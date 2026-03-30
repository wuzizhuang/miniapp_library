/**
 * @file 注册页面逻辑
 * @description 新用户注册页面，功能：
 *   - 输入用户名、密码、姓名、邮箱
 *   - 前端校验（必填项、密码长度、邮箱格式）
 *   - 注册成功后自动登录并跳转首页
 */

const { libraryService } = require('../../services/library')

Page({
  /**
   * 页面数据
   * @property {string} username     - 用户名
   * @property {string} password     - 密码
   * @property {string} fullName     - 姓名
   * @property {string} email        - 邮箱
   * @property {boolean} loading     - 提交中状态
   * @property {string} errorMessage - 错误信息
   */
  data: {
    username: '',
    password: '',
    fullName: '',
    email: '',
    loading: false,
    errorMessage: '',
  },

  /**
   * 通用输入处理器
   * 通过 data-field 属性动态绑定到对应的数据字段
   * @param {Object} event - 输入事件，event.currentTarget.dataset.field 为字段名
   */
  onInput(event) {
    this.setData({
      [event.currentTarget.dataset.field]: event.detail.value,
    })
  },

  /**
   * 提交注册表单
   *
   * 校验规则：
   *   1. 所有字段不能为空
   *   2. 密码长度 >= 6 位
   *   3. 邮箱格式校验（正则匹配）
   *
   * 注册成功后自动调用 login → 保存会话 → 跳转首页
   */
  async submit() {
    const username = String(this.data.username || '').trim()
    const password = this.data.password || ''
    const fullName = String(this.data.fullName || '').trim()
    const email = String(this.data.email || '').trim()

    // 必填项校验
    if (!username || !password || !fullName || !email) {
      this.setData({
        errorMessage: '请填写所有必填项',
      })
      return
    }

    // 密码长度校验
    if (password.length < 6) {
      this.setData({
        errorMessage: '密码长度不能少于 6 位',
      })
      return
    }

    // 邮箱格式校验
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.setData({
        errorMessage: '请输入有效的邮箱地址',
      })
      return
    }

    this.setData({
      loading: true,
      errorMessage: '',
    })

    try {
      // 调用注册接口（内部包含自动登录逻辑）
      const result = await libraryService.register({
        username: this.data.username,
        password: this.data.password,
        fullName: this.data.fullName,
        email: this.data.email,
      })

      // 保存会话到全局状态和本地存储
      getApp().setSession({
        token: result.token,
        refreshToken: result.refreshToken,
        user: result.user,
      })

      wx.showToast({
        title: '注册成功',
        icon: 'success',
      })

      // 跳转首页
      wx.reLaunch({
        url: '/pages/index/index',
      })
    } catch (error) {
      this.setData({
        errorMessage: error && error.message ? error.message : '注册失败',
      })
    } finally {
      this.setData({
        loading: false,
      })
    }
  },
})
