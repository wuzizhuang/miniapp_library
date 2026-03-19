import type { RootStackParamList } from "../../navigation/types";

export type HomeQuickLink =
  | "BooksTab"
  | "Shelf"
  | "Reservations"
  | "Notifications"
  | "HelpFeedback";

export const homeQuickLinkItems: Array<{
  label: string;
  target: HomeQuickLink;
}> = [
  { label: "馆藏目录", target: "BooksTab" },
  { label: "我的书架", target: "Shelf" },
  { label: "我的预约", target: "Reservations" },
  { label: "我的通知", target: "Notifications" },
  { label: "帮助反馈", target: "HelpFeedback" },
];

export type HomeStackTarget = Exclude<HomeQuickLink, "BooksTab">;
