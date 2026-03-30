/**
 * @file 个人资料页面逻辑
 * @description 用户个人信息管理页面，功能：
 *   - 查看和编辑基础信息（姓名/邮箱/院系/专业/入学年份）
 *   - 管理兴趣标签（预设标签选择 + 自定义标签添加）
 *   - 保存修改后同步到全局会话
 *
 *   兴趣标签系统：
 *     - 预设标签：文学/历史/计算机/人工智能/艺术设计/心理学/经济管理/外语学习/考试备考/科研论文
 *     - 自定义标签：用户手动输入，支持中英文逗号分隔批量添加
 *     - 标签存储格式兼容 JSON 数组字符串和逗号分隔字符串
 */

const { libraryService } = require('../../../services/library')

/** 预设的兴趣标签选项 */
const INTEREST_TAG_OPTIONS = [
  '文学',
  '历史',
  '计算机',
  '人工智能',
  '艺术设计',
  '心理学',
  '经济管理',
  '外语学习',
  '考试备考',
  '科研论文',
]

/**
 * 生成入学年份选项列表（当前年份 → 1980）
 * @returns {string[]} 年份字符串数组
 */
function buildYearOptions() {
  const currentYear = new Date().getFullYear()
  const options = []

  for (let year = currentYear; year >= 1980; year -= 1) {
    options.push(String(year))
  }

  return options
}

/**
 * 标准化兴趣标签碎片
 * 支持多种输入格式：
 *   - 字符串数组（递归处理）
 *   - JSON 数组字符串（如 '["文学","历史"]'）
 *   - 逗号分隔字符串（如 '文学，历史,计算机'）
 *
 * @param {*} value - 标签值
 * @returns {string[]} 标准化后的标签列表
 */
function normalizeInterestTagFragments(value) {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => normalizeInterestTagFragments(item))
      .filter(Boolean)
  }

  const normalizedValue = String(value || '').trim()

  if (!normalizedValue) {
    return []
  }

  // 尝试解析 JSON 格式
  if (normalizedValue.startsWith('[') && normalizedValue.endsWith(']')) {
    try {
      const parsedValue = JSON.parse(normalizedValue)
      return normalizeInterestTagFragments(parsedValue)
    } catch (error) {
      return [normalizedValue]
    }
  }

  // 按中英文逗号分隔
  return normalizedValue
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

/**
 * 将标签列表分为"预设标签"和"自定义标签"两组
 * @param {string[]} tags - 完整标签列表
 * @returns {Object} { selectedInterestTags, customInterestTags }
 */
function splitInterestTags(tags) {
  const selectedInterestTags = []
  const customInterestTags = []

  ;(tags || []).forEach((tag) => {
    normalizeInterestTagFragments(tag).forEach((tagItem) => {
      if (INTEREST_TAG_OPTIONS.includes(tagItem)) {
        selectedInterestTags.push(tagItem)
        return
      }

      customInterestTags.push(tagItem)
    })
  })

  return {
    selectedInterestTags: Array.from(new Set(selectedInterestTags)),
    customInterestTags: Array.from(new Set(customInterestTags)),
  }
}

/**
 * 获取入学年份在 picker 选项中的索引
 * @param {string[]} yearOptions - 年份选项列表
 * @param {*} enrollmentYear - 入学年份
 * @returns {number} 索引值
 */
function getYearIndex(yearOptions, enrollmentYear) {
  const matchedIndex = yearOptions.findIndex(
    (item) => item === String(enrollmentYear || ''),
  )

  return matchedIndex >= 0 ? matchedIndex : 0
}

/**
 * 合并预设标签和自定义标签为一个去重列表
 * @returns {string[]} 合并后的标签列表
 */
function mergeInterestTags(selectedInterestTags, customInterestTags) {
  return Array.from(
    new Set([...(selectedInterestTags || []), ...(customInterestTags || [])]),
  )
}

/**
 * 构建预设标签选项的视图模型
 * @param {string[]} selectedInterestTags - 已选中的标签
 * @returns {Object[]} 含 label / active 的标签对象列表
 */
function buildInterestTagOptions(selectedInterestTags) {
  return INTEREST_TAG_OPTIONS.map((item) => ({
    label: item,
    active: (selectedInterestTags || []).includes(item),
  }))
}

