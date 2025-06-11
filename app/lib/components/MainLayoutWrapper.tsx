"use client";

import { usePathname } from "next/navigation";
import styled from "styled-components";
import GNB from "./gnb";
import Footer from "./footer";
import { GnbProvider } from "../contexts/gnb_context";

const LayoutWrapper = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const PageContainer = styled.div<{ $isHomePage: boolean }>`
  padding-top: ${(props) => (props.$isHomePage ? "0" : "80px")};
  flex: 1;
  min-height: 100vh;
  max-width: ${(props) => (props.$isHomePage ? "100%" : "960px")};
  margin: 0 auto;
  padding-left: ${(props) => (props.$isHomePage ? "0" : "1.5rem")};
  padding-right: ${(props) => (props.$isHomePage ? "0" : "1.5rem")};
  font-family: "Noto Sans KR", sans-serif;
  width: 100%;

  @media (max-width: 768px) {
    padding-top: ${(props) => (props.$isHomePage ? "0" : "70px")};
    padding-left: ${(props) => (props.$isHomePage ? "0" : "1rem")};
    padding-right: ${(props) => (props.$isHomePage ? "0" : "1rem")};
  }
`;

export default function MainLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  return (
    <GnbProvider>
      <LayoutWrapper>
        <GNB variant={isHomePage ? "home" : "default"} />
        <PageContainer $isHomePage={isHomePage}>{children}</PageContainer>
        <Footer />
      </LayoutWrapper>
    </GnbProvider>
  );
}
