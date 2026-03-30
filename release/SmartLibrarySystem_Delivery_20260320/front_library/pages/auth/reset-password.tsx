"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { Button, Card, CardBody, CardHeader, Form, Input, Link, Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useRouter } from "next/router";
import { toast } from "sonner";

import DefaultLayout from "@/components/layouts/default";
import { authService, parseApiError } from "@/services/api/authService";

export default function ResetPasswordPage() {
  const router = useRouter();
  const token = useMemo(
    () => (typeof router.query.token === "string" ? router.query.token : ""),
    [router.query.token],
  );

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [validationMessage, setValidationMessage] = useState("正在校验重置链接...");
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    if (!token) {
      setIsChecking(false);
      setIsValidToken(false);
      setValidationMessage("缺少重置令牌，请重新发起找回密码流程。");

      return;
    }

    const run = async () => {
      setIsChecking(true);
      try {
        const result = await authService.validateResetToken(token);

        setIsValidToken(result.valid);
        setValidationMessage(result.message);
      } catch (error: any) {
        const message = parseApiError(error, "重置链接校验失败，请稍后重试。").message;

        setIsValidToken(false);
        setValidationMessage(message);
      } finally {
        setIsChecking(false);
      }
    };

    void run();
  }, [router.isReady, token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password.length < 8) {
      toast.error("密码至少需要 8 位");

      return;
    }

    if (password !== confirmPassword) {
      toast.error("两次输入的密码不一致");

      return;
    }

    setIsSubmitting(true);
    setFormError("");
    try {
      const result = await authService.resetPassword({ token, password });

      setSuccess(true);
      toast.success(result.message);
      setTimeout(() => {
        void router.push("/auth/login");
      }, 1200);
    } catch (error: any) {
      const message = parseApiError(error, "密码重置失败，请重新获取重置链接。").message;

      toast.error(message);
      setFormError(message);
      setIsValidToken(false);
      setValidationMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DefaultLayout>
      <section className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-12">
        <Card className="w-full border border-default-200 shadow-sm">
          <CardHeader className="flex flex-col items-start gap-2 pb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100">
              <Icon icon="solar:key-bold-duotone" width={26} className="text-primary-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">重置密码</h1>
              <p className="mt-1 text-sm text-default-500">
                请输入新密码并完成账号找回。重置链接只能使用一次，过期后需重新申请。
              </p>
            </div>
          </CardHeader>
          <CardBody className="space-y-5 pt-2">
            {isChecking ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Spinner size="lg" />
                <p className="text-sm text-default-500">{validationMessage}</p>
              </div>
            ) : success ? (
              <div className="space-y-4 rounded-xl border border-success-200 bg-success-50 p-4 text-sm text-success-700">
                <div className="flex items-start gap-3">
                  <Icon icon="solar:check-circle-bold-duotone" width={22} className="mt-0.5" />
                  <div>
                    <p className="font-semibold">密码已重置成功</p>
                    <p className="mt-1">正在跳转到登录页，您也可以立即返回登录。</p>
                  </div>
                </div>
                <Button as={Link} color="success" href="/auth/login">
                  返回登录
                </Button>
              </div>
            ) : !isValidToken ? (
              <div className="space-y-4 rounded-xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
                <div className="flex items-start gap-3">
                  <Icon icon="solar:danger-circle-bold-duotone" width={22} className="mt-0.5" />
                  <div>
                    <p className="font-semibold">重置链接不可用</p>
                    <p className="mt-1">{validationMessage}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button as={Link} color="primary" href="/auth/forgetPassword">
                    重新申请
                  </Button>
                  <Button as={Link} href="/auth/login" variant="flat">
                    返回登录
                  </Button>
                </div>
              </div>
            ) : (
              <Form className="flex flex-col gap-4" validationBehavior="native" onSubmit={handleSubmit}>
                <div className="w-full rounded-xl border border-primary-200 bg-primary-50 p-3 text-sm text-primary-700">
                  {validationMessage}
                </div>
                {formError ? (
                  <div className="w-full rounded-xl border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
                    {formError}
                  </div>
                ) : null}
                <Input
                  isRequired
                  endContent={
                    <button
                      aria-label={isVisible ? "隐藏新密码" : "显示新密码"}
                      type="button"
                      onClick={() => setIsVisible((prev) => !prev)}
                    >
                      <Icon
                        className="text-default-400 text-2xl"
                        icon={isVisible ? "solar:eye-closed-linear" : "solar:eye-bold"}
                      />
                    </button>
                  }
                  label="新密码"
                  labelPlacement="outside"
                  minLength={8}
                  placeholder="请输入至少 8 位的新密码"
                  type={isVisible ? "text" : "password"}
                  value={password}
                  variant="bordered"
                  onValueChange={(value) => {
                    setPassword(value);
                    if (formError) {
                      setFormError("");
                    }
                  }}
                />
                <Input
                  isRequired
                  endContent={
                    <button
                      aria-label={isConfirmVisible ? "隐藏确认新密码" : "显示确认新密码"}
                      type="button"
                      onClick={() => setIsConfirmVisible((prev) => !prev)}
                    >
                      <Icon
                        className="text-default-400 text-2xl"
                        icon={isConfirmVisible ? "solar:eye-closed-linear" : "solar:eye-bold"}
                      />
                    </button>
                  }
                  label="确认新密码"
                  labelPlacement="outside"
                  minLength={8}
                  placeholder="请再次输入新密码"
                  type={isConfirmVisible ? "text" : "password"}
                  value={confirmPassword}
                  variant="bordered"
                  onValueChange={(value) => {
                    setConfirmPassword(value);
                    if (formError) {
                      setFormError("");
                    }
                  }}
                />
                <Button className="w-full" color="primary" isLoading={isSubmitting} type="submit">
                  {isSubmitting ? "提交中..." : "确认重置"}
                </Button>
              </Form>
            )}
          </CardBody>
        </Card>
      </section>
    </DefaultLayout>
  );
}
