/**
 * @file 网络请求工具模块
 * @description 封装微信小程序的 wx.request() API，提供统一的 HTTP 请求能力。
 *   核心职责包括：
 *     1. URL 构建与查询参数序列化
 *     2. 自动附加鉴权头（Bearer Token）
 *     3. 统一处理 HTTP 状态码（2xx 成功 / 401 自动刷新令牌 / 其他抛异常）
 *     4. 全局注册「未授权处理器」和「令牌刷新处理器」供 App 层使用
 *
 *   任何页面或服务模块只需 require 本文件调用 request(options) 即可发起请求。
 */

// ─── 引入依赖 ─────────────────────────────────────────────────────
const { API_BASE_URL } = require('../config/env')            // 后端 API 基础路径
const { getStoredToken, clearSessionStorage } = require('./storage')  // 本地令牌存取

// ─── 全局回调句柄 ─────────────────────────────────────────────────
/**
 * 当请求返回 401 且无法刷新时，会调用此回调（通常用于跳转登录页）
 * @type {Function|null}
 */
let unauthorizedHandler = null

/**
 * 当请求返回 401 时，首先调用此回调尝试刷新令牌
 * 若返回新的 token，则使用新 token 重试原请求
 * @type {Function|null}
 */
let tokenRefreshHandler = null

// ─── 内部工具函数 ─────────────────────────────────────────────────

/**
 * 拼接完整的请求 URL
 * @param {string} path  - API 路径，例如 "/books/search"
 * @param {Object} query - 查询参数对象，空值会被自动过滤
 * @returns {string} 完整的请求 URL
 *
 * 示例：buildUrl('/books', { keyword: 'java', page: 0 })
 *   => "http://xxx/api/books?keyword=java&page=0"
 */
