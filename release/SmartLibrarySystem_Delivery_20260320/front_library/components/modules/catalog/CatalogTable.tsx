import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";

import { CatalogViewHandlers } from "./catalogTypes";

import { Book } from "@/types/book";
import { AppImage } from "@/components/common/AppImage";
import StatusBadge from "@/components/common/StatusBadge";


interface CatalogTableProps extends CatalogViewHandlers {
  items: Book[];
}

export function CatalogTable({
  getActionLabel,
  getStatusInfo,
  items,
  onSelectBook,
}: CatalogTableProps) {
  return (
    <Table
      aria-label="馆藏目录列表"
      classNames={{
        base: "w-full",
        wrapper:
          "w-full rounded-[28px] border border-slate-200/80 bg-white/92 shadow-[0_28px_70px_-44px_rgba(148,163,184,0.28)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(15,23,42,0.78))] dark:shadow-[0_28px_70px_-44px_rgba(15,23,42,0.95)]",
        table: "min-w-full",
        th: "bg-slate-50 text-slate-500 uppercase text-[11px] tracking-[0.18em] dark:bg-white/6 dark:text-slate-300",
        td: "border-b border-slate-100 py-4 text-slate-700 dark:border-white/6 dark:text-slate-100",
        tr: "data-[hover=true]:bg-slate-50 dark:data-[hover=true]:bg-white/6",
      }}
      shadow="none"
    >
      <TableHeader>
        <TableColumn>图书信息</TableColumn>
        <TableColumn>分类</TableColumn>
        <TableColumn>ISBN</TableColumn>
        <TableColumn>馆藏状态</TableColumn>
        <TableColumn align="end">操作</TableColumn>
      </TableHeader>
      <TableBody items={items}>
        {(book) => {
          const actionLabel = getActionLabel(book);
          const { color, status, label } = getStatusInfo(book);

          return (
            <TableRow
              key={book.bookId}
              className="cursor-pointer"
              onClick={() => onSelectBook(book.bookId)}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <AppImage
                    alt={book.title}
                    className="object-cover"
                    height={60}
                    src={book.coverUrl}
                    width={40}
                    wrapperClassName="hidden h-[60px] w-[40px] rounded-md sm:block"
                  />
                  <div>
                    <p className="line-clamp-1 text-sm font-semibold text-slate-900 dark:text-white">{book.title}</p>
                    <p className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                      {book.authorNames?.join(", ")}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {book.categoryNames?.[0] ? (
                  <StatusBadge color="primary" label={book.categoryNames[0]} variant="dot" />
                ) : (
                  <span className="text-xs text-slate-400 dark:text-slate-500">-</span>
                )}
              </TableCell>
              <TableCell>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-sm text-slate-700 dark:border-white/10 dark:bg-white/6 dark:text-slate-100">
                  {book.isbn}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex flex-col items-start gap-1">
                  <StatusBadge color={color} label={label} />
                  {book.availableCount > 0 ? (
                    <span className="ml-1 text-[10px] text-success-600 dark:text-success-300">
                      剩余 {book.availableCount} 本
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex justify-end">
                  <Button
                    className="border border-slate-200 dark:border-white/10"
                    color={status === "reserved" ? "secondary" : "primary"}
                    radius="full"
                    size="sm"
                    variant="flat"
                    onPress={() => onSelectBook(book.bookId)}
                  >
                    {actionLabel}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        }}
      </TableBody>
    </Table>
  );
}
