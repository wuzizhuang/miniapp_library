/**
 * Offline fallback proxy for libraryService.
 *
 * Wraps every method on the real service:
 *   1. Try the real (network) call
 *   2. If a network / timeout error occurs AND a mock is available, return mock data
 *   3. Otherwise rethrow so page‑level error handling still works for non‑network issues
 */

const { mockData } = require('./mock-data')

/**
 * Heuristic: is this error caused by network unreachability rather than
 * a business‑level API error?
 */
function isNetworkError(err) {
  if (!err) return false

  const msg = String(err.message || err.errMsg || err || '').toLowerCase()

  return (
    msg.includes('request:fail') ||
    msg.includes('timeout') ||
    msg.includes('net::') ||
    msg.includes('network') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    msg.includes('abort') ||
    msg.includes('连接') ||
    msg.includes('fail')
  )
}

/**
 * Wrap a real libraryService so that every method falls back to mock data
 * when the network is unreachable.
 */
function wrapWithFallback(realService) {
  const wrapped = {}

  Object.keys(realService).forEach(function (key) {
    if (typeof realService[key] !== 'function') {
      wrapped[key] = realService[key]
      return
    }

    wrapped[key] = function () {
      var args = arguments
      return realService[key].apply(realService, args)
        .catch(function (err) {
          if (isNetworkError(err) && typeof mockData[key] === 'function') {
            console.warn(
              '[离线演示] ' + key + ' 降级为模拟数据',
              '(原因: ' + (err.message || err.errMsg || err) + ')',
            )
            return mockData[key].apply(null, args)
          }
          throw err
        })
    }
  })

  return wrapped
}

module.exports = { wrapWithFallback }
