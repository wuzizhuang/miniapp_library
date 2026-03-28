import type { AppProps } from "next/app";

import { HeroUIProvider } from "@heroui/system";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useRouter } from "next/router";
import { Toaster } from "sonner";
import { ReactElement, ReactNode } from "react";
import { NextPage } from "next";
import { SWRConfig } from "swr";

import { AuthProvider } from "@/config/authContext";
import RouteGuard from "@/components/auth/RouteGuard";
import { FloatingAiAssistant } from "@/components/common/FloatingAiAssistant";
import { fontSans, fontMono } from "@/config/fonts";

import "@/styles/globals.css";

/**
 * 支持按页面注入自定义布局的 Next.js 页面类型。
 */
export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

/**
 * 前端应用根组件。
 * 统一挂载主题、鉴权、SWR、全局提示和路由守卫等跨页面能力。
 */
export default function App({ Component, pageProps }: AppPropsWithLayout) {
  const router = useRouter();
  const getLayout = Component.getLayout ?? ((page: ReactElement) => page);
  // 登录页和后台页不展示悬浮 AI 助手，避免遮挡表单和管理界面。
  const shouldShowAiAssistant =
    !router.pathname.startsWith("/auth") &&
    !router.pathname.startsWith("/dashboard") &&
    router.pathname !== "/404" &&
    router.pathname !== "/_error";

  return (
    <HeroUIProvider navigate={router.push}>
      <NextThemesProvider attribute="class" defaultTheme="light">
        <SWRConfig
          value={{
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 10_000,
            keepPreviousData: true,
          }}
        >
          <AuthProvider>
            <Toaster closeButton richColors position="top-right" />
            <RouteGuard>
              {getLayout(<Component {...pageProps} />)}
              {shouldShowAiAssistant ? <FloatingAiAssistant /> : null}
            </RouteGuard>
          </AuthProvider>
        </SWRConfig>
      </NextThemesProvider>
    </HeroUIProvider>
  );
}

/**
 * 对外导出字体变量，供样式层或组件按需复用。
 */
export const fonts = {
  sans: fontSans.style.fontFamily,
  mono: fontMono.style.fontFamily,
};
