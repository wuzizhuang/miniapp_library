import {
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
    Avatar,
    Badge,
} from "@heroui/react";
import { Button } from "@heroui/button";
import NextLink from "next/link";
import { Icon } from "@iconify/react";

import { useAuth } from "@/config/authContext";
import { canAccessAdminPanel } from "@/utils/rbac";

interface NavbarUserMenuProps {
    unreadCount: number;
}

export const NavbarUserMenu = ({ unreadCount }: NavbarUserMenuProps) => {
    const { user, logout } = useAuth();

    if (!user) return null;

    const userAvatar =
        user.avatar ||
        `https://ui-avatars.com/api/?name=${user.fullName || user.username || "User"}&background=random`;
    const userName = user.fullName || user.username || "读者";

    return (
        <div className="flex items-center gap-3">
            <Badge
                color="danger"
                content={unreadCount > 0 ? unreadCount : undefined}
                isInvisible={unreadCount === 0}
                shape="circle"
                size="sm"
            >
                <Button
                    aria-label="打开消息中心"
                    as={NextLink}
                    href="/my/notifications"
                    isIconOnly
                    radius="full"
                    variant="light"
                >
                    <Icon icon="solar:bell-bold-duotone" width={22} />
                </Button>
            </Badge>
            <Dropdown placement="bottom-end">
                <DropdownTrigger>
                    <Avatar
                        isBordered
                        as="button"
                        className="shrink-0 transition-transform"
                        color="primary"
                        name={userName}
                        size="sm"
                        src={userAvatar}
                    />
                </DropdownTrigger>
                <DropdownMenu aria-label="Profile Actions" variant="flat">
                    <DropdownItem key="profile-info" className="h-14 gap-2">
                        <p className="font-semibold">登录为</p>
                        <p className="font-semibold">{user.email}</p>
                    </DropdownItem>
                    <DropdownItem key="profile" href="/my" startContent={<Icon icon="solar:user-rounded-bold-duotone" width={18} />}>
                        我的中心
                    </DropdownItem>
                    <DropdownItem key="shelf" href="/my/shelf" startContent={<Icon icon="solar:library-bold-duotone" width={18} />}>
                        我的书架
                    </DropdownItem>
                    <DropdownItem key="reservations" href="/my/reservations" startContent={<Icon icon="solar:calendar-bold-duotone" width={18} />}>
                        我的预约
                    </DropdownItem>
                    <DropdownItem key="appointments" href="/my/appointments" startContent={<Icon icon="solar:buildings-bold-duotone" width={18} />}>
                        服务预约
                    </DropdownItem>
                    <DropdownItem key="reviews" href="/my/reviews" startContent={<Icon icon="solar:pen-new-square-bold-duotone" width={18} />}>
                        我的评论
                    </DropdownItem>
                    <DropdownItem key="recommendations" href="/my/recommendations" startContent={<Icon icon="solar:star-bold-duotone" width={18} />}>
                        推荐动态
                    </DropdownItem>
                    <DropdownItem key="search-history" href="/my/search-history" startContent={<Icon icon="solar:magnifer-bold-duotone" width={18} />}>
                        搜索历史
                    </DropdownItem>
                    <DropdownItem key="fines" href="/my/fines" startContent={<Icon icon="solar:card-bold-duotone" width={18} />}>
                        罚款记录
                    </DropdownItem>
                    <DropdownItem key="notifications" href="/my/notifications" startContent={<Icon icon="solar:bell-bold-duotone" width={18} />}>
                        消息中心
                        {unreadCount > 0 && (
                            <span className="ml-2 bg-danger text-white text-xs rounded-full px-1.5 py-0.5">
                                {unreadCount}
                            </span>
                        )}
                    </DropdownItem>
                    {canAccessAdminPanel(user) ? (
                        <DropdownItem key="admin" href="/dashboard" startContent={<Icon icon="solar:settings-bold-duotone" width={18} />}>
                            后台管理
                        </DropdownItem>
                    ) : null}
                    <DropdownItem key="logout" color="danger" onPress={logout} startContent={<Icon icon="solar:logout-2-bold-duotone" width={18} />}>
                        退出登录
                    </DropdownItem>
                </DropdownMenu>
            </Dropdown>
        </div>
    );
};
