import React from "react";
import StyledComponentsRegistry from "./lib/styled-components/registry";
import AuthProvider from "./lib/contexts/auth_context";
import GlobalStyles from "./lib/components/GlobalStyles";
import MainLayoutWrapper from "./lib/components/MainLayoutWrapper";

export const metadata = {
  title: "영어 한잔 - 1 Cup English",
  description: "통역사 출신이 개발한 비즈니스 영어 습관 형성 서비스",
  icons: {
    icon: [
      {
        url: "/images/logos/1cup_logo.jpg",
        sizes: "32x32",
        type: "image/jpeg",
      },
      {
        url: "/images/logos/1cup_logo.jpg",
        sizes: "16x16",
        type: "image/jpeg",
      },
    ],
    apple: [
      {
        url: "/images/logos/1cup_logo.jpg",
        sizes: "180x180",
        type: "image/jpeg",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body suppressHydrationWarning={true}>
        <StyledComponentsRegistry>
          <GlobalStyles />
          <AuthProvider>
            <MainLayoutWrapper>{children}</MainLayoutWrapper>
          </AuthProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
