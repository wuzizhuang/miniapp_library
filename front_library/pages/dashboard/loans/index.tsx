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
  CardHeader,
  Input,
  Divider,
  ChipProps,
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
import { adminService, AdminLoan, AdminUserDetail } from "@/services/api/adminService";
import { BookCopy, bookCopyService } from "@/services/api/bookCopyService";
import { hasAnyPermission } from "@/utils/rbac";

function statusChipColor(status: string): ChipProps["color"] {
  switch (status?.toUpperCase()) {
    case "AVAILABLE":
    case "ACTIVE":
      return "success";
    case "BORROWED":
    case "RESERVED":
      return "warning";
    case "LOST":
    case "DAMAGED":
    case "OVERDUE":
      return "danger";
    case "RETURNED":
      return "default";
    default:
      return "default";
  }
}

export default function LoansPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  const [borrowUserId, setBorrowUserId] = useState("");
  const [borrowCopyId, setBorrowCopyId] = useState("");
  const [reviewReaderAccount, setReviewReaderAccount] = useState("");
  const [borrowReview, setBorrowReview] = useState<{
    user: AdminUserDetail;
    copy: BookCopy;
  } | null>(null);
  const [reviewingBorrow, setReviewingBorrow] = useState(false);
  const [creatingLoan, setCreatingLoan] = useState(false);
  const [processingLoanAction, setProcessingLoanAction] = useState<string | null>(null);
  const canCreateLoan = hasAnyPermission(user, ["loan:manage"]);
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

  const resetBorrowReview = () => {
    setBorrowReview(null);
    setReviewReaderAccount("");
  };

  const updateBorrowUserId = (value: string) => {
    setBorrowUserId(value);
    resetBorrowReview();
  };

  const updateBorrowCopyId = (value: string) => {
    setBorrowCopyId(value);
    resetBorrowReview();
  };

  const parseBorrowForm = () => {
    const userId = Number(borrowUserId);
    const copyId = Number(borrowCopyId);

    if (!Number.isInteger(userId) || userId <= 0) {
      toast.error("请输入有效的读者 ID");

      return null;
    }

    if (!Number.isInteger(copyId) || copyId <= 0) {
      toast.error("请输入有效的副本 ID");

      return null;
    }

    return { userId, copyId };
  };

  const handleReviewBorrow = async () => {
    const parsed = parseBorrowForm();

    if (!parsed) {
      return;
    }

    setReviewingBorrow(true);
    try {
      const [reviewUser, reviewCopy] = await Promise.all([
        adminService.getAdminUserById(parsed.userId),
        bookCopyService.getById(parsed.copyId),
      ]);

      setBorrowReview({ user: reviewUser, copy: reviewCopy });
      setReviewReaderAccount("");
      toast.success("请核对读者与副本信息后，再完成代借确认");
    } catch (requestError: unknown) {
      resetBorrowReview();
      toast.error(getApiErrorMessage(requestError, "信息核对失败，请检查读者 ID 和副本 ID"));
    } finally {
      setReviewingBorrow(false);
    }
  };

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
    const parsed = parseBorrowForm();

    if (!parsed) {
      return;
    }

    if (!borrowReview) {
      toast.error("请先完成读者与副本的审核确认");

      return;
    }

    if (
      Number(borrowReview.user.id) !== parsed.userId ||
      borrowReview.copy.id !== parsed.copyId
    ) {
      toast.error("读者或副本信息已变更，请重新审核后再提交");
      resetBorrowReview();

      return;
    }

    if (
      reviewReaderAccount.trim().toLowerCase() !==
      borrowReview.user.username.trim().toLowerCase()
    ) {
      toast.error("复核账号不匹配，请根据读者账号重新确认");

      return;
    }

    setCreatingLoan(true);
    try {
      await adminService.createLoan(parsed.copyId, parsed.userId, {
        confirmUsername: borrowReview.user.username,
      });
      toast.success(`已为用户 #${parsed.userId} 办理借阅`);
      setBorrowCopyId("");
      resetBorrowReview();
      await Promise.all([
        mutate(),
        globalMutate(
          (key) =>
            Array.isArray(key) &&
            (key[0] === "admin-user-overview" || key[0] === "admin-user-loans") &&
            key[1] === parsed.userId,
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
                  先核对读者与副本，再输入读者账号完成二次审核，最后才会提交代借。
                </p>
              </div>
              <Input
                label="读者 ID"
                labelPlacement="outside"
                placeholder="例如 12"
                type="number"
                value={borrowUserId}
                onValueChange={updateBorrowUserId}
              />
              <Input
                label="副本 ID"
                labelPlacement="outside"
                placeholder="例如 105"
                type="number"
                value={borrowCopyId}
                onValueChange={updateBorrowCopyId}
              />
              <div className="flex gap-3 self-end">
                <Button
                  isLoading={reviewingBorrow}
                  variant="flat"
                  onPress={() => void handleReviewBorrow()}
                >
                  核对信息
                </Button>
                <Button
                  color="primary"
                  isDisabled={!borrowReview}
                  isLoading={creatingLoan}
                  onPress={() => void handleCreateLoan()}
                >
                  确认代借
                </Button>
              </div>

              {borrowReview ? (
                <div className="lg:col-span-3">
                  <Card className="border border-primary/20 bg-primary/5 shadow-none">
                    <CardHeader className="flex flex-col items-start gap-1 px-5 pb-0 pt-5">
                      <div className="flex items-center gap-2">
                        <Icon className="text-primary" icon="solar:shield-check-bold" width={18} />
                        <h3 className="text-base font-semibold">代借二次审核</h3>
                      </div>
                      <p className="text-sm text-default-500">
                        请核对读者本人信息、读者账号和副本信息，确认无误后再提交。
                      </p>
                    </CardHeader>
                    <CardBody className="grid gap-4 px-5 pb-5 pt-4 lg:grid-cols-[1fr_auto_1fr]">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">读者信息</p>
                            <p className="text-xs text-default-500">请与到馆证件或读者本人当面核对</p>
                          </div>
                          <Chip color={borrowReview.user.status === "active" ? "success" : "danger"} size="sm" variant="flat">
                            {borrowReview.user.status === "active" ? "账号正常" : "账号异常"}
                          </Chip>
                        </div>
                        <div className="rounded-2xl bg-white/80 p-4 text-sm shadow-sm">
                          <p className="font-semibold text-default-900">{borrowReview.user.name}</p>
                          <p className="mt-1 text-default-600">读者 ID：#{borrowReview.user.id}</p>
                          <p className="mt-1 text-default-600">读者账号：{borrowReview.user.username}</p>
                          <p className="mt-1 text-default-600">邮箱：{borrowReview.user.email || "-"}</p>
                          <p className="mt-1 text-default-600">身份：{borrowReview.user.identityType || "-"}</p>
                        </div>
                      </div>

                      <div className="hidden items-center justify-center lg:flex">
                        <Divider className="h-full" orientation="vertical" />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">副本信息</p>
                            <p className="text-xs text-default-500">请确认当前副本与柜台扫描/录入一致</p>
                          </div>
                          <Chip color={statusChipColor(borrowReview.copy.status)} size="sm" variant="flat">
                            {borrowReview.copy.status}
                          </Chip>
                        </div>
                        <div className="rounded-2xl bg-white/80 p-4 text-sm shadow-sm">
                          <p className="font-semibold text-default-900">{borrowReview.copy.bookTitle}</p>
                          <p className="mt-1 text-default-600">副本 ID：#{borrowReview.copy.id}</p>
                          <p className="mt-1 text-default-600">所属图书 ID：#{borrowReview.copy.bookId}</p>
                          <p className="mt-1 text-default-600">ISBN：{borrowReview.copy.isbn || "-"}</p>
                          <p className="mt-1 text-default-600">馆藏位置：{borrowReview.copy.locationCode || "-"}</p>
                        </div>
                      </div>

                      <div className="lg:col-span-3 rounded-2xl border border-warning-200 bg-warning-50 p-4">
                        <p className="text-sm font-medium text-warning-800">
                          二次确认要求
                        </p>
                        <p className="mt-1 text-sm text-warning-700">
                          请再次输入读者账号 <span className="font-semibold">{borrowReview.user.username}</span>，系统会把这次复核结果一并提交后端校验。
                        </p>
                        <Input
                          className="mt-3"
                          label="复核读者账号"
                          labelPlacement="outside"
                          placeholder={`请输入 ${borrowReview.user.username}`}
                          value={reviewReaderAccount}
                          onValueChange={setReviewReaderAccount}
                        />
                      </div>
                    </CardBody>
                  </Card>
                </div>
              ) : null}
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
