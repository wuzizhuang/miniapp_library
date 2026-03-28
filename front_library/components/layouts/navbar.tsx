import {
  Navbar as HeroUINavbar,
  NavbarContent,
  NavbarMenu,
  NavbarMenuToggle,
  NavbarBrand,
  NavbarItem,
  NavbarMenuItem,
} from "@heroui/navbar";
import { Button } from "@heroui/button";
import { Kbd } from "@heroui/kbd";
import { Link } from "@heroui/link";
import { Input } from "@heroui/input";
import { link as linkStyles } from "@heroui/theme";
import NextLink from "next/link";
import clsx from "clsx";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import dynamic from "next/dynamic";

import { ThemeSwitch } from "@/components/common/ThemeSwitch";
import { SearchIcon, Logo } from "@/components/common/site-icons";
import { useAuth } from "@/config/authContext";
import { notificationService } from "@/services/api/notificationService";
import { searchService } from "@/services/api/searchService";
import { useDebounce } from "@/hooks/useDebounce";
import { canAccessAdminPanel } from "@/utils/rbac";

const NavbarUserMenu = dynamic(
  () =>
    import("@/components/layouts/NavbarUserMenu").then(
      (mod) => mod.NavbarUserMenu,
    ),
  { ssr: false },
);

/**
 * 前台主导航栏。
 * 统一处理导航菜单、搜索联想、主题切换和用户菜单。
 */

// 顶部固定导航项，桌面和移动端都会复用。
const navItems = [
  { href: "/", label: "首页" },
  { href: "/books", label: "馆藏目录" },
  { href: "/authors", label: "作者" },
  { href: "/about", label: "关于系统" },
];

