import { Metadata } from "next";
import ShadowClient from "./ShadowClient";

export const metadata: Metadata = {
  title: "Shadow Learning | OneCup English",
  description:
    "Practice shadowing technique for English pronunciation and listening skills",
};

export default function ShadowPage() {
  return <ShadowClient />;
}
