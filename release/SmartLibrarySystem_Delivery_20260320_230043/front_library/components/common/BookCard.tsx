import React from "react";
import { Card, CardBody, CardFooter, Button, Chip } from "@heroui/react";
import NextLink from "next/link";

import { AppImage } from "@/components/common/AppImage";
import { Book } from "@/types/book";

interface BookCardProps {
  book: Book;
}

export const BookCard = ({ book }: BookCardProps) => {
  // 处理作者显示：如果是数组转字符串，如果为空显示未知
  const authorDisplay =
    book.authorNames && book.authorNames.length > 0
      ? book.authorNames.join(", ")
      : "Unknown Author";

  // 库存逻辑判断
  const isAvailable = book.availableCount > 0;

  return (
    <Card
      isPressable
      as={NextLink}
      className="h-full border-none hover:scale-[1.02] transition-transform"
      href={`/books/${book.bookId}`} // 点击卡片跳转详情
      shadow="sm"
    >
      <CardBody className="p-0 overflow-visible">
        <div className="relative w-full aspect-[2/3] bg-default-100">
          <AppImage
            alt={book.title}
            className="h-full w-full object-cover"
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            src={book.coverUrl}
            wrapperClassName="h-full w-full"
          />
          {/* 悬浮显示的分类标签 */}
          <div className="absolute top-2 right-2 z-10">
            {book.categoryNames && book.categoryNames.length > 0 && (
              <Chip
                className="bg-background/80 backdrop-blur-md"
                color="default"
                size="sm"
                variant="flat"
              >
                {book.categoryNames[0]}
              </Chip>
            )}
          </div>
        </div>
      </CardBody>

      <CardFooter className="flex flex-col items-start gap-1 p-3 text-left">
        <div className="flex justify-between items-start w-full gap-2">
          <h4 className="font-bold text-medium line-clamp-1" title={book.title}>
            {book.title}
          </h4>
        </div>

        <p className="text-tiny text-default-500 line-clamp-1 w-full">
          {authorDisplay}
        </p>

        <div className="flex justify-between items-center w-full mt-2">
          {/* 库存状态指示 */}
          <div className="flex items-center gap-1">
            <div
              className={`w-2 h-2 rounded-full ${isAvailable ? "bg-success" : "bg-danger"}`}
            />
            <span className="text-tiny text-default-400">
              {isAvailable ? `${book.availableCount} 本在馆` : "暂无库存"}
            </span>
          </div>

          {/* 实际上因为整个 Card 都是 Link，这里的按钮主要起视觉引导作用 */}
          <Button
            className="min-w-0 px-2 h-6 text-tiny font-medium"
            color="primary"
            size="sm"
            variant="light"
          >
            详情
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};
