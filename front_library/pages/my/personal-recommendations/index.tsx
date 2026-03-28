import React, { useMemo } from "react";
import useSWR from "swr";
import { useRouter } from "next/router";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Skeleton,
  Tooltip,
} from "@heroui/react";
import { Icon } from "@iconify/react";

import { AppImage } from "@/components/common/AppImage";
import DefaultLayout from "@/components/layouts/default";
import {
  personalRecommendationService,
  PersonalRecommendationResponse,
  RecommendedBook,
} from "@/services/api/personalRecommendationService";

/**
 * 推荐板块配置：每个策略对应一个可视化区块。
 */
interface RecommendationSection {
  key: keyof PersonalRecommendationResponse;
  title: string;
  subtitle: string;
  icon: string;
  gradientFrom: string;
  gradientTo: string;
  emptyText: string;
}

const SECTIONS: RecommendationSection[] = [
  {
    key: "byCategory",
    title: "分类偏好推荐",
    subtitle: "根据您借阅/收藏的图书分类，为您推荐同类新书",
    icon: "solar:widget-2-bold-duotone",
    gradientFrom: "rgba(59,130,246,0.18)",
    gradientTo: "rgba(37,99,235,0.06)",
    emptyText: "您还没有借阅或收藏记录，暂无分类偏好推荐。",
  },
  {
    key: "byAuthor",
    title: "喜欢的作者",
    subtitle: "您读过的作者的其他作品",
    icon: "solar:pen-new-round-bold-duotone",
    gradientFrom: "rgba(168,85,247,0.18)",
    gradientTo: "rgba(126,34,206,0.06)",
    emptyText: "暂无基于作者的推荐，多借阅几本书试试哦。",
  },
  {
    key: "byCollaborative",
    title: "志同道合",
    subtitle: "与您有相似阅读品味的读者也在读",
    icon: "solar:users-group-rounded-bold-duotone",
    gradientFrom: "rgba(236,72,153,0.18)",
    gradientTo: "rgba(190,24,93,0.06)",
    emptyText: "暂未找到与您阅读行为相似的读者。",
  },
  {
    key: "byInterestTags",
    title: "兴趣标签匹配",
    subtitle: "根据您个人资料中的兴趣标签推荐",
    icon: "solar:tag-bold-duotone",
    gradientFrom: "rgba(34,197,94,0.18)",
    gradientTo: "rgba(21,128,61,0.06)",
    emptyText: "您还没有设置兴趣标签，前往个人中心添加吧。",
  },
  {
    key: "trending",
    title: "近期热门",
    subtitle: "大家都在借阅的图书",
    icon: "solar:fire-bold-duotone",
    gradientFrom: "rgba(245,158,11,0.18)",
    gradientTo: "rgba(180,83,9,0.06)",
    emptyText: "暂无热门图书数据。",
  },
];

/**
 * 推荐图书卡片组件。
 */
function BookCard({
  book,
  onPress,
}: {
  book: RecommendedBook;
  onPress: () => void;
}) {
  return (
    <Card
      isPressable
      className="border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(11,18,32,0.86))] shadow-[0_18px_40px_-30px_rgba(2,6,23,0.92)] transition-all duration-200 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_24px_60px_-20px_rgba(2,6,23,1)]"
      onPress={onPress}
    >
      <CardBody className="p-3">
        {/* 封面 */}
        <div className="relative mb-3 aspect-[3/4] overflow-hidden rounded-2xl bg-white/[0.06]">
          <AppImage
            alt={book.title}
            className="h-full w-full object-cover"
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            src={book.coverUrl}
            wrapperClassName="h-full w-full"
          />
          {book.categoryName ? (
            <div className="absolute left-2 top-2">
              <Chip
                className="border-none bg-black/60 text-white backdrop-blur-md"
                size="sm"
                variant="flat"
              >
                {book.categoryName}
              </Chip>
            </div>
          ) : null}
        </div>

        {/* 详情 */}
        <div className="space-y-2">
          <h3 className="line-clamp-2 text-sm font-bold text-white">
            {book.title}
          </h3>
          <p className="line-clamp-1 text-xs text-slate-400">
            {book.authorNames && book.authorNames.length > 0
              ? book.authorNames.join(", ")
              : "未知作者"}
          </p>
          {book.reason ? (
            <Tooltip content={book.reason} placement="bottom">
              <p className="line-clamp-1 cursor-help text-xs text-sky-400/80">
                <Icon
                  className="mr-1 inline-block align-text-bottom"
                  icon="solar:lightbulb-bold-duotone"
                  width={12}
                />
                {book.reason}
              </p>
            </Tooltip>
          ) : null}
          {book.availableCopies != null ? (
            <Chip
              color={book.availableCopies > 0 ? "success" : "warning"}
              size="sm"
              variant="flat"
            >
              {book.availableCopies > 0
                ? `可借 ${book.availableCopies} 册`
                : "暂无库存"}
            </Chip>
          ) : null}
          <Button
            className="w-full"
            color="primary"
            size="sm"
            variant="flat"
            onPress={onPress}
          >
            查看详情
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

/**
 * 推荐板块骨架屏。
 */
function SectionSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="aspect-[3/5] rounded-2xl" />
      ))}
    </div>
  );
}

/**
 * 个人推荐页面。
 */
