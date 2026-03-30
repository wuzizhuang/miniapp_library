import type { Book, BookSearchSort } from "../../types/book";

export type CatalogStatus = "loaned" | "reserved" | "favorited" | "available" | "out";

export const sortOptions: Array<{ value: BookSearchSort; label: string }> = [
  { value: "RELEVANCE", label: "综合相关" },
  { value: "AVAILABILITY", label: "优先可借" },
  { value: "POPULARITY", label: "近期热门" },
  { value: "NEWEST", label: "最新入藏" },
];

export function getCatalogStatus(
  book: Book,
  favoriteIds: Set<number>,
  loanedIds: Set<number>,
  reservedIds: Set<number>,
): CatalogStatus {
  if (loanedIds.has(book.bookId)) {
    return "loaned";
  }
  if (reservedIds.has(book.bookId)) {
    return "reserved";
  }
  if (favoriteIds.has(book.bookId)) {
    return "favorited";
  }
  if (book.availableCopies > 0) {
    return "available";
  }

  return "out";
}

export function getStatusMeta(status: CatalogStatus): { label: string; tone: "primary" | "warning" | "danger" | "success" } {
  switch (status) {
    case "loaned":
      return { label: "我在借", tone: "primary" };
    case "reserved":
      return { label: "已预约", tone: "warning" };
    case "favorited":
      return { label: "已收藏", tone: "danger" };
    case "available":
      return { label: "可借阅", tone: "success" };
    default:
      return { label: "暂无库存", tone: "warning" };
  }
}
