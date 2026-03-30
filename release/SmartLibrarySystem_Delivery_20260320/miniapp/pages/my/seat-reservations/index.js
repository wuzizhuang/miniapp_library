const { libraryService } = require('../../../services/library')

function padNumber(value) {
  return String(value).padStart(2, '0')
}

function formatDateTimeValue(date) {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}T${padNumber(date.getHours())}:${padNumber(date.getMinutes())}:00`
}

function buildDefaultStartDateTime() {
  const date = new Date()
  date.setMinutes(0, 0, 0)
  date.setHours(date.getHours() + 1)
  return date
}

function buildDefaultEndDateTime() {
  const date = buildDefaultStartDateTime()
  date.setHours(date.getHours() + 2)
  return date
}

function splitDateTime(date) {
  return {
    date: `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`,
    time: `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`,
  }
}

function buildTimeWindowState() {
  const start = buildDefaultStartDateTime()
  const end = buildDefaultEndDateTime()

  return {
    startDate: splitDateTime(start).date,
    startTime: splitDateTime(start).time,
    endDate: splitDateTime(end).date,
    endTime: splitDateTime(end).time,
  }
}

function getSeatStatusClass(item) {
  if (item.available) {
    return 'chip-success'
  }

  return item.status === 'UNAVAILABLE' ? 'chip-danger' : 'chip-warning'
}

function getSeatStatusLabel(item) {
  if (item.available) {
    return '可预约'
  }

  return item.status === 'UNAVAILABLE' ? '已停用' : '时间冲突'
}

function getReservationStatusClass(status) {
  if (status === 'ACTIVE') {
    return 'chip-primary'
  }

  if (status === 'COMPLETED') {
    return 'chip-success'
  }

  if (status === 'CANCELLED') {
    return 'chip-danger'
  }

  return 'chip-warning'
}

function getReservationStatusLabel(status) {
  if (status === 'ACTIVE') {
    return '进行中'
  }

  if (status === 'COMPLETED') {
    return '已完成'
  }

  if (status === 'CANCELLED') {
    return '已取消'
  }

  if (status === 'MISSED') {
    return '已失约'
  }

  return status
}

function decorateSeat(item) {
  return {
    ...item,
    statusLabel: getSeatStatusLabel(item),
    statusClass: getSeatStatusClass(item),
    tagTexts: [
      item.seatType === 'COMPUTER' ? '电脑位' : item.seatType === 'DISCUSSION' ? '讨论位' : '标准位',
      item.hasPower ? '有电源' : '',
      item.nearWindow ? '靠窗' : '',
    ].filter(Boolean),
  }
}

function decorateReservation(item, highlightId) {
  const startText = String(item.startTime || '').replace('T', ' ').slice(0, 16)
  const endText = String(item.endTime || '').replace('T', ' ').slice(0, 16)

  return {
    ...item,
    statusLabel: getReservationStatusLabel(item.status),
    statusClass: getReservationStatusClass(item.status),
    timeLabel: `${startText} - ${endText}`,
    isHighlighted: Number(item.reservationId) === Number(highlightId || 0),
  }
}

Page({
  data: {
    seats: [],
    activeReservations: [],
    historyReservations: [],
    floorName: '',
    zoneName: '',
    notes: '',
    loading: true,
    searching: false,
    submittingSeatId: 0,
    cancellingReservationId: 0,
    errorMessage: '',
    highlightId: 0,
    highlightAnchor: '',
    ...buildTimeWindowState(),
  },

  onLoad(options) {
    const highlightId = Number((options && options.highlight) || 0)

    this.setData({
      highlightId,
      highlightAnchor: highlightId ? `seat-reservation-${highlightId}` : '',
    })
  },

  onShow() {
    this.loadPageData()
  },

  onPullDownRefresh() {
    this.loadPageData({ stopPullDownRefresh: true })
  },

  onFieldInput(event) {
    this.setData({
      [event.currentTarget.dataset.field]: event.detail.value,
    })
  },

  onDateChange(event) {
    const field = event.currentTarget.dataset.field
    this.setData({
      [field]: event.detail.value,
    })
  },

  onTimeChange(event) {
    const field = event.currentTarget.dataset.field
    this.setData({
      [field]: event.detail.value,
    })
  },

  getStartDateTimeValue() {
    return `${this.data.startDate}T${this.data.startTime}:00`
  },

  getEndDateTimeValue() {
    return `${this.data.endDate}T${this.data.endTime}:00`
  },

  validateTimeWindow() {
    const start = new Date(this.getStartDateTimeValue())
    const end = new Date(this.getEndDateTimeValue())

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return '请选择完整的开始和结束时间'
    }

    if (end <= start) {
      return '结束时间必须晚于开始时间'
    }

    const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000)
    if (durationMinutes < 30) {
      return '座位预约时长不能少于 30 分钟'
    }

    if (durationMinutes > 480) {
      return '座位预约时长不能超过 8 小时'
    }

    return ''
  },

  async loadPageData(options) {
    const nextOptions = options || {}
    const validationMessage = this.validateTimeWindow()

    this.setData({
      loading: true,
      errorMessage: validationMessage,
    })

    if (validationMessage) {
      this.setData({
        loading: false,
        searching: false,
      })

      if (nextOptions.stopPullDownRefresh) {
        wx.stopPullDownRefresh()
      }
      return
    }

    try {
      const [seats, reservations] = await Promise.all([
        libraryService.getSeats({
          floorName: this.data.floorName,
          zoneName: this.data.zoneName,
          startTime: this.getStartDateTimeValue(),
          endTime: this.getEndDateTimeValue(),
          availableOnly: false,
        }),
        libraryService.getMySeatReservations(),
      ])

      const decoratedReservations = (reservations || []).map((item) =>
        decorateReservation(item, this.data.highlightId),
      )

      this.setData({
        seats: (seats || []).map(decorateSeat),
        activeReservations: decoratedReservations.filter((item) => item.status === 'ACTIVE'),
        historyReservations: decoratedReservations.filter((item) => item.status !== 'ACTIVE'),
      })
    } catch (error) {
      this.setData({
        errorMessage: error && error.message ? error.message : '座位预约数据加载失败',
      })
    } finally {
      this.setData({
        loading: false,
        searching: false,
      })

      if (nextOptions.stopPullDownRefresh) {
        wx.stopPullDownRefresh()
      }
    }
  },

  refreshSeats() {
    this.setData({
      searching: true,
    })
    this.loadPageData()
  },

  async reserveSeat(event) {
    const seatId = Number(event.currentTarget.dataset.seatId || 0)
    const available = Boolean(event.currentTarget.dataset.available)
    const validationMessage = this.validateTimeWindow()

    if (!available) {
      wx.showToast({
        title: '当前座位在该时段不可预约',
        icon: 'none',
      })
      return
    }

    if (validationMessage) {
      wx.showToast({
        title: validationMessage,
        icon: 'none',
      })
      return
    }

    this.setData({
      submittingSeatId: seatId,
      errorMessage: '',
    })

    try {
      await libraryService.createSeatReservation({
        seatId,
        startTime: this.getStartDateTimeValue(),
        endTime: this.getEndDateTimeValue(),
        notes: this.data.notes,
      })

      wx.showToast({
        title: '座位预约成功',
        icon: 'success',
      })

      await this.loadPageData()
    } catch (error) {
      const message = error && error.message ? error.message : '座位预约失败'

      this.setData({
        errorMessage: message,
      })

      wx.showToast({
        title: message,
        icon: 'none',
      })
    } finally {
      this.setData({
        submittingSeatId: 0,
      })
    }
  },

  async cancelReservation(event) {
    const reservationId = Number(event.currentTarget.dataset.reservationId || 0)

    this.setData({
      cancellingReservationId: reservationId,
      errorMessage: '',
    })

    try {
      await libraryService.cancelSeatReservation(reservationId)

      wx.showToast({
        title: '已取消座位预约',
        icon: 'success',
      })

      await this.loadPageData()
    } catch (error) {
      const message = error && error.message ? error.message : '取消失败'

      this.setData({
        errorMessage: message,
      })

      wx.showToast({
        title: message,
        icon: 'none',
      })
    } finally {
      this.setData({
        cancellingReservationId: 0,
      })
    }
  },

  resetTimeWindow() {
    this.setData({
      ...buildTimeWindowState(),
      notes: '',
    })
    this.loadPageData()
  },
})