function buildUrl(path, query) {
  const url = `${API_BASE_URL}${path}`

  // 没有查询参数时直接返回
  if (!query) {
    return url
  }

  // 过滤掉 undefined / null / 空字符串，并对 key-value 进行 URI 编码
  const queryString = Object.keys(query)
    .filter((key) => query[key] !== undefined && query[key] !== null && query[key] !== '')
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(query[key]))}`)
    .join('&')

  return queryString ? `${url}?${queryString}` : url
}

/**
 * 从后端返回的 payload 中提取错误信息
 * @param {Object} payload  - 后端返回的数据对象
 * @param {string} fallback - 提取失败时的默认消息
 * @returns {string} 提取到的错误消息
 */
function parseErrorMessage(payload, fallback) {
  if (!payload || typeof payload !== 'object') {
    return fallback
  }

  return payload.message || payload.error || fallback
}

/**
 * 创建一个标准化的 HTTP 错误对象
 * @param {number} statusCode      - HTTP 状态码（网络失败时为 0）
 * @param {Object} payload         - 后端响应体
 * @param {string} fallbackMessage - 默认错误消息
 * @returns {Error} 带有 statusCode 和 payload 扩展属性的 Error 对象
 */
function createHttpError(statusCode, payload, fallbackMessage) {
  const error = new Error(parseErrorMessage(payload, fallbackMessage))
  error.name = 'HttpError'
  error.statusCode = statusCode   // 便于调用方按状态码分类处理
  error.payload = payload         // 保留原始响应体以供调试

  return error
}

/**
 * 实际执行 wx.request 的底层方法
 * @param {Object} options - 请求配置（url / method / data / query / auth）
 * @param {string} token   - 用于 Authorization 头的令牌
 * @returns {Promise<Object>} resolve 为微信原生 response 对象（含 statusCode + data）
 */
function executeRequest(options, token) {
  const method = options.method || 'GET'

  return new Promise((resolve, reject) => {
    wx.request({
      url: buildUrl(options.url, options.query),   // 完整 URL
      method,                                       // HTTP 方法
      data: options.data,                           // 请求体
      header: {
        // 有请求体时设置 Content-Type 为 JSON
        ...(options.data ? { 'Content-Type': 'application/json' } : {}),
        // 需要鉴权且 token 存在时添加 Authorization 头
        ...(options.auth && token ? { Authorization: `Bearer ${token}` } : {}),
      },
      /** 请求成功回调（注意：wx.request 的 success 并不代表 HTTP 2xx） */
      success(res) {
        resolve(res)
      },
      /** 网络级失败回调（DNS 无法解析、超时等） */
      fail(error) {
        reject(createHttpError(0, error, 'Network request failed'))
      },
    })
  })
}

// ─── 对外暴露的请求方法 ──────────────────────────────────────────

/**
 * 发起一个 HTTP 请求（对外入口）
 * @param {Object} options - 请求配置
 * @param {string} options.url             - API 路径
 * @param {string} [options.method='GET']  - HTTP 方法
 * @param {Object} [options.data]          - 请求体（JSON）
 * @param {Object} [options.query]         - URL 查询参数
 * @param {boolean} [options.auth]         - 是否需要鉴权（自动附加 token）
 * @param {string} [options.tokenOverride] - 手动传入 token（优先级最高）
 * @param {boolean} [options.skipAuthRefresh] - 是否跳过自动刷新令牌（防止递归）
 * @returns {Promise<any>} 后端返回的数据
 */
async function request(options) {
  return performRequest(options)
}

/**
 * 请求执行的核心逻辑（支持 401 自动刷新重试）
 *
 * 执行流程：
 *   1. 获取 token → 执行请求
 *   2. 2xx ⇒ 直接返回 response.data
 *   3. 401 且允许刷新 ⇒ 调用 tokenRefreshHandler 获取新 token → 重试（仅一次）
 *   4. 401 且不可恢复 ⇒ 清空会话 → 调用 unauthorizedHandler（跳登录页）
 *   5. 其他状态码 ⇒ 抛出 HttpError
 *
 * @param {Object} options - 同 request(options)
 * @returns {Promise<any>}
 */
async function performRequest(options) {
  // 确定使用的 token：手动传入 > 本地存储
  const token = options.tokenOverride || (options.auth ? getStoredToken() : '')
  const response = await executeRequest(options, token)

  // ── 2xx 成功 ──
  if (response.statusCode >= 200 && response.statusCode < 300) {
    return response.data
  }

  // ── 401 未授权 → 尝试刷新令牌 ──
  if (response.statusCode === 401 && options.auth && !options.skipAuthRefresh && typeof tokenRefreshHandler === 'function') {
    try {
      const refreshedToken = await tokenRefreshHandler()

      if (refreshedToken) {
        // 用新 token 重试一次，并标记 skipAuthRefresh 防止无限递归
        return performRequest({
          ...options,
          tokenOverride: refreshedToken,
          skipAuthRefresh: true,
        })
      }
    } catch (refreshError) {
      console.warn('miniapp token refresh failed', refreshError)
    }
  }

  // ── 401 最终不可恢复 → 清空会话并通知上层 ──
  if (response.statusCode === 401) {
    clearSessionStorage()

    if (typeof unauthorizedHandler === 'function') {
      try {
        unauthorizedHandler()
      } catch (handlerError) {
        console.warn('miniapp unauthorized handler failed', handlerError)
      }
    }
  }

  // ── 其他失败 → 抛出带状态码的异常 ──
  throw createHttpError(
    response.statusCode,
    response.data,
    `Request failed with status ${response.statusCode}`,
  )
}

// ─── 全局回调注册 ──────────────────────────────────────────────────

/**
 * 注册"未授权"全局处理器
 * 当请求最终确认 401 且刷新失败后调用，典型用途：reLaunch 到登录页
 * @param {Function|null} handler
 */
function registerUnauthorizedHandler(handler) {
  unauthorizedHandler = handler || null
}

/**
 * 注册"令牌刷新"全局处理器
 * 当首次收到 401 时，会先调用此处理器尝试用 refreshToken 获取新 accessToken
 * @param {Function|null} handler - 返回 Promise<string|null>
 */
function registerTokenRefreshHandler(handler) {
  tokenRefreshHandler = handler || null
}

// ─── 错误判断辅助 ──────────────────────────────────────────────────

/**
 * 判断给定的错误是否为 401 未授权错误
 * @param {Error} error
 * @returns {boolean}
 */
function isUnauthorizedError(error) {
  return Boolean(error && error.statusCode === 401)
}

/**
 * 安全地提取错误消息字符串
 * @param {Error} error    - 错误对象
 * @param {string} fallback - 默认消息
 * @returns {string}
 */
function getErrorMessage(error, fallback) {
  if (error && error.message) {
    return error.message
  }

  return fallback || 'Request failed'
}

// ─── 模块导出 ──────────────────────────────────────────────────────
module.exports = {
  request,                        // 发起 HTTP 请求（主入口）
  registerUnauthorizedHandler,    // 注册 401 处理回调
  registerTokenRefreshHandler,    // 注册令牌刷新回调
  isUnauthorizedError,            // 判断是否为 401 错误
  getErrorMessage,                // 提取错误消息
}
