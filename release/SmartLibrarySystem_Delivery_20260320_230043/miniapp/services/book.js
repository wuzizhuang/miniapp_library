/**
 * @file 图书服务模块
 * @description 处理图书相关的 API 调用：
 *   - 获取图书列表（支持关键词搜索、按分类筛选）
 *   - 获取单本图书详情
 *   - 获取图书分类列表
 *
 *   返回的数据经过 mapBook() 标准化处理，
 *   将后端 DTO 转换为前端页面所需的统一格式。
 */

const { request } = require('../utils/request')

/**
 * 将后端图书 DTO 映射为前端统一的图书对象
 *
 * 主要处理：
 *   - 字段重命名（如 publishedYear → publishYear）
 *   - 空值兜底（isbn 默认空字符串、拷贝数默认 0 等）
 *   - 派生字段（categoryNames 从单个 categoryName 转为数组）
 *   - 作者名列表提取（从 authors 对象数组 → 字符串数组）
 *
 * @param {Object} dto - 后端返回的图书数据对象
 * @returns {Object} 前端图书对象
 */
function mapBook(dto) {
  return {
    bookId: dto.bookId,                                          // 图书 ID
    isbn: dto.isbn || '',                                        // ISBN 编号
    title: dto.title,                                            // 书名
    coverUrl: dto.coverUrl,                                      // 封面图片 URL
    resourceMode: dto.resourceMode,                              // 资源模式（纸质/电子/混合）
    onlineAccessUrl: dto.onlineAccessUrl,                        // 在线阅读链接
    onlineAccessType: dto.onlineAccessType,                      // 在线阅读类型
    description: dto.description,                                // 图书简介
    language: dto.language,                                      // 语言
    publishYear: dto.publishedYear,                              // 出版年份
    publisherName: dto.publisherName,                            // 出版社名称
    categoryId: dto.categoryId,                                  // 分类 ID
    categoryName: dto.categoryName,                              // 分类名称
    categoryNames: dto.categoryName ? [dto.categoryName] : [],   // 分类名称数组（兼容多分类场景）
    authorNames: (dto.authors || []).map((item) => item.name),   // 作者名列表
    inventoryCount: dto.totalCopies || dto.availableCopies || 0, // 总库存数量
    availableCount: dto.availableCopies || 0,                    // 可借数量
    availableCopies: dto.availableCopies || 0,                   // 可借副本数（冗余，保持兼容）
    totalCopies: dto.totalCopies || dto.availableCopies || 0,    // 总副本数
    avgRating: dto.avgRating,                                    // 平均评分
    reviewCount: dto.reviewCount,                                // 评价数量
  }
}

// ─── 图书服务对象 ────────────────────────────────────────────────

const bookService = {
  /**
   * 获取图书列表
   *
   * 会根据传入参数自动选择不同的 API 接口：
   *   1. 有 keyword → 走搜索接口 /books/search
   *   2. 有 categoryId → 走分类接口 /books/category/{id}
   *   3. 都没有 → 走全量列表接口 /books
   *
   * @param {Object} params - 查询参数
   * @param {string} [params.keyword]    - 搜索关键词
   * @param {number} [params.categoryId] - 分类 ID
   * @param {number} [params.page=0]     - 页码
   * @param {number} [params.size=60]    - 每页数量
   * @returns {Promise<Object[]>} 图书对象数组
   */
  async getBooks(params) {
    const query = params || {}
    const keyword = query.keyword && String(query.keyword).trim()
    const page = query.page || 0
    const size = query.size || 60

    // 关键词搜索
    if (keyword) {
      const response = await request({
        url: '/books/search',
        query: {
          keyword,
          page,
          size,
          categoryId: query.categoryId,
        },
      })

      return (response.content || []).map(mapBook)
    }

    // 按分类筛选
    if (query.categoryId) {
      const response = await request({
        url: `/books/category/${query.categoryId}`,
        query: { page, size },
      })

      return (response.content || []).map(mapBook)
    }

    // 全量列表
    const response = await request({
      url: '/books',
      query: { page, size },
    })

    return (response.content || []).map(mapBook)
  },

  /**
   * 根据 ID 获取单本图书详情
   * @param {number} bookId - 图书 ID
   * @returns {Promise<Object>} 图书对象
   */
  async getBookById(bookId) {
    const response = await request({
      url: `/books/${bookId}`,
    })

    return mapBook(response)
  },

  /**
   * 获取所有图书分类列表
   * @returns {Promise<Object[]>} 分类数组 [{ categoryId, categoryName, ... }]
   */
  async getCategories() {
    const response = await request({
      url: '/categories',
      query: { page: 0, size: 100 },   // 一次性拉取全部分类
    })

    return response.content || []
  },
}

module.exports = {
  bookService,
}
