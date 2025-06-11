import { Metadata } from "next";
import ClientWrapper from "./ClientWrapper";

export const metadata: Metadata = {
  title: "Shadow Learning | OneCup English",
  description:
    "Practice shadowing technique for English pronunciation and listening skills",
};

export default function ShadowPage() {
  return <ClientWrapper />;
}
