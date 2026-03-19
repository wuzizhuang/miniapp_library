import type { ApiLoanDto, PageResponse } from "../types/api";
import { request } from "./http";

export interface MyLoan {
  loanId: number;
  bookTitle: string;
  bookIsbn?: string;
  bookCover?: string;
  bookAuthorNames?: string;
  categoryName?: string;
  locationCode?: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  status: "BORROWED" | "OVERDUE" | "RETURNED" | "LOST";
  daysOverdue?: number;
  daysRemaining?: number;
  renewalCount: number;
  canRenew: boolean;
  copyId: number;
  bookId?: number;
}

function mapLoanStatus(status: ApiLoanDto["status"]): MyLoan["status"] {
  if (status === "ACTIVE") {
    return "BORROWED";
  }

  return status as MyLoan["status"];
}

function mapLoan(dto: ApiLoanDto): MyLoan {
  const canRenew = (dto.renewalCount ?? 0) < 2 && dto.status === "ACTIVE";

  return {
    loanId: dto.loanId,
    bookTitle: dto.bookTitle,
    bookIsbn: dto.bookIsbn,
    bookCover: dto.bookCoverUrl,
    bookAuthorNames: dto.bookAuthorNames,
    categoryName: dto.categoryName,
    locationCode: dto.locationCode,
    borrowDate: String(dto.borrowDate ?? "").slice(0, 10),
    dueDate: String(dto.dueDate ?? "").slice(0, 10),
    returnDate: dto.returnDate ? String(dto.returnDate).slice(0, 10) : undefined,
    status: mapLoanStatus(dto.status),
    daysOverdue: dto.daysOverdue,
    daysRemaining: dto.daysRemaining,
    renewalCount: dto.renewalCount ?? 0,
    canRenew,
    copyId: dto.copyId,
    bookId: dto.bookId,
  };
}

export const loanService = {
  async getMyLoans(): Promise<MyLoan[]> {
    const response = await request<PageResponse<ApiLoanDto>>({
      url: "/loans/my",
      query: { page: 0, size: 50 },
      auth: true,
    });

    return (response.content ?? []).map(mapLoan);
  },

  async getMyLoanHistory(): Promise<MyLoan[]> {
    const response = await request<PageResponse<ApiLoanDto>>({
      url: "/loans/history",
      query: { page: 0, size: 100 },
      auth: true,
    });

    return (response.content ?? []).map(mapLoan);
  },

  async getLoanById(loanId: number): Promise<MyLoan> {
    const response = await request<ApiLoanDto>({
      url: `/loans/${loanId}`,
      auth: true,
    });

    return mapLoan(response);
  },

  async createLoan(copyId: number): Promise<void> {
    await request<void, { copyId: number }>({
      url: "/loans",
      method: "POST",
      data: { copyId },
      auth: true,
    });
  },

  async renewLoan(loanId: number): Promise<void> {
    await request<void>({
      url: `/loans/${loanId}/renew`,
      method: "PUT",
      auth: true,
    });
  },

  async returnLoan(loanId: number): Promise<void> {
    await request<void>({
      url: `/loans/${loanId}/return`,
      method: "PUT",
      auth: true,
    });
  },
};
