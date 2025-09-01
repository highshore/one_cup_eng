"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { getDictionary } from "../lib/i18n";
import { useAuth } from "../lib/contexts/auth_context";
import { BlogPost } from "../lib/features/blog/types/blog_types";
import {
  fetchBlogPosts,
  fetchAllBlogPosts,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
} from "../lib/features/blog/services/blog_service";
import { BlogEditor } from "../lib/features/blog/components/blog_editor";

// Grayscale, corporate blog palette (overrides accent usage)
const blog = {
  text: { dark: "#111111", medium: "#555555", light: "#8A8A8A" },
  bg: "rgba(255, 255, 255, 0.0)",
  mutedBg: "#f7f7f7",
  border: "#e5e7eb",
  shadow: "rgba(0,0,0,0.12)",
  primary: "#111111",
  primaryHover: "#1a1a1a",
} as const;

// Use shared colors; keep accent for buttons if needed via inline vars

const BlogContainer = styled.div`
  padding: 2rem 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  background-color: ${blog.bg};
  min-height: 100vh;

  @media (max-width: 768px) {
    padding: 1.5rem 0;
  }
`;

const AdminControls = styled.div`
  display: flex;
  justify-content: flex-end;
  margin: 0 auto 1.5rem auto;
  max-width: 960px;
  gap: 0.75rem;

  @media (max-width: 768px) {
    justify-content: center;
    flex-wrap: wrap;
  }
`;

const AdminButton = styled.button`
  background: ${blog.primary};
  color: #fff;
  border: 1px solid ${blog.primary};
  border-radius: 8px;
  padding: 10px 18px;
  font-size: 0.9rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 6px ${blog.shadow};

  &:hover {
    background: ${blog.primaryHover};
    border-color: ${blog.primaryHover};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    padding: 9px 16px;
    font-size: 0.85rem;
  }
`;

const ListSection = styled.section`
  max-width: 960px;
  margin: 0 auto;
  padding: 0 0 2rem 0;

  @media (max-width: 768px) {
    padding: 0 0 1.5rem 0;
  }
`;

const BlogGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.25rem;
  align-items: start;
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  font-size: 1.1rem;
  color: ${blog.text.medium};
  background: ${blog.bg};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: ${blog.text.medium};
  background: ${blog.bg};
  border: 2px dashed ${blog.border};
  border-radius: 8px;
  font-family: inherit;

  h3 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    color: ${blog.text.dark};
    font-family: inherit;
    font-weight: 700;
  }

  p {
    font-size: 1rem;
    line-height: 1.5;
    font-family: inherit;
  }

  @media (max-width: 768px) {
    padding: 3rem 1.5rem;

    h3 {
      font-size: 1.3rem;
    }

    p {
      font-size: 0.9rem;
    }
  }
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #dc2626;
  background: #fef2f2;
  border-radius: 8px;
  border: 1px solid #fecaca;
  margin: 2rem 0;
  font-family: inherit;
`;

// Section scroller (re-usable for Featured / Annoucements / Reviews)
const SectionRow = styled.section`
  margin: 0 auto 2rem auto;
  max-width: 960px;
`;

const SectionTitle = styled.h2`
  font-size: 2rem;
  font-weight: 700;
  color: ${blog.text.dark};
  margin: 0 0 1.5rem 0;
`;

const ScrollerWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const Scroller = styled.div`
  display: flex;
  gap: 1rem;
  overflow-x: hidden;
  box-sizing: border-box;
  position: relative;
  width: 100%;
  scroll-behavior: smooth;
  padding: 1rem 0; /* vertical breathing room so shadows aren't clipped */
`;

const ScrollButton = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== "direction" && prop !== "disabled",
})<{
  direction: "left" | "right";
  disabled?: boolean;
}>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100;
  opacity: ${(props) => (props.disabled ? 0.0 : 0.9)};
  pointer-events: ${(props) => (props.disabled ? "none" : "auto")};
  transition: all 0.25s ease;

  &:hover {
    opacity: 1;
    background-color: white;
    transform: translateY(-50%) scale(1.05);
  }

  ${(props) => (props.direction === "left" ? `left: -15px;` : `right: -15px;`)}
`;

// List card
const Card = styled.article`
  border: 1px solid ${blog.border};
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 4px 12px ${blog.shadow};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 18px ${blog.shadow};
  }
`;

const CardImage = styled.div<{ $image?: string }>`
  background: ${({ $image }) =>
    $image ? `url(${$image}) center/cover` : blog.mutedBg};
  width: 100%;
  height: 180px;
`;

const CardBody = styled.div`
  padding: 1rem 1.1rem 1.2rem 1.1rem;
`;

const CardTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: ${blog.text.dark};
`;

const CardExcerpt = styled.p`
  margin: 0 0 0.75rem 0;
  color: ${blog.text.medium};
  font-size: 0.95rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const MetaRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: ${blog.text.light};
  font-size: 0.8rem;
`;

// Featured card uses the same standard Card styling (shadow, border, hover)
const FeaturedSlide = styled.div`
  min-width: 0;
  flex: 1 0 100%;
`;

const FeaturedCard = styled(Card)`
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 1.5rem;
`;

const FeaturedContent = styled.div`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
`;

const FeaturedBadge = styled.div`
  font-size: 0.8rem;
  color: ${blog.text.light};
  margin-bottom: 0.5rem;
`;

const FeaturedTitle = styled(CardTitle)`
  font-size: 1.8rem;
  letter-spacing: -0.02em;
  margin: 0 0 0.5rem 0;
`;

const FeaturedDescription = styled.p`
  color: ${blog.text.medium};
  font-size: 1rem;
  line-height: 1.6;
  margin: 0 0 1rem 0;
`;

const FeaturedButtons = styled.div`
  margin-top: auto;
  display: flex;
  gap: 0.75rem;
`;

const FeaturedPrimaryButton = styled.button`
  background: ${blog.primary};
  color: #fff;
  border: 1px solid ${blog.primary};
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
`;

const FeaturedSecondaryButton = styled.button`
  background: transparent;
  color: ${blog.text.dark};
  border: 1px solid ${blog.border};
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
`;

const FeaturedImage = styled(CardImage)`
  height: auto;
  min-height: 260px;
