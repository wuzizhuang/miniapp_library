"use client";

import React, { useState } from "react";
import { Button, Input, Checkbox, Link, Divider, Form } from "@heroui/react"; // 引入 Form
import { Icon } from "@iconify/react";
import { useRouter } from "next/router";

import DefaultLayout from "@/components/layouts/default";
import { getApiErrorMessage } from "@/lib/apiError";
import { authService } from "@/services/api/authService";

export default function RegisterPage() {
  const [isVisible, setIsVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const toggleVisibility = () => setIsVisible(!isVisible);
  const toggleConfirmVisibility = () => setIsConfirmVisible(!isConfirmVisible);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsRegistering(true);
    setErrorMsg("");

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    // 1. 前端简单校验
    if (data.password !== data.confirmPassword) {
      setErrorMsg("两次输入的密码不一致");
      setIsRegistering(false);

      return;
    }

    try {
      const payload = {
        username: String(data.username ?? ""),
        email: String(data.email ?? ""),
        password: String(data.password ?? ""),
        fullName: String(data.fullName ?? ""),
      };

      await authService.register(payload);
      await router.push("/auth/login");
    } catch (error: unknown) {
      setErrorMsg(getApiErrorMessage(error, "注册失败，请检查输入信息"));
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <DefaultLayout>
      <div className="flex h-full w-full items-center justify-center py-12">
        <div className="rounded-large bg-content1 shadow-small flex w-full max-w-sm flex-col gap-4 px-8 pt-6 pb-10">
          <p className="pb-2 text-xl font-medium">注册新账户</p>

          <Form
            className="flex flex-col gap-3"
            validationBehavior="native"
            onSubmit={handleSubmit}
          >
            {errorMsg && (
              <div className="bg-danger-50 text-danger text-sm p-2 rounded border border-danger-200">
                {errorMsg}
              </div>
            )}

            <Input
              isRequired
              label="用户名"
              name="username"
              placeholder="设置登录用户名"
              type="text"
              variant="bordered"
            />

            {/* ✅ 新增 FullName 字段 */}
            <Input
              isRequired
              label="真实姓名"
              name="fullName"
              placeholder="请输入您的真实姓名"
              type="text"
              variant="bordered"
            />

            <Input
              isRequired
              label="电子邮箱"
              name="email"
              placeholder="用于找回密码"
              type="email"
              variant="bordered"
            />

            <Input
              isRequired
              endContent={
                <button
                  aria-label={isVisible ? "隐藏密码" : "显示密码"}
                  type="button"
                  onClick={toggleVisibility}
                >
                  <Icon
                    className="text-default-400 text-2xl"
                    icon={
                      isVisible ? "solar:eye-closed-linear" : "solar:eye-bold"
                    }
                  />
                </button>
              }
              label="密码"
              name="password"
              placeholder="8位以上字符"
              type={isVisible ? "text" : "password"}
              variant="bordered"
            />

            <Input
              isRequired
              classNames={{
                input: "[&::-ms-reveal]:hidden [&::-ms-clear]:hidden",
              }}
              endContent={
                <button
                  aria-label={isConfirmVisible ? "隐藏确认密码" : "显示确认密码"}
                  type="button"
                  onClick={toggleConfirmVisibility}
                >
                  <Icon
                    className="text-default-400 text-2xl"
                    icon={
                      isConfirmVisible
                        ? "solar:eye-closed-linear"
                        : "solar:eye-bold"
                    }
                  />
                </button>
              }
              label="确认密码"
              name="confirmPassword"
              placeholder="再次输入密码"
              type={isConfirmVisible ? "text" : "password"}
              variant="bordered"
            />

            <Checkbox isRequired className="py-4" size="sm" value="agreed">
              我已阅读并同意{" "}
              <Link href="#" size="sm">
                服务条款
              </Link>
            </Checkbox>

            <Button color="primary" isLoading={isRegistering} type="submit">
              {isRegistering ? "注册中..." : "立即注册"}
            </Button>
          </Form>

          <div className="flex items-center gap-4 py-2">
            <Divider className="flex-1" />
            <p className="text-tiny text-default-500 shrink-0">或</p>
            <Divider className="flex-1" />
          </div>

          <p className="text-small text-center">
            已有账号？{" "}
            <Link href="/auth/login" size="sm">
              直接登录
            </Link>
          </p>
        </div>
      </div>
    </DefaultLayout>
  );
}
