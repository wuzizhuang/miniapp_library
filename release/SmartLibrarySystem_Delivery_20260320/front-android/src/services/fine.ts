import type { ApiFineDto, PageResponse } from "../types/api";
import { request } from "./http";

export type FineStatus = "PENDING" | "PAID" | "WAIVED";
export type FineType = "OVERDUE" | "LOST" | "DAMAGE";

export interface MyFine {
  fineId: number;
  loanId?: number;
  bookTitle?: string;
  amount: number;
  status: FineStatus;
  type: FineType;
  reason?: string;
  createTime: string;
  paidTime?: string;
}

export interface MyFinesPage {
  items: MyFine[];
  totalPages: number;
  totalElements: number;
  page: number;
  size: number;
}

function mapFine(dto: ApiFineDto): MyFine {
  return {
    fineId: dto.fineId,
    loanId: dto.loanId,
    bookTitle: dto.bookTitle,
    amount: dto.amount,
    status: dto.status,
    type: dto.type,
    reason: dto.reason,
    createTime: String(dto.dateIssued ?? "").slice(0, 10),
    paidTime: dto.datePaid ? String(dto.datePaid).slice(0, 10) : undefined,
  };
}

export const fineService = {
  async getMyFinesPage(page = 0, size = 10): Promise<MyFinesPage> {
    const response = await request<PageResponse<ApiFineDto>>({
      url: "/fines/me",
      query: { page, size },
      auth: true,
    });

    return {
      items: (response.content ?? []).map(mapFine),
      totalPages: Math.max(1, response.totalPages ?? 1),
      totalElements: response.totalElements ?? 0,
      page: response.number ?? page,
      size: response.size ?? size,
    };
  },

  async getMyFines(): Promise<MyFine[]> {
    const response = await this.getMyFinesPage(0, 100);

    return response.items;
  },

  async payFine(fineId: number): Promise<void> {
    await request<void>({
      url: `/fines/${fineId}/pay`,
      method: "POST",
      auth: true,
    });
  },
};
