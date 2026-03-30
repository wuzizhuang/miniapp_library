export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "智慧图书馆",
  description: "面向读者与馆员的图书馆服务平台。",
  navItems: [
    {
      label: "首页",
      href: "/",
    },
    {
      label: "馆藏目录",
      href: "/books",
    },
    {
      label: "作者",
      href: "/authors",
    },
    {
      label: "关于系统",
      href: "/about",
    },
  ],
  navMenuItems: [
    {
      label: "我的中心",
      href: "/my",
    },
    {
      label: "我的书架",
      href: "/my/shelf",
    },
    {
      label: "推荐动态",
      href: "/my/recommendations",
    },
    {
      label: "我的预约",
      href: "/my/reservations",
    },
    {
      label: "服务预约",
      href: "/my/appointments",
    },
    {
      label: "罚款记录",
      href: "/my/fines",
    },
    {
      label: "帮助与反馈",
      href: "/help-feedback",
    },
    {
      label: "消息中心",
      href: "/my/notifications",
    },
  ],
  links: {
    github: "",
    twitter: "",
    docs: "",
    discord: "",
    sponsor: "",
  },
};
