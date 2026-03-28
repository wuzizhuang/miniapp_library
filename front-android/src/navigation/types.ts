/**
 * @file 导航参数类型定义
 * @description 定义整个应用的导航层级结构和路由参数类型。
 *
 *   导航结构：
 *   RootStack（原生栈导航器）
 *   ├── MainTabs（底部 Tab 导航器）
 *   │   ├── HomeTab  - 首页
 *   │   ├── BooksTab - 图书目录（可传入预设关键词）
 *   │   └── MyTab    - 我的
 *   ├── Login / Register / ForgotPassword - 认证相关
 *   ├── BookDetail   - 图书详情（需传入 bookId）
 *   ├── Shelf        - 我的书架
 *   ├── LoanTracking - 借阅追踪（需传入 loanId）
 *   ├── Reservations - 我的预约
 *   ├── Fines        - 我的罚款
 *   ├── Notifications - 我的通知
 *   ├── HelpFeedback - 帮助与反馈
 *   ├── Profile      - 个人资料
 *   ├── Appointments - 服务预约
 *   ├── SeatReservations - 座位预约
 *   ├── Recommendations - 推荐动态
 *   ├── Reviews      - 我的评论
 *   └── SearchHistory - 搜索历史
 */

import type { NavigatorScreenParams } from "@react-navigation/native";

/** 底部 Tab 导航器参数列表 */
export type MainTabParamList = {
  HomeTab: undefined;
  BooksTab: { presetKeyword?: string } | undefined;  // 可选预设搜索关键词
  MyTab: undefined;
};

/** 根栈导航器参数列表 */
export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  BookDetail: { bookId: number };                        // 图书详情（必传 bookId）
  Shelf: undefined;
  LoanTracking: { loanId: number };                      // 借阅追踪（必传 loanId）
  Reservations: { highlightId?: number } | undefined;    // 可选高亮指定预约
  Fines: { highlightId?: number } | undefined;
  Notifications: undefined;
  HelpFeedback: { highlightId?: number } | undefined;
  Profile: undefined;
  Appointments: { highlightId?: number } | undefined;
  Recommendations: { highlightId?: number } | undefined;
  SeatReservations: { highlightId?: number } | undefined;
  Reviews: undefined;
  SearchHistory: undefined;
};
