/**
 * @file 通知服务模块
 * @description 处理系统通知相关的所有功能：
 *   - 获取通知列表（分页）/ 未读数量
 *   - 标记单条已读 / 全部已读
 *   - 删除单条通知 / 清除所有已读通知
 *   - 解析通知的跳转目标页面（深度链接）
 *   - 生成通知操作按钮的文案
 *
 *   通知类型包括：借阅到期提醒、预约到书、新书推荐、
 *   罚款通知、反馈回复、服务预约更新、座位预约更新等。
 */

const { request } = require('../utils/request')

/**
 * 将后端通知 DTO 映射为前端统一的通知对象
 * @param {Object} dto - 后端通知数据
 * @returns {Object} 前端通知对象
 */
function mapNotification(dto) {
  return {
    notificationId: dto.notificationId,     // 通知 ID
    title: dto.title,                       // 通知标题
    content: dto.content,                   // 通知正文
    type: dto.type,                         // 通知类型（如 DUE_REMINDER / ARRIVAL_NOTICE）
    isRead: dto.isRead,                     // 是否已读
    createTime: dto.sendTime,               // 发送时间
    relatedEntityId: dto.relatedEntityId,   // 关联实体 ID
    targetType: dto.targetType,             // 目标实体类型（LOAN / RESERVATION / FINE 等）
    targetId: dto.targetId,                 // 目标实体 ID（用于跳转定位）
    routeHint: dto.routeHint,               // 路由提示（后端直接给出的跳转路径）
    businessKey: dto.businessKey,           // 业务标识键
  }
}

// ─── 跳转目标解析工具 ────────────────────────────────────────────

/**
 * 在 URL 上追加高亮参数（用于跳转后在目标页面高亮显示对应条目）
 * @param {string} basePath - 基础页面路径
 * @param {string} key      - 参数名（通常为 "highlight"）
 * @param {*}      value    - 参数值（目标 ID）
 * @returns {string} 带参数的完整路径
 */
function buildTargetWithHighlight(basePath, key, value) {
  if (!value) {
    return basePath
  }

  // 判断 URL 中是否已有查询参数
  const separator = basePath.indexOf('?') >= 0 ? '&' : '?'

  return `${basePath}${separator}${key}=${encodeURIComponent(String(value))}`
}

/**
 * 根据通知内容解析跳转目标页面路径
 *
 * 解析优先级（从高到低）：
 *   1. targetType 精确匹配 → 跳转到对应业务页面
 *   2. routeHint（后端提供的路由提示）
 *   3. type 类型匹配（如 ARRIVAL_NOTICE / DUE_REMINDER）
 *   4. 文本关键词模糊匹配（标题 + 内容中搜索"罚款"、"反馈"等关键词）
 *   5. 以上都无法匹配 → 返回 null
 *
 * @param {Object} notification - 通知对象
 * @returns {string|null} 跳转路径，或 null
 */
function resolveNotificationTarget(notification) {
  if (!notification) {
    return null
  }

  // ── 按 targetType 精确解析 ──

  // 推荐动态
  if (notification.targetType === 'RECOMMENDATION') {
    return buildTargetWithHighlight(
      '/pages/my/recommendations/index',
      'highlight',
      notification.targetId,
    )
  }

  // 借阅相关
  if (notification.targetType === 'LOAN') {
    return notification.targetId
      ? `/pages/my/loan-tracking/index?loanId=${encodeURIComponent(
          String(notification.targetId),
        )}`
      : '/pages/my/shelf/index'
  }

  // 预约相关
  if (notification.targetType === 'RESERVATION') {
    return buildTargetWithHighlight(
      '/pages/my/reservations/index',
      'highlight',
      notification.targetId,
    )
  }

  // 服务预约
  if (notification.targetType === 'SERVICE_APPOINTMENT') {
    return buildTargetWithHighlight(
      '/pages/my/appointments/index',
      'highlight',
      notification.targetId,
    )
  }

  // 座位预约
  if (notification.targetType === 'SEAT_RESERVATION') {
    return buildTargetWithHighlight(
      '/pages/my/seat-reservations/index',
      'highlight',
      notification.targetId,
    )
  }

  // 罚款
  if (notification.targetType === 'FINE') {
    return buildTargetWithHighlight(
      '/pages/my/fines/index',
      'highlight',
      notification.targetId,
    )
  }

  // 反馈
  if (notification.targetType === 'FEEDBACK') {
    return buildTargetWithHighlight(
      '/pages/help-feedback/index',
      'highlight',
      notification.targetId,
    )
  }

  // ── 按 routeHint 解析 ──

  if (notification.routeHint) {
    // 特殊处理：/my/seats → 座位预约页面
    if (notification.routeHint === '/my/seats') {
      return buildTargetWithHighlight(
        '/pages/my/seat-reservations/index',
        'highlight',
        notification.targetId,
      )
    }

    return notification.routeHint
  }

  // ── 按通知 type 解析 ──

  if (notification.type === 'ARRIVAL_NOTICE') {
    return '/pages/my/reservations/index'   // 预约到书通知
  }

  if (notification.type === 'NEW_BOOK_RECOMMEND') {
    return buildTargetWithHighlight(
      '/pages/my/recommendations/index',
      'highlight',
      notification.targetId,
    )
  }

  if (notification.type === 'DUE_REMINDER') {
    return notification.targetId
      ? `/pages/my/loan-tracking/index?loanId=${encodeURIComponent(
          String(notification.targetId),
        )}`
      : '/pages/my/shelf/index'
  }

  // ── 按文本关键词模糊匹配 ──

  const joinedText = `${notification.title || ''} ${notification.content || ''}`

  if (joinedText.indexOf('罚款') >= 0) {
    return '/pages/my/fines/index'
  }

  if (joinedText.indexOf('反馈') >= 0) {
    return '/pages/help-feedback/index'
  }

  if (joinedText.indexOf('预约') >= 0) {
    return '/pages/my/reservations/index'
  }

  if (joinedText.indexOf('借阅') >= 0) {
    return notification.targetId
      ? `/pages/my/loan-tracking/index?loanId=${encodeURIComponent(
          String(notification.targetId),
        )}`
      : '/pages/my/shelf/index'
  }

  // 无法解析 → 返回 null（页面不显示跳转按钮）
  return null
}

