const TOKEN_KEY = 'miniapp_token'
const USER_KEY = 'miniapp_user'

function getStoredToken() {
  return wx.getStorageSync(TOKEN_KEY) || ''
}

function setStoredToken(token) {
  wx.setStorageSync(TOKEN_KEY, token || '')
}

function clearStoredToken() {
  wx.removeStorageSync(TOKEN_KEY)
}

function getStoredUser() {
  return wx.getStorageSync(USER_KEY) || null
}

function setStoredUser(user) {
  wx.setStorageSync(USER_KEY, user || null)
}

function clearStoredUser() {
  wx.removeStorageSync(USER_KEY)
}

function clearSessionStorage() {
  clearStoredToken()
  clearStoredUser()
}

module.exports = {
  getStoredToken,
  setStoredToken,
  clearStoredToken,
  getStoredUser,
  setStoredUser,
  clearStoredUser,
  clearSessionStorage,
}