`;

interface BlogClientProps {
  initialPosts: BlogPost[];
}

export function BlogClient({ initialPosts }: BlogClientProps) {
  const { accountStatus } = useAuth();
  const router = useRouter();
  const dict = getDictionary("ko");
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(initialPosts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

  // Check if user is admin
  const isAdmin = accountStatus === "admin";

  // Load initial data if not provided via SSR
  useEffect(() => {
    if (initialPosts.length === 0) {
      loadBlogPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when admin status changes
  useEffect(() => {
    if (isAdmin) {
      loadBlogPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const loadBlogPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Admin users see all posts, regular users see only published posts
      const posts = isAdmin
        ? await fetchAllBlogPosts()
        : await fetchBlogPosts();

      // Debug: Log blog posts
      console.log(
        "Loaded blog posts:",
        posts.map((post) => ({
          id: post.id,
          title: post.title,
        }))
      );

      setBlogPosts(posts);
    } catch (err) {
      console.error("Failed to fetch blog posts:", err);
      setError("블로그 포스트를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = () => {
    setEditingPost(null);
    setShowEditor(true);
  };

  const handleEditPost = (post: BlogPost) => {
    setEditingPost(post);
    setShowEditor(true);
  };

  const handleSavePost = async (postData: Partial<BlogPost>) => {
    try {
      setLoading(true);
      setError(null);

      if (editingPost) {
        // Update existing post
        await updateBlogPost(editingPost.id, postData);
      } else {
        // Create new post
        await createBlogPost(postData);
      }

      // Reload posts after save
      await loadBlogPosts();
      setShowEditor(false);
      setEditingPost(null);
    } catch (err) {
      console.error("Failed to save blog post:", err);
      setError("블로그 포스트 저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("이 포스트를 삭제하시겠습니까?")) {
      return;
    }

    try {
      setLoading(true);
      await deleteBlogPost(postId);
      await loadBlogPosts();
    } catch (err) {
      console.error("Failed to delete blog post:", err);
      setError("블로그 포스트 삭제에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setEditingPost(null);
  };

  const handlePostClick = (post: BlogPost) => {
    console.log("Navigating to post:", {
      id: post.id,
      title: post.title,
    });
    // Always use ID-based routing
    router.push(`/blog/${post.id}`);
  };

  if (showEditor) {
    return (
      <BlogEditor
        post={editingPost}
        onSave={handleSavePost}
        onCancel={handleCloseEditor}
      />
    );
  }

  // Sort and select featured post
  const sortedPosts = [...blogPosts].sort((a, b) => {
    const aTime = (a.publishedAt || a.createdAt) as unknown as
      | string
      | number
      | Date;
    const bTime = (b.publishedAt || b.createdAt) as unknown as
      | string
      | number
      | Date;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });
  const featuredIndex = sortedPosts.findIndex(
    (p) => p.featured === true && !!p.featuredImage
  );
  const featuredPost = sortedPosts[featuredIndex >= 0 ? featuredIndex : 0];
  const otherPosts = sortedPosts; // keep featured in categories too
  const announcements = otherPosts.filter((p) => p.category === "announcement");
  const information = otherPosts.filter((p) => p.category === "info");
  const reviews = otherPosts.filter((p) => p.category === "review");

  // Show scroll buttons only when a section has 3 or more items
  const showFeaturedScroll = false; // single featured card; no need for scroll buttons
  const showAnnouncementsScroll = announcements.length >= 3;
  const showInformationScroll = information.length >= 3;
  const showReviewsScroll = reviews.length >= 3;

  return (
    <BlogContainer>
      {isAdmin && (
        <AdminControls>
          <AdminButton onClick={handleCreatePost}>+ New Post</AdminButton>
          <AdminButton onClick={loadBlogPosts}>Refresh</AdminButton>
        </AdminControls>
      )}

      {error && <ErrorState>{error}</ErrorState>}

      {loading && <LoadingState>Loading posts...</LoadingState>}

      {!loading && blogPosts.length === 0 && !error && (
        <EmptyState>
          <h3>No posts yet</h3>
          <p>Be the first to share your thoughts!</p>
        </EmptyState>
      )}

      {!loading && blogPosts.length > 0 && featuredPost && (
        <SectionRow>
          <SectionTitle>{dict.blog.featured}</SectionTitle>
          <ScrollerWrapper>
            {showFeaturedScroll && (
              <ScrollButton
                direction="left"
                onClick={() => {
                  const el = document.getElementById("featured-scroller");
                  if (el) el.scrollBy({ left: -400, behavior: "smooth" });
                }}
                aria-label="Scroll featured left"
              >
                <FaChevronLeft />
              </ScrollButton>
            )}
            <Scroller id="featured-scroller">
              {/* Single featured card; structure preserved for consistency */}
              <FeaturedSlide>
                <FeaturedCard>
                  <FeaturedContent>
                    <FeaturedBadge>{dict.blog.featured}</FeaturedBadge>
                    <FeaturedTitle>{featuredPost.title}</FeaturedTitle>
                    <FeaturedDescription>
                      {(featuredPost.excerpt ||
                        featuredPost.content
                          .replace(/<[^>]*>/g, "")
                          .slice(0, 180)) +
                        (featuredPost.excerpt
                          ? ""
                          : featuredPost.content.length > 180
                          ? "..."
                          : "")}
                    </FeaturedDescription>
                    <FeaturedButtons>
                      <FeaturedPrimaryButton
                        onClick={() => handlePostClick(featuredPost)}
                      >
                        {dict.blog.readPost}
                      </FeaturedPrimaryButton>
                      <FeaturedSecondaryButton onClick={loadBlogPosts}>
                        {dict.blog.refresh}
                      </FeaturedSecondaryButton>
                    </FeaturedButtons>
                  </FeaturedContent>
                  <FeaturedImage $image={featuredPost.featuredImage} />
                </FeaturedCard>
              </FeaturedSlide>
            </Scroller>
            {showFeaturedScroll && (
              <ScrollButton
                direction="right"
                onClick={() => {
                  const el = document.getElementById("featured-scroller");
                  if (el) el.scrollBy({ left: 400, behavior: "smooth" });
                }}
                aria-label="Scroll featured right"
              >
                <FaChevronRight />
              </ScrollButton>
            )}
          </ScrollerWrapper>
        </SectionRow>
      )}

      {!loading && announcements.length > 0 && (
        <SectionRow>
          <SectionTitle>{dict.blog.announcements}</SectionTitle>
          <ScrollerWrapper>
            {showAnnouncementsScroll && (
              <ScrollButton
                direction="left"
                onClick={() => {
                  const el = document.getElementById("announcements-scroller");
                  if (el) el.scrollBy({ left: -400, behavior: "smooth" });
                }}
                aria-label="Scroll announcements left"
              >
                <FaChevronLeft />
              </ScrollButton>
            )}
            <Scroller id="announcements-scroller">
              {announcements.map((post) => (
                <div
                  key={post.id}
                  style={{ width: 320, flex: "0 0 auto" }}
                  onClick={() => handlePostClick(post)}
                >
                  <Card>
                    <CardImage $image={post.featuredImage} />
                    <CardBody>
                      <CardTitle>{post.title}</CardTitle>
                      <CardExcerpt>
                        {(post.excerpt ||
                          post.content.replace(/<[^>]*>/g, "").slice(0, 120)) +
                          (post.excerpt
                            ? ""
                            : post.content.length > 120
                            ? "..."
                            : "")}
                      </CardExcerpt>
                      <MetaRow>
                        <span>
                          {new Date(
                            (post.publishedAt || post.createdAt) as unknown as
                              | string
                              | number
                              | Date
                          ).toLocaleDateString("ko-KR")}
                        </span>
                        <span>{post.tags?.slice(0, 1).join(" ") || ""}</span>
                      </MetaRow>
                    </CardBody>
                  </Card>
                </div>
              ))}
            </Scroller>
            {showAnnouncementsScroll && (
              <ScrollButton
                direction="right"
                onClick={() => {
                  const el = document.getElementById("announcements-scroller");
                  if (el) el.scrollBy({ left: 400, behavior: "smooth" });
                }}
                aria-label="Scroll announcements right"
              >
                <FaChevronRight />
              </ScrollButton>
            )}
          </ScrollerWrapper>
        </SectionRow>
      )}

      {!loading && information.length > 0 && (
        <SectionRow>
          <SectionTitle>{dict.blog.information}</SectionTitle>
          <ScrollerWrapper>
            {showInformationScroll && (
              <ScrollButton
                direction="left"
                onClick={() => {
                  const el = document.getElementById("info-scroller");
                  if (el) el.scrollBy({ left: -400, behavior: "smooth" });
                }}
                aria-label="Scroll information left"
              >
                <FaChevronLeft />
              </ScrollButton>
            )}
            <Scroller id="info-scroller">
              {information.map((post) => (
                <div
                  key={post.id}
                  style={{ width: 320, flex: "0 0 auto" }}
                  onClick={() => handlePostClick(post)}
                >
                  <Card>
                    <CardImage $image={post.featuredImage} />
                    <CardBody>
                      <CardTitle>{post.title}</CardTitle>
                      <CardExcerpt>
                        {(post.excerpt ||
                          post.content.replace(/<[^>]*>/g, "").slice(0, 120)) +
                          (post.excerpt
                            ? ""
                            : post.content.length > 120
                            ? "..."
                            : "")}
                      </CardExcerpt>
                      <MetaRow>
                        <span>
                          {new Date(
                            (post.publishedAt || post.createdAt) as unknown as
                              | string
                              | number
                              | Date
                          ).toLocaleDateString("ko-KR")}
                        </span>
                        <span>{post.tags?.slice(0, 1).join(" ") || ""}</span>
                      </MetaRow>
                    </CardBody>
                  </Card>
                </div>
              ))}
            </Scroller>
            {showInformationScroll && (
              <ScrollButton
                direction="right"
                onClick={() => {
                  const el = document.getElementById("info-scroller");
                  if (el) el.scrollBy({ left: 400, behavior: "smooth" });
                }}
                aria-label="Scroll information right"
              >
                <FaChevronRight />
              </ScrollButton>
            )}
          </ScrollerWrapper>
        </SectionRow>
      )}

      {!loading && reviews.length > 0 && (
        <SectionRow>
          <SectionTitle>{dict.blog.reviews}</SectionTitle>
          <ScrollerWrapper>
            {showReviewsScroll && (
              <ScrollButton
                direction="left"
                onClick={() => {
                  const el = document.getElementById("reviews-scroller");
                  if (el) el.scrollBy({ left: -400, behavior: "smooth" });
                }}
                aria-label="Scroll reviews left"
              >
                <FaChevronLeft />
              </ScrollButton>
            )}
            <Scroller id="reviews-scroller">
              {reviews.map((post) => (
                <div
                  key={post.id}
                  style={{ width: 320, flex: "0 0 auto" }}
                  onClick={() => handlePostClick(post)}
                >
                  <Card>
                    <CardImage $image={post.featuredImage} />
                    <CardBody>
                      <CardTitle>{post.title}</CardTitle>
                      <CardExcerpt>
                        {(post.excerpt ||
                          post.content.replace(/<[^>]*>/g, "").slice(0, 120)) +
                          (post.excerpt
                            ? ""
                            : post.content.length > 120
                            ? "..."
                            : "")}
                      </CardExcerpt>
                      <MetaRow>
                        <span>
                          {new Date(
                            (post.publishedAt || post.createdAt) as unknown as
                              | string
                              | number
                              | Date
                          ).toLocaleDateString("ko-KR")}
                        </span>
                        <span>{post.tags?.slice(0, 1).join(" ") || ""}</span>
                      </MetaRow>
                    </CardBody>
                  </Card>
                </div>
              ))}
            </Scroller>
            {showReviewsScroll && (
              <ScrollButton
                direction="right"
                onClick={() => {
                  const el = document.getElementById("reviews-scroller");
                  if (el) el.scrollBy({ left: 400, behavior: "smooth" });
                }}
                aria-label="Scroll reviews right"
              >
                <FaChevronRight />
              </ScrollButton>
            )}
          </ScrollerWrapper>
        </SectionRow>
      )}
    </BlogContainer>
  );
}
