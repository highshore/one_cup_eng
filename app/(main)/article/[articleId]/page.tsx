import { ArticleClient } from "./ArticleClient";

interface ArticlePageProps {
  params: Promise<{
    articleId: string;
  }>;
}

// Generate static paths for articles
export async function generateStaticParams(): Promise<
  Array<{ articleId: string }>
> {
  // Return empty array for now since articles are dynamic
  // Articles will be loaded client-side
  return [];
}

export default function ArticlePage({ params }: ArticlePageProps) {
  return <ArticleClient />;
}
