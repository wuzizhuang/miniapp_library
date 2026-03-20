import type { RootStackParamList } from "../../navigation/types";

export type HomeQuickLink =
  | "BooksTab"
  | "Shelf"
  | "Reservations"
  | "Notifications"
  | "HelpFeedback";

export const homeQuickLinkItems: Array<{
  label: string;
  description: string;
  icon: string;
  target: HomeQuickLink;
}> = [
  { label: "馆藏目录", description: "进入联合检索与图书详情", icon: "bookshelf", target: "BooksTab" },
  { label: "我的书架", description: "查看收藏和在借图书", icon: "bookmark-box-multiple-outline", target: "Shelf" },
  { label: "我的预约", description: "跟进排队与待取状态", icon: "calendar-clock-outline", target: "Reservations" },
  { label: "我的通知", description: "集中处理提醒消息", icon: "bell-badge-outline", target: "Notifications" },
  { label: "帮助反馈", description: "提交建议和问题反馈", icon: "message-alert-outline", target: "HelpFeedback" },
];

export type HomeStackTarget = Exclude<HomeQuickLink, "BooksTab">;
