const { request } = require('../utils/request')

const publicService = {
  getHomePage() {
    return request({
      url: '/public/home',
    })
  },
}

module.exports = {
  publicService,
}
