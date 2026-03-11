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

Page({
  data: {
    items: [],
    serviceOptions: SERVICE_OPTIONS,
    methodOptions: METHOD_OPTIONS,
    serviceType: 'CONSULTATION',
    method: 'COUNTER',
    scheduledTime: '2026-03-12T14:00:00',
    bookTitle: '',
    notes: '',
    loading: true,
    submitting: false,
    errorMessage: '',
  },

  onShow() {
    this.loadAppointments()
  },

  async loadAppointments() {
    this.setData({
      loading: true,
      errorMessage: '',
    })

    try {
      const items = await libraryService.getAppointments()
      this.setData({
        items: (items || []).map(decorateAppointment),
      })
    } catch (error) {
      this.setData({
        errorMessage: error && error.message ? error.message : '服务预约加载失败',
      })
    } finally {
      this.setData({
        loading: false,
      })
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

  async createAppointment() {
    this.setData({
      submitting: true,
    })

    try {
      await libraryService.createAppointment({
        serviceType: this.data.serviceType,
        method: this.data.method,
        scheduledTime: this.data.scheduledTime,
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
