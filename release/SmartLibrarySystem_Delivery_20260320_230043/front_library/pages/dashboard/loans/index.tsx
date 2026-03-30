import React, { useState } from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  User,
  Chip,
  Tabs,
  Tab,
  Button,
  Spinner,
  Card,
  CardBody,
  Input,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import useSWR from "swr";
import { toast } from "sonner";
import { useRouter } from "next/router";
import { mutate as globalMutate } from "swr";

import { RequestErrorCard } from "@/components/common/RequestErrorCard";
import AdminLayout from "@/components/layouts/AdminLayout";
import { useAuth } from "@/config/authContext";
import { getApiErrorMessage } from "@/lib/apiError";
import { adminService, AdminLoan } from "@/services/api/adminService";
import { hasAnyPermission } from "@/utils/rbac";

export default function LoansPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  const [borrowUserId, setBorrowUserId] = useState("");
  const [borrowCopyId, setBorrowCopyId] = useState("");
  const [creatingLoan, setCreatingLoan] = useState(false);
  const [processingLoanAction, setProcessingLoanAction] = useState<string | null>(null);
  const canCreateLoan = hasAnyPermission(user, ["loan:write", "loan:manage"]);
  // key 会触发 SWR 重新请求
  const { data, error, isLoading, mutate } = useSWR<AdminLoan[]>(
    ["admin-loans", filter],
    () => adminService.getAdminLoans(filter),
  );

  React.useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const rawUserId = Array.isArray(router.query.userId)
      ? router.query.userId[0]
      : router.query.userId;

    if (rawUserId) {
      setBorrowUserId(String(rawUserId));
    }
  }, [router.isReady, router.query.userId]);

  const handleReturn = async (id: string) => {
    if (!confirm("确认该图书已归还？")) return;
    setProcessingLoanAction(`return:${id}`);
    try {
      await adminService.returnLoan(id.replace("LN-", ""));
      await mutate();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, "还书失败，请稍后重试"));
    } finally {
      setProcessingLoanAction(null);
    }
  };

  const handleMarkLost = async (id: string) => {
    if (!confirm("确认标记该图书为遗失？此操作将自动生成罚款单。")) return;
    setProcessingLoanAction(`lost:${id}`);
    try {
      await adminService.markLost(id.replace("LN-", ""));
      await mutate();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, "操作失败，请稍后重试"));
    } finally {
      setProcessingLoanAction(null);
    }
  };

  const handleCreateLoan = async () => {
    const userId = Number(borrowUserId);
    const copyId = Number(borrowCopyId);

    if (!Number.isInteger(userId) || userId <= 0) {
      toast.error("请输入有效的读者 ID");

      return;
    }

    if (!Number.isInteger(copyId) || copyId <= 0) {
      toast.error("请输入有效的副本 ID");

      return;
    }

    setCreatingLoan(true);
    try {
      await adminService.createLoan(copyId, userId);
      toast.success(`已为用户 #${userId} 办理借阅`);
      setBorrowCopyId("");
      await Promise.all([
        mutate(),
        globalMutate(
          (key) =>
            Array.isArray(key) &&
            (key[0] === "admin-user-overview" || key[0] === "admin-user-loans") &&
            key[1] === userId,
          undefined,
          { revalidate: true },
        ),
      ]);
    } catch (requestError: unknown) {
      toast.error(getApiErrorMessage(requestError, "代借失败，请稍后重试"));
    } finally {
      setCreatingLoan(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">借阅记录管理</h1>
          <p className="text-default-500">查看实时流转记录与逾期处理</p>
        </div>

        {canCreateLoan ? (
          <Card className="border border-default-100 shadow-sm">
            <CardBody className="grid gap-4 p-5 lg:grid-cols-[1fr_1fr_auto]">
              <div className="lg:col-span-3">
                <h2 className="text-base font-semibold">柜台代借</h2>
                <p className="mt-1 text-sm text-default-500">
                  面向前台/馆员，为指定读者录入副本 ID 并直接办理借阅。
                </p>
              </div>
              <Input
                label="读者 ID"
                labelPlacement="outside"
                placeholder="例如 12"
                type="number"
                value={borrowUserId}
                onValueChange={setBorrowUserId}
              />
              <Input
                label="副本 ID"
                labelPlacement="outside"
                placeholder="例如 105"
                type="number"
                value={borrowCopyId}
                onValueChange={setBorrowCopyId}
              />
              <Button
                className="self-end"
                color="primary"
                isLoading={creatingLoan}
                onPress={() => void handleCreateLoan()}
              >
                办理代借
              </Button>
            </CardBody>
          </Card>
        ) : null}

        <Tabs
          aria-label="Filter Loans"
          classNames={{
            tabList:
              "gap-6 w-full relative rounded-none p-0 border-b border-divider",
            cursor: "w-full bg-primary",
            tab: "max-w-fit px-0 h-12",
            tabContent: "group-data-[selected=true]:text-primary",
          }}
          color="primary"
          selectedKey={filter}
          variant="underlined"
          onSelectionChange={(key) => setFilter(key as string)}
        >
          <Tab
            key="all"
            title={
              <div className="flex items-center space-x-2">
                <Icon icon="solar:bill-list-bold" />
                <span>所有记录</span>
              </div>
            }
          />
          <Tab
            key="active"
            title={
              <div className="flex items-center space-x-2">
                <Icon icon="solar:clock-circle-bold" />
                <span>借阅中</span>
              </div>
            }
          />
          <Tab
            key="overdue"
            title={
              <div className="flex items-center space-x-2 text-danger">
                <Icon icon="solar:danger-triangle-bold" />
                <span>逾期未还</span>
              </div>
            }
          />
        </Tabs>

        {error && !data ? (
          <RequestErrorCard
            message={getApiErrorMessage(error, "借阅记录加载失败，请稍后重试。")}
            title="借阅记录加载失败"
            onRetry={() => void mutate()}
          />
        ) : (
          <Table
            aria-label="Loans table"
            className="bg-content1 rounded-xl shadow-sm"
          >
            <TableHeader>
              <TableColumn>借阅图书</TableColumn>
              <TableColumn>借阅人</TableColumn>
              <TableColumn>借出日期</TableColumn>
              <TableColumn>应还日期</TableColumn>
              <TableColumn>状态</TableColumn>
              <TableColumn align="end">操作</TableColumn>
            </TableHeader>
            <TableBody
              emptyContent="没有找到相关记录"
              isLoading={isLoading}
              items={data || []}
              loadingContent={<Spinner />}
            >
              {(item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <User
                      avatarProps={{
                        radius: "sm",
                        src: item.bookCover,
                        size: "sm",
                      }}
                      description={item.id}
                      name={item.bookName}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-tiny">{item.userName}</span>
                    </div>
                  </TableCell>
                  <TableCell>{item.borrowDate}</TableCell>
                  <TableCell>
                    <span
                      className={
                        item.status === "overdue" ? "text-danger font-bold" : ""
                      }
                    >
                      {item.dueDate}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Chip
                      className="capitalize border-none gap-1 text-default-600"
                      color={
                        item.status === "active"
                          ? "primary"
                          : item.status === "overdue"
                            ? "danger"
                            : "success"
                      }
                      size="sm"
                      variant="dot"
                    >
                      {
                        {
                          active: "借阅中",
                          overdue: "已逾期",
                          returned: "已归还",
                        }[item.status]
                      }
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {item.status !== "returned" && (
                        <Button
                          color={item.status === "overdue" ? "danger" : "primary"}
                          isDisabled={!!processingLoanAction}
                          isLoading={processingLoanAction === `return:${item.id}`}
                          size="sm"
                          variant="flat"
                          onPress={() => handleReturn(item.id)}
                        >
                          {item.status === "overdue" ? "处理罚款" : "确认还书"}
                        </Button>
                      )}
                      {item.status !== "returned" && (
                        <Button
                          color="warning"
                          isDisabled={!!processingLoanAction}
                          isLoading={processingLoanAction === `lost:${item.id}`}
                          size="sm"
                          variant="flat"
                          onPress={() => handleMarkLost(item.id)}
                        >
                          标记遗失
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </AdminLayout>
  );
}
