/**
 * @file 推荐动态页面
 * @description 对应 Web 端老师荐书流、点赞和关注语义。
 *
 *   页面结构：
 *   1. 概要卡片 - 当前动态数/已关注/已点赞统计
 *   2. 发布推荐表单 - 图书检索 + 推荐理由（仅教师/管理员可见）
 *   3. 筛选范围 - 全部 / 关注 / 我的
 *   4. 动态列表 - 作者信息、图书信息、推荐内容、点赞/关注/删除操作
 *
 *   发布权限：仅 ADMIN 角色或 identityType === TEACHER 可发布
 *   事件驱动：监听 recommendations / notifications / auth 自动刷新
 */
import React, { useEffect, useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card, Screen, SectionTitle } from "../components/Screen";
import { ActionButton, CoverImage, EmptyCard, ErrorCard, InfoPill, LoginPromptCard, TextField } from "../components/Ui";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import type { RootStackParamList } from "../navigation/types";
import { authService } from "../services/auth";
import { bookService } from "../services/book";
import { getErrorMessage } from "../services/http";
import { recommendationService, type RecommendationPost } from "../services/recommendation";
import { useAuth } from "../store/auth";
import { colors, radius, spacing } from "../theme";
import type { ApiRecommendationScope, ApiUserProfileDto } from "../types/api";
import type { Book } from "../types/book";
import { emitAppEvent, subscribeAppEvent } from "../utils/events";

const scopes: ApiRecommendationScope[] = ["all", "following", "mine"];
const scopeLabelMap: Record<ApiRecommendationScope, string> = {
  all: "全部",
  following: "关注",
  mine: "我的",
};