/**
 * 根据通知类型生成操作按钮的中文文案
 *
 * 例如：推荐类通知 → "查看推荐"，罚款类通知 → "查看罚款"
 *
 * @param {Object} notification - 通知对象
 * @returns {string} 按钮文案
 */
function getNotificationActionLabel(notification) {
  if (!notification) {
    return '查看相关'
  }

  const targetType = notification && notification.targetType
  const joinedText = `${notification && notification.title ? notification.title : ''} ${
    notification && notification.content ? notification.content : ''
  }`

  if (targetType === 'RECOMMENDATION' || notification.type === 'NEW_BOOK_RECOMMEND') {
    return '查看推荐'
  }

  if (targetType === 'RESERVATION' || notification.type === 'ARRIVAL_NOTICE') {
    return '查看预约'
  }

  if (targetType === 'SERVICE_APPOINTMENT') {
    return '查看服务预约'
  }

  if (targetType === 'SEAT_RESERVATION') {
    return '查看座位预约'
  }

  if (targetType === 'FINE' || joinedText.indexOf('罚款') >= 0) {
    return '查看罚款'
  }

  if (targetType === 'LOAN' || notification.type === 'DUE_REMINDER') {
    return '查看借阅'
  }

  if (targetType === 'FEEDBACK' || joinedText.indexOf('反馈') >= 0) {
    return '查看反馈'
  }

  return '查看相关'   // 默认文案
}

// ─── 通知服务对象 ────────────────────────────────────────────────

const notificationService = {
  /**
   * 分页获取通知列表
   * @param {number} [page=0]  - 页码
   * @param {number} [size=20] - 每页数量
   * @returns {Promise<Object>} 分页响应，content 已经过 mapNotification 处理
   */
  async getNotificationsPage(page, size) {
    const response = await request({
      url: '/notifications',
      query: {
        page: page || 0,
        size: size || 20,
      },
      auth: true,
    })

    return {
      ...response,
      content: (response.content || []).map(mapNotification),
    }
  },

  /**
   * 获取未读通知数量
   * @returns {Promise<number>} 未读数
   */
  getUnreadCount() {
    return request({
      url: '/notifications/unread-count',
      auth: true,
    }).then((value) => (typeof value === 'number' ? value : 0))
  },

  /**
   * 标记单条通知为已读
   * @param {number} notificationId - 通知 ID
   * @returns {Promise<Object>}
   */
  markRead(notificationId) {
    return request({
      url: `/notifications/${notificationId}/read`,
      method: 'PUT',
      auth: true,
    })
  },

  /**
   * 标记所有通知为已读
   * @returns {Promise<Object>}
   */
  markAllRead() {
    return request({
      url: '/notifications/read-all',
      method: 'PUT',
      auth: true,
    })
  },

  /**
   * 删除单条通知
   * @param {number} notificationId - 通知 ID
   * @returns {Promise<Object>}
   */
  deleteNotification(notificationId) {
    return request({
      url: `/notifications/${notificationId}`,
      method: 'DELETE',
      auth: true,
    })
  },

  /**
   * 删除所有已读通知（批量清理）
   * @returns {Promise<Object>}
   */
  deleteAllRead() {
    return request({
      url: '/notifications/read',
      method: 'DELETE',
      auth: true,
    })
  },
}

module.exports = {
  notificationService,
  resolveNotificationTarget,    // 解析通知跳转目标
  getNotificationActionLabel,   // 获取通知操作按钮文案
}
