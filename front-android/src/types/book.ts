/**
 * @file 图书相关类型定义
 * @description 定义图书领域的前端数据模型：
 *   - Book：图书视图模型
 *   - BookSearchSort：搜索排序枚举
 *   - BookListQuery：搜索查询参数
 *   - PagedResult：通用分页结果
 *   - CategoryOption：分类选项
 */

/** 图书视图模型 */
export interface Book {
  bookId: number;                // 图书 ID
  title: string;                 // 标题
  isbn: string;                  // ISBN
  coverUrl?: string;             // 封面 URL
  description?: string;          // 简介
  publisherName?: string;        // 出版社名称
  categoryId?: number;           // 分类 ID
  categoryName?: string;         // 分类名称
  categoryNames?: string[];      // 所属分类名称列表（多分类场景）
  authorNames: string[];         // 作者名称列表
  language?: string;             // 语言
  publishedYear?: number;        // 出版年份
  availableCopies: number;       // 可借副本数
  totalCopies: number;           // 总副本数
  pendingReservationCount: number;  // 等待中的预约数
  resourceMode?: "PHYSICAL_ONLY" | "DIGITAL_ONLY" | "HYBRID";  // 资源模式
  onlineAccessUrl?: string;      // 在线访问 URL
  onlineAccessType?: "OPEN_ACCESS" | "CAMPUS_ONLY" | "LICENSED_ACCESS";  // 在线访问类型
  avgRating?: number;            // 平均评分
  reviewCount?: number;          // 评论数
  inventoryCount?: number;       // 库存数量
}

/** 图书搜索排序枚举 */
export type BookSearchSort = "RELEVANCE" | "AVAILABILITY" | "POPULARITY" | "NEWEST";

/** 图书列表查询参数 */
export interface BookListQuery {
  keyword?: string;              // 搜索关键词
  title?: string;                // 按标题搜索
  author?: string;               // 按作者搜索
  publisher?: string;            // 按出版社搜索
  categoryId?: number;           // 按分类筛选
  availableOnly?: boolean;       // 仅显示可借
  page?: number;                 // 页码（0-indexed）
  size?: number;                 // 每页数量
  sortBy?: string;               // 排序字段
  direction?: "ASC" | "DESC";    // 排序方向
  sort?: BookSearchSort;         // 搜索排序方式
}

/** 通用分页结果 */
export interface PagedResult<T> {
  items: T[];                    // 当前页数据
  totalElements: number;         // 总数据量
  totalPages: number;            // 总页数
  page: number;                  // 当前页码
  size: number;                  // 每页大小
}

/** 分类选项（用于筛选器下拉列表） */
export interface CategoryOption {
  categoryId: number;            // 分类 ID
  name: string;                  // 分类名称
}