export const Navbar = () => {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedKeyword = useDebounce(searchKeyword, 250);
  const { data: unreadCount = 0 } = useSWR(
    user ? "notification-unread-count" : null,
    notificationService.getUnreadCount,
    { refreshInterval: 30000 }
  );
  const { data: suggestions = [] } = useSWR(
    isSearchOpen && debouncedKeyword.trim()
      ? ["search-suggestions", debouncedKeyword.trim()]
      : null,
    () => searchService.getSuggestions(debouncedKeyword.trim(), 6),
  );
  const { data: hotKeywords = [] } = useSWR(
    isSearchOpen && !debouncedKeyword.trim() ? "search-hot-keywords" : null,
    () => searchService.getHotKeywords(6),
  );
  // 输入关键字时展示联想词，输入为空时退回热搜词。
  const suggestionItems = useMemo(
    () => (debouncedKeyword.trim() ? suggestions : hotKeywords),
    [debouncedKeyword, hotKeywords, suggestions],
  );

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  // 统一封装搜索提交逻辑，点击联想词和表单回车都走这里。
  const submitSearch = async (rawKeyword?: string) => {
    const keyword = (rawKeyword ?? searchKeyword).trim();

    setIsSearchOpen(false);
    setSearchKeyword(keyword);
    await router.push({
      pathname: "/books",
      query: keyword ? { query: keyword } : {},
    });
  };

  const handleSearchSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitSearch();
  };

  // 搜索框既承担检索入口，也承担热门词/联想词的轻量下拉面板。
  const searchInput = (
    <div className="relative w-full min-w-[260px]">
      <form onSubmit={handleSearchSubmit}>
        <Input
          aria-label="Search"
          classNames={{
            inputWrapper:
              "border border-slate-200/80 bg-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.82),rgba(30,41,59,0.7))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
            input: "text-sm text-slate-700 placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500",
          }}
          endContent={
            <Kbd className="hidden border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 lg:inline-block" keys={["enter"]}>
              Enter
            </Kbd>
          }
          labelPlacement="outside"
          placeholder="搜索书名、作者、ISBN..."
          startContent={
            <SearchIcon className="pointer-events-none flex-shrink-0 text-base text-slate-400 dark:text-slate-500" />
          }
          type="search"
          value={searchKeyword}
          onBlur={() => {
            closeTimerRef.current = setTimeout(() => setIsSearchOpen(false), 150);
          }}
          onFocus={() => {
            if (closeTimerRef.current) {
              clearTimeout(closeTimerRef.current);
            }
            setIsSearchOpen(true);
          }}
          onValueChange={setSearchKeyword}
        />
      </form>
      {isSearchOpen && suggestionItems.length > 0 ? (
        <div className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-200/80 bg-white/92 p-2 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.22)] backdrop-blur dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.88))] dark:shadow-[0_24px_60px_-28px_rgba(2,6,23,0.95)]">
          <p className="px-3 pb-2 pt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {debouncedKeyword.trim() ? "联想词" : "热门搜索"}
          </p>
          <div className="flex flex-col">
            {suggestionItems.map((item) => (
              <button
                key={item}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/[0.06]"
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  void submitSearch(item);
                }}
              >
                <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center text-slate-400 dark:text-slate-500">🔍</span>
                <span className="truncate">{item}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <HeroUINavbar
      className="border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(240,246,255,0.78))] shadow-[0_16px_40px_-24px_rgba(148,163,184,0.38)] backdrop-blur dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.9),rgba(15,23,42,0.78))] dark:shadow-[0_16px_40px_-24px_rgba(2,6,23,0.8)]"
      maxWidth="xl"
      position="sticky"
    >
      {/* 左侧区域：Logo 与桌面端主导航。 */}
      <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
        <NavbarBrand className="gap-3 max-w-fit">
          <NextLink className="flex justify-start items-center gap-1" href="/">
            <Logo />
            <p className="font-bold text-inherit">智慧图书馆</p>
          </NextLink>
        </NavbarBrand>
        <div className="hidden lg:flex gap-4 justify-start ml-2">
          {navItems.map((item) => {
            // 通过 pathname 判断当前激活项，给用户明确的导航反馈。
            const isActive = router.pathname === item.href;

            return (
              <NavbarItem key={item.href} isActive={isActive}>
                <NextLink
                  className={clsx(
                    linkStyles({ color: isActive ? "primary" : "foreground" }),
                    "data-[active=true]:font-medium",
                  )}
                  color="foreground"
                  href={item.href}
                >
                  {item.label}
                </NextLink>
              </NavbarItem>
            );
          })}
        </div>
      </NavbarContent>

      {/* 右侧区域：搜索、主题切换和用户态操作。 */}
      <NavbarContent
        className="hidden sm:flex basis-1/5 items-center gap-2 sm:basis-full"
        justify="end"
      >
        <NavbarItem className="hidden lg:flex">{searchInput}</NavbarItem>
        <NavbarItem className="flex items-center">
          <ThemeSwitch />
        </NavbarItem>

        {/* 根据登录态切换为用户菜单或登录注册入口。 */}
        {isLoading ? (
          <div className="w-8 h-8 bg-default-200 rounded-full animate-pulse" />
        ) : user ? (
          <>
            <NavbarItem className="flex items-center">
              <NavbarUserMenu unreadCount={unreadCount} />
            </NavbarItem>
          </>
        ) : (
          <NavbarItem className="hidden md:flex gap-2">
            <Button
              as={Link}
              className="border border-slate-200 bg-white/80 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
              href="/auth/login"
              variant="flat"
            >
              登录
            </Button>
            <Button
              as={Link}
              color="primary"
              href="/auth/register"
              variant="solid"
            >
              注册
            </Button>
          </NavbarItem>
        )}
      </NavbarContent>

      {/* 移动端菜单复用搜索与导航能力，并补充读者常用入口。 */}
      <NavbarContent className="sm:hidden basis-1 pl-4" justify="end">
        <ThemeSwitch />
        <NavbarMenuToggle />
      </NavbarContent>
      <NavbarMenu className="border-t border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(240,246,255,0.94))] backdrop-blur dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.98),rgba(15,23,42,0.94))]">
        {searchInput}
        <div className="mx-4 mt-2 flex flex-col gap-2">
          {navItems.map((item, index) => (
            <NavbarMenuItem key={`${item.label}-${index}`}>
              <Link color="foreground" href={item.href} size="lg">
                {item.label}
              </Link>
            </NavbarMenuItem>
          ))}
          {user ? (
            <>
              <NavbarMenuItem>
                <Link color="foreground" href="/my" size="lg">
                  我的中心
                </Link>
              </NavbarMenuItem>
              <NavbarMenuItem>
                <Link color="foreground" href="/my/shelf" size="lg">
                  我的书架
                </Link>
              </NavbarMenuItem>
              <NavbarMenuItem>
                <Link color="foreground" href="/my/appointments" size="lg">
                  服务预约
                </Link>
              </NavbarMenuItem>
              <NavbarMenuItem>
                <Link color="foreground" href="/my/reviews" size="lg">
                  我的评论
                </Link>
              </NavbarMenuItem>
              <NavbarMenuItem>
                <Link color="foreground" href="/my/recommendations" size="lg">
                  推荐动态
                </Link>
              </NavbarMenuItem>
              <NavbarMenuItem>
                <Link color="foreground" href="/my/personal-recommendations" size="lg">
                  为您推荐
                </Link>
              </NavbarMenuItem>
              <NavbarMenuItem>
                <Link color="foreground" href="/my/search-history" size="lg">
                  搜索历史
                </Link>
              </NavbarMenuItem>
              {canAccessAdminPanel(user) ? (
                <NavbarMenuItem>
                  <Link color="foreground" href="/dashboard" size="lg">
                    后台管理
                  </Link>
                </NavbarMenuItem>
              ) : null}
              <NavbarMenuItem>
                <Link color="danger" href="#" size="lg" onClick={logout}>
                  退出登录
                </Link>
              </NavbarMenuItem>
            </>
          ) : null}
        </div>
      </NavbarMenu>
    </HeroUINavbar>
  );
};
