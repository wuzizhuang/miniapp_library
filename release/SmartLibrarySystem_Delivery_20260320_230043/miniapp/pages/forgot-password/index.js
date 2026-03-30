/**
 * @file 忘记密码页面逻辑
 * @description 用户忘记密码时使用的页面：
 *   - 输入注册邮箱
 *   - 请求后端发送密码重置链接
 *   - 显示操作结果（成功/失败提示）
 */

const { libraryService } = require('../../services/library')

Page({
  /**
   * 页面数据
   * @property {string} email          - 邮箱输入值
   * @property {boolean} loading       - 提交中状态
   * @property {string} errorMessage   - 错误信息
   * @property {string} successMessage - 成功信息
   */
  data: {
    email: '',
    loading: false,
    errorMessage: '',
    successMessage: '',
  },

  /**
   * 通用输入处理器
   */
  onInput(event) {
    this.setData({
      [event.currentTarget.dataset.field]: event.detail.value,
    })
  },

  /**
   * 提交密码重置请求
   *
   * 流程：
   *   1. 校验邮箱是否为空
   *   2. 调用 requestPasswordReset 接口
   *   3. 成功后提示用户查看邮箱
   */
  async submit() {
    const email = String(this.data.email || '').trim()

    if (!email) {
      this.setData({
        errorMessage: '请输入邮箱',
      })
      return
    }

    this.setData({
      loading: true,
      errorMessage: '',
      successMessage: '',
    })

    try {
      const result = await libraryService.requestPasswordReset({
        email,
      })

      this.setData({
        successMessage: result && result.message ? result.message : '重置请求已提交，请查看邮箱或后端日志中的重置链接。',
      })
    } catch (error) {
      this.setData({
        errorMessage: error && error.message ? error.message : '重置失败',
      })
    } finally {
      this.setData({
        loading: false,
      })
    }
  },
})