export default function PersonalRecommendationsPage() {
  const router = useRouter();

  const {
    data,
    isLoading,
    error,
    mutate,
  } = useSWR<PersonalRecommendationResponse>(
    "personal-recommendations",
    () => personalRecommendationService.getRecommendations(6),
    { revalidateOnFocus: false },
  );

  /** 统计总推荐数 */
  const totalCount = useMemo(() => {
    if (!data) return 0;

    return (
      (data.byCategory?.length ?? 0) +
      (data.byAuthor?.length ?? 0) +
      (data.byCollaborative?.length ?? 0) +
      (data.byInterestTags?.length ?? 0) +
      (data.trending?.length ?? 0)
    );
  }, [data]);

  /** 非空的推荐板块 */
  const activeSections = useMemo(() => {
    if (!data) return [];

    return SECTIONS.filter((sec) => {
      const list = data[sec.key];

      return list && list.length > 0;
    });
  }, [data]);

  return (
    <DefaultLayout>
      <section className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 md:py-12">
        {/* Hero Banner */}
        <div className="mb-8 overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(10,15,28,0.86))] shadow-[0_28px_80px_-40px_rgba(2,6,23,0.88)]">
          <div className="relative px-6 py-8 md:px-8 md:py-10">
            <div className="absolute -left-10 top-0 h-40 w-40 rounded-full bg-indigo-500/12 blur-3xl" />
            <div className="absolute right-0 bottom-0 h-40 w-40 rounded-full bg-pink-500/10 blur-3xl" />
            <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl space-y-3">
                <p className="text-sm uppercase tracking-[0.32em] text-indigo-200/75">
                  Personal Recommendations
                </p>
                <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">
                  为您推荐
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                  基于您的借阅历史、收藏偏好、兴趣标签以及与其他读者的阅读重叠度，系统为您精选了以下图书。
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] border border-indigo-400/20 bg-[linear-gradient(135deg,rgba(99,102,241,0.16),rgba(99,102,241,0.05))] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-indigo-200">
                    推荐图书
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {isLoading ? "..." : totalCount} 本
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    多维度智能推荐
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    推荐维度
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {isLoading ? "..." : activeSections.length} 个
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    分类 · 作者 · 协同 · 标签 · 热门
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error state */}
        {error ? (
          <Card className="mb-6 border border-danger-500/30 bg-danger-500/10 shadow-none">
            <CardBody className="flex flex-row items-center gap-3 p-5 text-danger-100">
              <Icon icon="solar:danger-triangle-bold" width={20} />
              <span>推荐数据加载失败，请稍后刷新重试。</span>
              <Button
                className="ml-auto"
                color="danger"
                size="sm"
                variant="flat"
                onPress={() => mutate()}
              >
                重试
              </Button>
            </CardBody>
          </Card>
        ) : null}

        {/* Loading state */}
        {isLoading ? (
          <div className="space-y-10">
            {SECTIONS.slice(0, 3).map((sec) => (
              <div key={sec.key}>
                <Skeleton className="mb-4 h-8 w-48 rounded-xl" />
                <SectionSkeleton />
              </div>
            ))}
          </div>
        ) : null}

        {/* Recommendation Sections */}
        {!isLoading && data ? (
          <div className="space-y-10">
            {SECTIONS.map((sec) => {
              const books = data[sec.key];

              if (!books || books.length === 0) {
                return null;
              }

              return (
                <div key={sec.key}>
                  {/* 板块标题 */}
                  <div className="mb-5 flex items-center gap-3">
                    <div
                      className="rounded-2xl p-2.5"
                      style={{
                        background: `linear-gradient(135deg, ${sec.gradientFrom}, ${sec.gradientTo})`,
                      }}
                    >
                      <Icon
                        className="text-white"
                        icon={sec.icon}
                        width={22}
                      />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {sec.title}
                      </h2>
                      <p className="text-sm text-slate-400">{sec.subtitle}</p>
                    </div>
                    <Chip
                      className="ml-auto border-white/10 text-slate-300"
                      size="sm"
                      variant="bordered"
                    >
                      {books.length} 本
                    </Chip>
                  </div>

                  {/* 图书网格 */}
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    {books.map((book) => (
                      <BookCard
                        key={`${sec.key}-${book.bookId}`}
                        book={book}
                        onPress={() => router.push(`/books/${book.bookId}`)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* 所有策略都为空 */}
            {activeSections.length === 0 ? (
              <Card className="border border-dashed border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.7),rgba(30,41,59,0.46))] shadow-none">
                <CardBody className="py-16 text-center text-slate-400">
                  <Icon
                    className="mx-auto mb-3 opacity-50"
                    icon="solar:lightbulb-bolt-bold-duotone"
                    width={48}
                  />
                  <p className="text-base font-medium text-slate-200">
                    暂时还没有足够的数据为您生成推荐
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    多借阅、收藏几本图书，或在个人中心添加兴趣标签，推荐引擎就能为您工作了。
                  </p>
                  <div className="mt-6 flex justify-center gap-3">
                    <Button
                      color="primary"
                      startContent={
                        <Icon icon="solar:magnifer-linear" width={16} />
                      }
                      onPress={() => router.push("/books")}
                    >
                      去发现图书
                    </Button>
                    <Button
                      className="border-white/15 text-slate-200"
                      startContent={
                        <Icon icon="solar:user-circle-bold" width={16} />
                      }
                      variant="bordered"
                      onPress={() => router.push("/my/profile")}
                    >
                      完善个人资料
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ) : null}
          </div>
        ) : null}
      </section>
    </DefaultLayout>
  );
}
