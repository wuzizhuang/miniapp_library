const { libraryService } = require('../../../services/library')

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

function buildYearOptions() {
  const currentYear = new Date().getFullYear()
  const options = []

  for (let year = currentYear; year >= 1980; year -= 1) {
    options.push(String(year))
  }

  return options
}

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

  if (normalizedValue.startsWith('[') && normalizedValue.endsWith(']')) {
    try {
      const parsedValue = JSON.parse(normalizedValue)
      return normalizeInterestTagFragments(parsedValue)
    } catch (error) {
      return [normalizedValue]
    }
  }

  return normalizedValue
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

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

function getYearIndex(yearOptions, enrollmentYear) {
  const matchedIndex = yearOptions.findIndex(
    (item) => item === String(enrollmentYear || ''),
  )

  return matchedIndex >= 0 ? matchedIndex : 0
}

function mergeInterestTags(selectedInterestTags, customInterestTags) {
  return Array.from(
    new Set([...(selectedInterestTags || []), ...(customInterestTags || [])]),
  )
}

function buildInterestTagOptions(selectedInterestTags) {
  return INTEREST_TAG_OPTIONS.map((item) => ({
    label: item,
    active: (selectedInterestTags || []).includes(item),
  }))
}

Page({
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

  onShow() {
    this.loadProfile()
  },

  onPullDownRefresh() {
    this.loadProfile({ stopPullDownRefresh: true })
  },

  async loadProfile(options) {
    const nextOptions = options || {}

    this.setData({
      loading: true,
      errorMessage: '',
    })

    try {
      const profile = await libraryService.getMyProfile()
      const yearOptions = this.data.yearOptions
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

  onFieldInput(event) {
    const field = event.currentTarget.dataset.field

    this.setData({
      form: {
        ...this.data.form,
        [field]: event.detail.value,
      },
    })
  },

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

  onCustomInterestInput(event) {
    this.setData({
      customInterestInputValue: event.detail.value,
    })
  },

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

  removeCustomInterestTag(event) {
    const value = event.currentTarget.dataset.value

    this.setData({
      customInterestTags: (this.data.customInterestTags || []).filter(
        (item) => item !== value,
      ),
    })
  },

  retryLoadProfile() {
    this.loadProfile()
  },

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
