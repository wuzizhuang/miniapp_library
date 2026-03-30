import { useEffect, useMemo, useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/router";
import useSWR from "swr";
import { Icon } from "@iconify/react";
import { Spinner } from "@heroui/react";

import { AppImage } from "@/components/common/AppImage";
import DefaultLayout from "@/components/layouts/default";
import { useAuth } from "@/config/authContext";
import { publicService } from "@/services/api/publicService";
import { userService } from "@/services/api/userService";
import { ApiHomeBookItem, ApiHomeCategoryItem, ApiHomeStat } from "@/types/api";
import { canAccessAdminPanel } from "@/utils/rbac";

function formatCount(value: number) {
  return Number(value || 0).toLocaleString();
}

export default function Home() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [redirecting, setRedirecting] = useState(false);
  const { data, error } = useSWR("public-homepage", publicService.getHomePage, {
    revalidateOnFocus: false,
  });
  const { data: overview, isLoading: overviewLoading } = useSWR(
    user ? "homepage-my-overview" : null,
    userService.getMyOverview,
    { revalidateOnFocus: false },
  );

  // 管理员默认跳转后台（从后台点"返回前台"时带 ?view=front，不再自动跳回）
  useEffect(() => {
    if (authLoading) return;
    if (router.query.view === "front") return;
    if (user && canAccessAdminPanel(user)) {
      setRedirecting(true);
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  const heroStats: ApiHomeStat[] = data?.heroStats ?? [];
  const featuredBooks: ApiHomeBookItem[] = data?.featuredBooks ?? [];
  const newArrivals: ApiHomeBookItem[] = data?.newArrivals ?? [];
  const categories: ApiHomeCategoryItem[] = data?.categories ?? [];
  const audienceAwareStats = useMemo(
    () =>
      heroStats.map((stat) =>
        stat.label === "注册读者"
          ? {
              label: "热门分类",
              value: categories.length,
            }
          : stat,
      ),
    [categories.length, heroStats],
  );
  const quickActions = [
    {
      title: "馆藏目录",
      desc: "浏览全量书目与筛选",
      link: "/books",
      icon: "solar:book-2-bold-duotone",
    },
    {
      title: "我的书架",
      desc: "查看借阅与预约",
      link: "/my/shelf",
      icon: "solar:library-bold-duotone",
    },
    ...(canAccessAdminPanel(user)
      ? [
          {
            title: "后台管理",
            desc: "馆员运营与统计",
            link: "/dashboard",
            icon: "solar:widget-5-bold-duotone",
          },
        ]
      : []),
    {
      title: "关于我们",
      desc: "服务与开放时间",
      link: "/about",
      icon: "solar:info-circle-bold-duotone",
    },
  ];
  const readerStatusCards = [
    {
      title: "当前在借",
      value: overview?.activeLoanCount ?? 0,
      hint: "返回书架继续管理借阅",
      href: "/my/shelf",
      icon: "solar:book-bookmark-bold-duotone",
      accent: "from-sky-500/20 to-cyan-400/5 dark:from-sky-400/30 dark:to-cyan-300/10",
    },
    {
      title: "待还提醒",
      value: overview?.dueSoonLoanCount ?? 0,
      hint:
        (overview?.dueSoonLoanCount ?? 0) > 0
          ? `有 ${overview?.dueSoonLoanCount ?? 0} 本书需要优先处理`
          : "近期没有即将到期的借阅",
      href: "/my/shelf",
      icon: "solar:alarm-bold-duotone",
      accent: "from-amber-500/20 to-orange-400/5 dark:from-amber-400/30 dark:to-orange-300/10",
    },
    {
      title: "待取预约",
      value: overview?.readyReservationCount ?? 0,
      hint:
        (overview?.readyReservationCount ?? 0) > 0
          ? "你有预约到馆可取"
          : "预约到馆后会第一时间提醒你",
      href: "/my/reservations",
      icon: "solar:bookmark-square-minimalistic-bold-duotone",
      accent: "from-emerald-500/20 to-teal-400/5 dark:from-emerald-400/30 dark:to-teal-300/10",
    },
    {
      title: "我的书架",
      value: overview?.favoriteCount ?? 0,
      hint: "收藏、借阅历史和在借状态都在这里",
      href: "/my/shelf",
      icon: "solar:library-bold-duotone",
      accent: "from-fuchsia-500/20 to-violet-400/5 dark:from-fuchsia-400/25 dark:to-violet-300/10",
      suffix: "收藏",
    },
  ];

  if (redirecting) {
    return (
      <DefaultLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Spinner label="正在进入后台管理..." size="lg" />
        </div>
      </DefaultLayout>
    );
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      void router.push(`/books?query=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <DefaultLayout>
      {/* ═══ Hero 首屏 ═══ */}
      <section className="relative -mx-4 -mt-16 overflow-hidden px-4 pt-16 md:-mx-6 md:px-6">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/60 via-sky-50/40 to-transparent dark:from-indigo-950/40 dark:via-sky-950/20 dark:to-transparent" />
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl dark:bg-indigo-500/15" />
        <div className="absolute top-32 right-0 h-64 w-64 rounded-full bg-sky-300/15 blur-3xl dark:bg-sky-400/10" />
        <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-amber-300/15 blur-3xl dark:bg-amber-400/10" />

        <div className="relative mx-auto max-w-6xl py-12 lg:py-20">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-12">
            {/* 左侧文案区 */}
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/60 px-4 py-2 text-xs tracking-[0.2em] uppercase text-slate-600 backdrop-blur dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">
                智慧图书馆 / Digital Library
              </div>
              <h1 className="text-4xl md:text-6xl font-semibold leading-tight text-slate-900 dark:text-white">
                让馆藏与读者
                <span className="text-indigo-600 dark:text-indigo-300">更高效地相遇</span>
              </h1>
              <p className="text-lg text-slate-600 dark:text-white/70 max-w-xl">
                用统一的数据视图、智能检索与借阅管理，打造面向未来的图书服务体验。
              </p>
              {error && (
                <p className="text-sm text-amber-600 dark:text-amber-300">
                  首页数据加载失败，当前展示本地兜底内容。
                </p>
              )}
              <form
                className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-slate-200/80 bg-white/70 p-3 backdrop-blur dark:border-white/10 dark:bg-white/[0.06]"
                onSubmit={handleSearch}
              >
                <input
                  className="flex-1 px-4 py-3 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-slate-400 dark:bg-white/10 dark:text-white dark:placeholder-slate-500 dark:focus:ring-indigo-500/50"
                  placeholder="搜索书名、作者或 ISBN..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-colors dark:bg-indigo-500 dark:hover:bg-indigo-400"
                  type="submit"
                >
                  智能检索
                </button>
              </form>

              {/* 读者借阅状态 */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-600 dark:text-white/80">
                    {user ? "你的借阅状态" : "登录后可查看你的借阅状态"}
                  </p>
                  {user ? (
                    <NextLink className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-300 dark:hover:text-white" href="/my">
                      进入我的中心
                    </NextLink>
                  ) : (
                    <NextLink className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-300 dark:hover:text-white" href="/auth/login">
                      登录查看
                    </NextLink>
                  )}
                </div>
                {user ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {overviewLoading
                      ? Array.from({ length: 4 }).map((_, index) => (
                          <div
                            key={index}
                            className="h-24 rounded-2xl border border-slate-200/80 bg-white/60 animate-pulse dark:border-white/10 dark:bg-white/5"
                          />
                        ))
                      : readerStatusCards.map((card) => (
                          <NextLink
                            key={card.title}
                            className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 p-4 backdrop-blur transition hover:border-indigo-200 hover:shadow-md dark:border-white/10 dark:bg-white/[0.06] dark:hover:border-white/25"
                            href={card.href}
                          >
                            <div className={`absolute inset-0 bg-gradient-to-br ${card.accent} opacity-80`} />
                            <div className="relative flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm text-slate-500 dark:text-white/70">{card.title}</p>
                                <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
                                  {formatCount(card.value)}
                                  {card.suffix ? (
                                    <span className="ml-2 text-sm font-medium text-slate-400 dark:text-white/65">{card.suffix}</span>
                                  ) : null}
                                </p>
                                <p className="mt-2 text-xs text-slate-400 dark:text-white/60">{card.hint}</p>
                              </div>
                              <div className="rounded-2xl border border-slate-200/80 bg-white/60 p-3 text-slate-500 dark:border-white/15 dark:bg-white/10 dark:text-white/85">
                                <Icon icon={card.icon} width={22} />
                              </div>
                            </div>
                          </NextLink>
                        ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200/80 bg-white/60 px-4 py-4 text-sm text-slate-500 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                    登录后可在首页直接看到待还提醒、当前在借、待取预约和我的书架入口。
                  </div>
                )}
              </div>

              {/* 分类快速入口 */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-600 dark:text-white/80">不知道找什么时，可以先逛逛这些分类</p>
                  <NextLink className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-300 dark:hover:text-white" href="/books">
                    浏览全部馆藏
                  </NextLink>
                </div>
                <div className="flex flex-wrap gap-2">
                  {categories.slice(0, 8).map((item) => (
                    <NextLink
                      key={item.categoryId}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/60 px-4 py-2 text-sm text-slate-600 backdrop-blur transition hover:border-indigo-200 hover:bg-white/80 dark:border-white/12 dark:bg-white/[0.06] dark:text-white/82 dark:hover:border-white/25 dark:hover:bg-white/12"
                      href={`/books?category=${item.categoryId}`}
                    >
                      <span>{item.label}</span>
                      <span className="text-xs text-slate-400 dark:text-white/55">{formatCount(item.count)} 册</span>
                    </NextLink>
                  ))}
                  {categories.length === 0 ? (
                    <span className="text-sm text-slate-400 dark:text-white/55">分类数据加载中...</span>
                  ) : null}
                </div>
              </div>

              {/* 统计指标 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                {audienceAwareStats.length > 0 ? (
                  audienceAwareStats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-slate-200/80 bg-white/60 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-white/5"
                    >
                      <p className="text-sm text-slate-400 dark:text-white/60">{stat.label}</p>
                      <p className="text-xl font-semibold text-slate-900 dark:text-white">
                        {Number(stat.value || 0).toLocaleString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 sm:col-span-4 rounded-2xl border border-slate-200/80 bg-white/60 px-4 py-6 text-sm text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
                    {error ? "首页统计暂不可用" : "首页统计加载中"}
                  </div>
                )}
              </div>
            </div>

            {/* 右侧精选书目 */}
            <div className="flex-1 w-full">
              <div className="grid grid-cols-2 gap-4">
                {featuredBooks.slice(0, 4).map((book) => (
                  <NextLink
                    key={book.id}
                    className="group rounded-2xl border border-slate-200/80 bg-white/70 p-3 backdrop-blur transition hover:border-indigo-200 hover:shadow-md dark:border-white/10 dark:bg-white/[0.06] dark:hover:border-indigo-300/60"
                    href={`/books/${book.id}`}
                  >
                    <AppImage
                      alt={book.title}
                      className="group-hover:scale-105 transition-transform"
                      height={160}
                      src={book.cover}
                      width={240}
                      wrapperClassName="overflow-hidden rounded-xl"
                    />
                    <div className="pt-3">
                      <p className="text-sm text-slate-400 dark:text-white/60">{book.author}</p>
                      <p className="font-semibold text-slate-900 dark:text-white">{book.title}</p>
                    </div>
                  </NextLink>
                ))}
                {featuredBooks.length === 0 ? (
                  <div className="col-span-2 rounded-2xl border border-slate-200/80 bg-white/60 px-5 py-8 text-sm text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
                    当前没有可展示的推荐书目。
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 热门推荐区 ═══ */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row justify-between gap-8">
            <div className="flex-1">
              <h2 className="text-3xl font-semibold text-slate-900 dark:text-white">
                读者都在看
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                基于近期借阅热度整理的热门书目，适合没有明确目标时快速进入阅读状态。
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              {categories.map((item) => (
                <NextLink
                  key={`${item.categoryId}-${item.label}`}
                  className="rounded-2xl border border-slate-200/80 bg-white/80 px-5 py-4 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20"
                  href={`/books?category=${item.categoryId}`}
                >
                  <p className="text-sm text-slate-500 dark:text-slate-400">{item.label}</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {formatCount(item.count)} 册
                  </p>
                </NextLink>
              ))}
              {categories.length === 0 ? (
                <div className="rounded-2xl border border-slate-200/80 bg-white/80 px-5 py-4 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                  当前没有分类统计数据。
                </div>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {featuredBooks.map((book) => (
              <NextLink
                key={book.id}
                className="group rounded-2xl bg-white/80 shadow-sm hover:shadow-lg transition overflow-hidden dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
                href={`/books/${book.id}`}
              >
                <AppImage
                  alt={book.title}
                  className="group-hover:scale-105 transition-transform"
                  height={240}
                  src={book.cover}
                  width={320}
                  wrapperClassName="h-60 overflow-hidden"
                />
                  <div className="p-5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-slate-500 dark:text-slate-400">{book.author}</p>
                      {book.tag ? (
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">
                          {book.tag}
                        </span>
                      ) : null}
                    </div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {book.title}
                  </p>
                  <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300">
                    立即查看
                  </div>
                </div>
              </NextLink>
            ))}
            {featuredBooks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-5 py-10 text-center text-sm text-slate-500 md:col-span-2 lg:col-span-4 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                热门推荐暂时为空。
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* ═══ 新书上架 + 快捷入口 ═══ */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
          <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white/80 via-slate-50/60 to-indigo-50/40 p-8 dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.82),rgba(30,41,59,0.68))]">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              新书上架动态
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              新书速递会持续更新，适合想看看最近有什么新内容的读者。
            </p>
            <div className="mt-6 space-y-4">
              {newArrivals.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl bg-white/80 px-5 py-4 shadow-sm dark:bg-white/[0.04]"
                >
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{item.tag || "新上架"}</p>
                    <p className="text-lg font-medium text-slate-900 dark:text-white">
                      {item.title}
                    </p>
                  </div>
                  <NextLink
                    className="text-sm text-indigo-600 font-semibold dark:text-indigo-300"
                    href={`/books/${item.id}`}
                  >
                    查看
                  </NextLink>
                </div>
              ))}
              {newArrivals.length === 0 ? (
                <div className="rounded-2xl bg-white/80 px-5 py-6 text-sm text-slate-500 shadow-sm dark:bg-white/[0.04] dark:text-slate-400">
                  暂无新书上架数据。
                </div>
              ) : null}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.9),rgba(240,247,255,0.95))] p-8 dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.96),rgba(30,41,59,0.92))]">
            <div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">服务入口</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                快速进入常用功能模块。
              </p>
            </div>
            <div className="mt-6 space-y-3">
              {quickActions.map((action) => (
                <NextLink
                  key={action.title}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/60 px-4 py-3 transition hover:border-indigo-200 hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  href={action.link}
                >
                  <div className="shrink-0 rounded-xl border border-slate-200/60 bg-slate-50 p-2 text-slate-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">
                    <Icon icon={action.icon} width={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{action.title}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{action.desc}</p>
                  </div>
                </NextLink>
              ))}
            </div>
          </div>
        </div>
      </section>
    </DefaultLayout>
  );
}
