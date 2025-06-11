"use client";

import dynamic from "next/dynamic";

// Load ShadowClient only on client-side to avoid SSR issues with document references
const ShadowClient = dynamic(() => import("./ShadowClient"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg">Loading Shadow Learning...</div>
    </div>
  ),
});

export default function ClientWrapper() {
  return <ShadowClient />;
}
