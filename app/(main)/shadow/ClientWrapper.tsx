"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import ShadowClient with no SSR to prevent document access during build
const ShadowClientDynamic = dynamic(() => import("./ShadowClient"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <div className="text-lg text-gray-700">Loading Shadow Learning...</div>
        <div className="text-sm text-gray-500 mt-2">
          Preparing your shadowing experience
        </div>
      </div>
    </div>
  ),
});

export default function ClientWrapper() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Ensure we're fully client-side before rendering
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-lg text-gray-700">
            Loading Shadow Learning...
          </div>
        </div>
      </div>
    );
  }

  return <ShadowClientDynamic />;
}
