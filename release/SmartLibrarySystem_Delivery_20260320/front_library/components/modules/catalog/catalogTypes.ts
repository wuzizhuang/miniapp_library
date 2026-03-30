import { Book } from "@/types/book";

export type ViewMode = "table" | "grid";
export type AvailabilityStatus = "available" | "out_of_stock";
export type UserBookState =
  | "loaned"
  | "reserved"
  | "favorited"
  | "available"
  | "out_of_stock";

export interface CatalogStatusInfo {
  status: AvailabilityStatus | UserBookState;
  label: string;
  color: "success" | "warning" | "default" | "primary" | "secondary" | "danger";
}

export interface CatalogViewHandlers {
  onSelectBook: (bookId: number) => void;
  getActionLabel: (book: Book) => string;
  getStatusInfo: (book: Book) => CatalogStatusInfo;
}
