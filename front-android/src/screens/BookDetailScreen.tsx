import React, { useEffect, useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card, Screen, SectionTitle } from "../components/Screen";
import { ActionButton, CoverImage, EmptyCard, ErrorCard, InfoPill } from "../components/Ui";
import type { RootStackParamList } from "../navigation/types";
import { bookCopyService } from "../services/bookCopy";
import { bookService } from "../services/book";
import { favoriteService } from "../services/favorite";
import { getErrorMessage, isUnauthorizedError } from "../services/http";
import { loanService } from "../services/loan";
import { reservationService } from "../services/reservation";
import { reviewService } from "../services/review";
import { useAuth } from "../store/auth";
import { colors, radius, spacing } from "../theme";
import type { ApiReviewDto } from "../types/api";
import type { Book } from "../types/book";
import { emitAppEvent, subscribeAppEvent } from "../utils/events";
import { joinText } from "../utils/format";

export function BookDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "BookDetail">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const bookId = route.params.bookId;
  const [book, setBook] = useState<Book | null>(null);
  const [reviews, setReviews] = useState<ApiReviewDto[]>([]);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [favorite, setFavorite] = useState(false);
  const [activeLoanId, setActiveLoanId] = useState<number | null>(null);
  const [activeReservationStatus, setActiveReservationStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [acting, setActing] = useState<"borrow" | "favorite" | "reserve" | "review" | null>(null);
  const [commentText, setCommentText] = useState("");
  const [rating, setRating] = useState(5);

  const canBorrow = !!book && activeLoanId == null && activeReservationStatus == null && book.availableCopies > 0;
  const canReserve = !!book && activeLoanId == null && activeReservationStatus == null && book.availableCopies <= 0;
  const averageRating = useMemo(() => {
    if (reviews.length === 0) {
      return 0;
    }

    const total = reviews.reduce((sum, item) => sum + (item.rating ?? 0), 0);
    return Number((total / reviews.length).toFixed(1));
  }, [reviews]);

  async function loadBookDetail(isRefresh = false) {
    if (!isRefresh) {
      setLoading(true);
    }

    setErrorMessage("");

    try {
      const [nextBook, copies, reviewsPage] = await Promise.all([
        bookService.getBookById(bookId),
        bookCopyService.getByBookId(bookId),
        reviewService.getBookReviews(bookId, 0, 50),
      ]);

      setBook(nextBook);
      setReviews(reviewsPage.content ?? []);
      setAvailableLocations(
        Array.from(
          new Set(
            copies
              .filter((item) => item.status === "AVAILABLE" && item.locationCode)
              .map((item) => item.locationCode as string),
          ),
        ),
      );

      if (user) {
        const [isFavorite, loans, reservations] = await Promise.all([
          favoriteService.checkFavorite(bookId),
          loanService.getMyLoans(),
          reservationService.getMyReservations(),
        ]);

        setFavorite(isFavorite);

        const activeLoan = loans.find(
          (item) =>
            item.bookId === bookId &&
            (item.status === "BORROWED" || item.status === "OVERDUE"),
        );
        const activeReservation = reservations.find(
          (item) =>
            item.bookId === bookId &&
            (item.status === "PENDING" || item.status === "AWAITING_PICKUP"),
        );

        setActiveLoanId(activeLoan?.loanId ?? null);
        setActiveReservationStatus(activeReservation?.status ?? null);
      } else {
        setFavorite(false);
        setActiveLoanId(null);
        setActiveReservationStatus(null);
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "图书详情加载失败"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBookDetail();
  }, [bookId, user]);

  useEffect(() => {
    return subscribeAppEvent((event) => {
      if (event === "books" || event === "favorites" || event === "loans" || event === "reservations") {
        void loadBookDetail(true);
      }
    });
  }, [bookId, user]);

  async function requireLogin(): Promise<boolean> {
    if (user) {
      return true;
    }

    navigation.navigate("Login");
    return false;
  }

  async function handleBorrow() {
    if (!(await requireLogin()) || !book) {
      return;
    }

    try {
      setActing("borrow");
      const copies = await bookCopyService.getByBookId(book.bookId);
      const availableCopy = copies.find((item) => item.status === "AVAILABLE");

      if (!availableCopy) {
        setErrorMessage("当前没有可借副本，请改为预约。");
        return;
      }

      await loanService.createLoan(availableCopy.id);
      emitAppEvent("books");
      emitAppEvent("loans");
      emitAppEvent("overview");
      await loadBookDetail(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "借阅失败"));
    } finally {
      setActing(null);
    }
  }

  async function handleToggleFavorite() {
    if (!(await requireLogin()) || !book) {
      return;
    }

    try {
      setActing("favorite");
      if (favorite) {
        await favoriteService.removeFavorite(book.bookId);
        setFavorite(false);
      } else {
        await favoriteService.addFavorite(book.bookId);
        setFavorite(true);
      }
      emitAppEvent("favorites");
      emitAppEvent("books");
      emitAppEvent("overview");
    } catch (error) {
      if (isUnauthorizedError(error)) {
        navigation.navigate("Login");
        return;
      }
      setErrorMessage(getErrorMessage(error, "收藏操作失败"));
    } finally {
      setActing(null);
    }
  }

  async function handleReserve() {
    if (!(await requireLogin()) || !book) {
      return;
    }

    try {
      setActing("reserve");
      await reservationService.createReservation(book.bookId);
      emitAppEvent("reservations");
      emitAppEvent("books");
      emitAppEvent("overview");
      await loadBookDetail(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "预约失败"));
    } finally {
      setActing(null);
    }
  }

  async function handleCreateReview() {
    if (!(await requireLogin()) || !book) {
      return;
    }

    if (!commentText.trim()) {
      setErrorMessage("请填写评论内容");
      return;
    }

    try {
      setActing("review");
      await reviewService.createReview({
        bookId: book.bookId,
        rating,
        commentText: commentText.trim(),
      });
      setCommentText("");
      setRating(5);
      emitAppEvent("reviews");
      await loadBookDetail(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "评论提交失败"));
    } finally {
      setActing(null);
    }
  }

  return (
    <Screen title="图书详情" subtitle={`对应 Web 端详情页与评论模块，图书 ID: ${bookId}`}>
      {loading ? <Card><Text style={styles.helperText}>正在加载图书详情...</Text></Card> : null}
      {!loading && errorMessage ? (
        <ErrorCard
          message={errorMessage}
          onRetry={() => {
            void loadBookDetail(true);
          }}
        />
      ) : null}

      {!loading && !errorMessage && !book ? (
        <EmptyCard title="未找到该图书" description="它可能已下架，或者当前请求参数不正确。" />
      ) : null}

      {!loading && !errorMessage && book ? (
        <>
          <Card>
            <View style={styles.heroRow}>
              <CoverImage title={book.title} uri={book.coverUrl} style={styles.cover} />
              <View style={styles.heroBody}>
                <Text style={styles.title}>{book.title}</Text>
                <Text style={styles.meta}>{joinText(book.authorNames, "未知作者")}</Text>
                <View style={styles.badgeRow}>
                  <InfoPill label={`可借 ${book.availableCopies}`} tone={book.availableCopies > 0 ? "success" : "warning"} />
                  <InfoPill label={`总藏 ${book.totalCopies}`} />
                  {book.pendingReservationCount > 0 ? <InfoPill label={`排队 ${book.pendingReservationCount}`} tone="warning" /> : null}
                  {book.categoryName ? <InfoPill label={book.categoryName} /> : null}
                </View>
                {activeLoanId ? <InfoPill label="我已借阅" tone="primary" /> : null}
                {!activeLoanId && activeReservationStatus ? (
                  <InfoPill
                    label={activeReservationStatus === "AWAITING_PICKUP" ? "预约待取" : "预约排队中"}
                    tone="warning"
                  />
                ) : null}
              </View>
            </View>

            <View style={styles.actionRow}>
              {activeLoanId ? (
                <ActionButton
                  label="查看我的借阅"
                  onPress={() => navigation.navigate("LoanTracking", { loanId: activeLoanId })}
                />
              ) : null}
              {canBorrow ? (
                <ActionButton
                  label={acting === "borrow" ? "借阅中..." : "立即借阅"}
                  onPress={() => {
                    void handleBorrow();
                  }}
                  disabled={acting !== null}
                />
              ) : null}
              {canReserve ? (
                <ActionButton
                  label={acting === "reserve" ? "预约中..." : "预约取书"}
                  onPress={() => {
                    void handleReserve();
                  }}
                  tone="secondary"
                  disabled={acting !== null}
                />
              ) : null}
              <ActionButton
                label={favorite ? "取消收藏" : "加入收藏"}
                onPress={() => {
                  void handleToggleFavorite();
                }}
                tone={favorite ? "danger" : "secondary"}
                disabled={acting !== null}
              />
            </View>
          </Card>

          <Card>
            <SectionTitle>基本信息</SectionTitle>
            <InfoRow label="ISBN" value={book.isbn || "--"} />
            <InfoRow label="出版社" value={book.publisherName || "--"} />
            <InfoRow label="语言" value={book.language || "--"} />
            <InfoRow label="出版年" value={String(book.publishedYear || "--")} />
            <InfoRow label="资源模式" value={book.resourceMode || "--"} />
            <InfoRow label="当前排队" value={book.pendingReservationCount > 0 ? `${book.pendingReservationCount} 人` : "无人排队"} />
            <InfoRow label="平均评分" value={averageRating > 0 ? `${averageRating} / 5` : "--"} />
            <InfoRow label="评论数量" value={String(reviews.length)} />
            <InfoRow
              label="可借位置"
              value={availableLocations.length > 0 ? availableLocations.join(" / ") : "暂未标注"}
            />
          </Card>

          <Card>
            <SectionTitle>内容简介</SectionTitle>
            <Text style={styles.description}>{book.description || "暂无简介。"}</Text>
          </Card>

          <Card>
            <SectionTitle>线上资源</SectionTitle>
            {book.onlineAccessUrl ? (
              <>
                <Text style={styles.description}>
                  {book.onlineAccessType || "未标注"} · {book.onlineAccessUrl}
                </Text>
                <ActionButton
                  label="打开线上资源"
                  onPress={() => {
                    void Linking.openURL(book.onlineAccessUrl as string);
                  }}
                />
              </>
            ) : (
              <Text style={styles.description}>暂无线上资源访问地址。</Text>
            )}
          </Card>

          <Card>
            <SectionTitle>发表评论</SectionTitle>
            <Text style={styles.helperText}>评分</Text>
            <View style={styles.ratingRow}>
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
              placeholder="分享你的阅读体验"
              placeholderTextColor={colors.textMuted}
              style={styles.reviewInput}
            />
            <ActionButton
              label={acting === "review" ? "提交中..." : "提交评论"}
              onPress={() => {
                void handleCreateReview();
              }}
              disabled={acting !== null}
            />
          </Card>

          <Card>
            <SectionTitle>读者评论</SectionTitle>
            {reviews.length === 0 ? (
              <Text style={styles.helperText}>暂无评论，欢迎发布第一条评价。</Text>
            ) : (
              reviews.map((item) => (
                <View key={item.reviewId} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewUser}>{item.username}</Text>
                    <Text style={styles.reviewMeta}>{String(item.createTime ?? "").slice(0, 10)}</Text>
                  </View>
                  <Text style={styles.reviewMeta}>评分 {item.rating} / 5</Text>
                  <Text style={styles.reviewContent}>{item.commentText || "该用户未填写文字评论。"}</Text>
                </View>
              ))
            )}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  helperText: {
    color: colors.textMuted,
    lineHeight: 21,
  },
  heroRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  cover: {
    width: 86,
    height: 120,
  },
  heroBody: {
    flex: 1,
    gap: 6,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  meta: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  actionRow: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 14,
  },
  infoValue: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
  },
  description: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 24,
  },
  ratingRow: {
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
  reviewInput: {
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
  reviewCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.xs,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  reviewUser: {
    color: colors.text,
    fontWeight: "800",
  },
  reviewMeta: {
    color: colors.textMuted,
  },
  reviewContent: {
    color: colors.text,
    lineHeight: 22,
  },
});
