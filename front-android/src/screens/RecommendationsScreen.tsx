import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card, Screen, SectionTitle } from "../components/Screen";
import { ActionButton, CoverImage, EmptyCard, ErrorCard, InfoPill, LoginPromptCard } from "../components/Ui";
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
      <Screen title="推荐动态" subtitle="对应 Web 端老师荐书流、点赞和关注语义。">
        <LoginPromptCard onLogin={() => navigation.navigate("Login")} />
      </Screen>
    );
  }

  return (
    <Screen title="推荐动态" subtitle="对应 Web 端 `/my/recommendations` 的推荐流、关注和点赞。">
      {canPublish ? (
        <Card>
          <SectionTitle>发布推荐</SectionTitle>
          <TextInput
            value={bookKeyword}
            onChangeText={setBookKeyword}
            placeholder="检索要推荐的图书"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
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
          <TextInput
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={4}
            placeholder="推荐理由"
            placeholderTextColor={colors.textMuted}
            style={styles.textarea}
          />
          <ActionButton
            label={submitting ? "发布中..." : "发布推荐"}
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

      <Card>
        <SectionTitle>筛选范围</SectionTitle>
        <View style={styles.scopeRow}>
          {scopes.map((item) => (
            <ActionButton
              key={item}
              label={scopeLabelMap[item]}
              onPress={() => setScope(item)}
              tone={scope === item ? "primary" : "secondary"}
            />
          ))}
        </View>
      </Card>

      {loading ? <Card><Text style={styles.helperText}>正在加载推荐动态...</Text></Card> : null}
      {!loading && errorMessage ? (
        <ErrorCard
          message={errorMessage}
          onRetry={() => {
            void loadData(true);
          }}
        />
      ) : null}

      {!loading && !errorMessage ? (
        <Card>
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
                    <Text style={styles.postAuthor}>{post.authorFullName || post.authorUsername}</Text>
                    <Text style={styles.optionMeta}>{post.createTime.slice(0, 16).replace("T", " ")}</Text>
                  </View>
                  <InfoPill label={post.authorIdentityType || "推荐人"} tone="primary" />
                </View>
                <View style={styles.bookRow}>
                  <CoverImage title={post.bookTitle} uri={post.bookCoverUrl} />
                  <View style={styles.bookBody}>
                    <Text style={styles.optionTitle}>{post.bookTitle}</Text>
                    <Text style={styles.optionMeta}>{post.bookIsbn || "-"}</Text>
                  </View>
                </View>
                <Text style={styles.postContent}>{post.content}</Text>
                <View style={styles.actionRow}>
                  <ActionButton
                    label={actingId === post.postId ? "处理中..." : post.likedByMe ? `取消点赞 ${post.likeCount}` : `点赞 ${post.likeCount}`}
                    onPress={() => {
                      void handleLike(post);
                    }}
                    tone={post.likedByMe ? "danger" : "secondary"}
                    disabled={actingId !== null}
                  />
                  {post.authorUserId !== user.userId ? (
                    <ActionButton
                      label={post.followingAuthor ? "已关注" : "关注老师"}
                      onPress={() => {
                        void handleFollow(post);
                      }}
                      tone="secondary"
                      disabled={actingId !== null}
                    />
                  ) : null}
                  {post.canManage ? (
                    <ActionButton
                      label="删除"
                      onPress={() => {
                        void handleDelete(post.postId);
                      }}
                      tone="danger"
                      disabled={actingId !== null}
                    />
                  ) : null}
                  <ActionButton
                    label="查看图书"
                    onPress={() => navigation.navigate("BookDetail", { bookId: post.bookId })}
                    tone="secondary"
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

const styles = StyleSheet.create({
  helperText: {
    color: colors.textMuted,
    lineHeight: 21,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
  },
  textarea: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    textAlignVertical: "top",
  },
  optionWrap: {
    gap: spacing.sm,
  },
  optionCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  highlightCard: {
    borderColor: colors.primary,
    backgroundColor: "#f1faf7",
  },
  optionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  optionMeta: {
    color: colors.textMuted,
  },
  scopeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  postCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
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
    flex: 1,
    gap: 4,
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
