"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import styled, { keyframes } from "styled-components";
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

// Gradient shining sweep animation for CTA button
const gradientShine = keyframes`
  0% {
    background-position: -100% center;
  }
  100% {
    background-position: 100% center;
  }
`;

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
  background: linear-gradient(180deg, #1a1d22, #111315);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 0.75rem 1.5rem;
  font-size: 0.9rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    padding: 0.625rem 1.25rem;
    font-size: 0.85rem;
  }
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
  margin: 0 auto 3rem auto;
  max-width: 960px;
  padding: 0 1rem;

  @media (max-width: 768px) {
    margin: 0 auto 2rem auto;
    padding: 0 0.75rem;
  }
`;

const SectionDivider = styled.div`
  width: calc(100% - 2rem);
  height: 1px;
  background: ${blog.border};
  margin: 2.5rem auto;
  max-width: 920px;

  @media (max-width: 768px) {
    margin: 2rem auto;
    width: calc(100% - 1.5rem);
    max-width: 700px;
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${blog.text.dark};
  margin: 0 0 1.25rem 0;
  letter-spacing: -0.02em;

  @media (max-width: 768px) {
    font-size: 1.5rem;
    margin: 0 0 1rem 0;
  }
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
  padding: 0.75rem 0;

  @media (max-width: 768px) {
    gap: 0.75rem;
    padding: 0.5rem 0;
  }
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
  background-color: rgba(17, 17, 17, 0.8);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.18);
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
    transform: translateY(-50%) scale(1.06);
  }

  ${(props) => (props.direction === "left" ? `left: -15px;` : `right: -15px;`)}
`;

const EdgeFade = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== "side",
})<{ side: "left" | "right" }>`
  position: absolute;
  top: 0;
  ${(p) => (p.side === "left" ? "left: 0;" : "right: 0;")}
  width: 40px;
  height: 100%;
  pointer-events: none;
  background: ${(p) =>
    p.side === "left"
      ? "linear-gradient(90deg, rgba(0,0,0,0.08), rgba(0,0,0,0.0))"
      : "linear-gradient(270deg, rgba(0,0,0,0.08), rgba(0,0,0,0.0))"};
`;

// List card
const Card = styled.article`
  border: 1px solid ${blog.border};
  border-radius: 16px;
  overflow: hidden;
  background: #ffffff;
  transition: transform 0.25s ease, border-color 0.25s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-3px);
    border-color: #d1d5db;
  }

  @media (max-width: 768px) {
    border-radius: 14px;

    &:hover {
      transform: translateY(-2px);
    }
  }
`;

const CardImage = styled.div<{ $image?: string }>`
  background: ${({ $image }) =>
    $image ? `url(${$image}) center/cover` : blog.mutedBg};
  width: 100%;
  height: 200px;

  @media (max-width: 768px) {
    height: 160px;
  }
`;

const CardBody = styled.div`
  padding: 1.25rem 1.25rem 1.5rem 1.25rem;

  @media (max-width: 768px) {
    padding: 1rem 1rem 1.25rem 1rem;
  }
`;

const CardTitle = styled.h3`
  margin: 0 0 0.75rem 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: ${blog.text.dark};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
  letter-spacing: -0.01em;

  @media (max-width: 768px) {
    font-size: 1.1rem;
    margin: 0 0 0.5rem 0;
  }
`;

const CardExcerpt = styled.p`
  margin: 0 0 1rem 0;
  color: ${blog.text.medium};
  font-size: 0.95rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  opacity: 0.9;

  @media (max-width: 768px) {
    margin: 0 0 0.75rem 0;
    font-size: 0.9rem;
    -webkit-line-clamp: 2;
  }
`;

const MetaRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: ${blog.text.light};
  font-size: 0.8rem;
  margin-top: auto;

  @media (max-width: 768px) {
    font-size: 0.75rem;
  }
`;

const SlideItem = styled.div`
  width: 320px;
  flex: 0 0 auto;
  cursor: pointer;

  @media (max-width: 768px) {
    width: 280px;
  }
`;

const PillRow = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 0.75rem;

  @media (max-width: 768px) {
    margin-bottom: 0.5rem;
  }
`;

const Pill = styled.span`
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
  border: 1px solid ${blog.border};
  background: rgba(255, 255, 255, 0.8);
  color: ${blog.text.medium};
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 4px 8px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 1);
    border-color: ${blog.text.light};
  }

  @media (max-width: 768px) {
    font-size: 0.65rem;
    padding: 3px 6px;
  }
`;

// Featured card uses the same standard Card styling (shadow, border, hover)
const FeaturedSlide = styled.div`
  min-width: 0;
  flex: 1 0 100%;
