const { API_BASE_URL } = require('../config/env')
const { getStoredToken, clearSessionStorage } = require('./storage')

let unauthorizedHandler = null
let tokenRefreshHandler = null

function buildUrl(path, query) {
  const url = `${API_BASE_URL}${path}`

  if (!query) {
    return url
  }

  const queryString = Object.keys(query)
    .filter((key) => query[key] !== undefined && query[key] !== null && query[key] !== '')
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(query[key]))}`)
    .join('&')

  return queryString ? `${url}?${queryString}` : url
}

function parseErrorMessage(payload, fallback) {
  if (!payload || typeof payload !== 'object') {
    return fallback
  }

  return payload.message || payload.error || fallback
}

function createHttpError(statusCode, payload, fallbackMessage) {
  const error = new Error(parseErrorMessage(payload, fallbackMessage))
  error.name = 'HttpError'
  error.statusCode = statusCode
  error.payload = payload

  return error
}

function executeRequest(options, token) {
  const method = options.method || 'GET'

  return new Promise((resolve, reject) => {
    wx.request({
      url: buildUrl(options.url, options.query),
      method,
      data: options.data,
      header: {
        ...(options.data ? { 'Content-Type': 'application/json' } : {}),
        ...(options.auth && token ? { Authorization: `Bearer ${token}` } : {}),
      },
      success(res) {
        resolve(res)
      },
      fail(error) {
        reject(createHttpError(0, error, 'Network request failed'))
      },
    })
  })
}

async function request(options) {
  return performRequest(options)
}

async function performRequest(options) {
  const token = options.tokenOverride || (options.auth ? getStoredToken() : '')
  const response = await executeRequest(options, token)

  if (response.statusCode >= 200 && response.statusCode < 300) {
    return response.data
  }

  if (response.statusCode === 401 && options.auth && !options.skipAuthRefresh && typeof tokenRefreshHandler === 'function') {
    try {
      const refreshedToken = await tokenRefreshHandler()

      if (refreshedToken) {
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

  throw createHttpError(
    response.statusCode,
    response.data,
    `Request failed with status ${response.statusCode}`,
  )
}

function registerUnauthorizedHandler(handler) {
  unauthorizedHandler = handler || null
}

function registerTokenRefreshHandler(handler) {
  tokenRefreshHandler = handler || null
}

function isUnauthorizedError(error) {
  return Boolean(error && error.statusCode === 401)
}

function getErrorMessage(error, fallback) {
  if (error && error.message) {
    return error.message
  }

  return fallback || 'Request failed'
}

module.exports = {
  request,
  registerUnauthorizedHandler,
  registerTokenRefreshHandler,
  isUnauthorizedError,
  getErrorMessage,
}
