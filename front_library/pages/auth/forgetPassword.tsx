"use client";

import React, { FormEvent, useState } from "react";
import { Button, Card, CardBody, CardHeader, Form, Input } from "@heroui/react";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { toast } from "sonner";

import DefaultLayout from "@/components/layouts/default";
import { authService, parseApiError } from "@/services/api/authService";

/**
 * 忘记密码页。
 * 提交邮箱后触发后端找回流程，并提示用户查看邮箱或开发日志。
 */
export default function ForgetPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const result = await authService.forgotPassword({ email });

      setSuccessMessage(result.message);
      setDeliveryMethod(result.deliveryMethod || "");
      toast.success("找回请求已提交");
    } catch (error: any) {
      const message = parseApiError(error, "提交失败，请稍后重试").message;

      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DefaultLayout>
      <section className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-4 py-12">
        <Card className="w-full border border-default-200 shadow-sm">
          <CardHeader className="flex items-start gap-4 pb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100">
              <Icon icon="solar:letter-bold-duotone" width={26} className="text-primary-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">找回密码</h1>
              <p className="mt-1 text-sm text-default-600">
                输入注册邮箱后，系统会发送一次性重置链接到你的邮箱。为避免泄露账号信息，无论邮箱是否存在，前端提示都会保持一致。
              </p>
            </div>
          </CardHeader>
          <CardBody className="space-y-5 pt-2">
            <div className="rounded-xl border border-default-200 bg-default-50 p-4 text-sm text-default-600">
              如果当前环境已配置邮件服务，请检查收件箱和垃圾邮件箱；未配置时，系统会自动回退到开发日志模式。
            </div>
            {errorMessage ? (
              <div className="rounded-xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
                {errorMessage}
              </div>
            ) : null}
            {successMessage ? (
              <div className="space-y-4 rounded-xl border border-success-200 bg-success-50 p-4 text-sm text-success-700">
                <div className="flex items-start gap-3">
                  <Icon icon="solar:check-circle-bold-duotone" width={22} className="mt-0.5" />
                  <div>
                    <p className="font-semibold">请求已受理</p>
                    <p className="mt-1">{successMessage}</p>
                    {deliveryMethod === "LOG" ? (
                      <p className="mt-2">
                        当前环境未启用邮件投递，开发联调可查看后端控制台中的重置链接。
                      </p>
                    ) : (
                      <p className="mt-2">若几分钟内未收到邮件，请检查垃圾邮件箱或联系管理员确认发信配置。</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button as={Link} color="primary" href="/auth/login">
                    返回登录
                  </Button>
                  {/* 成功态下允许用户快速回到表单，重新提交其他邮箱。 */}
                  <Button variant="flat" onPress={() => setSuccessMessage("")}>
                    重新提交
                  </Button>
                </div>
              </div>
            ) : (
              <Form className="flex flex-col gap-4" validationBehavior="native" onSubmit={handleSubmit}>
                <Input
                  isRequired
                  label="邮箱"
                  labelPlacement="outside"
                  placeholder="请输入注册邮箱"
                  type="email"
                  value={email}
                  variant="bordered"
                  onValueChange={(value) => {
                    setEmail(value);
                    if (errorMessage) {
                      setErrorMessage("");
                    }
                  }}
                />
                <Button
                  className="w-full"
                  color="primary"
                  isLoading={isSubmitting}
                  startContent={!isSubmitting ? <Icon icon="solar:letter-bold" width={18} /> : undefined}
                  type="submit"
                >
                  {isSubmitting ? "提交中..." : "发送重置请求"}
                </Button>
              </Form>
            )}
            <div className="flex flex-wrap gap-3">
              <Button as={Link} color="primary" href="/auth/login" variant="flat">
                返回登录
              </Button>
              <Button
                as={Link}
                href="/help-feedback"
                startContent={<Icon icon="solar:chat-round-dots-bold" width={18} />}
                variant="light"
              >
                联系支持
              </Button>
            </div>
          </CardBody>
        </Card>
      </section>
    </DefaultLayout>
  );
}
