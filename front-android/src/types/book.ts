export interface Book {
  bookId: number;
  title: string;
  isbn: string;
  coverUrl?: string;
  description?: string;
  publisherName?: string;
  categoryId?: number;
  categoryName?: string;
  categoryNames?: string[];
  authorNames: string[];
  language?: string;
  publishedYear?: number;
  availableCopies: number;
  totalCopies: number;
  pendingReservationCount: number;
  resourceMode?: "PHYSICAL_ONLY" | "DIGITAL_ONLY" | "HYBRID";
  onlineAccessUrl?: string;
  onlineAccessType?: "OPEN_ACCESS" | "CAMPUS_ONLY" | "LICENSED_ACCESS";
  avgRating?: number;
  reviewCount?: number;
  inventoryCount?: number;
}

export type BookSearchSort = "RELEVANCE" | "AVAILABILITY" | "POPULARITY" | "NEWEST";

export interface BookListQuery {
  keyword?: string;
  title?: string;
  author?: string;
  publisher?: string;
  categoryId?: number;
  availableOnly?: boolean;
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: "ASC" | "DESC";
  sort?: BookSearchSort;
}

export interface PagedResult<T> {
  items: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface CategoryOption {
  categoryId: number;
  name: string;
}
