export interface UserOverviewLoan {
  loanId: number;
  bookId: number;
  bookTitle: string;
  dueDate: string;
  daysRemaining: number;
  status: string;
}

export interface UserOverview {
  userId: number;
  username: string;
  fullName?: string;
  activeLoanCount: number;
  dueSoonLoanCount: number;
  dueSoonLoans: UserOverviewLoan[];
  activeReservationCount: number;
  readyReservationCount: number;
  pendingFineCount: number;
  pendingFineTotal: number;
  unreadNotificationCount: number;
  favoriteCount: number;
  pendingServiceAppointmentCount: number;
  completedServiceAppointmentCount: number;
}

