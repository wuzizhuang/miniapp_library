import useSWR, { mutate as globalMutate } from "swr";

import { adminService, AdminBook } from "@/services/api/adminService";
import { getApiErrorMessage } from "@/lib/apiError";

export function getAdminBooksKey(page: number, keyword: string) {
  return ["admin-books", page, keyword] as const;
}

export function getAdminBookDetailKey(bookId: number) {
  return ["admin-book", bookId] as const;
}

export function useAdminBooks(page: number, size: number, keyword: string) {
  return useSWR<{
    items: AdminBook[];
    totalPages: number;
  }>(
    getAdminBooksKey(page, keyword),
    () => adminService.getAdminBooks(page - 1, size, keyword),
  );
}

export function useAdminBookDetail(bookId?: number) {
  return useSWR(
    typeof bookId === "number" && Number.isFinite(bookId)
      ? getAdminBookDetailKey(bookId)
      : null,
    () => adminService.getAdminBookById(bookId as number),
  );
}

export async function refreshAdminBookData(bookId?: number) {
  await globalMutate(
    (key) => Array.isArray(key) && key[0] === "admin-books",
    undefined,
    { revalidate: true }
  );

  if (typeof bookId === "number" && Number.isFinite(bookId)) {
    await globalMutate(getAdminBookDetailKey(bookId));
  }
}

export function formatBookMutationError(error: any, fallback: string) {
  const message = getApiErrorMessage(error, fallback);

  if (error?.response?.status === 403) {
    return "当前账号没有图书写入权限";
  }

  if (error?.response?.status === 401) {
    return "登录状态已失效，请重新登录";
  }

  return message;
}
