import React from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  User,
  Chip,
  Tooltip,
  Card,
  CardHeader,
  CardBody,
  Button,
  Link,
} from "@heroui/react";
import { Icon } from "@iconify/react";

import { AppImage } from "@/components/common/AppImage";
import { RecentLoan } from "@/services/api/adminService";

interface Props {
  loans: RecentLoan[];
}

const statusMap: Record<string, { color: "primary" | "danger" | "success"; label: string }> = {
  active: { color: "primary", label: "借阅中" },
  overdue: { color: "danger", label: "已逾期" },
  returned: { color: "success", label: "已归还" },
};

export const RecentLoans = ({ loans }: Props) => {
  return (
    <Card className="shadow-sm border-none bg-white dark:bg-content1 h-full">
      <CardHeader className="flex justify-between items-center px-6 py-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
          最近借阅动态
        </h3>
        <Button
          as={Link}
          color="primary"
          endContent={<Icon icon="solar:alt-arrow-right-linear" />}
          href="/dashboard/loans"
          size="sm"
          variant="light"
        >
          查看全部
        </Button>
      </CardHeader>
      <CardBody className="px-3 pb-3">
        <Table
          removeWrapper
          aria-label="Recent loans"
          classNames={{
            th: "bg-transparent text-default-500 border-b border-divider",
            td: "py-3",
          }}
          shadow="none"
        >
          <TableHeader>
            <TableColumn>图书</TableColumn>
            <TableColumn>借阅人</TableColumn>
            <TableColumn>状态</TableColumn>
            <TableColumn align="end">到期日</TableColumn>
          </TableHeader>
          <TableBody emptyContent="暂无数据">
            {loans.map((loan) => (
              <TableRow
                key={loan.id}
                className="hover:bg-default-50/50 cursor-pointer transition-colors"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    {loan.bookCover ? (
                      <AppImage
                        alt="cover"
                        className="rounded shadow-sm"
                        height={40}
                        src={loan.bookCover}
                        width={32}
                        wrapperClassName="h-10 w-8 rounded"
                      />
                    ) : (
                      <div className="flex h-10 w-8 items-center justify-center rounded bg-default-100 text-default-400">
                        <Icon icon="solar:book-2-bold" width={14} />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-small font-medium truncate max-w-[120px]">
                        {loan.bookName}
                      </span>
                      <span className="text-tiny text-default-400">
                        {loan.id}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <User
                    avatarProps={{
                      radius: "full",
                      size: "sm",
                    }}
                    classNames={{ name: "text-small font-medium" }}
                    name={loan.userName}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    className="capitalize border-none gap-1 text-default-600"
                    // @ts-ignore
                    color={statusMap[loan.status].color}
                    size="sm"
                    variant="dot"
                  >
                    {statusMap[loan.status].label}
                  </Chip>
                </TableCell>
                <TableCell>
                  <div className="text-right flex justify-end items-center gap-2">
                    <span
                      className={`text-small ${loan.status === "overdue" ? "text-danger font-bold" : "text-default-500"}`}
                    >
                      {loan.dueDate}
                    </span>
                    {loan.status === "overdue" && (
                      <Tooltip content="发送催还通知">
                        <span className="text-danger cursor-pointer active:scale-95">
                          <Icon icon="solar:bell-bold" />
                        </span>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardBody>
    </Card>
  );
};
