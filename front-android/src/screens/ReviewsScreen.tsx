import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { Card, Screen, SectionTitle } from "../components/Screen";
import { ActionButton, EmptyCard, ErrorCard, InfoPill, LoginPromptCard } from "../components/Ui";
import type { RootStackParamList } from "../navigation/types";
import { getErrorMessage } from "../services/http";
import { reviewService } from "../services/review";
import { useAuth } from "../store/auth";
import { colors, radius, spacing } from "../theme";
import type { ApiReviewDto } from "../types/api";
import { emitAppEvent, subscribeAppEvent } from "../utils/events";

const statusMap: Record<string, { label: string; tone: "warning" | "success" | "danger" | "neutral" }> = {
  PENDING: { label: "待审核", tone: "warning" },
  APPROVED: { label: "已通过", tone: "success" },
  REJECTED: { label: "已驳回", tone: "danger" },
};

export function ReviewsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ApiReviewDto[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [editingReview, setEditingReview] = useState<ApiReviewDto | null>(null);
  const [rating, setRating] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function loadData(targetPage = page, isRefresh = false) {
    if (!user) {
      setLoading(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage("");

    try {
      const response = await reviewService.getMyReviews(targetPage, 10);
      setReviews(response.content ?? []);
      setTotalPages(Math.max(response.totalPages ?? 1, 1));
      setPage(response.number ?? targetPage);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "我的评论加载失败"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadData(0);
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      if (!user) {
        return undefined;
      }

      void loadData(page, true);
      return undefined;
    }, [page, user]),
  );

  useEffect(() => {
    return subscribeAppEvent((event) => {
      if (event === "reviews" || event === "books" || event === "auth") {
        void loadData(page, true);
      }
    });
  }, [user, page]);

  const canGoPrev = useMemo(() => page > 0, [page]);
  const canGoNext = useMemo(() => page + 1 < totalPages, [page, totalPages]);

  function openEdit(review: ApiReviewDto) {
    setEditingReview(review);
    setRating(review.rating ?? 0);
    setCommentText(review.commentText ?? "");
  }

  function closeEdit() {
    setEditingReview(null);
    setRating(0);
    setCommentText("");
  }

  async function handleUpdate() {
    if (!editingReview?.reviewId || !editingReview.bookId) {
      setErrorMessage("当前评论缺少图书信息，暂时无法更新");
      return;
    }

    if (rating <= 0) {
      setErrorMessage("请先选择评分");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");
      await reviewService.updateReview(Number(editingReview.reviewId), {
        bookId: editingReview.bookId,
        rating,
        commentText: commentText.trim() || undefined,
      });
      emitAppEvent("reviews");
      closeEdit();
      await loadData(page, true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "评论更新失败"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(review: ApiReviewDto) {
    try {
      setDeletingId(Number(review.reviewId));
      setErrorMessage("");
      await reviewService.deleteReview(Number(review.reviewId));
      emitAppEvent("reviews");
      const nextPage = reviews.length === 1 && page > 0 ? page - 1 : page;
      await loadData(nextPage, true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "删除评论失败"));
    } finally {
      setDeletingId(null);
    }
  }

  if (!user) {
    return (
      <Screen title="我的评论" subtitle="查看每条评论的审核状态，并继续编辑或删除。">
        <LoginPromptCard onLogin={() => navigation.navigate("Login")} />
      </Screen>
    );
  }

  return (
    <Screen title="我的评论" subtitle="查看评论审核状态，并继续编辑或删除。" refreshing={refreshing} onRefresh={() => { void loadData(page, true); }}>
      {loading ? <Card><Text style={styles.helperText}>正在加载评论...</Text></Card> : null}
      {!loading && errorMessage ? (
        <ErrorCard
          message={errorMessage}
          onRetry={() => {
            void loadData(page, true);
          }}
        />
      ) : null}

      {!loading && !errorMessage ? (
        <>
          <Card>
            <SectionTitle>评论列表</SectionTitle>
            {reviews.length === 0 ? (
              <EmptyCard title="你还没有提交任何评论" description="进入图书详情页后即可发布第一条书评。" />
            ) : (
              reviews.map((review) => {
                const statusMeta = statusMap[review.status || "PENDING"] || statusMap.PENDING;

                return (
                  <View key={String(review.reviewId)} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewHeaderMain}>
                        <Text style={styles.reviewTitle}>{review.bookTitle || "未知图书"}</Text>
                        <Text style={styles.reviewMeta}>ISBN: {review.bookIsbn || "--"}</Text>
                      </View>
                      <InfoPill label={statusMeta.label} tone={statusMeta.tone} />
                    </View>
                    <Text style={styles.reviewMeta}>评分 {review.rating} / 5</Text>
                    <Text style={styles.reviewContent}>{review.commentText || "该评论未填写文字内容。"}</Text>
                    <Text style={styles.reviewMeta}>提交于 {String(review.createTime || "").slice(0, 10)}</Text>
                    <View style={styles.actionRow}>
                      {review.bookId ? (
                        <ActionButton
                          label="查看图书"
                          onPress={() => navigation.navigate("BookDetail", { bookId: review.bookId })}
                          tone="secondary"
                        />
                      ) : null}
                      <ActionButton
                        label="编辑评论"
                        onPress={() => openEdit(review)}
                        tone="secondary"
                      />
                      <ActionButton
                        label={deletingId === Number(review.reviewId) ? "删除中..." : "删除评论"}
                        onPress={() => {
                          void handleDelete(review);
                        }}
                        tone="danger"
                        disabled={deletingId !== null}
                      />
                    </View>
                  </View>
                );
              })
            )}
          </Card>

          {totalPages > 1 ? (
            <Card>
              <SectionTitle>分页</SectionTitle>
              <View style={styles.actionRow}>
                <ActionButton
                  label="上一页"
                  onPress={() => {
                    void loadData(page - 1);
                  }}
                  tone="secondary"
                  disabled={!canGoPrev}
                />
                <Text style={styles.pageText}>第 {page + 1} / {totalPages} 页</Text>
                <ActionButton
                  label="下一页"
                  onPress={() => {
                    void loadData(page + 1);
                  }}
                  tone="secondary"
                  disabled={!canGoNext}
                />
              </View>
            </Card>
          ) : null}

          {editingReview ? (
            <Card>
              <SectionTitle>编辑评论</SectionTitle>
              <Text style={styles.reviewTitle}>{editingReview.bookTitle || "未知图书"}</Text>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <Pressable key={value} onPress={() => setRating(value)}>
                    <Text style={value <= rating ? styles.starActive : styles.star}>★</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                multiline
                numberOfLines={4}
                placeholder="继续完善你的阅读体验..."
                placeholderTextColor={colors.textMuted}
                style={styles.textarea}
              />
              <View style={styles.actionRow}>
                <ActionButton label="取消编辑" onPress={closeEdit} tone="secondary" />
                <ActionButton
                  label={submitting ? "保存中..." : "保存修改"}
                  onPress={() => {
                    void handleUpdate();
                  }}
                  disabled={submitting}
                />
              </View>
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  helperText: {
    color: colors.textMuted,
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.sm,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  reviewHeaderMain: {
    flex: 1,
    gap: 4,
  },
  reviewTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  reviewMeta: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  reviewContent: {
    color: colors.text,
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    alignItems: "center",
  },
  pageText: {
    color: colors.text,
    fontWeight: "700",
  },
  starRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  star: {
    color: colors.border,
    fontSize: 30,
  },
  starActive: {
    color: colors.accent,
    fontSize: 30,
  },
  textarea: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 100,
    color: colors.text,
    textAlignVertical: "top",
  },
});
