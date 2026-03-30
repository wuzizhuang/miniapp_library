import React from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Input,
  Spinner,
} from "@heroui/react";

import { RbacAuditLog } from "@/services/api/adminService";

interface SettingsAuditProps {
  auditActionOptions: string[];
  auditActionType: string;
  auditActorKeyword: string;
  auditFromDate: string;
  auditKeyword: string;
  auditPage: number;
  auditToDate: string;
  auditsLoading: boolean;
  filteredAuditLogs: RbacAuditLog[];
  isLastPage?: boolean;
  onAuditActionTypeChange: (value: string) => void;
  onAuditActorKeywordChange: (value: string) => void;
  onAuditFromDateChange: (value: string) => void;
  onAuditKeywordChange: (value: string) => void;
  onAuditToDateChange: (value: string) => void;
  onClearFilters: () => void;
  onExportCsv: () => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  formatLogTime: (value: string) => string;
}

export function SettingsAudit({
  auditActionOptions,
  auditActionType,
  auditActorKeyword,
  auditFromDate,
  auditKeyword,
  auditPage,
  auditToDate,
  auditsLoading,
  filteredAuditLogs,
  formatLogTime,
  isLastPage,
  onAuditActionTypeChange,
  onAuditActorKeywordChange,
  onAuditFromDateChange,
  onAuditKeywordChange,
  onAuditToDateChange,
  onClearFilters,
  onExportCsv,
  onNextPage,
  onPreviousPage,
}: SettingsAuditProps) {
  return (
    <Card className="border border-default-200">
      <CardHeader>
        <div className="flex w-full flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h2 className="font-semibold">RBAC 操作审计日志</h2>
            <p className="text-xs text-default-500">
              记录角色、权限、用户角色分配相关操作，便于追溯变更。
            </p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-5">
              <select
                className="w-full rounded-xl border border-default-300 bg-content1 px-3 py-2 text-sm"
                value={auditActionType}
                onChange={(event) => onAuditActionTypeChange(event.target.value)}
              >
                {auditActionOptions.map((action) => (
                  <option key={action || "all"} value={action}>
                    {action || "全部动作"}
                  </option>
                ))}
              </select>
              <Input
                placeholder="按操作者筛选"
                size="sm"
                value={auditActorKeyword}
                onValueChange={onAuditActorKeywordChange}
              />
              <Input
                placeholder="开始日期"
                size="sm"
                type="date"
                value={auditFromDate}
                onValueChange={onAuditFromDateChange}
              />
              <Input
                placeholder="结束日期"
                size="sm"
                type="date"
                value={auditToDate}
                onValueChange={onAuditToDateChange}
              />
              <Input
                placeholder="页内关键词搜索"
                size="sm"
                value={auditKeyword}
                onValueChange={onAuditKeywordChange}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="flat" onPress={onClearFilters}>
                清空筛选
              </Button>
              <Button size="sm" variant="flat" onPress={onExportCsv}>
                导出筛选结果 CSV
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button isDisabled={auditPage <= 0} size="sm" variant="flat" onPress={onPreviousPage}>
              上一页
            </Button>
            <Chip size="sm" variant="flat">
              第 {auditPage + 1} 页
            </Chip>
            <Button isDisabled={Boolean(isLastPage)} size="sm" variant="flat" onPress={onNextPage}>
              下一页
            </Button>
          </div>
        </div>
      </CardHeader>
      <Divider />
      <CardBody>
        {auditsLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : filteredAuditLogs.length === 0 ? (
          <p className="text-sm text-default-500">暂无审计日志</p>
        ) : (
          <div className="space-y-2">
            {filteredAuditLogs.map((log) => (
              <div
                key={log.logId}
                className="flex flex-col gap-2 rounded-xl border border-default-200 px-3 py-2 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Chip color="primary" size="sm" variant="flat">
                    {log.actionType}
                  </Chip>
                  <Chip size="sm" variant="dot">
                    {log.targetType}
                  </Chip>
                  <span className="text-default-500">目标: {log.targetId || "-"}</span>
                  <span className="text-default-500">操作者: {log.actorUsername}</span>
                </div>
                <div className="text-xs text-default-500">{formatLogTime(log.createTime)}</div>
                {log.detail ? (
                  <div className="text-xs text-default-400 lg:ml-4">{log.detail}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
