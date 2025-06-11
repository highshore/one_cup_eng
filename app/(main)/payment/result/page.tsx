import { Metadata } from "next";
import { Suspense } from "react";
import PaymentResultClient from "./PaymentResultClient";

export const metadata: Metadata = {
  title: "결제 결과 | OneCup English",
  description: "결제 결과를 확인하세요.",
};

export default function PaymentResultPage() {
  return (
    <Suspense fallback={<div>Loading payment result...</div>}>
      <PaymentResultClient />
    </Suspense>
  );
}
