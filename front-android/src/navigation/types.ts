import type { NavigatorScreenParams } from "@react-navigation/native";

export type MainTabParamList = {
  HomeTab: undefined;
  BooksTab: { presetKeyword?: string } | undefined;
  MyTab: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  BookDetail: { bookId: number };
  Shelf: undefined;
  LoanTracking: { loanId: number };
  Reservations: { highlightId?: number } | undefined;
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
