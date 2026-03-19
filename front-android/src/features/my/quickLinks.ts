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
  screen: MyQuickLinkScreen;
}> = [
  { label: "我的书架", screen: "Shelf" },
  { label: "我的预约", screen: "Reservations" },
  { label: "我的评论", screen: "Reviews" },
  { label: "搜索历史", screen: "SearchHistory" },
  { label: "我的罚款", screen: "Fines" },
  { label: "我的通知", screen: "Notifications" },
  { label: "帮助与反馈", screen: "HelpFeedback" },
  { label: "个人资料", screen: "Profile" },
  { label: "服务预约", screen: "Appointments" },
  { label: "座位预约", screen: "SeatReservations" },
  { label: "推荐动态", screen: "Recommendations" },
];
