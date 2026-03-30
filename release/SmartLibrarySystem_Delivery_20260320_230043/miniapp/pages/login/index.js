/**
 * @file 登录页面逻辑
 * @description 用户登录页面，功能：
 *   - 输入用户名和密码进行登录
 *   - 支持自动填充（开发环境下由 env.js 配置）
 *   - 已登录用户自动跳转到首页
 *   - 提供注册和忘记密码入口
 */

// 引入图书馆聚合服务
const { libraryService } = require('../../services/library')

// 从环境配置中读取自动登录参数（开发调试用）
const {
  AUTO_LOGIN_ENABLED,    // 是否启用自动填充
  AUTO_LOGIN_USERNAME,   // 预填充的用户名
  AUTO_LOGIN_PASSWORD,   // 预填充的密码
} = require('../../config/env')

Page({
  /**
   * 页面数据
   * @property {string} username         - 用户名输入值
   * @property {string} password         - 密码输入值
   * @property {boolean} loading         - 登录请求是否进行中
   * @property {string} errorMessage     - 错误提示
   * @property {boolean} autoLoginEnabled - 是否启用自动填充（用于 UI 提示展示）
   */
  data: {
    username: AUTO_LOGIN_USERNAME,
    password: AUTO_LOGIN_PASSWORD,
    loading: false,
    errorMessage: '',
    autoLoginEnabled: AUTO_LOGIN_ENABLED,
  },

  /**
   * 页面加载时检查登录状态
   * 如果用户已登录，直接跳转首页
   */
  async onLoad() {
    const app = getApp()

    // 等待 App 初始化完成
    await app.whenReady()

    // 已登录 → 直接跳转首页
    if (app.isLoggedIn()) {
      wx.reLaunch({
        url: '/pages/index/index',
      })
    }
  },

  /**
   * 用户名输入事件处理
   */
  onUsernameInput(event) {
    this.setData({
      username: event.detail.value,
    })
  },

  /**
   * 密码输入事件处理
   */
  onPasswordInput(event) {
    this.setData({
      password: event.detail.value,
    })
  },

  /**
   * 提交登录表单
   *
   * 流程：
   *   1. 表单校验（用户名和密码不能为空）
   *   2. 调用 libraryService.login 发起登录请求
   *   3. 成功后通过 app.setSession 持久化会话
   *   4. 弹出成功提示 → 跳转首页
   *   5. 失败则显示错误信息
   */
  async onSubmit() {
    const username = String(this.data.username || '').trim()
    const password = this.data.password || ''

    // 表单校验
    if (!username || !password) {
      this.setData({
        errorMessage: '请输入用户名和密码',
      })
      return
    }

    // 开始加载
    this.setData({
      loading: true,
      errorMessage: '',
    })

    try {
      // 调用登录接口
      const result = await libraryService.login({
        username,
        password,
      })

      // 将会话信息保存到 App 全局状态和本地存储
      getApp().setSession({
        token: result.token,
        refreshToken: result.refreshToken,
        user: result.user,
      })

      wx.showToast({
        title: '登录成功',
        icon: 'success',
      })

      // 跳转到首页（使用 reLaunch 清除页面栈）
      wx.reLaunch({
        url: '/pages/index/index',
      })
    } catch (error) {
      this.setData({
        errorMessage: error && error.message ? error.message : '登录失败',
      })
    } finally {
      this.setData({
        loading: false,
      })
    }
  },

  /**
   * 跳转到注册页面
   */
  goRegister() {
    wx.navigateTo({
      url: '/pages/register/index',
    })
  },

  /**
   * 跳转到忘记密码页面
   */
  goForgotPassword() {
    wx.navigateTo({
      url: '/pages/forgot-password/index',
    })
  },
})
