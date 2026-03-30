import React, { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { mutate as globalMutate } from "swr";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Pagination,
  Skeleton,
  Tab,
  Tabs,
  Textarea,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { useRouter } from "next/router";

import DefaultLayout from "@/components/layouts/default";
import { RequestErrorCard } from "@/components/common/RequestErrorCard";
import { AppImage } from "@/components/common/AppImage";
import { useAuth } from "@/config/authContext";
import { useDebounce } from "@/hooks/useDebounce";
import { getApiErrorMessage } from "@/lib/apiError";
import { authService } from "@/services/api/authService";
import { bookService } from "@/services/api/bookService";
import {
  recommendationService,
  RecommendationPost,
} from "@/services/api/recommendationService";
import { Book } from "@/types/book";
import { ApiRecommendationScope } from "@/types/api";
import { hasRole } from "@/utils/rbac";

const scopeOptions: Array<{ key: ApiRecommendationScope; label: string; icon: string }> = [
  { key: "all", label: "全部推荐", icon: "solar:global-bold" },
  { key: "following", label: "关注中", icon: "solar:star-bold" },
  { key: "mine", label: "我的发布", icon: "solar:user-circle-bold" },
];

const identityLabelMap: Record<string, string> = {
  TEACHER: "教师推荐人",
  ADMIN: "管理员推荐",
  STAFF: "馆员",
  STUDENT: "学生",
  VISITOR: "访客",
};

function formatTime(value: string) {
  return new Date(value).toLocaleString("zh-CN");
}

export default function RecommendationFeedPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [scope, setScope] = useState<ApiRecommendationScope>("all");
  const [page, setPage] = useState(1);
  const [bookKeyword, setBookKeyword] = useState("");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actingPostId, setActingPostId] = useState<number | null>(null);
  const debouncedKeyword = useDebounce(bookKeyword, 250);

  const { data: profile } = useSWR("my-profile", authService.getProfile);
  const canPublish = hasRole(user, "ADMIN") || profile?.identityType === "TEACHER";
  const highlightId = useMemo(() => {
    const raw = router.query.highlight;
    const value = Array.isArray(raw) ? raw[0] : raw;

    return value ? Number(value) : null;
  }, [router.query.highlight]);

  const {
    data: feedPage,
    error,
    isLoading,
    mutate,
  } = useSWR(
    ["recommendation-feed", scope, page],
    () => recommendationService.getFeed(scope, page - 1, 10),
  );
  const { data: searchResults = [], isLoading: searchingBooks } = useSWR(
    canPublish && debouncedKeyword.trim().length > 0
      ? ["recommendation-book-search", debouncedKeyword.trim()]
      : null,
    () => bookService.getBooks({ keyword: debouncedKeyword.trim(), size: 6 }),
  );

  const posts = feedPage?.content ?? [];
  const totalPages = feedPage?.totalPages ?? 1;

  useEffect(() => {
    setPage(1);
  }, [scope]);

  useEffect(() => {
    if (!highlightId || posts.length === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      document.getElementById(`recommendation-${highlightId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [highlightId, posts]);

  const handleCreatePost = async () => {
    if (!selectedBook?.bookId) {
      toast.error("请先选择一本图书");

      return;
    }

    if (!content.trim()) {
      toast.error("请填写推荐理由");

      return;
    }

    setSubmitting(true);
    try {
      await recommendationService.createPost({
        bookId: selectedBook.bookId,
        content: content.trim(),
      });
      toast.success("推荐已发布");
      setContent("");
      setBookKeyword("");
      setSelectedBook(null);
      await Promise.all([
        mutate(),
        globalMutate(
          (key) => Array.isArray(key) && key[0] === "my-notifications-page",
          undefined,
          { revalidate: true },
        ),
      ]);
    } catch (requestError: unknown) {
      toast.error(getApiErrorMessage(requestError, "发布推荐失败"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLike = async (post: RecommendationPost) => {
    setActingPostId(post.postId);
    try {
      if (post.likedByMe) {
        await recommendationService.unlikePost(post.postId);
      } else {
        await recommendationService.likePost(post.postId);
      }
      await mutate();
    } catch (requestError: unknown) {
      toast.error(getApiErrorMessage(requestError, "操作失败"));
    } finally {
      setActingPostId(null);
    }
  };

  const handleToggleFollow = async (post: RecommendationPost) => {
    setActingPostId(post.postId);
    try {
      if (post.followingAuthor) {
        await recommendationService.unfollowTeacher(post.authorUserId);
      } else {
        await recommendationService.followTeacher(post.authorUserId);
      }
      await mutate();
    } catch (requestError: unknown) {
      toast.error(getApiErrorMessage(requestError, "关注操作失败"));
    } finally {
      setActingPostId(null);
    }
  };

  const handleDelete = async (postId: number) => {
    if (!confirm("确认删除这条推荐动态？")) {
      return;
    }

    setActingPostId(postId);
    try {
      await recommendationService.deletePost(postId);
      toast.success("推荐已删除");
      await mutate();
    } catch (requestError: unknown) {
      toast.error(getApiErrorMessage(requestError, "删除失败"));
    } finally {
      setActingPostId(null);
    }
  };

  return (
    <DefaultLayout>
      <section className="container mx-auto max-w-6xl px-4 py-8 min-h-screen">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-bold">推荐动态</h1>
          <p className="text-default-500">
            老师可以像发动态一样推荐图书，学生和读者可以点赞、关注并持续追踪荐书内容。
          </p>
        </div>

        {canPublish ? (
          <Card className="mb-8 border border-default-100 shadow-sm">
            <CardHeader className="px-5 pb-0 pt-5">
              <div>
                <h2 className="text-lg font-semibold">发布老师推荐</h2>
                <p className="text-sm text-default-400">先选书，再写推荐理由。</p>
              </div>
            </CardHeader>
            <CardBody className="space-y-4 px-5 pb-5 pt-4">
              <Input
                isClearable
                label="检索图书"
                labelPlacement="outside"
                placeholder="输入书名、作者或 ISBN"
                value={bookKeyword}
                onClear={() => setBookKeyword("")}
                onValueChange={setBookKeyword}
              />

              {bookKeyword.trim() ? (
                <div className="rounded-2xl border border-default-100 bg-default-50 p-3">
                  <p className="mb-2 text-sm font-medium text-default-600">候选图书</p>
                  {searchingBooks ? (
                    <div className="space-y-2">
                      <Skeleton className="h-14 rounded-xl" />
                      <Skeleton className="h-14 rounded-xl" />
                    </div>
                  ) : searchResults.length === 0 ? (
                    <p className="text-sm text-default-400">没有找到匹配图书</p>
                  ) : (
                    <div className="space-y-2">
                      {searchResults.map((book) => (
                        <button
                          key={book.bookId}
                          className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                            selectedBook?.bookId === book.bookId
                              ? "border-primary bg-primary-50"
                              : "border-default-100 bg-white hover:border-primary/40"
                          }`}
                          type="button"
                          onClick={() => setSelectedBook(book)}
                        >
                          <div className="h-14 w-10 overflow-hidden rounded-lg bg-default-100">
                            <AppImage
                              alt={book.title}
                              className="h-full w-full object-cover"
                              fill
                              sizes="40px"
                              src={book.coverUrl}
                              wrapperClassName="h-full w-full"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{book.title}</p>
                            <p className="truncate text-xs text-default-400">
                              {book.authorNames.join(", ") || "未知作者"}
                            </p>
                          </div>
                          <Chip color="primary" size="sm" variant="flat">
                            选择
                          </Chip>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {selectedBook ? (
                <div className="rounded-2xl border border-primary-100 bg-primary-50 p-4">
                  <p className="text-sm font-medium">已选择图书</p>
                  <p className="mt-1 font-semibold">{selectedBook.title}</p>
                  <p className="text-xs text-default-500">
                    {selectedBook.authorNames.join(", ") || "未知作者"}
                  </p>
                </div>
              ) : null}

              <Textarea
                label="推荐理由"
                labelPlacement="outside"
                minRows={4}
                placeholder="例如：适合课程配套阅读、案例讲解清晰、对入门很友好"
                value={content}
                onValueChange={setContent}
              />

              <div className="flex justify-end">
                <Button
                  color="primary"
                  isLoading={submitting}
                  onPress={() => void handleCreatePost()}
                >
                  发布推荐
                </Button>
              </div>
            </CardBody>
          </Card>
        ) : (
          <Card className="mb-8 border border-warning-200 bg-warning-50 shadow-none">
            <CardBody className="px-5 py-4 text-sm text-warning-800">
              当前账号可以浏览和关注推荐；若要发布老师推荐，请将个人身份设置为“教师”。
            </CardBody>
          </Card>
        )}

        <Tabs
          aria-label="recommendation scope"
          classNames={{
            tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider",
            cursor: "w-full bg-primary",
            tab: "max-w-fit px-0 h-12",
            tabContent: "group-data-[selected=true]:text-primary",
          }}
          color="primary"
          selectedKey={scope}
          variant="underlined"
          onSelectionChange={(key) => setScope(key as ApiRecommendationScope)}
        >
          {scopeOptions.map((item) => (
            <Tab
              key={item.key}
              title={(
                <div className="flex items-center gap-2">
                  <Icon icon={item.icon} />
                  <span>{item.label}</span>
                </div>
              )}
            />
          ))}
        </Tabs>

        <div className="mt-6 space-y-4">
          {error ? (
            <RequestErrorCard
              message={getApiErrorMessage(error, "推荐动态加载失败，请稍后重试。")}
              title="推荐动态加载失败"
              onRetry={() => void mutate()}
            />
          ) : isLoading ? (
            <>
              <Skeleton className="h-56 rounded-3xl" />
              <Skeleton className="h-56 rounded-3xl" />
            </>
          ) : posts.length === 0 ? (
            <Card className="border border-dashed border-default-200 shadow-none">
              <CardBody className="py-16 text-center text-default-400">
                <Icon className="mx-auto mb-3 opacity-40" icon="solar:chat-round-bold-duotone" width={52} />
                <p className="font-medium">当前还没有推荐动态</p>
                <p className="mt-1 text-sm">
                  {scope === "following" ? "先关注一位老师，再回来查看关注流。" : "第一条老师荐书动态会出现在这里。"}
                </p>
              </CardBody>
            </Card>
          ) : (
            posts.map((post) => {
              const isOwnPost = post.authorUserId === user?.userId;

              return (
                <Card
                  key={post.postId}
                  id={`recommendation-${post.postId}`}
                  className={`border shadow-sm ${
                    highlightId === post.postId
                      ? "border-primary bg-primary-50 ring-2 ring-primary-200"
                      : "border-default-100"
                  }`}
                >
                  <CardBody className="gap-5 p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold">
                            {post.authorFullName || post.authorUsername}
                          </h2>
                          <Chip color="secondary" size="sm" variant="flat">
                            {identityLabelMap[post.authorIdentityType ?? ""] ?? "推荐人"}
                          </Chip>
                          {post.authorDepartment ? (
                            <Chip size="sm" variant="bordered">
                              {post.authorDepartment}
                            </Chip>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-default-400">{formatTime(post.createTime)}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {!isOwnPost ? (
                          <Button
                            color={post.followingAuthor ? "default" : "primary"}
                            isLoading={actingPostId === post.postId}
                            size="sm"
                            variant={post.followingAuthor ? "flat" : "solid"}
                            onPress={() => void handleToggleFollow(post)}
                          >
                            {post.followingAuthor ? "已关注" : "关注老师"}
                          </Button>
                        ) : null}
                        {post.canManage ? (
                          <Button
                            color="danger"
                            isLoading={actingPostId === post.postId}
                            size="sm"
                            variant="flat"
                            onPress={() => void handleDelete(post.postId)}
                          >
                            删除
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-default-100 bg-default-50 p-4">
                      <div className="flex gap-4">
                        <div className="h-28 w-20 overflow-hidden rounded-xl bg-default-100">
                          <AppImage
                            alt={post.bookTitle}
                            className="h-full w-full object-cover"
                            fill
                            sizes="80px"
                            src={post.bookCoverUrl}
                            wrapperClassName="h-full w-full"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-default-400">推荐图书</p>
                          <h3 className="line-clamp-2 text-lg font-semibold">{post.bookTitle}</h3>
                          <p className="mt-1 text-xs text-default-400">ISBN: {post.bookIsbn || "-"}</p>
                          <Button
                            className="mt-3"
                            color="primary"
                            size="sm"
                            variant="flat"
                            onPress={() => router.push(`/books/${post.bookId}`)}
                          >
                            查看图书
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white p-1 text-sm leading-7 text-default-700">
                      {post.content}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-default-100 pt-4">
                      <div className="flex items-center gap-2 text-sm text-default-500">
                        <Icon icon="solar:heart-bold" width={16} />
                        <span>{post.likeCount} 人点赞</span>
                      </div>
                      <Button
                        color={post.likedByMe ? "danger" : "default"}
                        isLoading={actingPostId === post.postId}
                        size="sm"
                        variant={post.likedByMe ? "flat" : "bordered"}
                        onPress={() => void handleToggleLike(post)}
                      >
                        {post.likedByMe ? "取消点赞" : "点赞"}
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              );
            })
          )}
        </div>

        {totalPages > 1 ? (
          <div className="mt-6 flex justify-center">
            <Pagination
              color="primary"
              page={page}
              showControls
              total={totalPages}
              onChange={setPage}
            />
          </div>
        ) : null}
      </section>
    </DefaultLayout>
  );
}
