import React, { Suspense } from "react";
import UserReportClient from "../UserReportClient";
import GlobalLoadingScreen from "../../lib/components/GlobalLoadingScreen";

export const dynamic = "force-dynamic";

export default function UserReportPage() {
  return (
    <Suspense fallback={<GlobalLoadingScreen />}>
      <UserReportClient />
    </Suspense>
  );
}


