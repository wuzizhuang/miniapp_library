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

export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

export default function App({ Component, pageProps }: AppPropsWithLayout) {
  const router = useRouter();
  const getLayout = Component.getLayout ?? ((page: ReactElement) => page);
  const shouldShowAiAssistant =
    !router.pathname.startsWith("/auth") && !router.pathname.startsWith("/dashboard");

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

export const fonts = {
  sans: fontSans.style.fontFamily,
  mono: fontMono.style.fontFamily,
};
