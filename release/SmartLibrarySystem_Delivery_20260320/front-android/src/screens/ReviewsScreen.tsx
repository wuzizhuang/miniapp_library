import React, { useEffect, useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { Card, Screen, SectionTitle } from "../components/Screen";
import { ActionButton, EmptyCard, ErrorCard, InfoPill, LoginPromptCard, TextField } from "../components/Ui";
import type { RootStackParamList } from "../navigation/types";
import { getErrorMessage } from "../services/http";
import { reviewService } from "../services/review";
import { useAuth } from "../store/auth";
import { colors, radius, spacing } from "../theme";
import type { ApiReviewDto } from "../types/api";
import { emitAppEvent, subscribeAppEvent } from "../utils/events";

const statusMap: Record<string, { label: string; tone: "warning" | "success" | "danger" | "neutral"; icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"] }> = {
  PENDING: { label: "待审核", tone: "warning", icon: "clock-outline" },
  APPROVED: { label: "已通过", tone: "success", icon: "check-circle-outline" },
  REJECTED: { label: "已驳回", tone: "danger", icon: "close-circle-outline" },
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
  const summary = useMemo(() => ({
    pending: reviews.filter((item) => (item.status || "PENDING") === "PENDING").length,
    approved: reviews.filter((item) => item.status === "APPROVED").length,
    rejected: reviews.filter((item) => item.status === "REJECTED").length,
  }), [reviews]);

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
    <Screen
      title="我的评论"
      subtitle="查看评论审核状态，并继续编辑或删除。"
      refreshing={refreshing}
      onRefresh={() => {
        void loadData(page, true);
      }}
    >
      <Card tone="tinted" style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryIconWrap}>
            <MaterialCommunityIcons name="comment-text-outline" size={26} color={colors.primaryDark} />
          </View>
          <View style={styles.summaryBody}>
            <InfoPill label="REVIEW CENTER" tone="primary" icon="star-outline" />
            <Text style={styles.summaryTitle}>管理你的书评内容</Text>
            <Text style={styles.summaryText}>在这里查看审核状态、继续编辑文字内容，或删除不再保留的评论。</Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <StatCard icon="clock-outline" value={summary.pending} label="待审核" />
          <StatCard icon="check-circle-outline" value={summary.approved} label="已通过" />
          <StatCard icon="close-circle-outline" value={summary.rejected} label="已驳回" />
        </View>
      </Card>

      {loading ? (
        <Card tone="muted">
          <Text style={styles.helperText}>正在加载评论...</Text>
        </Card>
      ) : null}

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
          <Card style={styles.sectionCard}>
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
                      <InfoPill label={statusMeta.label} tone={statusMeta.tone} icon={statusMeta.icon} />
                    </View>
                    <View style={styles.starRow}>
                      {[1, 2, 3, 4, 5].map((value) => (
                        <MaterialCommunityIcons
                          key={`${review.reviewId}-${value}`}
                          name={value <= (review.rating ?? 0) ? "star" : "star-outline"}
                          size={18}
                          color={value <= (review.rating ?? 0) ? colors.accent : colors.borderStrong}
                        />
                      ))}
                    </View>
                    <Text style={styles.reviewContent}>{review.commentText || "该评论未填写文字内容。"}</Text>
                    <Text style={styles.reviewMeta}>提交于 {String(review.createTime || "").slice(0, 10)}</Text>
                    <View style={styles.actionRow}>
                      {review.bookId ? (
                        <ActionButton
                          label="查看图书"
                          icon="book-open-variant"
                          onPress={() => navigation.navigate("BookDetail", { bookId: review.bookId })}
                          tone="secondary"
                        />
                      ) : null}
                      <ActionButton
                        label="编辑评论"
                        icon="square-edit-outline"
                        onPress={() => openEdit(review)}
                        tone="secondary"
                      />
                      <ActionButton
                        label={deletingId === Number(review.reviewId) ? "删除中..." : "删除评论"}
                        icon="trash-can-outline"
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
                  icon="chevron-left"
                  onPress={() => {
                    void loadData(page - 1);
                  }}
                  tone="secondary"
                  disabled={!canGoPrev}
                />
                <Text style={styles.pageText}>第 {page + 1} / {totalPages} 页</Text>
                <ActionButton
                  label="下一页"
                  icon="chevron-right"
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
            <Card style={styles.sectionCard}>
              <SectionTitle>编辑评论</SectionTitle>
              <Text style={styles.reviewTitle}>{editingReview.bookTitle || "未知图书"}</Text>
              <View style={styles.editStarRow}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <Pressable key={value} style={styles.starChip} onPress={() => setRating(value)}>
                    <MaterialCommunityIcons
                      name={value <= rating ? "star" : "star-outline"}
                      size={22}
                      color={value <= rating ? colors.accent : colors.borderStrong}
                    />
                  </Pressable>
                ))}
              </View>
              <TextField
                icon="text-box-outline"
                value={commentText}
                onChangeText={setCommentText}
                multiline
                numberOfLines={4}
                placeholder="继续完善你的阅读体验..."
              />
              <View style={styles.actionRow}>
                <ActionButton label="取消编辑" icon="close" onPress={closeEdit} tone="secondary" />
                <ActionButton
                  label={submitting ? "保存中..." : "保存修改"}
                  icon="content-save-outline"
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

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  value: number;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.primaryDark} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    gap: spacing.md,
  },
  summaryHeader: {
    flexDirection: "row",
    gap: spacing.md,
  },
  summaryIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryBody: {
    flex: 1,
    gap: spacing.xs,
  },
  summaryTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  summaryText: {
    color: colors.textMuted,
    lineHeight: 22,
  },
  statRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    gap: 4,
  },
  statValue: {
    color: colors.primaryDark,
    fontSize: 22,
    fontWeight: "800",
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  helperText: {
    color: colors.textMuted,
    lineHeight: 21,
  },
  sectionCard: {
    gap: spacing.md,
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
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
    lineHeight: 22,
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
    gap: 4,
  },
  editStarRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  starChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
});
