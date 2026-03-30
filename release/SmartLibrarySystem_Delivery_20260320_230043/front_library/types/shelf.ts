// types/shelf.ts

// 视图模式：列表 vs 网格
export type ViewMode = "list" | "grid";

// 筛选类型：全部 | 借阅中 | 已逾期
export type FilterType = "all" | "active" | "overdue";

// 弹窗类型：无 | 缴纳罚金 | 预约还书
export type ModalType = "none" | "payFine" | "scheduleReturn";

// 书籍数据模型接口
export interface Book {
  id: number;
  title: string;
  author: string;
  cover: string; // 封面图片URL
  category: string; // 分类
  borrowDate: string; // 借阅日期 (YYYY-MM-DD)
  dueDate: string; // 到期日期 (YYYY-MM-DD)
  renewCount: number; // 当前已续借次数
  maxRenew: number; // 最大允许续借次数 (通常为1)

  // --- 以下字段由前端动态计算，后端只需传基础数据 ---
  daysLeft?: number; // 剩余天数
  status?: string; // 状态文本 (借阅中/已逾期)
  statusColor?: string; // 状态对应的 Tailwind 颜色类
  fineAmount?: number; // 产生的罚金金额
}
