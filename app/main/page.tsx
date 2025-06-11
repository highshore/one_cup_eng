import dynamic from "next/dynamic";

const HomePageClient = dynamic(
  () => import("../lib/features/home/components/HomePageClient"),
  { ssr: false }
);

export default function Home() {
  return <HomePageClient />;
}
