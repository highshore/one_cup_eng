import { BlogClient } from "./BlogClient";

export default function BlogPage() {
  // Remove SSR fetch to avoid stack overflow - let client handle all data fetching
  return <BlogClient initialPosts={[]} />;
}
