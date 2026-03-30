import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import useSWR, { mutate as globalMutate } from "swr";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Pagination,
  Skeleton,
  Textarea,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

import { RequestErrorCard } from "@/components/common/RequestErrorCard";
import DefaultLayout from "@/components/layouts/default";
import { StarRating } from "@/components/common/StarRating";
import { getApiErrorMessage } from "@/lib/apiError";
import { reviewService } from "@/services/api/reviewService";
import { ApiReviewDto } from "@/types/api";

const statusMap: Record<string, { label: string; color: "warning" | "success" | "danger" | "default" }> = {
  PENDING: { label: "待审核", color: "warning" },
  APPROVED: { label: "已通过", color: "success" },
  REJECTED: { label: "已驳回", color: "danger" },
};

export default function MyReviewsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [editingReview, setEditingReview] = useState<ApiReviewDto | null>(null);
  const [rating, setRating] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data, error, isLoading, mutate } = useSWR(
    ["my-reviews", page],
    () => reviewService.getMyReviews(page - 1, 10),
  );

  const reviews = useMemo(() => data?.content ?? [], [data?.content]);
  const totalPages = data?.totalPages ?? 1;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const openEditModal = (review: ApiReviewDto) => {
    setEditingReview(review);
    setRating(review.rating ?? 0);
    setCommentText(review.commentText ?? "");
  };

  const closeEditModal = () => {
    setEditingReview(null);
    setRating(0);
    setCommentText("");
  };

  const refreshRelatedData = async (bookId?: number) => {
    await mutate();
    await globalMutate(
      (key) => Array.isArray(key) && key[0] === "my-reviews",
      undefined,
      { revalidate: true },
    );
    if (bookId != null) {
      await globalMutate(["book-reviews", bookId]);
    }
  };

  const handleUpdate = async () => {
    if (!editingReview?.reviewId || !editingReview.bookId) {
      toast.error("当前评论缺少图书信息，无法更新");

      return;
    }

    if (rating <= 0) {
      toast.error("请先选择评分");

      return;
    }

    try {
      setSubmitting(true);
      await reviewService.updateReview(editingReview.reviewId, {
        bookId: editingReview.bookId,
        rating,
        commentText: commentText.trim() || undefined,
      });
      toast.success("评论已更新");
      closeEditModal();
      await refreshRelatedData(editingReview.bookId);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "评论更新失败，请稍后重试"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (review: ApiReviewDto) => {
    if (!confirm(`确认删除《${review.bookTitle || "该图书"}》的评论？`)) {
      return;
    }

    try {
      setDeletingId(review.reviewId);
      await reviewService.deleteReview(review.reviewId);
      toast.success("评论已删除");
      await refreshRelatedData(review.bookId);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "删除失败，请稍后重试"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DefaultLayout>
      <section className="container mx-auto max-w-5xl px-4 py-8 min-h-screen">
        <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">我的评论</h1>
            <p className="text-default-500">查看每条评论的审核状态，并继续编辑或删除。</p>
          </div>
          <Button
            color="primary"
            startContent={<Icon icon="solar:book-2-bold" width={18} />}
            variant="flat"
            onPress={() => router.push("/books")}
          >
            去找书
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
          </div>
        ) : error ? (
          <RequestErrorCard
            message={getApiErrorMessage(error, "评论列表加载失败，请稍后重试。")}
            title="我的评论加载失败"
            onRetry={() => void mutate()}
          />
        ) : reviews.length === 0 ? (
          <Card className="border border-dashed border-default-200 shadow-none">
            <CardBody className="py-16 text-center text-default-400">
              <Icon className="mx-auto mb-3 opacity-40" icon="solar:chat-round-like-bold-duotone" width={52} />
              <p className="text-base font-medium text-default-600">你还没有提交任何评论</p>
              <p className="mt-1 text-sm">进入图书详情页后即可发布第一条书评。</p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              {reviews.map((review) => {
                const statusMeta = statusMap[review.status || "PENDING"] || statusMap.PENDING;

                return (
                  <Card key={review.reviewId} className="border border-default-100 shadow-sm">
                    <CardHeader className="flex flex-col gap-3 px-5 pb-0 pt-5 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h2 className="text-lg font-semibold">{review.bookTitle || "未知图书"}</h2>
                        <p className="mt-1 text-sm text-default-400">ISBN: {review.bookIsbn || "-"}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Chip color={statusMeta.color} size="sm" variant="flat">
                          {statusMeta.label}
                        </Chip>
                        <Chip size="sm" variant="bordered">
                          提交于 {String(review.createTime ?? "").slice(0, 10)}
                        </Chip>
                      </div>
                    </CardHeader>
                    <CardBody className="space-y-4 px-5 pb-5 pt-4">
                      <div className="flex items-center gap-3">
                        <StarRating rating={review.rating} size={16} />
                        <span className="text-sm text-default-400">{review.rating}/5</span>
                      </div>
                      <p className="text-sm leading-7 text-default-600">
                        {review.commentText || "该评论未填写文字内容。"}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {review.bookId != null ? (
                          <Button
                            color="primary"
                            size="sm"
                            variant="flat"
                            onPress={() => router.push(`/books/${review.bookId}`)}
                          >
                            查看图书
                          </Button>
                        ) : null}
                        <Button size="sm" variant="flat" onPress={() => openEditModal(review)}>
                          编辑评论
                        </Button>
                        <Button
                          color="danger"
                          isLoading={deletingId === review.reviewId}
                          size="sm"
                          variant="light"
                          onPress={() => void handleDelete(review)}
                        >
                          删除评论
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>

            {totalPages > 1 ? (
              <div className="flex justify-center">
                <Pagination
                  color="primary"
                  page={page}
                  showControls
                  total={totalPages}
                  onChange={setPage}
                />
              </div>
            ) : null}
          </div>
        )}
      </section>

      <Modal isOpen={!!editingReview} placement="center" onOpenChange={(open) => !open && closeEditModal()}>
        <ModalContent>
          <ModalHeader>编辑评论</ModalHeader>
          <ModalBody className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-default-500">评分</p>
              <StarRating isReadOnly={false} rating={rating} size={24} onChange={setRating} />
            </div>
            <Textarea
              minRows={4}
              placeholder="继续完善你的阅读体验..."
              value={commentText}
              variant="bordered"
              onValueChange={setCommentText}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={closeEditModal}>
              取消
            </Button>
            <Button color="primary" isLoading={submitting} onPress={() => void handleUpdate()}>
              保存修改
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DefaultLayout>
  );
}
