/**
 * @file 公共数据服务模块
 * @description 获取不需要登录即可访问的公共数据。
 *   目前仅提供首页数据接口。
 */

const { request } = require('../utils/request')

const publicService = {
  /**
   * 获取首页展示数据
   * 通常包含推荐图书、公告信息等
   * @returns {Promise<Object>} 首页数据对象
   */
  getHomePage() {
    return request({
      url: '/public/home',
    })
  },
}

module.exports = {
  publicService,
}
