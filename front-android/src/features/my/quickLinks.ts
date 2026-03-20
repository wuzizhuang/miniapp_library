export type MyQuickLinkScreen =
  | "Shelf"
  | "Reservations"
  | "Reviews"
  | "SearchHistory"
  | "Fines"
  | "Notifications"
  | "HelpFeedback"
  | "Profile"
  | "Appointments"
  | "SeatReservations"
  | "Recommendations";

export const myQuickLinkItems: Array<{
  label: string;
  description: string;
  icon: string;
  screen: MyQuickLinkScreen;
}> = [
  { label: "我的书架", description: "查看收藏与借阅记录", icon: "bookmark-box-multiple-outline", screen: "Shelf" },
  { label: "我的预约", description: "处理排队和待取图书", icon: "calendar-clock-outline", screen: "Reservations" },
  { label: "我的评论", description: "回看已发布书评", icon: "comment-text-outline", screen: "Reviews" },
  { label: "搜索历史", description: "继续上次检索路径", icon: "history", screen: "SearchHistory" },
  { label: "我的罚款", description: "查看待处理费用", icon: "cash-lock", screen: "Fines" },
  { label: "我的通知", description: "阅读业务提醒和消息", icon: "bell-badge-outline", screen: "Notifications" },
  { label: "帮助与反馈", description: "提交建议或问题", icon: "message-alert-outline", screen: "HelpFeedback" },
  { label: "个人资料", description: "管理账号与院系信息", icon: "account-cog-outline", screen: "Profile" },
  { label: "服务预约", description: "预约取书或咨询服务", icon: "desk-lamp", screen: "Appointments" },
  { label: "座位预约", description: "管理自习座位时段", icon: "seat-outline", screen: "SeatReservations" },
  { label: "推荐动态", description: "查看读者推荐内容", icon: "star-box-outline", screen: "Recommendations" },
];