`;

const FeaturedCard = styled(Card)`
  display: grid;
  grid-template-columns: 1.3fr 0.7fr;
  gap: 1.5rem;
  border-radius: 20px;
  background: #ffffff;
  border: 1px solid ${blog.border};
  overflow: hidden;

  &:hover {
    transform: translateY(-3px);
    border-color: #d1d5db;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0;
  }
`;

const FeaturedContent = styled.div`
  padding: 2rem;
  display: flex;
  flex-direction: column;
  justify-content: center;

  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const FeaturedBadge = styled(Pill)`
  color: ${blog.text.dark};
`;

const FeaturedTitle = styled(CardTitle)`
  font-size: 2rem;
  letter-spacing: -0.02em;
  margin: 0 0 1rem 0;
  white-space: normal;
  line-height: 1.2;
  font-weight: 700;

  @media (max-width: 768px) {
    font-size: 1.75rem;
    margin: 0 0 0.75rem 0;
  }
`;

const FeaturedDescription = styled.p`
  color: ${blog.text.medium};
  font-size: 1rem;
  line-height: 1.5;
  margin: 0 0 1.5rem 0;
  opacity: 0.85;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;

  @media (max-width: 768px) {
    font-size: 0.95rem;
    margin: 0 0 1.25rem 0;
    -webkit-line-clamp: 2;
  }
`;

const FeaturedButtons = styled.div`
  margin-top: auto;
  display: flex;
  gap: 0.75rem;
`;

const CTAButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  position: relative;
  overflow: hidden;
  color: white;
  font-family: inherit;
  background: linear-gradient(180deg, #1a1d22, #111315);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      120deg,
      rgba(255, 255, 255, 0) 15%,
      rgba(255, 255, 255, 0.35) 50%,
      rgba(255, 255, 255, 0) 85%
    );
    background-size: 200% 100%;
    animation: ${gradientShine} 2.5s linear infinite;
    pointer-events: none;
    mix-blend-mode: screen;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  }

  @media (max-width: 768px) {
    padding: 0.675rem 1.25rem;
    font-size: 0.9rem;
    gap: 0.375rem;

    &:hover {
      transform: translateY(-1px);
    }
  }
