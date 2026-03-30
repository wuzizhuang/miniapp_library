import useSWR, { mutate as globalMutate } from "swr";

import {
  AdminFinesPage,
  fineService,
  MyFinesPage,
  MyFine,
} from "@/services/api/fineService";

export const MY_FINES_KEY = "my-fines";
export const ADMIN_FINES_PENDING_TOTAL_KEY = "admin-fines-pending-total";

export function getAdminFinesKey(
  filter: string,
  page: number,
  size: number,
  keyword: string,
) {
  return ["admin-fines", filter, page, size, keyword] as const;
}

export function useMyFines(swrKey: string = MY_FINES_KEY) {
  return useSWR<MyFine[]>(swrKey, fineService.getMyFines);
}

export function useMyFinesPage(page: number, size: number) {
  return useSWR<MyFinesPage>(
    ["my-fines-page", page, size],
    () => fineService.getMyFinesPage(page - 1, size),
  );
}

export function useAdminFines(
  filter: string,
  page: number,
  size: number,
  keyword: string,
) {
  return useSWR<AdminFinesPage>(
    getAdminFinesKey(filter, page, size, keyword),
    () =>
      fineService.getAllFines({
        page: page - 1,
        size,
        status: filter,
        keyword,
      }),
  );
}

export async function refreshFineData() {
  await Promise.all([
    globalMutate(MY_FINES_KEY),
    globalMutate(ADMIN_FINES_PENDING_TOTAL_KEY),
    globalMutate("my-overview"),
    globalMutate("homepage-my-overview"),
    globalMutate(
      (key) => Array.isArray(key) && key[0] === "my-fines-page",
      undefined,
      { revalidate: true },
    ),
    globalMutate(
      (key) => Array.isArray(key) && key[0] === "admin-fines",
      undefined,
      { revalidate: true },
    ),
  ]);
}
