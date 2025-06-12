"use client";

import React from "react";
import { usePathname } from "next/navigation";
import MainLayoutWrapper from "./MainLayoutWrapper";

interface ConditionalLayoutWrapperProps {
  children: React.ReactNode;
}

export default function ConditionalLayoutWrapper({
  children,
}: ConditionalLayoutWrapperProps) {
  const pathname = usePathname();

  // Pages that should NOT use the main layout (with GNB and Footer)
  const authPages = ["/auth", "/kakao_callback"];

  const shouldUseMainLayout = !authPages.includes(pathname);

  if (shouldUseMainLayout) {
    return <MainLayoutWrapper>{children}</MainLayoutWrapper>;
  }

  // For auth pages, render children directly without main layout
  return <>{children}</>;
}
