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

/**
 * 顶部导航用户菜单组件属性。
 */
interface NavbarUserMenuProps {
    unreadCount: number;
}

/**
 * 顶部导航用户菜单。
 * 负责通知入口、头像下拉菜单以及读者常用快捷跳转。
 */
export const NavbarUserMenu = ({ unreadCount }: NavbarUserMenuProps) => {
    const { user, logout } = useAuth();

    if (!user) return null;

    // 若用户未上传头像，则回退到动态生成的首字母头像。
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
                    <DropdownItem key="profile" href="/my">
                        👤 我的中心
                    </DropdownItem>
                    <DropdownItem key="shelf" href="/my/shelf">
                        📚 我的书架
                    </DropdownItem>
                    <DropdownItem key="reservations" href="/my/reservations">
                        🗓 我的预约
                    </DropdownItem>
                    <DropdownItem key="appointments" href="/my/appointments">
                        🏛 服务预约
                    </DropdownItem>
                    <DropdownItem key="reviews" href="/my/reviews">
                        ✍ 我的评论
                    </DropdownItem>
                    <DropdownItem key="recommendations" href="/my/recommendations">
                        🌟 推荐动态
                    </DropdownItem>
                    <DropdownItem key="personal-recommendations" href="/my/personal-recommendations">
                        💡 为您推荐
                    </DropdownItem>
                    <DropdownItem key="search-history" href="/my/search-history">
                        🔎 搜索历史
                    </DropdownItem>
                    <DropdownItem key="fines" href="/my/fines">
                        💳 罚款记录
                    </DropdownItem>
                    <DropdownItem key="notifications" href="/my/notifications">
                        🔔 消息中心
                        {unreadCount > 0 && (
                            <span className="ml-2 bg-danger text-white text-xs rounded-full px-1.5 py-0.5">
                                {unreadCount}
                            </span>
                        )}
                    </DropdownItem>
                    {canAccessAdminPanel(user) ? (
                        <DropdownItem key="admin" href="/dashboard">
                            ⚙️ 后台管理
                        </DropdownItem>
                    ) : null}
                    <DropdownItem key="logout" color="danger" onPress={logout}>
                        退出登录
                    </DropdownItem>
                </DropdownMenu>
            </Dropdown>
        </div>
    );
};
