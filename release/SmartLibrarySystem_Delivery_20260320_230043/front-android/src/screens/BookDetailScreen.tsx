/**
 * @file 图书详情页面
 * @description 单本图书的完整详情屏幕，对应 Web 端详情页与评论模块。
 *
 *   页面结构：
 *   1. Hero 卡片 - 封面、标题、作者、可借/总藏/排队标签、借阅/预约/收藏状态
 *   2. 核心信息 - ISBN、出版社、语言、出版年、资源模式、排队、可借位置
 *   3. 内容简介
 *   4. 线上资源 - 在线访问 URL + 打开按钮
 *   5. 发表评论 - 评分 + 评论输入框
 *   6. 读者评论 - 已有评论列表
 *
 *   交互能力：
 *   - 立即借阅（自动选择可用副本）
 *   - 预约取书（无可借副本时）
 *   - 收藏/取消收藏
 *   - 发表评论
 *   - 所有写操作需要登录，未登录自动跳转登录页
 *
 *   事件驱动：
 *   - 监听 books / favorites / loans / reservations 事件自动刷新
 */
import React, { useEffect, useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card, Screen, SectionTitle } from "../components/Screen";
import { ActionButton, CoverImage, EmptyCard, ErrorCard, InfoPill, TextField } from "../components/Ui";
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

