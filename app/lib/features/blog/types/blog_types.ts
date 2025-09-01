export interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  status: "draft" | "published" | "archived";
  slug: string;
  featuredImage?: string;
  tags?: string[];
  featured?: boolean;
  category?: "announcement" | "review" | "info";
  views: number;
  likes: number;
  likedBy: string[];
}

export interface BlogPostForm {
  title: string;
  content: string;
  excerpt?: string;
  status: "draft" | "published";
  featuredImage?: string;
  tags?: string[];
  featured?: boolean;
  category?: "announcement" | "review" | "info";
}
