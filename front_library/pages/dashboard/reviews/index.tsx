import React, { Key, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Input,
  Pagination,
  Tab,
  Tabs,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  User,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import useSWR from "swr";
import { toast } from "sonner";

import AdminLayout from "@/components/layouts/AdminLayout";
import { reviewService } from "@/services/api/reviewService";
import { ApiReviewDto } from "@/types/api";

const PAGE_SIZE = 10;

type ReviewFilter = "PENDING" | "APPROVED" | "REJECTED";

const statusColorMap: Record<ReviewFilter, "warning" | "success" | "danger"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

const statusTextMap: Record<ReviewFilter, string> = {
  PENDING: "待审核",
  APPROVED: "已通过",
  REJECTED: "已驳回",
};

export default function AdminReviewsPage() {
  const [filter, setFilter] = useState<ReviewFilter>("PENDING");
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [auditingId, setAuditingId] = useState<number | null>(null);

  const { data, error, isLoading, mutate } = useSWR(
    ["admin-reviews", filter, page, keyword],
    () =>
      reviewService.getAdminReviews(page - 1, PAGE_SIZE, {
        status: filter,
        keyword: keyword || undefined,
      }),
  );
  const currentItems = data?.content ?? [];
  const reviewedCount = useMemo(
    () => (filter === "PENDING" ? 0 : data?.totalElements ?? 0),
    [data?.totalElements, filter],
  );

  const handleAudit = async (reviewId: number, approved: boolean) => {
    setAuditingId(reviewId);
    try {
      await reviewService.auditReview(reviewId, approved);
      await mutate();
      toast.success(approved ? "评论已通过" : "评论已驳回");
    } catch (auditError: any) {
      toast.error(auditError?.response?.data?.message || "审核失败，请稍后重试");
    } finally {
      setAuditingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">评论审核</h1>
          <p className="text-default-500">处理待审核评论，并查询已审核历史。</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border border-default-100 shadow-sm">
            <CardBody className="py-4">
              <p className="text-xs text-default-400">当前筛选总数</p>
              <p className="mt-1 text-2xl font-bold">{data?.totalElements ?? "-"}</p>
            </CardBody>
          </Card>
          <Card className="border border-primary-100 shadow-sm">
            <CardBody className="py-4">
              <p className="text-xs text-default-400">当前页</p>
              <p className="mt-1 text-2xl font-bold text-primary">{page}</p>
            </CardBody>
          </Card>
          <Card className="border border-default-100 shadow-sm">
            <CardBody className="py-4">
              <p className="text-xs text-default-400">已审核历史数</p>
              <p className="mt-1 text-2xl font-bold">{reviewedCount}</p>
            </CardBody>
          </Card>
        </div>

        <Tabs
          aria-label="Review status tabs"
          classNames={{
            tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider",
            cursor: "w-full bg-primary",
            tab: "max-w-fit px-0 h-12",
            tabContent: "group-data-[selected=true]:text-primary",
          }}
          color="primary"
          selectedKey={filter}
          variant="underlined"
          onSelectionChange={(key: Key) => {
            setFilter(key as ReviewFilter);
            setPage(1);
          }}
        >
          <Tab key="PENDING" title="待审核" />
          <Tab key="APPROVED" title="已通过" />
          <Tab key="REJECTED" title="已驳回" />
        </Tabs>

        <Input
          isClearable
          placeholder="搜索书名 / ISBN / 用户名"
          value={keyword}
          onClear={() => {
            setKeyword("");
            setPage(1);
          }}
          onValueChange={(value) => {
            setKeyword(value);
            setPage(1);
          }}
          startContent={<Icon icon="solar:magnifer-linear" width={16} className="text-default-400" />}
        />

        {error ? (
          <Card className="border border-danger-200 bg-danger-50">
            <CardBody className="py-12 text-center text-danger-700">
              <Icon icon="solar:danger-circle-bold-duotone" width={48} className="mx-auto mb-3" />
              <p className="font-medium">评论数据加载失败</p>
              <p className="mt-1 text-sm">
                {error instanceof Error ? error.message : "请稍后刷新重试"}
              </p>
            </CardBody>
          </Card>
        ) : (
          <Table aria-label="Pending reviews table" className="bg-content1 rounded-xl shadow-sm">
            <TableHeader>
              <TableColumn>评论 ID</TableColumn>
              <TableColumn>图书信息</TableColumn>
              <TableColumn>读者</TableColumn>
              <TableColumn>评分</TableColumn>
              <TableColumn>评论内容</TableColumn>
              <TableColumn>创建时间</TableColumn>
              <TableColumn>审核时间</TableColumn>
              <TableColumn>状态</TableColumn>
              <TableColumn align="end">操作</TableColumn>
            </TableHeader>
            <TableBody
              emptyContent={isLoading ? " " : "暂无符合条件的评论"}
              isLoading={isLoading}
              items={currentItems}
              loadingContent={<Spinner label="加载评论数据..." />}
            >
              {(item: ApiReviewDto) => (
                <TableRow key={item.reviewId}>
                  <TableCell>
                    <span className="text-sm text-default-500">#{item.reviewId}</span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{item.bookTitle || "未知图书"}</p>
                      <p className="text-xs text-default-400">{item.bookIsbn || "-"}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <User
                      avatarProps={{ size: "sm", radius: "full" }}
                      description={item.username}
                      name={item.userFullName || item.username}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-warning-500">
                      <Icon icon="solar:star-bold" width={16} />
                      <span className="font-semibold">{item.rating}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="max-w-xl whitespace-pre-wrap text-sm text-default-700">
                      {item.commentText || "-"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-default-500">
                      {item.createTime ? new Date(item.createTime).toLocaleString() : "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-default-500">
                      {item.auditTime ? new Date(item.auditTime).toLocaleString() : "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Chip color={statusColorMap[(item.status as ReviewFilter) || "PENDING"]} size="sm" variant="flat">
                      {statusTextMap[(item.status as ReviewFilter) || "PENDING"]}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {item.status === "PENDING" ? (
                        <>
                          <Button
                            color="success"
                            isLoading={auditingId === item.reviewId}
                            size="sm"
                            variant="flat"
                            onPress={() => handleAudit(item.reviewId, true)}
                          >
                            通过
                          </Button>
                          <Button
                            color="danger"
                            isLoading={auditingId === item.reviewId}
                            size="sm"
                            variant="flat"
                            onPress={() => handleAudit(item.reviewId, false)}
                          >
                            驳回
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-default-400">已完成审核</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}

        {data && data.totalPages > 1 ? (
          <div className="flex justify-center">
            <Pagination
              showControls
              color="primary"
              page={page}
              total={data.totalPages}
              variant="flat"
              onChange={setPage}
            />
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
