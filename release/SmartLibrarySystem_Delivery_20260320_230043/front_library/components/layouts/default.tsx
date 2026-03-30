import { Head } from "./head";
import { Navbar } from "./navbar";

import { siteConfig } from "@/config/site";

/**
 * 前台默认布局。
 * 统一包裹公共头部导航、内容区域和页脚，供读者侧页面复用。
 */
export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.1),transparent_24%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_34%,#f7f9fc_100%)] text-foreground dark:bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.08),transparent_22%),linear-gradient(180deg,#030712_0%,#0b1120_36%,#111827_100%)]">
      <Head />
      <Navbar />
      <main className="w-full flex-grow px-4 pt-16 md:px-6">
        {children}
      </main>
      <footer className="border-t border-slate-200/80 bg-white/55 px-4 py-4 text-center text-sm text-slate-500 backdrop-blur md:px-6 dark:border-white/8 dark:bg-black/10 dark:text-slate-400">
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-4 py-1.5 dark:border-white/8 dark:bg-white/[0.03]">
          {siteConfig.name}
        </span>
      </footer>
    </div>
  );
}
