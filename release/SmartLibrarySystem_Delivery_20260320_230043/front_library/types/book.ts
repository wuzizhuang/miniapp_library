// types/book.ts
// UI 组件与 Service 层共用的类型定义

export type ViewMode = "list" | "grid";
export type FilterType = "all" | "active" | "overdue";
export type ModalType = "none" | "payFine" | "scheduleReturn";

/**
 * 图书类型（与后端 BookDetailDto 字段对应，Service 层负责字段映射）
 */
export interface Book {
  bookId: number;
  isbn: string;
  title: string;
  description?: string;
  /** 封面图片 URL（后端字段 coverUrl） */
  coverUrl?: string;
  resourceMode?: "PHYSICAL_ONLY" | "DIGITAL_ONLY" | "HYBRID";
  onlineAccessUrl?: string;
  onlineAccessType?: "OPEN_ACCESS" | "CAMPUS_ONLY" | "LICENSED_ACCESS";
  language?: string;
  publishYear?: number;

  // 关联信息（Service 层负责从后端 DTO 转换）
  publisherName?: string;
  categoryId?: number;
  /** 分类名称列表（后端返回单个 categoryName，Service 层包装为数组） */
  categoryNames: string[];
  /** 作者名称列表（后端返回 authors[{name}]，Service 层提取为字符串数组） */
  authorNames: string[];

  // 库存信息
  inventoryCount?: number;
  /** 在馆可借数量（后端字段 availableCopies，Service 层重命名） */
  availableCount: number;

  status?: "AVAILABLE" | "OUT_OF_STOCK";
}

export interface Author {
  authorId: number;
  name: string;
  bio?: string;
}

export interface Category {
  categoryId: number | string;
  name: string;
  description?: string;
}

export interface Publisher {
  publisherId: number;
  name: string;
  address?: string;
}

export interface BookQueryParams {
  keyword?: string;
  categoryId?: number;
  page?: number;
  size?: number;
}

