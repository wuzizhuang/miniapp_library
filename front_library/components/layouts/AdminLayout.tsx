import React, { ReactNode, useEffect } from "react";
import {
  Navbar,
  NavbarContent,
  User,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Spinner,
} from "@heroui/react";
import { motion } from "framer-motion"; // 引入动画库
import { useRouter } from "next/router";
import { toast } from "sonner";

import { ThemeSwitch } from "@/components/common/ThemeSwitch";
import { AdminSidebar } from "@/components/modules/admin/AdminSidebar";
import { useAuth } from "@/config/authContext";
import {
  canAccessAdminPanel,
  canAccessAdminRoute,
  getDefaultAdminRoute,
  hasRole,
} from "@/utils/rbac";

/**
 * 后台默认布局。
 * 负责后台路由准入校验、侧边栏、顶栏用户信息和页面切换动效。
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace("/auth/login");

      return;
    }

    if (!canAccessAdminPanel(user)) {
      toast.error("你没有后台管理权限");
      router.replace("/");

      return;
    }

    // 用户具备后台入口权限，但不具备当前路由权限时，自动回退到其默认后台页。
    if (!canAccessAdminRoute(router.pathname, user)) {
      router.replace(getDefaultAdminRoute(user));
    }
  }, [isLoading, user, router]);

  if (isLoading || !user || !canAccessAdminPanel(user) || !canAccessAdminRoute(router.pathname, user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-content2/50">
        <Spinner label="正在跳转..." size="lg" />
      </div>
    );
  }

  const isAdmin = hasRole(user, "ADMIN");
  const userName = user.fullName || user.username || "管理员";
  const userRoleLabelMap: Record<string, string> = {
    ADMIN: "Super Admin",
    LIBRARIAN: "馆员工作台",
    CATALOGER: "录入工作台",
    USER: "Operator",
  };
  const userRoleLabel = userRoleLabelMap[user.roles[0] ?? ""] ?? (isAdmin ? "Super Admin" : "Operator");

  return (
    <div className="flex h-screen w-full bg-content2/50 font-sans">
      {/* 左侧固定侧边栏，仅在中大屏显示。 */}
      <aside className="h-full fixed left-0 top-0 z-50 hidden md:flex shadow-xl shadow-blue-900/5">
        <AdminSidebar />
      </aside>

      {/* 右侧主内容区负责承载顶栏与页面主体。 */}
      <div className="flex-1 flex flex-col md:ml-64 min-h-screen">
        <Navbar
          isBordered
          className="bg-content1/80 backdrop-blur-md sticky top-0 z-40"
          maxWidth="full"
        >
          {/* 后台顶栏只保留主题切换和用户操作菜单。 */}
          <NavbarContent justify="end">
            <ThemeSwitch />
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <User
                  as="button"
                  avatarProps={{
                    isBordered: true,
                    src: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=0D8ABC&color=fff`,
                    className: "transition-transform hover:scale-105",
                  }}
                  className="transition-transform"
                  description={userRoleLabel}
                  name={userName}
                />
              </DropdownTrigger>
              <DropdownMenu aria-label="User Actions" variant="flat">
                <DropdownItem key="frontend" href="/">
                  前台首页
                </DropdownItem>
                <DropdownItem key="settings" href="/my/profile">个人设置</DropdownItem>
                <DropdownItem key="logout" color="danger" onPress={logout}>
                  退出登录
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </NavbarContent>
        </Navbar>

        {/* 页面主体统一附加轻量进入动画，提升后台切页体验。 */}
        <main className="flex-1 p-6 overflow-auto scrollbar-hide">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="h-full"
            initial={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