`;

const FeaturedImage = styled(CardImage)`
  height: auto;
  min-height: 200px;

  @media (max-width: 768px) {
    min-height: 160px;
  }
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

  type SectionKey = "announcements" | "information" | "reviews";
  type ArrowState = { left: boolean; right: boolean };
  const announcementsRef = useRef<HTMLDivElement | null>(null);
  const informationRef = useRef<HTMLDivElement | null>(null);
  const reviewsRef = useRef<HTMLDivElement | null>(null);
  const [scrollDisabled, setScrollDisabled] = useState<
    Record<SectionKey, ArrowState>
  >({
    announcements: { left: true, right: false },
    information: { left: true, right: false },
    reviews: { left: true, right: false },
  });

  const computeArrowState = (el: HTMLDivElement | null): ArrowState => {
    if (!el) return { left: true, right: false };
    const left = el.scrollLeft <= 0;
    const right = Math.ceil(el.scrollLeft + el.clientWidth) >= el.scrollWidth;
    return { left, right };
  };

  const updateArrows = (key: SectionKey) => {
    const map: Record<SectionKey, HTMLDivElement | null> = {
      announcements: announcementsRef.current,
      information: informationRef.current,
      reviews: reviewsRef.current,
    };
    const next = computeArrowState(map[key]);
    setScrollDisabled((prev) => ({ ...prev, [key]: next }));
  };

  // Derived collections for sections and featured
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
  const otherPosts = sortedPosts;
  const announcements = otherPosts.filter((p) => p.category === "announcement");
  const information = otherPosts.filter((p) => p.category === "info");
  const reviews = otherPosts.filter((p) => p.category === "review");

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

  useEffect(() => {
    // Initialize arrow states after lists render
    updateArrows("announcements");
    updateArrows("information");
    updateArrows("reviews");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcements.length, information.length, reviews.length]);

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

  const categoryLabel = (cat?: string) => {
    switch (cat) {
      case "announcement":
        return dict.blog.announcements;
      case "info":
        return dict.blog.information;
      case "review":
        return dict.blog.reviews;
      default:
        return cat || "";
    }
  };

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
                    <PillRow>
                      <FeaturedBadge>{dict.blog.featured}</FeaturedBadge>
                      <Pill>{categoryLabel(featuredPost.category)}</Pill>
                    </PillRow>
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
                      <CTAButton onClick={() => handlePostClick(featuredPost)}>
                        ✨ {dict.blog.readPost}
                      </CTAButton>
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

      {!loading && blogPosts.length > 0 && <SectionDivider />}

      {!loading && announcements.length > 0 && (
        <SectionRow>
          <SectionTitle>{dict.blog.announcements}</SectionTitle>
          <ScrollerWrapper>
            {showAnnouncementsScroll && (
              <>
                <ScrollButton
                  direction="left"
                  disabled={scrollDisabled.announcements.left}
                  onClick={() => {
                    const el = announcementsRef.current;
                    if (el) el.scrollBy({ left: -400, behavior: "smooth" });
                  }}
                  aria-label="Scroll announcements left"
                >
                  <FaChevronLeft />
                </ScrollButton>
                <EdgeFade side="left" />
              </>
            )}
            <Scroller
              id="announcements-scroller"
              ref={announcementsRef}
              onScroll={() => updateArrows("announcements")}
            >
              {announcements.map((post) => (
                <SlideItem key={post.id} onClick={() => handlePostClick(post)}>
                  <Card>
                    <CardImage $image={post.featuredImage} />
                    <CardBody>
                      <PillRow>
                        <Pill>{categoryLabel(post.category)}</Pill>
                      </PillRow>
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
                </SlideItem>
              ))}
            </Scroller>
            {showAnnouncementsScroll && (
              <>
                <EdgeFade side="right" />
                <ScrollButton
                  direction="right"
                  disabled={scrollDisabled.announcements.right}
                  onClick={() => {
                    const el = announcementsRef.current;
                    if (el) el.scrollBy({ left: 400, behavior: "smooth" });
                  }}
                  aria-label="Scroll announcements right"
                >
                  <FaChevronRight />
                </ScrollButton>
              </>
            )}
          </ScrollerWrapper>
        </SectionRow>
      )}

      {!loading && announcements.length > 0 && information.length > 0 && (
        <SectionDivider />
      )}

      {!loading && information.length > 0 && (
        <SectionRow>
          <SectionTitle>{dict.blog.information}</SectionTitle>
          <ScrollerWrapper>
            {showInformationScroll && (
              <>
                <ScrollButton
                  direction="left"
                  disabled={scrollDisabled.information.left}
                  onClick={() => {
                    const el = informationRef.current;
                    if (el) el.scrollBy({ left: -400, behavior: "smooth" });
                  }}
                  aria-label="Scroll information left"
                >
                  <FaChevronLeft />
                </ScrollButton>
                <EdgeFade side="left" />
              </>
            )}
            <Scroller
              id="info-scroller"
              ref={informationRef}
              onScroll={() => updateArrows("information")}
            >
              {information.map((post) => (
                <SlideItem key={post.id} onClick={() => handlePostClick(post)}>
                  <Card>
                    <CardImage $image={post.featuredImage} />
                    <CardBody>
                      <PillRow>
                        <Pill>{categoryLabel(post.category)}</Pill>
                      </PillRow>
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
                </SlideItem>
              ))}
            </Scroller>
            {showInformationScroll && (
              <>
                <EdgeFade side="right" />
                <ScrollButton
                  direction="right"
                  disabled={scrollDisabled.information.right}
                  onClick={() => {
                    const el = informationRef.current;
                    if (el) el.scrollBy({ left: 400, behavior: "smooth" });
                  }}
                  aria-label="Scroll information right"
                >
                  <FaChevronRight />
                </ScrollButton>
              </>
            )}
          </ScrollerWrapper>
        </SectionRow>
      )}

      {!loading && information.length > 0 && reviews.length > 0 && (
        <SectionDivider />
      )}

      {!loading && reviews.length > 0 && (
        <SectionRow>
          <SectionTitle>{dict.blog.reviews}</SectionTitle>
          <ScrollerWrapper>
            {showReviewsScroll && (
              <>
                <ScrollButton
                  direction="left"
                  disabled={scrollDisabled.reviews.left}
                  onClick={() => {
                    const el = reviewsRef.current;
                    if (el) el.scrollBy({ left: -400, behavior: "smooth" });
                  }}
                  aria-label="Scroll reviews left"
                >
                  <FaChevronLeft />
                </ScrollButton>
                <EdgeFade side="left" />
              </>
            )}
            <Scroller
              id="reviews-scroller"
              ref={reviewsRef}
              onScroll={() => updateArrows("reviews")}
            >
              {reviews.map((post) => (
                <SlideItem key={post.id} onClick={() => handlePostClick(post)}>
                  <Card>
                    <CardImage $image={post.featuredImage} />
                    <CardBody>
                      <PillRow>
                        <Pill>{categoryLabel(post.category)}</Pill>
                      </PillRow>
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
                </SlideItem>
              ))}
            </Scroller>
            {showReviewsScroll && (
              <>
                <EdgeFade side="right" />
                <ScrollButton
                  direction="right"
                  disabled={scrollDisabled.reviews.right}
                  onClick={() => {
                    const el = reviewsRef.current;
                    if (el) el.scrollBy({ left: 400, behavior: "smooth" });
                  }}
                  aria-label="Scroll reviews right"
                >
                  <FaChevronRight />
                </ScrollButton>
              </>
            )}
          </ScrollerWrapper>
        </SectionRow>
      )}
    </BlogContainer>
  );
}