Page({
  /**
   * 页面数据
   * @property {Object} form - 表单数据（fullName/email/department/major/enrollmentYear）
   * @property {string[]} yearOptions - 入学年份选项
   * @property {number} yearIndex     - 当前选中的年份索引
   * @property {Object[]} interestTagOptions - 预设标签视图模型
   * @property {string[]} selectedInterestTags - 已选中的预设标签
   * @property {string[]} customInterestTags   - 自定义标签列表
   * @property {string} customInterestInputValue - 自定义标签输入框的值
   * @property {boolean} loading  - 加载中
   * @property {boolean} saving   - 保存中
   * @property {string} errorMessage - 错误信息
   */
  data: {
    form: {
      fullName: '',
      email: '',
      department: '',
      major: '',
      enrollmentYear: '',
    },
    yearOptions: buildYearOptions(),
    yearIndex: 0,
    interestTagOptions: buildInterestTagOptions([]),
    selectedInterestTags: [],
    customInterestTags: [],
    customInterestInputValue: '',
    loading: true,
    saving: false,
    errorMessage: '',
  },

  /** 每次显示页面时加载资料 */
  onShow() {
    this.loadProfile()
  },

  /** 下拉刷新 */
  onPullDownRefresh() {
    this.loadProfile({ stopPullDownRefresh: true })
  },

  /**
   * 加载用户资料
   * 获取后端数据 → 分拆兴趣标签 → 同步到表单
   */
  async loadProfile(options) {
    const nextOptions = options || {}

    this.setData({
      loading: true,
      errorMessage: '',
    })

    try {
      const profile = await libraryService.getMyProfile()
      const yearOptions = this.data.yearOptions

      // 分拆兴趣标签为预设和自定义两组
      const { selectedInterestTags, customInterestTags } = splitInterestTags(
        profile.interestTags || [],
      )

      this.setData({
        form: {
          fullName: profile.fullName || '',
          email: profile.email || '',
          department: profile.department || '',
          major: profile.major || '',
          enrollmentYear: String(profile.enrollmentYear || yearOptions[0] || ''),
        },
        yearIndex: getYearIndex(yearOptions, profile.enrollmentYear),
        interestTagOptions: buildInterestTagOptions(selectedInterestTags),
        selectedInterestTags,
        customInterestTags,
        customInterestInputValue: '',
      })
    } catch (error) {
      this.setData({
        errorMessage: error && error.message ? error.message : '资料加载失败',
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

  /** 表单字段输入处理（通过 data-field 动态绑定） */
  onFieldInput(event) {
    const field = event.currentTarget.dataset.field

    this.setData({
      form: {
        ...this.data.form,
        [field]: event.detail.value,
      },
    })
  },

  /** 入学年份 picker 变更 */
  onYearChange(event) {
    const yearIndex = Number(event.detail.value || 0)

    this.setData({
      yearIndex,
      form: {
        ...this.data.form,
        enrollmentYear: this.data.yearOptions[yearIndex] || '',
      },
    })
  },

  /** 切换预设兴趣标签的选中状态 */
  toggleInterestTag(event) {
    const value = event.currentTarget.dataset.value
    const selectedInterestTags = [...this.data.selectedInterestTags]
    const currentIndex = selectedInterestTags.indexOf(value)

    if (currentIndex >= 0) {
      selectedInterestTags.splice(currentIndex, 1)
    } else {
      selectedInterestTags.push(value)
    }

    this.setData({
      interestTagOptions: buildInterestTagOptions(selectedInterestTags),
      selectedInterestTags,
    })
  },

  /** 自定义标签输入事件 */
  onCustomInterestInput(event) {
    this.setData({
      customInterestInputValue: event.detail.value,
    })
  },

  /**
   * 添加自定义兴趣标签
   * 过滤掉已存在于预设标签中的值，去重后添加
   */
  addCustomInterestTag() {
    const nextTags = normalizeInterestTagFragments(
      this.data.customInterestInputValue,
    ).filter((item) => !INTEREST_TAG_OPTIONS.includes(item))

    if (!nextTags.length) {
      return
    }

    this.setData({
      customInterestTags: Array.from(
        new Set([...(this.data.customInterestTags || []), ...nextTags]),
      ),
      customInterestInputValue: '',
    })
  },

  /** 删除某个自定义兴趣标签 */
  removeCustomInterestTag(event) {
    const value = event.currentTarget.dataset.value

    this.setData({
      customInterestTags: (this.data.customInterestTags || []).filter(
        (item) => item !== value,
      ),
    })
  },

  /** 重试加载 */
  retryLoadProfile() {
    this.loadProfile()
  },

  /**
   * 保存个人资料
   *
   * 流程：
   *   1. 合并预设标签和自定义标签
   *   2. 调用 updateProfile 接口
   *   3. 成功后同步更新全局会话中的用户信息
   */
  async saveProfile() {
    this.setData({
      saving: true,
    })

    try {
      const payload = {
        ...this.data.form,
        enrollmentYear: Number(this.data.form.enrollmentYear || 0),
        interestTags: mergeInterestTags(
          this.data.selectedInterestTags,
          this.data.customInterestTags,
        ),
      }

      const user = await libraryService.updateProfile(payload)
      const app = getApp()

      // 同步更新全局会话中的用户信息（保持 token 不变）
      app.setSession({
        token: app.globalData.token,
        user,
      })

      wx.showToast({
        title: '资料已保存',
        icon: 'success',
      })
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '保存失败',
        icon: 'none',
      })
    } finally {
      this.setData({
        saving: false,
      })
    }
  },
})
