import React, { useMemo, useState } from "react";
import useSWR from "swr";
import { Avatar, Button, Textarea, Progress, Skeleton } from "@heroui/react";
import { useRouter } from "next/router";
import { toast } from "sonner";

import { StarRating } from "@/components/common/StarRating";
import { useAuth } from "@/config/authContext";
import { getApiErrorMessage } from "@/lib/apiError";
import { reviewService } from "@/services/api/reviewService";

interface ReviewSectionProps {
  bookId: number;
}

export const ReviewSection = ({ bookId }: ReviewSectionProps) => {
  const router = useRouter();
  const { user } = useAuth();
  const { data, isLoading, mutate } = useSWR(
    bookId ? ["book-reviews", bookId] : null,
    () => reviewService.getBookReviews(bookId, 0, 50),
  );
  const [newContent, setNewContent] = useState("");
  const [newRating, setNewRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reviews = data?.content ?? [];
  const reviewCount = reviews.length;
  const averageRating = useMemo(() => {
    if (reviewCount === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + (review.rating ?? 0), 0);

    return Number((total / reviewCount).toFixed(1));
  }, [reviews, reviewCount]);

  const ratingBuckets = useMemo(() => {
    const buckets: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (const review of reviews) {
      const key = Math.max(1, Math.min(5, review.rating ?? 0));

      buckets[key] += 1;
    }

    return buckets;
  }, [reviews]);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("请先登录后再发表评论");
      router.push("/auth/login");

      return;
    }
    if (newRating <= 0) {
      toast.error("请先选择评分");

      return;
    }

    try {
      setIsSubmitting(true);
      const created = await reviewService.createReview({
        bookId,
        rating: newRating,
        commentText: newContent.trim() || undefined,
      });

      toast.success(created.status === "PENDING" ? "评价已提交，等待审核" : "评价已发布");
      setNewContent("");
      setNewRating(0);
      await mutate();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "评价发布失败，请稍后重试"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 mt-8 p-6 bg-content1/50 rounded-2xl border border-default-100">
      <h3 className="text-xl font-bold">读者评价 ({reviewCount})</h3>

      {/* 评分概览面板 */}
      <div className="flex flex-col md:flex-row gap-8 items-center bg-default-50 p-6 rounded-xl">
        <div className="flex flex-col items-center justify-center text-center min-w-[120px]">
          <span className="text-5xl font-black text-warning-500">
            {averageRating.toFixed(1)}
          </span>
          <StarRating className="mt-2" rating={averageRating} size={20} />
          <span className="text-tiny text-default-400 mt-1">
            基于 {reviewCount} 条评价
          </span>
        </div>
        <div className="flex-1 w-full space-y-2">
          {[5, 4, 3, 2, 1].map((star) => (
            <div key={star} className="flex items-center gap-2">
              <span className="text-tiny font-bold w-3">{star}</span>
              <Progress
                className="max-w-md"
                color="warning"
                size="sm"
                value={
                  reviewCount > 0
                    ? (ratingBuckets[star] / reviewCount) * 100
                    : 0
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* 发表评论 */}
      <div className="flex gap-4 items-start">
        <Avatar className="w-10 h-10" name={user?.fullName ?? "游客"} />
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-small font-medium text-default-600">
                您的评分:
              </span>
              <StarRating
                isReadOnly={false}
                rating={newRating}
                size={24}
                onChange={setNewRating}
              />
            </div>
            {user ? (
              <Button
                size="sm"
                variant="light"
                onPress={() => router.push("/my/reviews")}
              >
                管理我的评论
              </Button>
            ) : null}
          </div>
          <Textarea
            className="w-full"
            minRows={3}
            placeholder="分享您的阅读心得..."
            value={newContent}
            variant="bordered"
            onValueChange={setNewContent}
          />
          <Button
            className="w-fit"
            color="primary"
            isLoading={isSubmitting}
            onPress={handleSubmit}
          >
            发布评价
          </Button>
          <p className="text-xs text-default-400">新评论提交后会进入审核队列，审核通过后才会公开显示。</p>
        </div>
      </div>

      {/* 评论列表 */}
      <div className="flex flex-col gap-6">
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        )}
        {!isLoading && reviews.length === 0 && (
          <p className="text-default-500 text-sm">暂无评论，欢迎发布第一条评价。</p>
        )}
        {!isLoading &&
          reviews.map((review) => (
            <div
              key={review.reviewId}
              className="flex gap-4 pb-6 border-b border-default-100 last:border-none"
            >
              <Avatar name={review.username} src={review.userAvatar} />
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-small">{review.username}</h4>
                  <span className="text-tiny text-default-400">
                    {String(review.createTime ?? "").slice(0, 10)}
                  </span>
                </div>
                <StarRating rating={review.rating} size={14} />
                <p className="text-default-600 text-sm mt-2 leading-relaxed">
                  {review.commentText || "该用户未填写文字评论。"}
                </p>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};
