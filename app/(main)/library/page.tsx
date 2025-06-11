import { Metadata } from "next";
import LibraryClient from "./LibraryClient";

export const metadata: Metadata = {
  title: "라이브러리 | OneCup English",
  description:
    "다양한 카테고리의 영어 영상 라이브러리를 탐색하고 학습하세요. 비즈니스, IT, 인터뷰, 연설 등 다양한 주제의 영상을 난이도별로 확인할 수 있습니다.",
};

export default function LibraryPage() {
  return <LibraryClient />;
}
