import { Chip } from "@heroui/react";
import { Icon } from "@iconify/react";

import DefaultLayout from "@/components/layouts/default";

const highlights = [
  "Spring Boot 3.4 + JWT 权限认证",
  "Next.js 15 Pages Router 前后台一体",
  "统一通知、预约、借阅与罚款链路",
  "面向管理员的统计分析与运营看板",
];

const metrics = [
  {
    label: "核心业务链路",
    value: "8 条",
    desc: "覆盖检索、借阅、预约、归还、罚款、通知与审核流。",
    icon: "solar:route-bold-duotone",
  },
  {
    label: "双端角色",
    value: "2 端",
    desc: "读者自助端与馆员后台共用一套业务规则。",
    icon: "solar:users-group-rounded-bold-duotone",
  },
  {
    label: "管理能力",
    value: "12+",
    desc: "图书、副本、借阅、预约、评论、反馈、权限等后台模块。",
    icon: "solar:widget-5-bold-duotone",
  },
  {
    label: "通知触点",
    value: "全链路",
    desc: "预约到馆、逾期提醒、审核结果和罚款状态都会触发消息。",
    icon: "solar:bell-bing-bold-duotone",
  },
];

const journey = [
  {
    step: "01",
    title: "编目与入库",
    desc: "馆员录入图书、作者、分类、出版社和副本位置，形成真实馆藏基础数据。",
    icon: "solar:box-bold-duotone",
  },
  {
    step: "02",
    title: "检索与借阅",
    desc: "读者可以在馆藏目录里搜索、收藏、借阅、预约，并查看楼层定位与可借副本。",
    icon: "solar:magnifer-book-bold-duotone",
  },
  {
    step: "03",
    title: "预约与归还审核",
    desc: "系统支持预约取书、归还地点指定、归还申请审核，以及借阅跟踪与逾期规则处理。",
    icon: "solar:checklist-bold-duotone",
  },
  {
    step: "04",
    title: "运营与治理",
    desc: "后台集中处理评论审核、反馈工单、罚款记录、预约履约与权限配置。",
    icon: "solar:chart-square-bold-duotone",
  },
];

const readerFeatures = [
  "馆藏检索、筛选、书架定位与作者查询",
  "借阅、预约、续借、归还申请与审核跟踪",
  "收藏、评论、通知、罚款与反馈提交",
];

const adminFeatures = [
  "图书、副本、作者、分类、出版社统一维护",
  "借阅、预约、评论、反馈、罚款和通知联动管理",
  "统计看板、权限配置与业务规则落地",
];

const governanceCards = [
  {
    title: "统一规则中心",
    desc: "借阅上限、预约履约、归还审核、逾期罚款和通知策略都由后端规则统一控制，不依赖页面临时判断。",
    icon: "solar:shield-check-bold-duotone",
    accent: "from-sky-500/25 to-cyan-400/10",
  },
  {
    title: "真实业务闭环",
    desc: "不是单页演示，而是把读者端和后台管理真正串成一条可运行的业务链，方便演示也方便继续扩展。",
    icon: "solar:repeat-bold-duotone",
    accent: "from-amber-500/25 to-orange-400/10",
  },
  {
    title: "前后台一体协作",
    desc: "同一套图书、借阅、副本和通知数据，同时服务读者体验与馆员运营，减少重复维护和信息断层。",
    icon: "solar:layers-bold-duotone",
    accent: "from-emerald-500/25 to-teal-400/10",
  },
];

