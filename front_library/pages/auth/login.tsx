"use client";

import React, { useState } from "react";
import { Button, Input, Checkbox, Link, Form } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useRouter } from "next/router";
import { motion, useAnimation } from "framer-motion"; // 引入动画库
import { toast } from "sonner";

import DefaultLayout from "@/components/layouts/default";
import { useAuth } from "@/config/authContext";
import { authService, parseApiError } from "@/services/api/authService";
import { canAccessAdminPanel, getDefaultAdminRoute } from "@/utils/rbac";

function safeRedirect(redirect: string | string[] | undefined): string | null {
  if (typeof redirect !== "string") {
    return null;
  }

  if (
    !redirect.startsWith("/") ||
    redirect.startsWith("//") ||
    redirect.startsWith("http://") ||
    redirect.startsWith("https://")
  ) {
    return null;
  }

  return redirect;
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 错误状态管理
  const [isError, setIsError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 动画控制器
  const controls = useAnimation();

  const toggleVisibility = () => setIsVisible(!isVisible);

  // 核心优化 1：用户一旦开始输入，就清除错误状态
  const clearError = () => {
    if (isError) {
      setIsError(false);
      setErrorMsg("");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    // 重置状态
    setIsError(false);
    setErrorMsg("");

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    try {
      const payload = {
        username: String(data.email ?? ""),
        password: String(data.password ?? ""),
      };

      const response = await authService.login(payload);
      const { role, roles, permissions } = response;

      const normalizedRoles = Array.from(
        new Set([...(roles ?? []), role].filter(Boolean).map((r) => String(r).toUpperCase()))
      );
      const normalizedPermissions = permissions ?? [];

      await login(response);

      const adminRoute = getDefaultAdminRoute({
        role: role ?? "USER",
        roles: normalizedRoles,
        permissions: normalizedPermissions,
      });
      const redirectTarget = safeRedirect(router.query.redirect);

      if (redirectTarget) {
        await router.push(redirectTarget);
      } else if (canAccessAdminPanel({ role, roles: normalizedRoles, permissions: normalizedPermissions })) {
        await router.push(adminRoute);
      } else {
        await router.push("/my/shelf");
      }
    } catch (error: any) {
      const message = parseApiError(error, "账号或密码错误").message;

      setErrorMsg(message);
      setIsError(true);
      toast.error(message);

      // 触发左右晃动动画
      controls.start({
        x: [0, -10, 10, -10, 10, 0],
        transition: { duration: 0.4 },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DefaultLayout>
      <div className="flex h-full w-full items-center justify-center py-8">
        {/* 包裹动画容器 */}
        <motion.div
          animate={controls} // 绑定动画控制器
          className="flex w-full max-w-md flex-col gap-6 rounded-[28px] border border-slate-200/80 bg-white/90 p-10 shadow-[0_28px_70px_-44px_rgba(148,163,184,0.28)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.82))] dark:shadow-[0_28px_70px_-44px_rgba(2,6,23,0.9)]"
        >
          <div className="text-center">
            <Icon
              className="text-primary-500 mx-auto mb-4 text-5xl"
              icon="solar:book-2-bold"
            />
            <p className="pb-1 text-4xl font-bold text-slate-900 dark:text-white">
              图书馆入口
            </p>
            <p className="text-md text-slate-500 dark:text-slate-400">
              请登录以访问图书馆资源。
            </p>
          </div>

          <Form
            className="flex flex-col gap-6"
            validationBehavior="native"
            onSubmit={handleSubmit}
          >
            {/* 这里的全局错误提示条可以保留，也可以去掉，因为下面 Input 已经有提示了 */}
            {/* 为了美观，我建议去掉这个红条，只保留 Input 下方的红字和红框 */}

            <Input
              isRequired
              isInvalid={isError}
              label="账号"
              labelPlacement="outside"
              name="email"
              placeholder="请输入用户名 (如: admin)"
              onValueChange={clearError}
              // 核心优化 3：状态绑定
              variant="bordered"
              // 监听输入，清除错误
              type="text"
            />

            <Input
              isRequired
              endContent={
                <button
                  aria-label={isVisible ? "隐藏密码" : "显示密码"}
                  className="focus:outline-none"
                  type="button"
                  onClick={toggleVisibility}
                >
                  <Icon className="text-default-400 pointer-events-none text-2xl" icon={isVisible ? "solar:eye-closed-linear" : "solar:eye-bold"} />
                </button>
              }
              label="密码"
              labelPlacement="outside"
              name="password"
              placeholder="请输入密码"
              type={isVisible ? "text" : "password"}
              errorMessage={isError ? errorMsg : ""} // 只有出错时才显示文字
              // 监听输入，清除错误
              onValueChange={clearError}
              variant="bordered"
              // 核心优化 3：状态绑定 + 错误信息展示
              isInvalid={isError}
            />

            <div className="flex w-full items-center justify-between px-1 py-2">
              <Checkbox defaultSelected name="remember" size="sm">
                记住我
              </Checkbox>
              <Link className="text-primary-500" href="/auth/forgetPassword" size="sm">
                忘记密码？
              </Link>
            </div>

            <Button
              className="w-full font-medium"
              color={isError ? "danger" : "primary"} // 出错时按钮也可以变红一下提示
              isLoading={isLoading}
              type="submit"
            >
              {isLoading ? "登录中..." : isError ? "请重试" : "登录"}
            </Button>
          </Form>

          <div className="text-small text-center">
            还没有图书馆账户？{" "}
            <Link
              className="text-primary-500 font-semibold"
              href="/auth/register"
              size="sm"
            >
              立即注册
            </Link>
          </div>
        </motion.div>
      </div>
    </DefaultLayout>
  );
}
