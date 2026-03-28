/**
 * @file 离线降级代理模块
 * @description 为 libraryService 提供离线降级能力。
 *   当后端不可达（网络超时、DNS 解析失败等）时，
 *   自动回退到 mock-data.js 中的模拟数据，
 *   让小程序在无网络环境下仍可完整演示。
 *
 *   设计原则：
 *     - 页面代码无需任何改动
 *     - 只在网络错误时降级，业务逻辑错误（如 403/404）正常抛出
 *     - 写操作在演示模式下提供视觉反馈（由 mock-data 实现）
 */

const { mockData } = require('./mock-data')

/**
 * 判断错误是否为网络不可达类型
 * 通过错误消息中的关键词进行启发式判断
 *
 * @param {Error} err - 捕获到的错误对象
 * @returns {boolean} 是否为网络错误
 */
function isNetworkError(err) {
  if (!err) return false

  const msg = String(err.message || err.errMsg || err || '').toLowerCase()

  return (
    msg.includes('request:fail') ||   // 微信小程序特有的请求失败
    msg.includes('timeout') ||        // 请求超时
    msg.includes('net::') ||          // Chromium 网络错误
    msg.includes('network') ||        // 通用网络错误
    msg.includes('econnrefused') ||   // 连接被拒绝
    msg.includes('enotfound') ||      // DNS 解析失败
    msg.includes('abort') ||          // 请求被中止
    msg.includes('连接') ||           // 中文"连接"关键词
    msg.includes('fail')              // 通用失败
  )
}

/**
 * 用离线降级代理包装 libraryService 的所有方法
 *
 * 包装逻辑：
 *   1. 调用真实方法
 *   2. 如果抛出网络错误 且 mockData 中有同名方法 → 降级为模拟数据
 *   3. 如果不是网络错误 → 正常抛出让页面处理
 *
 * @param {Object} realService - 真实的 libraryService 对象
 * @returns {Object} 包装后的服务对象（接口签名不变）
 */
function wrapWithFallback(realService) {
  const wrapped = {}

  Object.keys(realService).forEach(function (key) {
    // 非函数属性直接透传
    if (typeof realService[key] !== 'function') {
      wrapped[key] = realService[key]
      return
    }

    // 函数属性 → 用 try-catch 包装
    wrapped[key] = function () {
      var args = arguments
      return realService[key].apply(realService, args)
        .catch(function (err) {
          // 网络错误 + 有对应 mock → 降级
          if (isNetworkError(err) && typeof mockData[key] === 'function') {
            console.warn(
              '[离线演示] ' + key + ' 降级为模拟数据',
              '(原因: ' + (err.message || err.errMsg || err) + ')',
            )
            return mockData[key].apply(null, args)
          }
          // 其他错误 → 原样抛出
          throw err
        })
    }
  })

  return wrapped
}

module.exports = { wrapWithFallback }
