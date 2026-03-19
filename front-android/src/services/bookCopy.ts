import type { ApiBookCopyDto } from "../types/api";
import { request } from "./http";

export interface BookCopy {
  id: number;
  bookId: number;
  bookTitle: string;
  isbn: string;
  status: "AVAILABLE" | "BORROWED" | "RESERVED" | "LOST" | "DAMAGED";
  acquisitionDate: string;
  price: number;
  notes?: string;
  locationCode?: string;
}

function mapBookCopy(dto: ApiBookCopyDto): BookCopy {
  return {
    id: dto.id,
    bookId: dto.bookId,
    bookTitle: dto.bookTitle,
    isbn: dto.isbn,
    status: dto.status,
    acquisitionDate: dto.acquisitionDate,
    price: dto.price,
    notes: dto.notes,
    locationCode: dto.locationCode,
  };
}

export const bookCopyService = {
  async getByBookId(bookId: number): Promise<BookCopy[]> {
    const response = await request<ApiBookCopyDto[]>({
      url: `/books/${bookId}/copies`,
    });

    return (response ?? []).map(mapBookCopy);
  },
};
