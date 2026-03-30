/**
 * @file 本地存储工具模块
 * @description 封装微信本地存储（wx.*StorageSync）的读写操作，
 *   统一管理用户会话中需要持久化的三类数据：
 *     1. 访问令牌（Access Token）     — 用于接口鉴权
 *     2. 刷新令牌（Refresh Token）    — 用于自动续签会话
 *     3. 当前登录用户信息（User 对象） — 用于页面展示和逻辑判断
 *
 *   所有 key 均以 "miniapp_" 前缀开头，避免与其他数据冲突。
 */

// ─── 存储键名常量 ────────────────────────────────────────────────
/** 访问令牌在本地存储中的 key */
const TOKEN_KEY = 'miniapp_token'

/** 刷新令牌在本地存储中的 key */
const REFRESH_TOKEN_KEY = 'miniapp_refresh_token'

/** 用户信息对象在本地存储中的 key */
const USER_KEY = 'miniapp_user'

// ─── 访问令牌（Access Token）操作 ────────────────────────────────

/**
 * 从本地存储中获取访问令牌
 * @returns {string} 访问令牌字符串；不存在时返回空字符串
 */
function getStoredToken() {
  return wx.getStorageSync(TOKEN_KEY) || ''
}

/**
 * 将访问令牌写入本地存储
 * @param {string} token - 要存储的访问令牌
 */
function setStoredToken(token) {
  wx.setStorageSync(TOKEN_KEY, token || '')
}

/**
 * 清除本地存储中的访问令牌
 */
function clearStoredToken() {
  wx.removeStorageSync(TOKEN_KEY)
}

// ─── 刷新令牌（Refresh Token）操作 ────────────────────────────────

/**
 * 从本地存储中获取刷新令牌
 * @returns {string} 刷新令牌字符串；不存在时返回空字符串
 */
function getStoredRefreshToken() {
  return wx.getStorageSync(REFRESH_TOKEN_KEY) || ''
}

/**
 * 将刷新令牌写入本地存储
 * @param {string} token - 要存储的刷新令牌
 */
function setStoredRefreshToken(token) {
  wx.setStorageSync(REFRESH_TOKEN_KEY, token || '')
}

/**
 * 清除本地存储中的刷新令牌
 */
function clearStoredRefreshToken() {
  wx.removeStorageSync(REFRESH_TOKEN_KEY)
}

// ─── 用户信息（User）操作 ────────────────────────────────────────

/**
 * 从本地存储中获取当前登录用户的信息对象
 * @returns {Object|null} 用户信息对象；不存在时返回 null
 */
function getStoredUser() {
  return wx.getStorageSync(USER_KEY) || null
}

/**
 * 将用户信息对象写入本地存储
 * @param {Object|null} user - 要存储的用户信息对象
 */
function setStoredUser(user) {
  wx.setStorageSync(USER_KEY, user || null)
}

/**
 * 清除本地存储中的用户信息
 */
function clearStoredUser() {
  wx.removeStorageSync(USER_KEY)
}

// ─── 批量清除 ─────────────────────────────────────────────────────

/**
 * 一次性清除所有会话相关的本地存储数据（令牌 + 用户信息）
 * 典型场景：用户退出登录、会话过期后被强制踢出
 */
function clearSessionStorage() {
  clearStoredToken()
  clearStoredRefreshToken()
  clearStoredUser()
}

// ─── 模块导出 ─────────────────────────────────────────────────────
module.exports = {
  getStoredToken,
  setStoredToken,
  clearStoredToken,
  getStoredRefreshToken,
  setStoredRefreshToken,
  clearStoredRefreshToken,
  getStoredUser,
  setStoredUser,
  clearStoredUser,
  clearSessionStorage,
}
