import type { ReactNode } from "react";

import { Button, Card, CardBody, CardFooter } from "@heroui/react";

import { CatalogViewHandlers } from "./catalogTypes";

import { Book } from "@/types/book";
import { AppImage } from "@/components/common/AppImage";
import StatusBadge from "@/components/common/StatusBadge";


interface CatalogGridProps extends CatalogViewHandlers {
  items: Book[];
  tailPanel?: ReactNode;
}

export function CatalogGrid({
  getActionLabel,
  getStatusInfo,
  items,
  onSelectBook,
  tailPanel,
}: CatalogGridProps) {
  const baseMissing = items.length > 0 && items.length % 2 !== 0 ? 1 : 0;
  const mdMissing = items.length > 0 ? (3 - (items.length % 3 || 3)) % 3 : 0;
  const lgMissing = items.length > 0 ? (4 - (items.length % 4 || 4)) % 4 : 0;
  const xlMissing = items.length > 0 ? (5 - (items.length % 5 || 5)) % 5 : 0;

  return (
    <div className="grid w-full grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((book) => {
        const { color, status, label } = getStatusInfo(book);
        const actionLabel = getActionLabel(book);

        return (
          <Card
            key={book.bookId}
            isPressable
            className="w-full border-none transition-transform hover:scale-[1.02] data-[pressed=true]:scale-95"
            shadow="sm"
            onPress={() => onSelectBook(book.bookId)}
          >
            <CardBody className="relative aspect-[3/4] overflow-visible p-0">
              <AppImage
                alt={book.title}
                className="object-cover"
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 20vw"
                src={book.coverUrl}
                wrapperClassName="h-full w-full rounded-lg"
              />
              <div className="absolute right-2 top-2 z-10">
                <StatusBadge color={color} label={label} />
              </div>
            </CardBody>
            <CardFooter className="flex h-[110px] flex-col items-start justify-between bg-background/60 px-4 pb-4 pt-4 backdrop-blur-lg">
              <div className="w-full">
                <h3
                  className="w-full truncate text-left text-large font-bold"
                  title={book.title}
                >
                  {book.title}
                </h3>
                <p className="w-full truncate text-left text-tiny font-bold uppercase text-default-500">
                  {book.authorNames?.join(", ") || "Unknown Author"}
                </p>
              </div>

              <div className="mt-2 flex w-full items-end justify-between">
                <div className="flex flex-col items-start">
                  <span className="text-tiny text-default-400">ISBN</span>
                  <span className="font-mono text-xs font-medium">{book.isbn}</span>
                </div>
                <Button
                  className="h-8 min-w-16 text-xs font-medium"
                  color={
                    status === "available" || status === "loaned"
                      ? "primary"
                      : status === "reserved"
                        ? "secondary"
                        : "default"
                  }
                  radius="full"
                  size="sm"
                  variant={status === "available" ? "solid" : "flat"}
                  onPress={() => onSelectBook(book.bookId)}
                >
                  {actionLabel}
                </Button>
              </div>
            </CardFooter>
          </Card>
        );
      })}

      {tailPanel && baseMissing > 0 ? (
        <div className="col-span-1 md:hidden">
          {tailPanel}
        </div>
      ) : null}

      {tailPanel && mdMissing > 0 ? (
        <div
          className={`hidden md:block lg:hidden ${
            mdMissing === 1 ? "md:col-span-1" : "md:col-span-2"
          }`}
        >
          {tailPanel}
        </div>
      ) : null}

      {tailPanel && lgMissing > 0 ? (
        <div
          className={`hidden lg:block xl:hidden ${
            lgMissing === 1
              ? "lg:col-span-1"
              : lgMissing === 2
                ? "lg:col-span-2"
                : "lg:col-span-3"
          }`}
        >
          {tailPanel}
        </div>
      ) : null}

      {tailPanel && xlMissing > 0 ? (
        <div
          className={`hidden xl:block ${
            xlMissing === 1
              ? "xl:col-span-1"
              : xlMissing === 2
                ? "xl:col-span-2"
                : xlMissing === 3
                  ? "xl:col-span-3"
                  : "xl:col-span-4"
          }`}
        >
          {tailPanel}
        </div>
      ) : null}
    </div>
  );
}
