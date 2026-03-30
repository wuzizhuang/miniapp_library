import React, { useEffect, useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/router";
import {
    Card,
    CardBody,
    CardHeader,
    Chip,
    Divider,
    Avatar,
    Button,
    Input,
    Spinner,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import useSWR, { mutate as globalMutate } from "swr";
import { toast } from "sonner";

import DefaultLayout from "@/components/layouts/default";
import { RequestErrorCard } from "@/components/common/RequestErrorCard";
import { useAuth } from "@/config/authContext";
import { getApiErrorMessage } from "@/lib/apiError";
import { loanService } from "@/services/api/loanService";
import { authService } from "@/services/api/authService";
import { userService } from "@/services/api/userService";
import { hasRole } from "@/utils/rbac";
import { ApiUserProfileDto, ApiProfileUpdateDto } from "@/types/api";

const identityOptions = [
    { key: "STUDENT", label: "学生" },
    { key: "TEACHER", label: "教师" },
    { key: "STAFF", label: "职工" },
    { key: "VISITOR", label: "访客" },
];

const roleLabelMap: Record<string, string> = {
    ADMIN: "管理员",
    USER: "普通读者",
    LIBRARIAN: "馆员",
    CATALOGER: "录入员",
};

export default function ProfilePage() {
    const { user, updateProfile: updateAuthProfile } = useAuth();
    const router = useRouter();

    const { data: loans, error: loansError } = useSWR("my-loans-profile", loanService.getMyLoans);
    const {
        data: overview,
        error: overviewError,
        mutate: mutateOverview,
    } = useSWR(
        "my-overview",
        userService.getMyOverview,
    );

    const {
        data: profile,
        error: profileError,
        isLoading: profileLoading,
        mutate: mutateProfile,
    } = useSWR<ApiUserProfileDto>("my-profile", authService.getProfile);

    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<ApiProfileUpdateDto>({});

    useEffect(() => {
        if (profile) {
            setForm({
                fullName: profile.fullName ?? "",
                email: profile.email ?? "",
                department: profile.department ?? "",
                major: profile.major ?? "",
                enrollmentYear: profile.enrollmentYear,
                interestTags: profile.interestTags ?? [],
            });
        }
    }, [profile]);

    const activeLoans = loans?.filter((l) => l.status === "BORROWED" || l.status === "OVERDUE").length ?? 0;
    const overdueLoans = loans?.filter((l) => l.status === "OVERDUE").length ?? 0;

    const isAdmin = hasRole(user, "ADMIN");
    const roleLabel = roleLabelMap[user?.roles?.[0] ?? ""] ?? (isAdmin ? "管理员" : "普通读者");
    const roleColor = isAdmin ? "primary" : "default";
    const userAvatar = user?.avatar ||
        `https://ui-avatars.com/api/?name=${user?.fullName || user?.username || "User"}&background=random&size=128`;

    const handleSave = async () => {
        setSaving(true);
        try {
            const updatedProfile = await authService.updateProfile(form);

            updateAuthProfile({
                fullName: updatedProfile.fullName,
                email: updatedProfile.email,
            });

            await Promise.all([
                mutateProfile(updatedProfile, false),
                mutateOverview(),
            ]);
            setEditing(false);
            toast.success("个人信息已更新");
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, "更新失败，请稍后重试"));
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        if (profile) {
            setForm({
                fullName: profile.fullName ?? "",
                email: profile.email ?? "",
                department: profile.department ?? "",
                major: profile.major ?? "",
                enrollmentYear: profile.enrollmentYear,
                interestTags: profile.interestTags ?? [],
            });
        }
        setEditing(false);
    };

    const stats = [
        {
            label: "当前借阅",
            value: overview?.activeLoanCount ?? activeLoans,
            icon: "solar:book-bold-duotone",
            color: "text-primary",
            bg: "bg-primary-50 dark:bg-primary-900/20",
            href: "/my/shelf",
        },
        {
            label: "进行中预约",
            value: overview?.activeReservationCount ?? 0,
            icon: "solar:bookmark-bold-duotone",
            color: "text-warning-600",
            bg: "bg-warning-50 dark:bg-warning-900/20",
            href: "/my/reservations",
        },
        {
            label: "逾期书籍",
            value: overdueLoans,
            icon: "solar:danger-triangle-bold-duotone",
            color: "text-danger",
            bg: "bg-danger-50 dark:bg-danger-900/20",
            href: "/my/shelf",
        },
        {
            label: "待缴罚款",
            value: overviewError ? "-" : `¥${Number(overview?.pendingFineTotal ?? 0).toFixed(2)}`,
            icon: "solar:wallet-money-bold-duotone",
            color: "text-success-600",
            bg: "bg-success-50 dark:bg-success-900/20",
            href: "/my/fines",
        },
    ];

    const identityLabel = identityOptions.find((o) => o.key === profile?.identityType)?.label ?? "-";
    const requestError = profileError ?? overviewError ?? loansError;

    const retryRequests = async () => {
        await Promise.all([
            mutateProfile(),
            mutateOverview(),
            globalMutate("my-loans-profile"),
        ]);
    };

    return (
        <DefaultLayout>
            <section className="container mx-auto px-4 py-8 max-w-3xl min-h-screen">
                <h1 className="text-3xl font-bold mb-8">个人资料</h1>
                {requestError ? (
                    <RequestErrorCard
                        className="mb-6 border border-danger-200 bg-danger-50"
                        message={getApiErrorMessage(requestError, "个人资料加载失败，请稍后重试。")}
                        title="个人资料加载失败"
                        onRetry={() => {
                            void retryRequests();
                        }}
                    />
                ) : null}

                {/* 用户信息卡片 */}
                {!requestError ? (
                <Card className="mb-6 shadow-sm border-none bg-content1">
                    <CardHeader className="px-6 pt-6 pb-0 flex justify-between items-center">
                        <h3 className="text-base font-semibold text-default-700">基本信息</h3>
                        {!editing && (
                            <Button
                                size="sm"
                                variant="flat"
                                color="primary"
                                startContent={<Icon icon="solar:pen-bold" width={16} />}
                                onPress={() => setEditing(true)}
                            >
                                编辑资料
                            </Button>
                        )}
                    </CardHeader>
                    <CardBody className="p-6">
                        {profileLoading ? (
                            <div className="flex justify-center py-8">
                                <Spinner size="lg" label="加载个人信息..." />
                            </div>
                        ) : !editing ? (
                            /* 展示模式 */
                            <div className="flex items-start gap-6">
                                <Avatar
                                    src={userAvatar}
                                    name={user?.fullName || user?.username}
                                    size="lg"
                                    isBordered
                                    color="primary"
                                    className="w-20 h-20 text-2xl flex-shrink-0"
                                />
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h2 className="text-2xl font-bold">{profile?.fullName || user?.username || "-"}</h2>
                                        <Chip color={roleColor} size="sm" variant="flat">{roleLabel}</Chip>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-default-500">
                                        <div className="flex items-center gap-2">
                                            <Icon icon="solar:user-id-bold" width={16} />
                                            <span>用户名：{profile?.username || "-"}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Icon icon="solar:letter-bold" width={16} />
                                            <span>邮箱：{profile?.email || "-"}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Icon icon="solar:buildings-bold" width={16} />
                                            <span>院系：{profile?.department || "-"}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Icon icon="solar:notebook-bold" width={16} />
                                            <span>专业：{profile?.major || "-"}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Icon icon="solar:user-check-bold" width={16} />
                                            <span>身份：{identityLabel}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Icon icon="solar:calendar-bold" width={16} />
                                            <span>入学年份：{profile?.enrollmentYear || "-"}</span>
                                        </div>
                                    </div>
                                    {profile?.interestTags && profile.interestTags.length > 0 && (
                                        <div className="flex items-center gap-2 flex-wrap mt-2">
                                            <Icon icon="solar:tag-bold" width={16} className="text-default-400" />
                                            {profile.interestTags.map((tag) => (
                                                <Chip key={tag} size="sm" variant="flat" color="secondary">{tag}</Chip>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* 编辑模式 */
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Input
                                        label="姓名"
                                        value={form.fullName ?? ""}
                                        onValueChange={(v) => setForm({ ...form, fullName: v })}
                                        variant="bordered"
                                        size="sm"
                                    />
                                    <Input
                                        label="邮箱"
                                        type="email"
                                        value={form.email ?? ""}
                                        onValueChange={(v) => setForm({ ...form, email: v })}
                                        variant="bordered"
                                        size="sm"
                                    />
                                    <Input
                                        label="院系"
                                        value={form.department ?? ""}
                                        onValueChange={(v) => setForm({ ...form, department: v })}
                                        variant="bordered"
                                        size="sm"
                                    />
                                    <Input
                                        label="专业"
                                        value={form.major ?? ""}
                                        onValueChange={(v) => setForm({ ...form, major: v })}
                                        variant="bordered"
                                        size="sm"
                                    />
                                    <Input
                                        label="入学年份"
                                        type="number"
                                        value={form.enrollmentYear?.toString() ?? ""}
                                        onValueChange={(v) => setForm({ ...form, enrollmentYear: v ? parseInt(v) : undefined })}
                                        variant="bordered"
                                        size="sm"
                                    />
                                </div>
                                <div className="rounded-xl border border-default-200 bg-default-50 px-4 py-3 text-sm text-default-600">
                                    <div className="flex items-center gap-2">
                                        <Icon icon="solar:shield-user-bold" width={16} />
                                        <span>
                                            当前身份：{identityLabel}。身份与推荐资格由管理员统一分配，普通用户不能自行修改。
                                        </span>
                                    </div>
                                </div>
                                <Input
                                    label="兴趣标签（逗号分隔）"
                                    value={form.interestTags?.join(", ") ?? ""}
                                    onValueChange={(v) =>
                                        setForm({
                                            ...form,
                                            interestTags: v
                                                .split(",")
                                                .map((s) => s.trim())
                                                .filter(Boolean),
                                        })
                                    }
                                    variant="bordered"
                                    size="sm"
                                    description="例如：编程, 文学, 历史"
                                />
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                        variant="flat"
                                        size="sm"
                                        onPress={handleCancel}
                                        isDisabled={saving}
                                    >
                                        取消
                                    </Button>
                                    <Button
                                        color="primary"
                                        size="sm"
                                        isLoading={saving}
                                        onPress={handleSave}
                                        startContent={!saving && <Icon icon="solar:check-circle-bold" width={16} />}
                                    >
                                        保存
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardBody>
                </Card>
                ) : null}

                {/* 借阅统计 */}
                {!requestError ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    {stats.map((s) => (
                        <Card
                            key={s.label}
                            isPressable
                            onPress={() => {
                                void router.push(s.href);
                            }}
                            className="shadow-sm border-none bg-content1 hover:shadow-md transition-shadow"
                        >
                            <CardBody className="p-4 text-center">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 ${s.bg}`}>
                                    <Icon icon={s.icon} className={s.color} width={22} />
                                </div>
                                <p className="text-2xl font-bold">{s.value}</p>
                                <p className="text-xs text-default-400 mt-1">{s.label}</p>
                            </CardBody>
                        </Card>
                    ))}
                </div>
                ) : null}

                {/* 快捷入口 */}
                {!requestError ? (
                <Card className="shadow-sm border-none bg-content1">
                    <CardHeader className="px-5 pt-5 pb-2">
                        <h3 className="text-base font-semibold text-default-700">快捷功能</h3>
                    </CardHeader>
                    <CardBody className="px-5 pb-5 pt-0">
                        {[
                            { label: "我的书架", desc: "查看当前借阅书目", href: "/my/shelf", icon: "solar:library-bold-duotone", color: "text-primary" },
                            { label: "我的预约", desc: "查看排队预约情况", href: "/my/reservations", icon: "solar:bookmark-square-minimalistic-bold-duotone", color: "text-warning-600" },
                            { label: "罚款记录", desc: "查看并缴纳逾期罚款", href: "/my/fines", icon: "solar:wallet-money-bold-duotone", color: "text-danger" },
                            { label: "消息中心", desc: "查看系统通知与提醒", href: "/my/notifications", icon: "solar:bell-bold-duotone", color: "text-success-600" },
                        ].map((item, idx, arr) => (
                            <React.Fragment key={item.href}>
                                <NextLink
                                    href={item.href}
                                    className="flex items-center gap-4 py-3 hover:opacity-80 transition-opacity"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-default-100 flex items-center justify-center flex-shrink-0">
                                        <Icon icon={item.icon} className={item.color} width={20} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{item.label}</p>
                                        <p className="text-xs text-default-400">{item.desc}</p>
                                    </div>
                                    <Icon icon="solar:arrow-right-bold" className="text-default-300" width={18} />
                                </NextLink>
                                {idx < arr.length - 1 && <Divider />}
                            </React.Fragment>
                        ))}
                    </CardBody>
                </Card>
                ) : null}
            </section>
        </DefaultLayout>
    );
}
