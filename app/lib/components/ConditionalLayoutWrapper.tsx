"use client";

import React from "react";
import { usePathname } from "next/navigation";
import MainLayoutWrapper from "./MainLayoutWrapper";
import DisplayNamePrompt from "./DisplayNamePrompt";
import { useDisplayNamePrompt } from "../hooks/useDisplayNamePrompt";

interface ConditionalLayoutWrapperProps {
  children: React.ReactNode;
}

export default function ConditionalLayoutWrapper({
  children,
}: ConditionalLayoutWrapperProps) {
  const pathname = usePathname();
  const { shouldShowPrompt, hidePrompt } = useDisplayNamePrompt();

  // Pages that should NOT use the main layout (with GNB and Footer)
  const authPages = ["/auth", "/kakao_callback"];

  const shouldUseMainLayout = !authPages.includes(pathname);

  return (
    <>
      {shouldUseMainLayout ? (
        <MainLayoutWrapper>{children}</MainLayoutWrapper>
      ) : (
        // For auth pages, render children directly without main layout
        children
      )}

      {/* Global display name prompt */}
      {shouldShowPrompt && <DisplayNamePrompt onComplete={hidePrompt} />}
    </>
  );
}
