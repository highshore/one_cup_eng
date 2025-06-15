import { Metadata } from "next";
import { Suspense } from "react";
import PaymentResultClient from "./PaymentResultClient";
import GlobalLoadingScreen from "../../lib/components/GlobalLoadingScreen";

export const metadata: Metadata = {
  title: "결제 결과 | OneCup English",
  description: "결제 결과를 확인하세요.",
};

export default function PaymentResultPage() {
  return (
    <Suspense fallback={<GlobalLoadingScreen />}>
      <PaymentResultClient />
    </Suspense>
  );
}
