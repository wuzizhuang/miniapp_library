/**
 * @file 交互辅助工具
 * @description 封装确认弹窗等通用交互能力，避免各页面重复拼装 wx.showModal。
 */

/**
 * 弹出确认框并返回用户选择结果。
 * @param {Object} options - 弹窗配置
 * @param {string} options.title - 标题
 * @param {string} options.content - 内容
 * @param {string} [options.confirmText='确认'] - 确认按钮文案
 * @param {string} [options.cancelText='取消'] - 取消按钮文案
 * @returns {Promise<boolean>} 用户是否确认
 */
function confirmAction(options) {
  const modalOptions = options || {}

  return new Promise((resolve) => {
    wx.showModal({
      title: modalOptions.title || '请确认',
      content: modalOptions.content || '是否继续本次操作？',
      confirmText: modalOptions.confirmText || '确认',
      cancelText: modalOptions.cancelText || '取消',
      success(result) {
        resolve(Boolean(result && result.confirm))
      },
      fail() {
        resolve(false)
      },
    })
  })
}

module.exports = {
  confirmAction,
}