type AppIcon = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

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

  // 借阅条件：有书 + 未借 + 未预约 + 有可借副本
  const canBorrow = !!book && activeLoanId == null && activeReservationStatus == null && book.availableCopies > 0;
  // 预约条件：有书 + 未借 + 未预约 + 无可借副本
  const canReserve = !!book && activeLoanId == null && activeReservationStatus == null && book.availableCopies <= 0;
  const averageRating = useMemo(() => {
    if (reviews.length === 0) {
      return 0;
    }

    const total = reviews.reduce((sum, item) => sum + (item.rating ?? 0), 0);
    return Number((total / reviews.length).toFixed(1));
  }, [reviews]);

  /** 加载图书详情（并行获取图书信息、副本、评论）+ 用户态数据（收藏、借阅、预约） */
  async function loadBookDetail(isRefresh = false) {
    if (!isRefresh) {
      setLoading(true);
    }

    setErrorMessage("");

    try {
      const [nextBook, copies, reviewsPage] = await Promise.all([
        bookService.getBookById(bookId),
        bookCopyService.getByBookId(bookId).catch(() => []),
        reviewService.getBookReviews(bookId, 0, 50).catch(() => ({
          content: [],
          totalPages: 1,
          totalElements: 0,
          size: 50,
          number: 0,
          first: true,
          last: true,
          empty: true,
        })),
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
        try {
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
        } catch {
          setFavorite(false);
          setActiveLoanId(null);
          setActiveReservationStatus(null);
        }
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

  /** 确保用户已登录，未登录则跳转登录页 */
  async function requireLogin(): Promise<boolean> {
    if (user) {
      return true;
    }

    navigation.navigate("Login");
    return false;
  }

  /** 处理借阅：查找可用副本 → 创建借阅 → 发出事件通知 */
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

  /** 切换收藏状态 */
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

  /** 处理预约取书 */
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

  /** 提交评论 */
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
      {loading ? (
        <Card tone="muted">
          <Text style={styles.helperText}>正在加载图书详情...</Text>
        </Card>
      ) : null}

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
          <Card tone="tinted" style={styles.heroCard}>
            <View style={styles.heroRow}>
              <CoverImage title={book.title} uri={book.coverUrl} style={styles.cover} />
              <View style={styles.heroBody}>
                <InfoPill label="BOOK PROFILE" tone="primary" icon="book-open-page-variant-outline" />
                <Text style={styles.title}>{book.title}</Text>
                <Text style={styles.meta}>{joinText(book.authorNames, "未知作者")}</Text>
                <View style={styles.badgeRow}>
                  <InfoPill
                    label={`可借 ${book.availableCopies}`}
                    tone={book.availableCopies > 0 ? "success" : "warning"}
                    icon="book-check-outline"
                  />
                  <InfoPill label={`总藏 ${book.totalCopies}`} icon="bookshelf" />
                  {book.pendingReservationCount > 0 ? (
                    <InfoPill label={`排队 ${book.pendingReservationCount}`} tone="warning" icon="account-group-outline" />
                  ) : null}
                  {book.categoryName ? <InfoPill label={book.categoryName} icon="shape-outline" /> : null}
                </View>
                {activeLoanId ? <InfoPill label="我已借阅" tone="primary" icon="bookmark-check-outline" /> : null}
                {!activeLoanId && activeReservationStatus ? (
                  <InfoPill
                    label={activeReservationStatus === "AWAITING_PICKUP" ? "预约待取" : "预约排队中"}
                    tone="warning"
                    icon="calendar-clock-outline"
                  />
                ) : null}
              </View>
            </View>

            <View style={styles.metricRow}>
              <MiniMetric icon="star-outline" label="评分" value={averageRating > 0 ? `${averageRating}` : "--"} />
              <MiniMetric icon="comment-text-outline" label="评论" value={String(reviews.length)} />
              <MiniMetric icon="map-marker-radius-outline" label="可借点位" value={availableLocations.length > 0 ? `${availableLocations.length}` : "--"} />
            </View>

            <View style={styles.actionRow}>
              {activeLoanId ? (
                <ActionButton
                  label="查看我的借阅"
                  icon="book-arrow-right-outline"
                  onPress={() => navigation.navigate("LoanTracking", { loanId: activeLoanId })}
                  style={styles.actionButton}
                />
              ) : null}
              {canBorrow ? (
                <ActionButton
                  label={acting === "borrow" ? "借阅中..." : "立即借阅"}
                  icon="bookmark-plus-outline"
                  onPress={() => {
                    void handleBorrow();
                  }}
                  disabled={acting !== null}
                  style={styles.actionButton}
                />
              ) : null}
              {canReserve ? (
                <ActionButton
                  label={acting === "reserve" ? "预约中..." : "预约取书"}
                  icon="calendar-plus"
                  onPress={() => {
                    void handleReserve();
                  }}
                  tone="secondary"
                  disabled={acting !== null}
                  style={styles.actionButton}
                />
              ) : null}
              <ActionButton
                label={favorite ? "取消收藏" : "加入收藏"}
                icon={favorite ? "heart-off-outline" : "heart-outline"}
                onPress={() => {
                  void handleToggleFavorite();
                }}
                tone={favorite ? "danger" : "secondary"}
                disabled={acting !== null}
                style={styles.actionButton}
              />
            </View>
          </Card>

          <Card style={styles.sectionCard}>
            <SectionTitle>核心信息</SectionTitle>
            <View style={styles.infoBoard}>
              <InfoRow icon="barcode" label="ISBN" value={book.isbn || "--"} />
              <InfoRow icon="office-building-outline" label="出版社" value={book.publisherName || "--"} />
              <InfoRow icon="translate" label="语言" value={book.language || "--"} />
              <InfoRow icon="calendar-range" label="出版年" value={String(book.publishedYear || "--")} />
              <InfoRow icon="layers-outline" label="资源模式" value={book.resourceMode || "--"} />
              <InfoRow
                icon="account-group-outline"
                label="当前排队"
                value={book.pendingReservationCount > 0 ? `${book.pendingReservationCount} 人` : "无人排队"}
              />
              <InfoRow
                icon="map-marker-outline"
                label="可借位置"
                value={availableLocations.length > 0 ? availableLocations.join(" / ") : "暂未标注"}
              />
            </View>
          </Card>

          <Card style={styles.sectionCard}>
            <SectionTitle>内容简介</SectionTitle>
            <Text style={styles.description}>{book.description || "暂无简介。"}</Text>
          </Card>

          <Card style={styles.sectionCard}>
            <SectionTitle>线上资源</SectionTitle>
            {book.onlineAccessUrl ? (
              <>
                <View style={styles.resourceCard}>
                  <View style={styles.resourceIconWrap}>
                    <MaterialCommunityIcons name="web" size={20} color={colors.primaryDark} />
                  </View>
                  <View style={styles.resourceBody}>
                    <Text style={styles.resourceTitle}>{book.onlineAccessType || "未标注访问方式"}</Text>
                    <Text style={styles.resourceUrl}>{book.onlineAccessUrl}</Text>
                  </View>
                </View>
                <ActionButton
                  label="打开线上资源"
                  icon="open-in-new"
                  onPress={() => {
                    void Linking.openURL(book.onlineAccessUrl as string);
                  }}
                />
              </>
            ) : (
              <Text style={styles.description}>暂无线上资源访问地址。</Text>
            )}
          </Card>

          <Card style={styles.sectionCard}>
            <SectionTitle>发表评论</SectionTitle>
            <Text style={styles.helperText}>选择评分并分享你的阅读体验</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable
                  key={value}
                  style={({ pressed }) => [styles.starWrap, pressed ? styles.starWrapPressed : undefined]}
                  onPress={() => setRating(value)}
                >
                  <MaterialCommunityIcons
                    name={value <= rating ? "star" : "star-outline"}
                    size={24}
                    color={value <= rating ? colors.accent : colors.borderStrong}
                  />
                </Pressable>
              ))}
            </View>
            <TextField
              icon="message-text-outline"
              value={commentText}
              onChangeText={setCommentText}
              multiline
              numberOfLines={5}
              placeholder="分享你的阅读体验"
            />
            <ActionButton
              label={acting === "review" ? "提交中..." : "提交评论"}
              icon="send-outline"
              onPress={() => {
                void handleCreateReview();
              }}
              disabled={acting !== null}
            />
          </Card>

          <Card style={styles.sectionCard}>
            <SectionTitle>读者评论</SectionTitle>
            {reviews.length === 0 ? (
              <Text style={styles.helperText}>暂无评论，欢迎发布第一条评价。</Text>
            ) : (
              reviews.map((item) => (
                <View key={item.reviewId} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewUserRow}>
                      <View style={styles.reviewAvatar}>
                        <Text style={styles.reviewAvatarText}>
                          {(item.userFullName || item.username || "读").slice(0, 1)}
                        </Text>
                      </View>
                      <View style={styles.reviewUserBody}>
                        <Text style={styles.reviewUser}>{item.userFullName || item.username}</Text>
                        <Text style={styles.reviewMeta}>{String(item.createTime ?? "").slice(0, 10)}</Text>
                      </View>
                    </View>
                    <InfoPill label={`${item.rating} / 5`} tone="warning" icon="star-outline" />
                  </View>
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

/** 迷你指标卡片（评分/评论数/可借点位） */
function MiniMetric({
  icon,
  label,
  value,
}: {
  icon: AppIcon;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metricCard}>
      <MaterialCommunityIcons name={icon} size={16} color={colors.primaryDark} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

/** 信息行组件（核心信息面板中的一行） */
function InfoRow({
  icon,
  label,
  value,
}: {
  icon: AppIcon;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <MaterialCommunityIcons name={icon} size={16} color={colors.textSoft} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  helperText: {
    color: colors.textMuted,
    lineHeight: 21,
  },
  heroCard: {
    gap: spacing.md,
  },
  heroRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  cover: {
    width: 96,
    height: 136,
  },
  heroBody: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 32,
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
    marginTop: 2,
  },
  metricRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: 2,
  },
  metricValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  actionRow: {
    gap: spacing.sm,
  },
  actionButton: {
    width: "100%",
  },
  sectionCard: {
    gap: spacing.md,
  },
  infoBoard: {
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 14,
  },
  infoValue: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
  },
  description: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 24,
  },
  resourceCard: {
    flexDirection: "row",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  resourceIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  resourceBody: {
    flex: 1,
    gap: 4,
  },
  resourceTitle: {
    color: colors.text,
    fontWeight: "800",
  },
  resourceUrl: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  ratingRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  starWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  starWrapPressed: {
    opacity: 0.86,
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    alignItems: "center",
  },
  reviewUserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewAvatarText: {
    color: colors.primaryDark,
    fontWeight: "800",
  },
  reviewUserBody: {
    gap: 2,
    flex: 1,
  },
  reviewUser: {
    color: colors.text,
    fontWeight: "800",
  },
  reviewMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  reviewContent: {
    color: colors.text,
    lineHeight: 22,
  },
});
