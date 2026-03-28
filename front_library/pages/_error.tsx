import NextLink from "next/link";
import Head from "next/head";
import { Icon } from "@iconify/react";

/**
 * 全局错误兜底页面。
 * 全局错误兜底页面。
 * 使用静态兜底文案，避免本地 Windows 构建在 tracing 阶段对动态错误页处理不稳定。
 */
function ErrorPage() {
  const title = "页面加载出错";
  const description =
    "当前页面未能正常加载，你可以尝试刷新页面或返回首页。如果问题持续，请联系管理员。";

  return (
    <>
      <Head>
        <title>{title} - 智慧图书馆</title>
      </Head>
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-amber-50 px-6 text-center">
        <div className="relative mb-8">
          <div className="absolute -inset-6 rounded-full bg-amber-100/60 blur-2xl" />
          <div className="relative rounded-3xl border border-amber-100 bg-white/80 p-8 shadow-sm backdrop-blur">
            <Icon
              className="mx-auto text-amber-400"
              icon="solar:shield-warning-bold-duotone"
              width={72}
            />
          </div>
        </div>

        <h2 className="mt-4 text-2xl font-semibold text-slate-800">{title}</h2>
        <p className="mt-3 max-w-md text-slate-500">{description}</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-amber-200 transition hover:-translate-y-0.5 hover:bg-amber-600 hover:shadow-lg"
            type="button"
            onClick={() => window.location.reload()}
          >
            <Icon icon="solar:refresh-bold" width={18} />
            刷新页面
          </button>
          <NextLink
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md"
            href="/"
          >
            <Icon icon="solar:home-2-bold" width={18} />
            返回首页
          </NextLink>
        </div>

        <p className="mt-12 text-xs text-slate-400">
          &copy; 2026 智慧图书馆
        </p>
      </div>
    </>
  );
}

export default ErrorPage;
