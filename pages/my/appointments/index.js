const { libraryService } = require('../../../services/library')

const SERVICE_OPTIONS = [
  { value: 'CONSULTATION', label: '馆员咨询' },
  { value: 'PICKUP_BOOK', label: '到馆取书' },
  { value: 'READING_SUPPORT', label: '阅读支持' },
]

const METHOD_OPTIONS = [
  { value: 'COUNTER', label: '到馆柜台' },
  { value: 'SMART_LOCKER', label: '智能书柜' },
  { value: 'ONLINE', label: '线上咨询' },
]

function decorateAppointment(item) {
  const statusMap = {
    PENDING: '待处理',
    COMPLETED: '已完成',
    CANCELLED: '已取消',
  }

  const classMap = {
    PENDING: 'chip-warning',
    COMPLETED: 'chip-success',
    CANCELLED: 'chip-danger',
  }

  const serviceOption = SERVICE_OPTIONS.find((option) => option.value === item.serviceType)
  const methodOption = METHOD_OPTIONS.find((option) => option.value === item.method)

  return {
    ...item,
    serviceLabel: serviceOption ? serviceOption.label : item.serviceType,
    methodLabel: methodOption ? methodOption.label : item.method,
    statusLabel: statusMap[item.status] || item.status,
    statusClass: classMap[item.status] || 'chip',
    timeLabel: String(item.scheduledTime || '').replace('T', ' ').slice(0, 16),
  }
}

function padNumber(value) {
  return String(value).padStart(2, '0')
}

function getDefaultAppointmentDate() {
  const date = new Date()
  date.setDate(date.getDate() + 1)

  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`
}

function getDefaultAppointmentTime() {
  return '14:00'
}

Page({
  data: {
    items: [],
    serviceOptions: SERVICE_OPTIONS,
    methodOptions: METHOD_OPTIONS,
    serviceType: 'CONSULTATION',
    method: 'COUNTER',
    appointmentDate: getDefaultAppointmentDate(),
    appointmentTime: getDefaultAppointmentTime(),
    bookTitle: '',
    notes: '',
    loading: true,
    submitting: false,
    errorMessage: '',
    highlightId: 0,
    highlightAnchor: '',
  },

  onLoad(options) {
    const highlightId = Number((options && options.highlight) || 0)

    this.setData({
      highlightId,
      highlightAnchor: highlightId ? `appointment-${highlightId}` : '',
    })
  },

  onShow() {
    this.loadAppointments()
  },

  onPullDownRefresh() {
    this.loadAppointments({ stopPullDownRefresh: true })
  },

  async loadAppointments(options) {
    const nextOptions = options || {}

    this.setData({
      loading: true,
      errorMessage: '',
    })

    try {
      const items = await libraryService.getAppointments()
      this.setData({
        items: (items || []).map((item) => ({
          ...decorateAppointment(item),
          isHighlighted: Number(item.appointmentId) === Number(this.data.highlightId || 0),
        })),
      })
    } catch (error) {
      this.setData({
        errorMessage: error && error.message ? error.message : '服务预约加载失败',
      })
    } finally {
      this.setData({
        loading: false,
      })

      if (nextOptions.stopPullDownRefresh) {
        wx.stopPullDownRefresh()
      }
    }
  },

  pickService(event) {
    this.setData({
      serviceType: event.currentTarget.dataset.value,
    })
  },

  pickMethod(event) {
    this.setData({
      method: event.currentTarget.dataset.value,
    })
  },

  onFieldInput(event) {
    this.setData({
      [event.currentTarget.dataset.field]: event.detail.value,
    })
  },

  onDateChange(event) {
    this.setData({
      appointmentDate: event.detail.value,
    })
  },

  onTimeChange(event) {
    this.setData({
      appointmentTime: event.detail.value,
    })
  },

  getScheduledTimeValue() {
    return `${this.data.appointmentDate}T${this.data.appointmentTime}:00`
  },

  retryLoadAppointments() {
    this.loadAppointments()
  },

  async createAppointment() {
    this.setData({
      submitting: true,
    })

    try {
      await libraryService.createAppointment({
        serviceType: this.data.serviceType,
        method: this.data.method,
        scheduledTime: this.getScheduledTimeValue(),
        notes: this.data.notes,
        bookTitle: this.data.bookTitle,
      })

      wx.showToast({
        title: '预约已提交',
        icon: 'success',
      })

      this.setData({
        bookTitle: '',
        notes: '',
        appointmentDate: getDefaultAppointmentDate(),
        appointmentTime: getDefaultAppointmentTime(),
      })

      await this.loadAppointments()
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '预约失败',
        icon: 'none',
      })
    } finally {
      this.setData({
        submitting: false,
      })
    }
  },

  async cancelAppointment(event) {
    const appointmentId = event.currentTarget.dataset.appointmentId

    try {
      await libraryService.cancelAppointment(appointmentId)
      wx.showToast({
        title: '预约已取消',
        icon: 'success',
      })
      this.loadAppointments()
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '取消失败',
        icon: 'none',
      })
    }
  },
})
