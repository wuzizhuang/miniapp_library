import type {
  AdminAiGatewaySettings,
  AdminAiGatewaySettingsUpdateRequest,
} from "@/services/api/adminService";

import React, { useEffect, useState } from "react";
import { Button, Card, CardBody, CardHeader, Chip, Input, Switch } from "@heroui/react";

type SettingsAiGatewayProps = {
  data?: AdminAiGatewaySettings;
  isLoading: boolean;
  pending: boolean;
  onSubmit: (payload: AdminAiGatewaySettingsUpdateRequest) => Promise<void>;
};

export function SettingsAiGateway({
  data,
  isLoading,
  pending,
  onSubmit,
}: SettingsAiGatewayProps) {
  const [enabled, setEnabled] = useState(false);
  const [provider, setProvider] = useState("openai");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [clearApiKey, setClearApiKey] = useState(false);

  useEffect(() => {
    setEnabled(Boolean(data?.enabled));
    setProvider(data?.provider || "openai");
    setBaseUrl(data?.baseUrl || "");
    setModel(data?.model || "");
    setApiKey("");
    setClearApiKey(false);
  }, [data]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({
      enabled,
      provider: provider.trim() || "openai",
      baseUrl: baseUrl.trim(),
      model: model.trim(),
      apiKey: apiKey.trim() || undefined,
      clearApiKey,
    });
    setApiKey("");
    setClearApiKey(false);
  };

  return (
    <Card className="shadow-sm border-none bg-white dark:bg-content1">
      <CardHeader className="flex items-start justify-between gap-4 px-6 py-5">
        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">AI 网关设置</h3>
          <p className="mt-1 text-sm text-default-500">
            AI 请求始终从后端发出。管理员只能在这里更新网关地址、模型和 Key，前端不会读取明文密钥。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip color={data?.enabled ? "success" : "default"} variant="flat">
            {data?.enabled ? "已启用" : "未启用"}
          </Chip>
          <Chip color={data?.hasApiKey ? "primary" : "warning"} variant="flat">
            {data?.hasApiKey ? "已配置 Key" : "未配置 Key"}
          </Chip>
        </div>
      </CardHeader>
      <CardBody className="px-6 pb-6 pt-0">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Input
              label="Provider"
              placeholder="openai"
              value={provider}
              onValueChange={setProvider}
            />
            <Input
              label="模型"
              placeholder="gpt-4.1-mini"
              value={model}
              onValueChange={setModel}
            />
          </div>

          <Input
            label="网关地址"
            placeholder="http://47.242.209.120:40005/v1"
            value={baseUrl}
            onValueChange={setBaseUrl}
          />

          <Input
            label="新的 API Key"
            placeholder={data?.apiKeyMasked || "留空则保留现有 Key"}
            type="password"
            value={apiKey}
            onValueChange={setApiKey}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-default-200 bg-default-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-default-400">当前状态</p>
              <p className="mt-2 text-sm text-default-700">
                当前 Key: {data?.hasApiKey ? data.apiKeyMasked || "已配置" : "未配置"}
              </p>
              <p className="mt-1 text-sm text-default-500">
                最近更新: {data?.updateTime ? `${data.updateTime} / ${data.updatedBy || "unknown"}` : "环境变量默认值"}
              </p>
            </div>

            <div className="rounded-2xl border border-warning-200 bg-warning-50 p-4 text-sm text-warning-900">
              <p className="font-semibold">安全提醒</p>
              <p className="mt-2 leading-6">
                不要把真实 API Key 写进仓库。后台只显示掩码，提交新 Key 后也不会回显明文。
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-default-200 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3">
              <Switch isSelected={enabled} onValueChange={setEnabled}>
                启用 AI 网关
              </Switch>
              <Switch isSelected={clearApiKey} onValueChange={setClearApiKey}>
                清空当前 API Key
              </Switch>
            </div>
            <Button color="primary" isLoading={pending || isLoading} type="submit">
              保存 AI 设置
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