export function RecommendationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Recommendations">>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ApiUserProfileDto | null>(null);
  const [scope, setScope] = useState<ApiRecommendationScope>("all");
  const [posts, setPosts] = useState<RecommendationPost[]>([]);
  const [bookKeyword, setBookKeyword] = useState("");
  const debouncedKeyword = useDebouncedValue(bookKeyword, 300);
  const [bookOptions, setBookOptions] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const canPublish = useMemo(
    () => Boolean(user && (user.roles.includes("ADMIN") || profile?.identityType === "TEACHER")),
    [user, profile],
  );

  async function loadData(isRefresh = false) {
    if (!user) {
      setLoading(false);
      return;
    }

    if (!isRefresh) {
      setLoading(true);
    }

    setErrorMessage("");
    try {
      const [feed, nextProfile] = await Promise.all([
        recommendationService.getFeed(scope, 0, 20),
        authService.getMyProfile(),
      ]);
      setPosts(feed.content ?? []);
      setProfile(nextProfile);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "推荐动态加载失败"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [user, scope]);

  useEffect(() => {
    return subscribeAppEvent((event) => {
      if (event === "recommendations" || event === "notifications" || event === "auth") {
        void loadData(true);
      }
    });
  }, [user, scope]);

  useEffect(() => {
    if (!debouncedKeyword.trim() || !canPublish) {
      setBookOptions([]);
      return;
    }

    void bookService.getBooks({
      keyword: debouncedKeyword.trim(),
      page: 0,
      size: 6,
    })
      .then((response) => setBookOptions(response.items))
      .catch(() => setBookOptions([]));
  }, [debouncedKeyword, canPublish]);

  /** 发布新推荐 */
  async function handleCreate() {
    if (!selectedBook?.bookId) {
      setErrorMessage("请先选择一本图书");
      return;
    }

    if (!content.trim()) {
      setErrorMessage("请填写推荐理由");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    try {
      await recommendationService.createPost({
        bookId: selectedBook.bookId,
        content: content.trim(),
      });
      setBookKeyword("");
      setSelectedBook(null);
      setContent("");
      emitAppEvent("recommendations");
      emitAppEvent("notifications");
      await loadData(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "发布推荐失败"));
    } finally {
      setSubmitting(false);
    }
  }

  /** 点赞/取消点赞 */
  async function handleLike(post: RecommendationPost) {
    try {
      setActingId(post.postId);
      if (post.likedByMe) {
        await recommendationService.unlikePost(post.postId);
      } else {
        await recommendationService.likePost(post.postId);
      }
      emitAppEvent("recommendations");
      await loadData(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "点赞操作失败"));
    } finally {
      setActingId(null);
    }
  }

  /** 关注/取关注推荐人 */
  async function handleFollow(post: RecommendationPost) {
    try {
      setActingId(post.postId);
      if (post.followingAuthor) {
        await recommendationService.unfollowTeacher(post.authorUserId);
      } else {
        await recommendationService.followTeacher(post.authorUserId);
      }
      emitAppEvent("recommendations");
      await loadData(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "关注操作失败"));
    } finally {
      setActingId(null);
    }
  }

  /** 删除推荐 */
  async function handleDelete(postId: number) {
    try {
      setActingId(postId);
      await recommendationService.deletePost(postId);
      emitAppEvent("recommendations");
      await loadData(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "删除推荐失败"));
    } finally {
      setActingId(null);
    }
  }

  if (!user) {
    return (
      <Screen title="推荐动态" subtitle="老师荐书和阅读推荐">
        <LoginPromptCard onLogin={() => navigation.navigate("Login")} />
      </Screen>
    );
  }

  return (
    <Screen title="推荐动态" subtitle="浏览推荐书目、关注和互动">
      <Card tone="tinted" style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryIconWrap}>
            <MaterialCommunityIcons name="star-box-outline" size={26} color={colors.primaryDark} />
          </View>
          <View style={styles.summaryBody}>
            <InfoPill label="阅读推荐" tone="primary" icon="star-outline" />
            <Text style={styles.summaryTitle}>发现老师和读者的荐书内容</Text>
            <Text style={styles.summaryText}>你可以浏览、点赞、关注推荐人；教师或管理员还能直接发布荐书动态。</Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <StatCard icon="text-box-check-outline" value={posts.length} label="当前动态" />
          <StatCard icon="account-check-outline" value={posts.filter((item) => item.followingAuthor).length} label="已关注" />
          <StatCard icon="heart-outline" value={posts.filter((item) => item.likedByMe).length} label="已点赞" />
        </View>
      </Card>

      {canPublish ? (
        <Card style={styles.sectionCard}>
          <SectionTitle>发布推荐</SectionTitle>
          <TextField
            label="图书检索"
            icon="magnify"
            value={bookKeyword}
            onChangeText={setBookKeyword}
            placeholder="检索要推荐的图书"
          />
          {bookOptions.length > 0 ? (
            <View style={styles.optionWrap}>
              {bookOptions.map((item) => (
                <Pressable
                  key={item.bookId}
                  style={[styles.optionCard, selectedBook?.bookId === item.bookId ? styles.highlightCard : undefined]}
                  onPress={() => setSelectedBook(item)}
                >
                  <Text style={styles.optionTitle}>{item.title}</Text>
                  <Text style={styles.optionMeta}>{item.authorNames.join(", ") || "未知作者"}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {selectedBook ? (
            <View style={styles.selectedBookCard}>
              <CoverImage title={selectedBook.title} uri={selectedBook.coverUrl} />
              <View style={styles.selectedBookBody}>
                <Text style={styles.optionTitle}>{selectedBook.title}</Text>
                <Text style={styles.optionMeta}>{selectedBook.authorNames.join(", ") || "未知作者"}</Text>
              </View>
            </View>
          ) : null}
          <TextField
            label="推荐理由"
            icon="text-box-outline"
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={4}
            placeholder="推荐理由"
          />
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          <ActionButton
            label={submitting ? "发布中..." : "发布推荐"}
            icon="send-outline"
            onPress={() => {
              void handleCreate();
            }}
            disabled={submitting}
          />
        </Card>
      ) : (
        <Card>
          <Text style={styles.helperText}>当前账号可以浏览、点赞和关注推荐；发布功能仅对教师或管理员开放。</Text>
        </Card>
      )}

      <Card style={styles.sectionCard}>
        <SectionTitle>筛选范围</SectionTitle>
        <View style={styles.scopeRow}>
          {scopes.map((item) => (
            <Pressable
              key={item}
              style={[styles.scopeChip, scope === item ? styles.scopeChipActive : undefined]}
              onPress={() => setScope(item)}
            >
              <Text style={scope === item ? styles.scopeChipActiveText : styles.scopeChipText}>{scopeLabelMap[item]}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {loading ? (
        <Card tone="muted">
          <Text style={styles.helperText}>正在加载推荐动态...</Text>
        </Card>
      ) : null}

      {!loading && errorMessage ? (
        <ErrorCard
          message={errorMessage}
          onRetry={() => {
            void loadData(true);
          }}
        />
      ) : null}

      {!loading && !errorMessage ? (
        <Card style={styles.sectionCard}>
          <SectionTitle>动态列表</SectionTitle>
          {posts.length === 0 ? (
            <EmptyCard title="当前没有推荐动态" />
          ) : (
            posts.map((post) => (
              <View
                key={post.postId}
                style={[
                  styles.postCard,
                  route.params?.highlightId === post.postId ? styles.highlightCard : undefined,
                ]}
              >
                <View style={styles.rowBetween}>
                  <View style={styles.postHeader}>
                    <View style={styles.authorAvatar}>
                      <Text style={styles.authorAvatarText}>{(post.authorFullName || post.authorUsername).slice(0, 1)}</Text>
                    </View>
                    <View style={styles.postHeaderBody}>
                      <Text style={styles.postAuthor}>{post.authorFullName || post.authorUsername}</Text>
                      <Text style={styles.optionMeta}>{post.createTime.slice(0, 16).replace("T", " ")}</Text>
                    </View>
                  </View>
                  <InfoPill label={post.authorIdentityType || "推荐人"} tone="primary" icon="badge-account-outline" />
                </View>

                <View style={styles.bookRow}>
                  <CoverImage title={post.bookTitle} uri={post.bookCoverUrl} />
                  <View style={styles.bookBody}>
                    <Text style={styles.optionTitle}>{post.bookTitle}</Text>
                    <Text style={styles.optionMeta}>{post.bookIsbn || "-"}</Text>
                    {post.authorDepartment ? <Text style={styles.optionMeta}>{post.authorDepartment}</Text> : null}
                  </View>
                </View>

                <Text style={styles.postContent}>{post.content}</Text>

                <View style={styles.actionRow}>
                  <ActionButton
                    label={actingId === post.postId ? "处理中..." : post.likedByMe ? `取消点赞 ${post.likeCount}` : `点赞 ${post.likeCount}`}
                    icon={post.likedByMe ? "heart" : "heart-outline"}
                    onPress={() => {
                      void handleLike(post);
                    }}
                    tone={post.likedByMe ? "danger" : "secondary"}
                    size="sm"
                    disabled={actingId !== null}
                  />
                  {post.authorUserId !== user.userId ? (
                    <ActionButton
                      label={post.followingAuthor ? "已关注" : "关注老师"}
                      icon={post.followingAuthor ? "account-check-outline" : "account-plus-outline"}
                      onPress={() => {
                        void handleFollow(post);
                      }}
                      tone="secondary"
                      size="sm"
                      disabled={actingId !== null}
                    />
                  ) : null}
                  {post.canManage ? (
                    <ActionButton
                      label="删除"
                      icon="trash-can-outline"
                      onPress={() => {
                        void handleDelete(post.postId);
                      }}
                      tone="danger"
                      size="sm"
                      disabled={actingId !== null}
                    />
                  ) : null}
                  <ActionButton
                    label="查看图书"
                    icon="book-open-variant"
                    onPress={() => navigation.navigate("BookDetail", { bookId: post.bookId })}
                    tone="secondary"
                    size="sm"
                  />
                </View>
              </View>
            ))
          )}
        </Card>
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
  sectionCard: {
    gap: spacing.md,
  },
  helperText: {
    color: colors.textMuted,
    lineHeight: 21,
  },
  errorText: {
    color: colors.danger,
    lineHeight: 21,
  },
  optionWrap: {
    gap: spacing.sm,
  },
  optionCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  selectedBookCard: {
    flexDirection: "row",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  selectedBookBody: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  highlightCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  optionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21,
  },
  optionMeta: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  scopeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  scopeChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  scopeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  scopeChipText: {
    color: colors.text,
    fontWeight: "600",
  },
  scopeChipActiveText: {
    color: colors.white,
    fontWeight: "700",
  },
  postCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    gap: spacing.sm,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    alignItems: "center",
  },
  postHeader: {
    flexDirection: "row",
    gap: spacing.sm,
    flex: 1,
    alignItems: "center",
  },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  authorAvatarText: {
    color: colors.primaryDark,
    fontWeight: "800",
  },
  postHeaderBody: {
    flex: 1,
    gap: 2,
  },
  postAuthor: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  bookRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  bookBody: {
    flex: 1,
    gap: 4,
    justifyContent: "center",
  },
  postContent: {
    color: colors.text,
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
