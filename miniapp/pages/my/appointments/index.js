/**
 * @file 服务预约页面逻辑
 * @description 图书馆服务预约管理页面，功能：
 *   - 查看预约记录（待处理/已完成/已取消/已失约）
 *   - 创建新服务预约，支持三种服务类型：
 *     1. 到馆还书（RETURN_BOOK）：需关联借阅记录和选择归还地点
 *     2. 预约取书（PICKUP_BOOK）：可选关联借阅
 *     3. 馆员咨询（CONSULTATION）：无需关联
 *   - 两种服务方式：到馆柜台（COUNTER）/ 智能书柜（SMART_LOCKER）
 *   - 取消预约
 *   - 支持从通知跳转后高亮指定预约项
 *
 *   归还地点系统：
 *     归还地点与服务方式关联，切换方式时自动更新可选地点
 *     - 柜台类：一层总服务台、二层东侧咨询台
 *     - 智能书柜类：东门24小时还书柜、南门智能还书柜
 */

const { libraryService } = require('../../../services/library')
const { confirmAction } = require('../../../utils/interaction')

/** 服务类型选项 */
const SERVICE_OPTIONS = [
  { value: 'RETURN_BOOK', label: '到馆还书' },
  { value: 'PICKUP_BOOK', label: '预约取书' },
  { value: 'CONSULTATION', label: '馆员咨询' },
]

/** 服务方式选项 */
const METHOD_OPTIONS = [
  { value: 'COUNTER', label: '到馆柜台' },
  { value: 'SMART_LOCKER', label: '智能书柜' },
]

/**
 * 归还地点选项
 * 每个地点关联一种服务方式（method），
 * 切换方式时自动过滤可选地点
 */
const RETURN_LOCATION_OPTIONS = [
  {
    value: '一层总服务台',
    label: '一层总服务台',
    method: 'COUNTER',
    description: '适合需要馆员现场核验的普通归还',
  },
  {
    value: '二层东侧咨询台',
    label: '二层东侧咨询台',
    method: 'COUNTER',
    description: '适合教学楼方向到馆读者归还',
  },
  {
    value: '东门24小时还书柜',
    label: '东门24小时还书柜',
    method: 'SMART_LOCKER',
    description: '支持非馆开放时段自助投递归还',
  },
  {
    value: '南门智能还书柜',
    label: '南门智能还书柜',
    method: 'SMART_LOCKER',
    description: '适合宿舍区方向读者归还',
  },
]

/**
 * 装饰预约记录，补充状态/服务类型/方式的中文标签
 * @param {Object} item - 原始预约数据
 * @returns {Object} 装饰后的视图模型
 */