export default function AboutPage() {
  return (
    <DefaultLayout>
      <section className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_24%),radial-gradient(circle_at_82%_18%,rgba(251,191,36,0.1),transparent_18%),linear-gradient(180deg,#07101c_0%,#0b1525_45%,#111827_100%)] text-white">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(8,15,30,0.82))] p-6 shadow-[0_32px_90px_-42px_rgba(2,6,23,0.9)] md:p-8">
            <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr] xl:items-start">
              <div className="space-y-6">
                <Chip
                  className="border border-sky-400/20 bg-sky-400/10 text-sky-200"
                  radius="sm"
                  variant="flat"
                >
                  Library System Overview
                </Chip>

                <div className="space-y-4">
                  <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white md:text-6xl md:leading-[1.02]">
                    面向读者与馆员的统一智慧图书馆系统
                  </h1>
                  <p className="max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
                    这套系统把馆藏检索、预约借阅、归还审核、罚款处理、消息通知、评论审核和后台运营分析放进同一条真实业务链路里，目标是让读者体验更顺滑，也让馆员管理更集中。
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {highlights.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                    >
                      {item}
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-sky-400/20 bg-[linear-gradient(135deg,rgba(14,165,233,0.15),rgba(14,165,233,0.05))] p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-sky-200">Reader Side</p>
                    <p className="mt-2 text-xl font-semibold text-white">从检索到归还跟踪的一站式体验</p>
                    <p className="mt-2 text-sm leading-7 text-slate-300">
                      读者可以完成搜索、收藏、借阅、预约、评论、查看通知、支付罚款与提交反馈。
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-amber-300/20 bg-[linear-gradient(135deg,rgba(245,158,11,0.16),rgba(245,158,11,0.06))] p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-amber-200">Admin Side</p>
                    <p className="mt-2 text-xl font-semibold text-white">从馆藏维护到运营治理的统一后台</p>
                    <p className="mt-2 text-sm leading-7 text-slate-300">
                      馆员和管理员可以围绕图书、副本、借阅、预约、审核、反馈和权限完成日常运营。
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(160deg,rgba(3,7,18,0.92),rgba(12,27,52,0.84)_58%,rgba(11,37,67,0.78)_100%)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_30px_80px_-40px_rgba(15,23,42,0.95)]">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/70 to-transparent" />
                <div className="space-y-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.34em] text-sky-300">System Scope</p>
                    <p className="mt-3 text-3xl font-bold leading-tight text-white">
                      从图书入库到读者归还的完整闭环
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-300">
                      不只是静态页面集合，而是围绕馆藏数据、借阅规则和审核流真正串起来的可运行系统。
                    </p>
                  </div>

                  <div className="grid gap-4">
                    {[
                      {
                        title: "读者自助服务",
                        desc: "支持检索、收藏、预约、借阅跟踪、罚款处理、通知查看与反馈提交。",
                        icon: "solar:user-rounded-bold-duotone",
                      },
                      {
                        title: "馆员运营后台",
                        desc: "覆盖图书、副本、借阅、预约、评论审核、反馈处理与权限配置。",
                        icon: "solar:shield-user-bold-duotone",
                      },
                      {
                        title: "统一业务规则",
                        desc: "借阅上限、逾期罚款、预约履约、通知深链与审核流全部由后端规则控制。",
                        icon: "solar:clipboard-check-bold-duotone",
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="rounded-[24px] border border-white/10 bg-white/[0.05] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                      >
                        <div className="flex items-start gap-4">
                          <div className="rounded-2xl bg-white/10 p-3 text-sky-200">
                            <Icon icon={item.icon} width={24} />
                          </div>
                          <div>
                            <p className="text-xl font-semibold text-white">{item.title}</p>
                            <p className="mt-2 text-sm leading-7 text-slate-300">{item.desc}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((item) => (
              <div
                key={item.label}
                className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                    <p className="mt-3 text-3xl font-black text-white">{item.value}</p>
                  </div>
                  <div className="rounded-2xl bg-white/[0.06] p-3 text-sky-200">
                    <Icon icon={item.icon} width={24} />
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-300">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(15,23,42,0.58))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Service Journey</p>
                  <h2 className="mt-3 text-2xl font-bold text-white">核心业务链路</h2>
                </div>
                <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300">
                  真实流程，不是静态原型
                </div>
              </div>

              <div className="mt-6 grid gap-4">
                {journey.map((item) => (
                  <div
                    key={item.step}
                    className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center gap-3">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400/12 text-sm font-bold text-sky-200">
                          {item.step}
                        </span>
                        <div className="hidden h-10 w-px bg-gradient-to-b from-sky-300/40 to-transparent last:hidden md:block" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="rounded-2xl bg-white/[0.05] p-3 text-slate-200">
                            <Icon icon={item.icon} width={22} />
                          </div>
                          <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-slate-300">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[32px] border border-sky-300/12 bg-[linear-gradient(180deg,rgba(10,18,32,0.84),rgba(8,15,28,0.68))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <p className="text-xs uppercase tracking-[0.28em] text-sky-300">For Readers</p>
                <h2 className="mt-3 text-2xl font-bold text-white">读者端能力</h2>
                <div className="mt-5 space-y-3">
                  {readerFeatures.map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
                    >
                      <Icon
                        className="mt-0.5 shrink-0 text-sky-300"
                        icon="solar:check-circle-bold"
                        width={18}
                      />
                      <p className="text-sm leading-7 text-slate-200">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[32px] border border-amber-300/12 bg-[linear-gradient(180deg,rgba(27,18,10,0.78),rgba(22,17,14,0.68))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <p className="text-xs uppercase tracking-[0.28em] text-amber-200">For Librarians</p>
                <h2 className="mt-3 text-2xl font-bold text-white">馆员与管理员端能力</h2>
                <div className="mt-5 space-y-3">
                  {adminFeatures.map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
                    >
                      <Icon
                        className="mt-0.5 shrink-0 text-amber-200"
                        icon="solar:check-circle-bold"
                        width={18}
                      />
                      <p className="text-sm leading-7 text-slate-200">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {governanceCards.map((item) => (
              <div
                key={item.title}
                className={`rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.76),rgba(15,23,42,0.58))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]`}
              >
                <div
                  className={`inline-flex rounded-2xl bg-gradient-to-br ${item.accent} p-3 text-white`}
                >
                  <Icon icon={item.icon} width={24} />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </DefaultLayout>
  );
}
