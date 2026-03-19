// utils/shelfUtils.ts
import { Book } from "@/types/shelf";

/**
 * 核心算法：计算书籍的剩余天数、状态颜色和罚金
 */
export const enrichBookData = (book: Book): Book => {
  const today = new Date();
  const due = new Date(book.dueDate);

  // 计算时间差 (毫秒转天数)
  const diffTime = due.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let status = "借阅中";
  let statusColor = "bg-emerald-100 text-emerald-600";
  let fineAmount = 0;

  if (daysLeft < 0) {
    status = "已逾期";
    statusColor = "bg-rose-100 text-rose-600";
    // 假设罚金规则：逾期一天罚 1 元
    fineAmount = Math.abs(daysLeft) * 1.0;
  } else if (daysLeft <= 3) {
    status = "即将到期";
    statusColor = "bg-amber-100 text-amber-600";
  }

  return { ...book, daysLeft, status, statusColor, fineAmount };
};

/**
 * 获取预约日期的限制范围 (今天 ~ 未来7天)
 */
export const getDateLimits = () => {
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  return {
    min: today.toISOString().split("T")[0],
    max: nextWeek.toISOString().split("T")[0],
  };
};
