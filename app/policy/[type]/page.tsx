import { PolicyClient } from "./PolicyClient";

interface PolicyPageProps {
  params: Promise<{
    type: string;
  }>;
}

// Generate static paths for policy pages
export async function generateStaticParams() {
  // Common policy types
  return [{ type: "privacy" }, { type: "terms" }, { type: "refund" }];
}

export default function PolicyPage({ params }: PolicyPageProps) {
  return <PolicyClient />;
}
