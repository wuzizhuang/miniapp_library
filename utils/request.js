const { API_BASE_URL } = require('../config/env')
const { getStoredToken, clearSessionStorage } = require('./storage')

let unauthorizedHandler = null

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

function request(options) {
  const method = options.method || 'GET'
  const token = options.tokenOverride || (options.auth ? getStoredToken() : '')

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
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
          return
        }

        if (res.statusCode === 401) {
          clearSessionStorage()

          if (typeof unauthorizedHandler === 'function') {
            try {
              unauthorizedHandler()
            } catch (handlerError) {
              console.warn('miniapp unauthorized handler failed', handlerError)
            }
          }
        }

        reject(createHttpError(res.statusCode, res.data, `Request failed with status ${res.statusCode}`))
      },
      fail(error) {
        reject(createHttpError(0, error, 'Network request failed'))
      },
    })
  })
}

function registerUnauthorizedHandler(handler) {
  unauthorizedHandler = handler || null
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
  isUnauthorizedError,
  getErrorMessage,
}
