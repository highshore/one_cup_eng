import { Metadata } from "next";
import PaymentClient from "./PaymentClient";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "영어 한잔 멤버십 | OneCup English",
  description:
    "원하는 카테고리를 선택하고 멤버십을 시작하세요. 밋업 참여 티켓 및 프리미엄 기능을 이용할 수 있습니다.",
};

export default function PaymentPage() {
  return (
    <Suspense fallback={null}>
      <PaymentClient />
    </Suspense>
  );
}