function decorateAppointment(item) {
  const statusMap = {
    PENDING: '待处理',
    COMPLETED: '已完成',
    CANCELLED: '已取消',
    MISSED: '已失约',
  }

  const classMap = {
    PENDING: 'chip-warning',
    COMPLETED: 'chip-success',
    CANCELLED: 'chip-danger',
    MISSED: 'chip',
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

/**
 * 按服务方式过滤归还地点
 * @param {string} method - COUNTER / SMART_LOCKER
 * @returns {Object[]} 匹配的地点选项
 */
function getReturnLocationsByMethod(method) {
  return RETURN_LOCATION_OPTIONS.filter((option) => option.method === method)
}

/**
 * 构建借阅选择器的选项文案
 * @param {Object} loan - 借阅记录
 * @returns {Object|null} { value, label }
 */
function buildLoanOption(loan) {
  if (!loan) {
    return null
  }

  const dueDate = loan.dueDate ? `，应还 ${loan.dueDate}` : ''

  return {
    value: String(loan.loanId),
    label: `${loan.bookTitle || '未命名图书'} #${loan.loanId}${dueDate}`,
  }
}

/** 数字前补零（用于日期时间格式化） */
function padNumber(value) {
  return String(value).padStart(2, '0')
}

/** 默认预约日期：明天 */
function getDefaultAppointmentDate() {
  const date = new Date()
  date.setDate(date.getDate() + 1)

  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`
}

/** 默认预约时间：14:00 */
function getDefaultAppointmentTime() {
  return '14:00'
}

/**
 * 构建归还地点相关的 UI 状态
 * 当切换服务方式时，自动更新可选地点和选中状态
 * @param {string} method - 服务方式
 * @param {string} currentValue - 当前选中的地点
 * @returns {Object} 地点相关的页面数据
 */
function buildReturnLocationState(method, currentValue) {
  const options = getReturnLocationsByMethod(method)
  // 如果当前值在新方式下仍然有效，保持选中；否则选第一个
  const nextValue = options.some((item) => item.value === currentValue)
    ? currentValue
    : (options[0] && options[0].value) || ''
  const selectedOption = options.find((item) => item.value === nextValue) || null
  const selectedIndex = Math.max(
    options.findIndex((item) => item.value === nextValue),
    0,
  )

  return {
    availableReturnLocations: options,
    returnLocation: nextValue,
    returnLocationPickerIndex: selectedIndex,
    selectedReturnLocationLabel: selectedOption ? selectedOption.label : '',
    selectedReturnLocationDescription: selectedOption ? selectedOption.description : '',
  }
}

Page({
  /**
   * 页面数据
   * @property {Object[]} items          - 预约记录列表
   * @property {Object[]} serviceOptions - 服务类型选项
   * @property {Object[]} methodOptions  - 服务方式选项
   * @property {string} serviceType      - 选中的服务类型
   * @property {string} method           - 选中的服务方式
   * @property {Object[]} activeLoans    - 当前活跃借阅（用于关联还书）
   * @property {string[]} loanPickerOptions - 借阅选择器选项文案列表
   * @property {number} loanPickerIndex    - 借阅选择器当前索引
   * @property {string} loanId           - 关联的借阅 ID
   * @property {Object[]} availableReturnLocations - 当前可选归还地点
   * @property {string} returnLocation   - 选中的归还地点
   * @property {string} appointmentDate  - 预约日期
   * @property {string} appointmentTime  - 预约时间
   * @property {string} notes            - 备注
   * @property {boolean} loading         - 加载中
   * @property {boolean} submitting      - 提交中
   */
  data: {
    items: [],
    serviceOptions: SERVICE_OPTIONS,
    methodOptions: METHOD_OPTIONS,
    serviceType: 'CONSULTATION',
    method: 'COUNTER',
    activeLoans: [],
    loanPickerOptions: ['不关联借阅'],
    loanPickerIndex: 0,
    selectedLoanLabel: '不关联借阅',
    loanId: '',
    availableReturnLocations: getReturnLocationsByMethod('COUNTER'),
    returnLocationPickerOptions: getReturnLocationsByMethod('COUNTER').map((item) => item.label),
    returnLocationPickerIndex: 0,
    selectedReturnLocationLabel: '',
    selectedReturnLocationDescription: '',
    returnLocation: '',
    appointmentDate: getDefaultAppointmentDate(),
    appointmentTime: getDefaultAppointmentTime(),
    notes: '',
    loading: true,
    submitting: false,
    cancellingAppointmentId: 0,
    errorMessage: '',
    highlightId: 0,
    highlightAnchor: '',
  },

  /** 页面加载，从路由参数获取高亮 ID */
  onLoad(options) {
    const highlightId = Number((options && options.highlight) || 0)

    this.setData({
      highlightId,
      highlightAnchor: highlightId ? `appointment-${highlightId}` : '',
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

  /**
   * 加载页面数据
   * 并行请求预约列表和活跃借阅（用于创建还书预约时选择）
   */
  async loadPageData(options) {
    const nextOptions = options || {}

    this.setData({
      loading: true,
      errorMessage: '',
    })

    try {
      const [items, activeLoans] = await Promise.all([
        libraryService.getAppointments(),
        libraryService.getActiveLoans().catch(() => []),
      ])

      // 构建借阅选择器选项
      const loanOptions = (activeLoans || [])
        .map(buildLoanOption)
        .filter(Boolean)
      const selectedLoanIndex = Math.max(
        loanOptions.findIndex((item) => item.value === this.data.loanId) + 1,
        0,
      )

      // 构建归还地点状态
      const returnLocationState = buildReturnLocationState(
        this.data.method,
        this.data.serviceType === 'RETURN_BOOK' ? this.data.returnLocation : '',
      )

      this.setData({
        items: (items || []).map((item) => ({
          ...decorateAppointment(item),
          isHighlighted: Number(item.appointmentId) === Number(this.data.highlightId || 0),
        })),
        activeLoans: activeLoans || [],
        loanPickerOptions: ['不关联借阅'].concat(loanOptions.map((item) => item.label)),
        loanPickerIndex: selectedLoanIndex,
        selectedLoanLabel: ['不关联借阅'].concat(loanOptions.map((item) => item.label))[selectedLoanIndex] || '不关联借阅',
        ...returnLocationState,
        returnLocationPickerOptions: returnLocationState.availableReturnLocations.map((item) => item.label),
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

  /**
   * 选择服务类型
   * 切换类型时根据是否为"还书"决定是否保留归还地点
   */
  pickService(event) {
    const nextServiceType = event.currentTarget.dataset.value
    const shouldKeepReturnLocation = nextServiceType === 'RETURN_BOOK'
    const returnLocationState = buildReturnLocationState(
      this.data.method,
      shouldKeepReturnLocation ? this.data.returnLocation : '',
    )

    this.setData({
      serviceType: nextServiceType,
      returnLocation: shouldKeepReturnLocation ? returnLocationState.returnLocation : '',
      availableReturnLocations: returnLocationState.availableReturnLocations,
      returnLocationPickerOptions: returnLocationState.availableReturnLocations.map((item) => item.label),
      returnLocationPickerIndex: shouldKeepReturnLocation ? returnLocationState.returnLocationPickerIndex : 0,
      selectedReturnLocationLabel: shouldKeepReturnLocation ? returnLocationState.selectedReturnLocationLabel : '',
      selectedReturnLocationDescription: shouldKeepReturnLocation ? returnLocationState.selectedReturnLocationDescription : '',
    })
  },

  /**
   * 选择服务方式
   * 切换方式时自动更新可选归还地点
   */
  pickMethod(event) {
    const nextMethod = event.currentTarget.dataset.value
    const returnLocationState = buildReturnLocationState(
      nextMethod,
      this.data.serviceType === 'RETURN_BOOK' ? this.data.returnLocation : '',
    )

    this.setData({
      method: nextMethod,
      availableReturnLocations: returnLocationState.availableReturnLocations,
      returnLocationPickerOptions: returnLocationState.availableReturnLocations.map((item) => item.label),
      returnLocationPickerIndex: returnLocationState.returnLocationPickerIndex,
      returnLocation: this.data.serviceType === 'RETURN_BOOK' ? returnLocationState.returnLocation : '',
      selectedReturnLocationLabel: this.data.serviceType === 'RETURN_BOOK' ? returnLocationState.selectedReturnLocationLabel : '',
      selectedReturnLocationDescription: this.data.serviceType === 'RETURN_BOOK' ? returnLocationState.selectedReturnLocationDescription : '',
    })
  },

  /** 通用字段输入处理（通过 data-field 动态绑定） */
  onFieldInput(event) {
    this.setData({
      [event.currentTarget.dataset.field]: event.detail.value,
    })
  },

  /** 预约日期选择 */
  onDateChange(event) {
    this.setData({
      appointmentDate: event.detail.value,
    })
  },

  /** 预约时间选择 */
  onTimeChange(event) {
    this.setData({
      appointmentTime: event.detail.value,
    })
  },

  /** 借阅选择器变更 */
  onLoanChange(event) {
    const nextIndex = Number(event.detail.value || 0)
    // 索引 0 = "不关联借阅"，实际借阅从索引 1 开始
    const nextLoan = nextIndex > 0 ? this.data.activeLoans[nextIndex - 1] : null

    this.setData({
      loanPickerIndex: nextIndex,
      selectedLoanLabel: this.data.loanPickerOptions[nextIndex] || '不关联借阅',
      loanId: nextLoan ? String(nextLoan.loanId) : '',
    })
  },

  /** 归还地点选择器变更 */
  onReturnLocationChange(event) {
    const nextIndex = Number(event.detail.value || 0)
    const nextOption = this.data.availableReturnLocations[nextIndex] || null

    this.setData({
      returnLocationPickerIndex: nextIndex,
      selectedReturnLocationLabel: nextOption ? nextOption.label : '',
      selectedReturnLocationDescription: nextOption ? nextOption.description : '',
      returnLocation: nextOption ? nextOption.value : '',
    })
  },

  /** 拼接预约时间完整值（ISO 格式） */
  getScheduledTimeValue() {
    return `${this.data.appointmentDate}T${this.data.appointmentTime}:00`
  },

  /** 重试加载 */
  retryLoadAppointments() {
    this.loadPageData()
  },

  /**
   * 创建服务预约
   *
   * 校验规则：
   *   - 到馆还书必须关联借阅记录
   *   - 到馆还书必须选择归还地点
   *
   * 成功后重置表单并刷新列表
   */
  async createAppointment() {
    if (this.data.submitting || this.data.cancellingAppointmentId) {
      return
    }

    // 到馆还书校验
    if (this.data.serviceType === 'RETURN_BOOK' && !this.data.loanId) {
      wx.showToast({
        title: '到馆还书必须关联借阅记录',
        icon: 'none',
      })
      return
    }

    if (this.data.serviceType === 'RETURN_BOOK' && !this.data.returnLocation) {
      wx.showToast({
        title: '请选择归还地点',
        icon: 'none',
      })
      return
    }

    this.setData({
      submitting: true,
    })

    try {
      await libraryService.createAppointment({
        serviceType: this.data.serviceType,
        method: this.data.method,
        scheduledTime: this.getScheduledTimeValue(),
        notes: this.data.notes,
        loanId: this.data.loanId ? Number(this.data.loanId) : undefined,
        returnLocation: this.data.serviceType === 'RETURN_BOOK' ? this.data.returnLocation : undefined,
      })

      wx.showToast({
        title: '预约已提交',
        icon: 'success',
      })

      // 重置表单
      const resetReturnLocationState = buildReturnLocationState(this.data.method, '')
      this.setData({
        notes: '',
        loanId: '',
        loanPickerIndex: 0,
        appointmentDate: getDefaultAppointmentDate(),
        appointmentTime: getDefaultAppointmentTime(),
        returnLocation: this.data.serviceType === 'RETURN_BOOK' ? resetReturnLocationState.returnLocation : '',
        availableReturnLocations: resetReturnLocationState.availableReturnLocations,
        returnLocationPickerOptions: resetReturnLocationState.availableReturnLocations.map((item) => item.label),
        returnLocationPickerIndex: resetReturnLocationState.returnLocationPickerIndex,
        selectedReturnLocationLabel: this.data.serviceType === 'RETURN_BOOK' ? resetReturnLocationState.selectedReturnLocationLabel : '',
        selectedReturnLocationDescription: this.data.serviceType === 'RETURN_BOOK' ? resetReturnLocationState.selectedReturnLocationDescription : '',
      })

      await this.loadPageData()
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

  /** 取消预约 */
  async cancelAppointment(event) {
    const appointmentId = Number(event.currentTarget.dataset.appointmentId || 0)

    if (!appointmentId || this.data.submitting || this.data.cancellingAppointmentId) {
      return
    }

    const targetAppointment = (this.data.items || []).find(
      (item) => Number(item.appointmentId) === appointmentId,
    )
    const confirmed = await confirmAction({
      title: '确认取消服务预约',
      content: `确认取消${(targetAppointment && targetAppointment.serviceLabel) || '当前服务'}吗？`,
      confirmText: '确认取消',
    })

    if (!confirmed) {
      return
    }

    this.setData({
      cancellingAppointmentId: appointmentId,
    })

    try {
      await libraryService.cancelAppointment(appointmentId)
      wx.showToast({
        title: '预约已取消',
        icon: 'success',
      })
      await this.loadPageData()
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '取消失败',
        icon: 'none',
      })
    } finally {
      this.setData({
        cancellingAppointmentId: 0,
      })
    }
  },
})
