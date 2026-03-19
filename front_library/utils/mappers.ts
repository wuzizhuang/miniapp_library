// =============================================================================
// FILE: frontend/utils/mappers.ts
// DESCRIPTION: 数据转换层 (Data Transformation Layer)
// 作用：将后端 DTO 转换为 UI 组件所需的 ViewModel，实现前后端解耦。
// =============================================================================

import { ApiBookDto, ApiLoanDto } from "@/types/api";

// --- 1. 定义前端 UI 需要的数据结构 (ViewModel) ---
// 你可以把这些类型移到 types/index.ts，但为了方便，暂时放在这里

/**
 * UI展示用的图书对象 (对应 BookCard)
 */
export interface LibraryItem {
  id: number;
  title: string;
  coverUrl: string;
  rating: number; // 后端没有评分，前端为了好看需要这个字段
  status: "available" | "unavailable"; // UI 状态
  publisher: string;
  format: string; // "Hardcover", "Paperback" 等
  categories: string[];
  author: string; // 拼接后的作者名
  description: string;
}

/**
 * UI展示用的借阅记录 (对应“我的书架”)
 */
export interface LoanItem {
  id: number; // 借阅记录ID
  bookId: number; // 书籍ID
  bookTitle: string;
  coverUrl: string;
  loanDate: string;
  dueDate: string;
  daysLeft: number; // 动态计算
  isOverdue: boolean;
  statusText: string; // 中文状态文本
  statusColor: "success" | "danger" | "warning" | "default"; // UI 颜色
}

// --- 2. 辅助函数 (Helpers) ---

/**
 * 计算两个日期相差的天数
 */
const getDaysDiff = (targetDate: string): number => {
  const today = new Date();
  const target = new Date(targetDate);

  // 重置时间部分，只比较日期
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();

  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * 生成默认封面图 (使用 Placehold.co)
 */
const getDefaultCover = (title: string) => {
  const encodedTitle = encodeURIComponent(title.substring(0, 20)); // 防止太长

  return `https://placehold.co/400x600/e2e8f0/1e293b?text=${encodedTitle}`;
};

// --- 3. 转换函数 (Mappers) ---

/**
 * 将后端 BookDto 转换为 UI LibraryItem
 */
export const mapBookToUi = (dto: ApiBookDto): LibraryItem => {
  const isAvailable = (dto.availableCopies || 0) > 0;
  const authorNames = dto.authors?.map((author) => author.name) || [];

  return {
    id: dto.bookId, // 映射 bookId -> id
    title: dto.title,

    // 图片降级处理
    coverUrl:
      dto.coverUrl && dto.coverUrl.startsWith("http")
        ? dto.coverUrl
        : getDefaultCover(dto.title),

    rating: 4.5, // 暂时写死，或者根据借阅量 availableCopies/totalCopies 计算热度

    status: isAvailable ? "available" : "unavailable",

    publisher: dto.publisherName || "Unknown Publisher",

    // 后端没有 format 字段，暂时给默认值
    format: "Standard",

    // 字符串转数组 (后端 DTO 返回的是 categoryName 字符串)
    categories: dto.categoryName ? [dto.categoryName] : ["General"],

    // 作者列表转字符串
    author: authorNames.length > 0 ? authorNames.join(", ") : "Unknown Author",

    description: dto.description || "No description provided.",
  };
};

/**
 * 将后端 LoanDto 转换为 UI LoanItem (我的书架)
 */
export const mapLoanToUi = (dto: ApiLoanDto): LoanItem => {
  const daysLeft = getDaysDiff(dto.dueDate);

  // 状态显示逻辑
  let statusText = "借阅中";
  let statusColor: LoanItem["statusColor"] = "success";

  if (dto.status === "OVERDUE") {
    statusText = "已逾期";
    statusColor = "danger";
  } else if (dto.status === "RETURNED") {
    statusText = "已归还";
    statusColor = "default";
  } else if (daysLeft <= 3) {
    statusText = "即将到期";
    statusColor = "warning";
  }

  return {
    id: dto.loanId,
    bookId: dto.bookId,
    bookTitle: dto.bookTitle,
    coverUrl: getDefaultCover(dto.bookTitle),
    loanDate: dto.borrowDate.split("T")[0],
    dueDate: dto.dueDate.split("T")[0],
    daysLeft: daysLeft,
    isOverdue: daysLeft < 0 && dto.status !== "RETURNED",
    statusText,
    statusColor,
  };
};
