/**
 * @file 环境配置文件
 * @description 微信小程序运行环境的全局配置。
 *   定义了 API 后端基础地址、自动登录开关等关键参数。
 *   在开发/演示环境中可通过微信本地存储（wx.getStorageSync）
 *   动态覆盖默认 API 地址，方便在不同后端环境间切换。
 */

/** 默认后端 API 基础地址（含端口号和 /api 前缀） */
const DEFAULT_API_BASE_URL = 'http://154.19.43.33:8089/api'

/** 是否启用自动登录（开启后页面启动时自动使用下方预设账号进行登录） */
const DEFAULT_AUTO_LOGIN_ENABLED = false

/** 自动登录使用的默认用户名 */
const DEFAULT_AUTO_LOGIN_USERNAME = 'user'

/** 自动登录使用的默认密码 */
const DEFAULT_AUTO_LOGIN_PASSWORD = 'user123'

/**
 * 去除字符串末尾多余的斜杠
 * 保证拼接路径时不会出现 "//api" 之类的问题
 * @param {string} value - 需要处理的字符串
 * @returns {string} 去除尾部斜杠后的字符串
 */
function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '')
}

/**
 * 计算实际使用的 API 基础地址：
 *   1. 优先读取微信本地存储中的 'miniapp_api_base_url' 键值
 *   2. 如果不存在则回退到 DEFAULT_API_BASE_URL
 *   3. 最终统一去除末尾斜杠
 */
const apiBaseUrl = trimTrailingSlash(
  typeof wx !== 'undefined' && wx.getStorageSync('miniapp_api_base_url')
    ? wx.getStorageSync('miniapp_api_base_url')
    : DEFAULT_API_BASE_URL,
)

/**
 * 导出全局环境配置常量
 * @property {string} API_BASE_URL             - 实际生效的 API 基础地址
 * @property {string} DEFAULT_API_BASE_URL     - 默认 API 基础地址（供运行时重置使用）
 * @property {boolean} AUTO_LOGIN_ENABLED      - 是否自动登录
 * @property {string} AUTO_LOGIN_USERNAME      - 自动登录用户名
 * @property {string} AUTO_LOGIN_PASSWORD      - 自动登录密码
 */
module.exports = {
  API_BASE_URL: apiBaseUrl,
  DEFAULT_API_BASE_URL,
  AUTO_LOGIN_ENABLED: DEFAULT_AUTO_LOGIN_ENABLED,
  AUTO_LOGIN_USERNAME: DEFAULT_AUTO_LOGIN_USERNAME,
  AUTO_LOGIN_PASSWORD: DEFAULT_AUTO_LOGIN_PASSWORD,
}
