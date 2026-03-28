/**
 * @file 座位预约页面逻辑
 * @description 图书馆自习座位预约管理页面，功能：
 *   - 查询可用座位（按楼层/区域/时间段筛选）
 *   - 创建座位预约（选择时间窗口 + 选座）
 *   - 查看我的座位预约（进行中/已完成/已取消/已失约）
 *   - 取消座位预约
 *   - 时间窗口校验（30 分钟 ≤ 时长 ≤ 8 小时）
 *   - 支持从通知跳转后高亮指定预约项
 *
 *   座位属性标签系统：
 *     - 座位类型：标准位 / 电脑位 / 讨论位
 *     - 设施标签：有电源 / 靠窗
 */

const { libraryService } = require('../../../services/library')
const { confirmAction } = require('../../../utils/interaction')

/** 楼层筛选选项 */
const FLOOR_OPTIONS = ['不限', '1F', '2F', '3F', '4F', '5F']

/** 区域筛选选项 */
const ZONE_OPTIONS = ['不限', '东侧静音区', '西侧静音区', '南侧讨论区', '北侧电脑区', '朝阳自习区']

/** 数字前补零 */
function padNumber(value) {
  return String(value).padStart(2, '0')
}

/** 格式化 Date 对象为 ISO 日期时间字符串 */
function formatDateTimeValue(date) {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}T${padNumber(date.getHours())}:${padNumber(date.getMinutes())}:00`
}

/** 默认开始时间：下一个整点 */
function buildDefaultStartDateTime() {
  const date = new Date()
  date.setMinutes(0, 0, 0)
  date.setHours(date.getHours() + 1)
  return date
}

/** 默认结束时间：开始时间 + 2 小时 */
function buildDefaultEndDateTime() {
  const date = buildDefaultStartDateTime()
  date.setHours(date.getHours() + 2)
  return date
}

/**
 * 将 Date 对象拆分为日期和时间字符串
 * @param {Date} date - 日期对象
 * @returns {Object} { date: 'YYYY-MM-DD', time: 'HH:mm' }
 */
function splitDateTime(date) {
  return {
    date: `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`,
    time: `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`,
  }
}

/** 构建默认时间窗口状态 */
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

/**
 * 获取座位状态样式（用于 chip 颜色）
 * @param {Object} item - 座位数据
 * @returns {string} CSS 类名
 */
function getSeatStatusClass(item) {
  if (item.available) {
    return 'chip-success'
  }

  return item.status === 'UNAVAILABLE' ? 'chip-danger' : 'chip-warning'
}

/**
 * 获取座位状态文案
 * @param {Object} item - 座位数据
 * @returns {string} 状态文案
 */
function getSeatStatusLabel(item) {
  if (item.available) {
    return '可预约'
  }

  return item.status === 'UNAVAILABLE' ? '已停用' : '时间冲突'
}

/**
 * 获取座位预约状态样式
 * @param {string} status - 预约状态
 * @returns {string} CSS 类名
 */
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

/**
 * 获取座位预约状态文案
 * @param {string} status - 预约状态
 * @returns {string} 状态文案
 */
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

/**
 * 装饰座位数据，补充状态标签和设施标签
 * @param {Object} item - 原始座位数据
 * @returns {Object} 装饰后的视图模型
 */
function decorateSeat(item) {
  return {
    ...item,
    statusLabel: getSeatStatusLabel(item),
    statusClass: getSeatStatusClass(item),
    tagTexts: [
      // 座位类型标签
      item.seatType === 'COMPUTER' ? '电脑位' : item.seatType === 'DISCUSSION' ? '讨论位' : '标准位',
      // 设施标签
      item.hasPower ? '有电源' : '',
      item.nearWindow ? '靠窗' : '',
    ].filter(Boolean),
  }
}

/**
 * 装饰座位预约记录
 * @param {Object} item - 原始预约数据
 * @param {number} highlightId - 高亮 ID
 * @returns {Object} 装饰后的视图模型
 */
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
  /**
   * 页面数据
   * @property {Object[]} seats              - 可用座位列表
   * @property {Object[]} activeReservations  - 进行中的预约
   * @property {Object[]} historyReservations - 历史预约（已完成/已取消等）
   * @property {string} floorName            - 楼层筛选
   * @property {string} zoneName             - 区域筛选
   * @property {string} notes                - 预约备注
   * @property {boolean} loading             - 加载中
   * @property {boolean} searching           - 搜索中
   * @property {number} submittingSeatId     - 正在提交预约的座位 ID
   * @property {number} cancellingReservationId - 正在取消的预约 ID
   * @property {string} startDate/startTime  - 开始日期/时间
   * @property {string} endDate/endTime      - 结束日期/时间
   */
  data: {
    seats: [],
    activeReservations: [],
    historyReservations: [],
    floorName: '',
    zoneName: '',
    floorOptions: FLOOR_OPTIONS,
    floorPickerIndex: 0,
    zoneOptions: ZONE_OPTIONS,
    zonePickerIndex: 0,
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

  /** 页面加载，从路由参数获取高亮 ID */
  onLoad(options) {
    const highlightId = Number((options && options.highlight) || 0)

    this.setData({
      highlightId,
      highlightAnchor: highlightId ? `seat-reservation-${highlightId}` : '',
    })
  },

  /** 每次显示页面时加载数据 */
  onShow() {
    this.loadPageData()
  },

  /** 下拉刷新 */
  onPullDownRefresh() {
    this.loadPageData({ stopPullDownRefresh: true })
  },

  /** 通用字段输入处理 */
  onFieldInput(event) {
    this.setData({
      [event.currentTarget.dataset.field]: event.detail.value,
    })
  },

  /** 日期选择器变更 */
  onDateChange(event) {
    const field = event.currentTarget.dataset.field
    this.setData({
      [field]: event.detail.value,
    })
  },

  /** 时间选择器变更 */
  onTimeChange(event) {
    const field = event.currentTarget.dataset.field
    this.setData({
      [field]: event.detail.value,
    })
  },

  /** 楼层筛选 picker 变更 */
  onFloorChange(event) {
    const index = Number(event.detail.value || 0)
    this.setData({
      floorPickerIndex: index,
      floorName: index > 0 ? FLOOR_OPTIONS[index] : '',
    })
  },

  /** 分区筛选 picker 变更 */
  onZoneChange(event) {
    const index = Number(event.detail.value || 0)
    this.setData({
      zonePickerIndex: index,
      zoneName: index > 0 ? ZONE_OPTIONS[index] : '',
    })
  },

  /** 拼接开始时间完整值 */
  getStartDateTimeValue() {
    return `${this.data.startDate}T${this.data.startTime}:00`
  },

  /** 拼接结束时间完整值 */
  getEndDateTimeValue() {
    return `${this.data.endDate}T${this.data.endTime}:00`
  },

  /**
   * 校验时间窗口合法性
   *
   * 校验规则：
   *   1. 开始和结束时间必须完整
   *   2. 结束时间必须晚于开始时间
   *   3. 时长不少于 30 分钟
   *   4. 时长不超过 8 小时
   *
   * @returns {string} 校验错误信息（空字符串表示通过）
   */
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

  /**
   * 加载页面数据
   * 先校验时间窗口，通过后并行请求座位列表和我的预约
   */
  async loadPageData(options) {
    const nextOptions = options || {}
    const validationMessage = this.validateTimeWindow()

    this.setData({
      loading: true,
      errorMessage: validationMessage,
    })

    // 时间窗口校验失败则不发起请求
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
        // 按状态分为"进行中"和"历史"两组
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

  /** 手动刷新座位列表（搜索按钮） */
  refreshSeats() {
    this.setData({
      searching: true,
    })
    this.loadPageData()
  },

  /**
   * 预约座位
   *
   * 校验：
   *   1. 座位必须可用
   *   2. 时间窗口必须合法
   *
   * 成功后自动刷新页面数据
   */
  async reserveSeat(event) {
    const seatId = Number(event.currentTarget.dataset.seatId || 0)
    const available = Boolean(event.currentTarget.dataset.available)
    const validationMessage = this.validateTimeWindow()

    if (this.data.submittingSeatId || this.data.cancellingReservationId) {
      return
    }

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

    const targetSeat = (this.data.seats || []).find((item) => Number(item.seatId) === seatId)
    const confirmed = await confirmAction({
      title: '确认预约座位',
      content: `确认预约${(targetSeat && targetSeat.seatCode) || '当前座位'}吗？预约成功后可在“我的当前预约”中查看。`,
      confirmText: '确认预约',
    })

    if (!confirmed) {
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

  /** 取消座位预约 */
  async cancelReservation(event) {
    const reservationId = Number(event.currentTarget.dataset.reservationId || 0)

    if (!reservationId || this.data.submittingSeatId || this.data.cancellingReservationId) {
      return
    }

    const targetReservation = (this.data.activeReservations || []).find(
      (item) => Number(item.reservationId) === reservationId,
    )
    const confirmed = await confirmAction({
      title: '确认取消座位预约',
      content: `确认取消${(targetReservation && targetReservation.seatCode) || '当前座位'}的预约吗？`,
      confirmText: '确认取消',
    })

    if (!confirmed) {
      return
    }

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

  /** 重置时间窗口为默认值并刷新 */
  resetTimeWindow() {
    this.setData({
      ...buildTimeWindowState(),
      notes: '',
    })
    this.loadPageData()
  },
})
