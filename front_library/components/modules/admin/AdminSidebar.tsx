import React, { useEffect, useMemo, useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/router";
import { Tooltip, Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";

import { useAuth } from "@/config/authContext";
import { hasAnyPermission, hasRole } from "@/utils/rbac";

export const AdminSidebar = () => {
  const router = useRouter();
  const pathname = router.pathname;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user } = useAuth();

  const menuItems = useMemo(
    () => [
      {
        key: "dashboard",
        label: "仪表盘",
        href: "/dashboard",
        icon: "solar:widget-2-bold-duotone",
        permissions: ["report:view"],
      },
      {
        key: "books",
        label: "图书管理",
        href: "/dashboard/books",
        icon: "solar:book-2-bold-duotone",
        permissions: ["book:read", "book:write", "book:delete"],
      },
      {
        key: "copies",
        label: "副本管理",
        href: "/dashboard/copies",
        icon: "solar:copy-bold-duotone",
        permissions: ["book:read", "book:write"],
      },
      {
        key: "authors",
        label: "作者管理",
        href: "/dashboard/authors",
        icon: "solar:user-id-bold-duotone",
        permissions: [],
        adminOnly: true,
      },
      {
        key: "categories",
        label: "分类管理",
        href: "/dashboard/categories",
        icon: "solar:layers-bold-duotone",
        permissions: [],
        adminOnly: true,
      },
      {
        key: "publishers",
        label: "出版社管理",
        href: "/dashboard/publishers",
        icon: "solar:buildings-2-bold-duotone",
        permissions: [],
        adminOnly: true,
      },
      {
        key: "users",
        label: "读者管理",
        href: "/dashboard/users",
        icon: "solar:users-group-rounded-bold-duotone",
        permissions: ["user:manage"],
      },
      {
        key: "loans",
        label: "借阅记录",
        href: "/dashboard/loans",
        icon: "solar:bill-list-bold-duotone",
        permissions: ["loan:read", "loan:write", "loan:manage"],
      },
      {
        key: "appointments",
        label: "服务预约",
        href: "/dashboard/appointments",
        icon: "solar:calendar-mark-bold-duotone",
        permissions: ["appointment:manage"],
      },
      {
        key: "reservations",
        label: "图书预约",
        href: "/dashboard/reservations",
        icon: "solar:bookmark-square-minimalistic-bold-duotone",
        permissions: ["reservation:manage"],
      },
      {
        key: "fines",
        label: "罚款管理",
        href: "/dashboard/fines",
        icon: "solar:wallet-money-bold-duotone",
        permissions: ["fine:waive", "loan:manage"],
      },
      {
        key: "settings",
        label: "系统设置",
        href: "/dashboard/settings",
        icon: "solar:settings-bold-duotone",
        permissions: [],
        adminOnly: true,
      },
      {
        key: "feedback",
        label: "反馈处理",
        href: "/dashboard/feedback",
        icon: "solar:chat-round-dots-bold-duotone",
        permissions: [],
        adminOnly: true,
      },
      {
        key: "reviews",
        label: "评论审核",
        href: "/dashboard/reviews",
        icon: "solar:chat-square-like-bold-duotone",
        permissions: ["review:audit"],
      },
    ],
    [],
  );

  const visibleMenuItems = useMemo(
    () =>
      menuItems.filter((item) => {
        if (item.adminOnly) {
          return hasRole(user, "ADMIN");
        }

        return hasAnyPermission(user, item.permissions);
      }),
    [menuItems, user],
  );

  useEffect(() => {
    for (const item of visibleMenuItems) {
      void router.prefetch(item.href);
    }
  }, [router, visibleMenuItems]);

  return (
    <motion.div
      animate={{ width: isCollapsed ? 80 : 256 }}
      className="h-full bg-content1 border-r border-default-200 flex flex-col py-4 relative transition-all duration-300 ease-in-out"
    >
      {/* Logo 区 */}
      <div
        className={`flex items-center gap-3 px-6 mb-8 ${isCollapsed ? "justify-center px-0" : ""}`}
      >
        <div className="w-10 h-10 bg-gradient-to-tr from-primary to-secondary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0">
          <Icon icon="solar:library-bold" width={24} />
        </div>
        {!isCollapsed && (
          <motion.div
            animate={{ opacity: 1 }}
            className="flex flex-col"
            initial={{ opacity: 0 }}
          >
            <span className="text-lg font-bold text-foreground leading-none">
              智图
            </span>
            <span className="text-xs text-default-400 font-medium tracking-wider">
              ADMIN
            </span>
          </motion.div>
        )}
      </div>

      {/* 折叠按钮 */}
      <Button
        aria-label={isCollapsed ? "展开后台导航" : "折叠后台导航"}
        isIconOnly
        className="absolute -right-3 top-20 bg-content1 border border-default-200 rounded-full shadow-sm z-50 text-default-500 hover:text-primary"
        size="sm"
        variant="light"
        onPress={() => setIsCollapsed(!isCollapsed)}
      >
        <Icon
          icon={
            isCollapsed
              ? "solar:alt-arrow-right-linear"
              : "solar:alt-arrow-left-linear"
          }
        />
      </Button>

      {/* 菜单区 */}
      <div className="flex flex-col gap-1 px-3">
        {visibleMenuItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          const LinkContent = (
            <NextLink
              className={`
                flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                ${isActive
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-default-600 hover:bg-default-100 hover:text-default-900"
                }
                ${isCollapsed ? "justify-center" : ""}
              `}
              href={item.href}
            >
              <Icon
                className={
                  isActive
                    ? "text-primary drop-shadow-md"
                    : "text-default-500 group-hover:text-default-700"
                }
                icon={item.icon}
                width={24}
              />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
              {isActive && !isCollapsed && (
                <motion.div
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                  layoutId="active-pill"
                />
              )}
            </NextLink>
          );

          return isCollapsed ? (
            <Tooltip
              key={item.key}
              color="primary"
              content={item.label}
              placement="right"
            >
              {LinkContent}
            </Tooltip>
          ) : (
            <div key={item.key}>{LinkContent}</div>
          );
        })}
      </div>

      {/* 返回前台 */}
      <div className={`mt-auto px-3 ${isCollapsed ? "flex justify-center" : ""}`}>
        {isCollapsed ? (
          <Tooltip color="primary" content="返回前台" placement="right">
            <NextLink
              className="flex items-center justify-center w-10 h-10 rounded-xl text-default-500 hover:bg-primary/10 hover:text-primary transition-all"
              href="/?view=front"
            >
              <Icon icon="solar:arrow-left-bold-duotone" width={22} />
            </NextLink>
          </Tooltip>
        ) : (
          <NextLink
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-default-600 hover:bg-primary/10 hover:text-primary transition-all group"
            href="/?view=front"
          >
            <Icon
              className="text-default-500 group-hover:text-primary"
              icon="solar:arrow-left-bold-duotone"
              width={24}
            />
            <span className="font-medium">返回前台</span>
          </NextLink>
        )}
      </div>

      {/* 底部信息 */}
      {!isCollapsed && (
        <div className="px-4 mt-3">
          <div className="p-4 bg-gradient-to-br from-default-100 to-default-50 rounded-2xl border border-default-100">
            <p className="text-xs text-default-500 mb-1">系统状态</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm font-bold text-success-600">
                运行正常
              </span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
