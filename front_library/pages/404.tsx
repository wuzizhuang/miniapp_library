import NextLink from "next/link";
import Head from "next/head";
import { Icon } from "@iconify/react";

/**
 * 自定义 404 页面。
 * 当用户访问不存在的路由时展示友好的中文提示。
 */
export default function Custom404() {
  return (
    <>
      <Head>
        <title>页面未找到 - 智慧图书馆</title>
      </Head>
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-6 text-center">
        <div className="relative mb-8">
          <div className="absolute -inset-6 rounded-full bg-indigo-100/60 blur-2xl" />
          <div className="relative rounded-3xl border border-indigo-100 bg-white/80 p-8 shadow-sm backdrop-blur">
            <Icon
              className="mx-auto text-indigo-300"
              icon="solar:book-bookmark-minimalistic-bold-duotone"
              width={72}
            />
          </div>
        </div>

        <h1 className="text-7xl font-bold text-indigo-400">404</h1>
        <h2 className="mt-4 text-2xl font-semibold text-slate-800">
          页面未找到
        </h2>
        <p className="mt-3 max-w-md text-slate-500">
          你访问的页面不存在或已被移除，请检查链接是否正确，或返回首页继续浏览。
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <NextLink
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:-translate-y-0.5 hover:bg-indigo-600 hover:shadow-lg"
            href="/"
          >
            <Icon icon="solar:home-2-bold" width={18} />
            返回首页
          </NextLink>
          <NextLink
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
            href="/books"
          >
            <Icon icon="solar:library-bold-duotone" width={18} />
            浏览馆藏
          </NextLink>
        </div>

        <p className="mt-12 text-xs text-slate-400">
          &copy; 2026 智慧图书馆
        </p>
      </div>
    </>
  );
}
