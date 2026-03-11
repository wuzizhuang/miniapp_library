const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8089/api'
const DEFAULT_AUTO_LOGIN_ENABLED = false
const DEFAULT_AUTO_LOGIN_USERNAME = 'user'
const DEFAULT_AUTO_LOGIN_PASSWORD = 'user123'

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '')
}

const apiBaseUrl = trimTrailingSlash(
  typeof wx !== 'undefined' && wx.getStorageSync('miniapp_api_base_url')
    ? wx.getStorageSync('miniapp_api_base_url')
    : DEFAULT_API_BASE_URL,
)

module.exports = {
  API_BASE_URL: apiBaseUrl,
  DEFAULT_API_BASE_URL,
  AUTO_LOGIN_ENABLED: DEFAULT_AUTO_LOGIN_ENABLED,
  AUTO_LOGIN_USERNAME: DEFAULT_AUTO_LOGIN_USERNAME,
  AUTO_LOGIN_PASSWORD: DEFAULT_AUTO_LOGIN_PASSWORD,
}
