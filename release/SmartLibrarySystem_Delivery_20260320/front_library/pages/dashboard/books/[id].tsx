import React from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Chip,
  Button,
  Skeleton,
  Divider,
  Spinner,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useRouter } from "next/router";
import useSWR from "swr";

import { AppImage } from "@/components/common/AppImage";
import AdminLayout from "@/components/layouts/AdminLayout";
import { useAdminBookDetail } from "@/hooks/books/useAdminBookData";
import { bookCopyService, CopyStatus } from "@/services/api/bookCopyService";

const copyStatusColor: Record<CopyStatus, "success" | "primary" | "warning" | "danger" | "default"> = {
  AVAILABLE: "success", BORROWED: "primary", RESERVED: "warning", LOST: "danger", DAMAGED: "default",
};
const copyStatusLabel: Record<CopyStatus, string> = {
  AVAILABLE: "可借", BORROWED: "已借出", RESERVED: "已预约", LOST: "遗失", DAMAGED: "损坏",
};

function CopyListSection({ bookId }: { bookId: number }) {
  const router = useRouter();
  const { data: copies, isLoading } = useSWR(
    [`book-copies-for`, bookId],
    () => bookCopyService.getByBookId(bookId)
  );

  return (
    <Card className="shadow-sm border border-default-100">
      <CardHeader className="flex justify-between items-center">
        <h3 className="text-base font-semibold">副本列表</h3>
        <Button
          size="sm"
          variant="flat"
          color="primary"
          startContent={<Icon icon="solar:arrow-right-bold" width={14} />}
          onPress={() =>
            void router.push({
              pathname: "/dashboard/copies",
              query: { bookId },
            })
          }
        >
          查看该书全部副本
        </Button>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <div className="flex justify-center py-6"><Spinner size="sm" /></div>
        ) : !copies || copies.length === 0 ? (
          <p className="text-sm text-default-400 text-center py-4">该书暂无副本记录</p>
        ) : (
          <div className="space-y-2">
            {copies.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-default-50">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-default-400">#{c.id}</span>
                  <Chip size="sm" variant="flat" color={copyStatusColor[c.status]}>
                    {copyStatusLabel[c.status]}
                  </Chip>
                </div>
                <div className="flex items-center gap-4 text-xs text-default-500">
                  {c.locationCode && <span>📍 {c.locationCode}</span>}
                  {c.price != null && <span>¥{c.price.toFixed(2)}</span>}
                  {c.acquisitionDate && <span>{c.acquisitionDate.slice(0, 10)}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

const statusColorMap: Record<string, "success" | "warning" | "danger"> = {
  available: "success",
  low_stock: "warning",
  out_of_stock: "danger",
};

const statusLabelMap: Record<string, string> = {
  available: "库存充足",
  low_stock: "库存紧张",
  out_of_stock: "缺货",
};

export default function BookDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const numericId = Number(id);
  const { data: book, isLoading } = useAdminBookDetail(
    router.isReady && Number.isFinite(numericId) ? numericId : undefined
  );

  return (
    <AdminLayout>
      <div className="max-w-[1100px] mx-auto space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">图书详情</h1>
            <p className="text-default-500 text-small">
              查看图书基础信息与库存状态。
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              startContent={<Icon icon="solar:arrow-left-bold" />}
              variant="flat"
              onPress={() => router.push("/dashboard/books")}
            >
              返回列表
            </Button>
            <Button
              color="primary"
              startContent={<Icon icon="solar:add-circle-bold" />}
              onPress={() => router.push("/dashboard/books/new")}
            >
              新书入库
            </Button>
          </div>
        </div>

        <Skeleton className="rounded-2xl" isLoaded={!isLoading}>
          <Card className="shadow-sm border border-default-100">
            <CardBody className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
              <div className="flex flex-col gap-3">
                <AppImage
                  alt={book?.title || "Book cover"}
                  className="object-cover rounded-xl"
                  src={book?.cover}
                  width={240}
                  height={320}
                  wrapperClassName="rounded-xl"
                />
                <Chip
                  className="justify-center"
                  color={statusColorMap[book?.status || "available"]}
                  variant="flat"
                >
                  {statusLabelMap[book?.status || "available"]}
                </Chip>
              </div>
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-semibold">
                    {book?.title || "未找到该图书"}
                  </h2>
                  <p className="text-default-500">{book?.author}</p>
                </div>
                <Divider />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-default-400">ISBN</p>
                    <p className="font-medium">{book?.isbn || "-"}</p>
                  </div>
                  <div>
                    <p className="text-default-400">分类</p>
                    <p className="font-medium">{book?.category || "-"}</p>
                  </div>
                  <div>
                    <p className="text-default-400">馆藏总量</p>
                    <p className="font-medium">{book?.total ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-default-400">可借库存</p>
                    <p className="font-medium">{book?.stock ?? "-"}</p>
                  </div>
                </div>
                <Card className="bg-default-50 border border-default-100">
                  <CardHeader className="pb-0">
                    <h3 className="text-sm font-semibold">管理提示</h3>
                  </CardHeader>
                  <CardBody className="text-sm text-default-500">
                    该页面用于查看详情，编辑请返回列表使用“编辑详情”操作。
                  </CardBody>
                </Card>
              </div>
            </CardBody>
          </Card>
        </Skeleton>

        {/* 副本列表 */}
        {router.isReady && Number.isFinite(numericId) && (
          <CopyListSection bookId={numericId} />
        )}
      </div>
    </AdminLayout>
  );
}
