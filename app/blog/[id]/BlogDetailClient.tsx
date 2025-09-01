"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import styled, { keyframes } from "styled-components";
import { colors } from "../../lib/constants/colors";
import { BlogPost } from "../../lib/features/blog/types/blog_types";
import {
  fetchBlogPost,
  fetchPublishedBlogPost,
  deleteBlogPost,
  updateBlogPost,
} from "../../lib/features/blog/services/blog_service";
import { useAuth } from "../../lib/contexts/auth_context";
import { BlogEditor } from "../../lib/features/blog/components/blog_editor";

// Using shared colors

const DetailContainer = styled.div`
  padding: 2rem 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  line-height: 1.6;
  background-color: ${colors.primaryBg};
  min-height: 100vh;

  @media (max-width: 768px) {
    padding: 1.5rem 0;
  }
`;

const BackButton = styled.button`
  background: transparent;
  color: ${colors.text.medium};
  border: 1px solid ${colors.border};
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 2rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: ${colors.primaryPale};
    border-color: ${colors.accent};
    color: ${colors.accent};
  }

  @media (max-width: 768px) {
    margin-bottom: 1.5rem;
    padding: 0.625rem 1.25rem;
  }
`;

const FeaturedImage = styled.div<{ $hasImage: boolean; $imageUrl?: string }>`
  width: 100%;
  height: 300px;
  background: ${(props) =>
    props.$hasImage && props.$imageUrl
      ? `url(${props.$imageUrl}) center/cover`
      : `${colors.gray.light}`};
  border-radius: 6px;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border: 1px solid ${colors.border};

  @media (max-width: 768px) {
    height: 200px;
    margin-bottom: 1.5rem;
  }
`;

const ImagePlaceholder = styled.div`
  color: ${colors.text.light};
  font-size: 3rem;
  font-weight: 300;

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const StatusBadge = styled.div<{ $status: string }>`
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: white;
  background: ${(props) => {
    switch (props.$status) {
      case "published":
        return "#10b981";
      case "draft":
        return "#f59e0b";
      case "archived":
        return "#6b7280";
      default:
        return "#6b7280";
    }
  }};
`;

const PostHeader = styled.header`
  margin-bottom: 2rem;
  border-bottom: 1px solid ${colors.border};
  padding-bottom: 2rem;
`;

const PostTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  color: ${colors.text.dark};
  margin-bottom: 1rem;
  line-height: 1.2;
  font-family: inherit;
  letter-spacing: -0.02em;

  @media (max-width: 768px) {
    font-size: 2rem;
    margin-bottom: 0.75rem;
  }
`;

const PostMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1.5rem 0 0 0;
  color: ${colors.text.medium};
`;

const AuthorAvatar = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid ${colors.border};

  @media (max-width: 768px) {
    width: 36px;
    height: 36px;
  }
`;

const AuthorInfo = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const AuthorName = styled.span`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${colors.text.dark};

  @media (max-width: 768px) {
    font-size: 0.85rem;
  }
`;

const PostDate = styled.span`
  color: ${colors.text.light};
  font-size: 0.8rem;
  font-weight: 400;

  @media (max-width: 768px) {
    font-size: 0.75rem;
  }
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const Tag = styled.span`
  background: ${colors.primaryPale};
  color: ${colors.accent};
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid ${colors.accent};
`;

const PostContent = styled.div`
  font-size: 1.1rem;
  line-height: 1.7;
  color: ${colors.text.dark};
  font-family: inherit;
  margin-bottom: 3rem;

  /* Enhanced typography styles */
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-family: inherit;
    color: ${colors.text.dark};
    margin: 2rem 0 1rem 0;
    font-weight: 600;
    line-height: 1.3;
    letter-spacing: -0.01em;
  }

  h1 {
    font-size: 2rem;
    font-weight: 700;
  }
  h2 {
    font-size: 1.75rem;
    font-weight: 700;
  }
  h3 {
    font-size: 1.5rem;
    font-weight: 600;
  }
  h4 {
    font-size: 1.25rem;
    font-weight: 600;
  }
  h5 {
    font-size: 1.125rem;
    font-weight: 600;
  }
  h6 {
    font-size: 1rem;
    font-weight: 600;
  }

  /* First paragraph after heading has no top margin */
  h1 + p,
  h2 + p,
  h3 + p,
  h4 + p,
  h5 + p,
  h6 + p {
    margin-top: 0.5rem;
  }

  p {
    margin-bottom: 1.5rem;
    font-family: inherit;
  }

  /* Enhanced bold text styling */
  strong,
  b {
    font-weight: 600;
    color: ${colors.text.dark};
  }

  img {
    max-width: 100%;
    height: auto;
    border-radius: 6px;
    margin: 2rem auto;
    box-shadow: 0 4px 12px ${colors.shadow};
    display: block;
    cursor: pointer;
    transition: transform 0.2s ease;
    border: 1px solid ${colors.border};

    &:hover {
      transform: scale(1.02);
      box-shadow: 0 8px 20px ${colors.shadow};
    }
  }

  blockquote {
    border-left: 4px solid ${colors.accent};
    padding-left: 1.5rem;
    margin: 2rem 0;
    font-style: italic;
    color: ${colors.text.medium};
    background: ${colors.primaryPale};
    padding: 1rem 1.5rem;
    border-radius: 0 6px 6px 0;
  }

  ul,
  ol {
    padding-left: 1.5rem;
    margin-bottom: 1.5rem;
  }

  li {
    margin-bottom: 0.5rem;
  }

  code {
    background: ${colors.primaryPale};
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-family: "JetBrains Mono", "Monaco", "Consolas", monospace;
    font-size: 0.9em;
    border: 1px solid ${colors.border};
  }

  pre {
    background: ${colors.primaryPale};
    padding: 1.5rem;
    border-radius: 6px;
    overflow-x: auto;
    margin: 2rem 0;
    border: 1px solid ${colors.border};
    font-family: "JetBrains Mono", "Monaco", "Consolas", monospace;
  }

  /* Better spacing for br tags */
  br {
    line-height: 1.8;
  }

  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 2rem;

    h1 {
      font-size: 1.75rem;
    }
    h2 {
      font-size: 1.5rem;
    }
    h3 {
      font-size: 1.25rem;
    }
    h4 {
      font-size: 1.125rem;
    }
    h5,
    h6 {
      font-size: 1rem;
    }

    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      margin: 1.5rem 0 0.75rem 0;
    }

    p {
      margin-bottom: 1.25rem;
    }

    img {
      margin: 1.5rem auto;
    }

    blockquote {
      padding: 0.75rem 1.25rem;
      margin: 1.5rem 0;
    }

    ul,
    ol {
      margin-bottom: 1.25rem;
    }

    pre {
      padding: 1.25rem;
      margin: 1.5rem 0;
    }
  }
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  font-size: 1.1rem;
  color: ${colors.text.medium};
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #dc2626;
  background: #fef2f2;
  border-radius: 6px;
  border: 1px solid #fecaca;
  margin: 2rem 0;
`;

// Gradient shining sweep animation for CTA button
const gradientShine = keyframes`
  0% {
    background-position: -100% center;
  }
  100% {
    background-position: 100% center;
  }
`;

const CTASection = styled.div`
  background: ${colors.primaryPale};
  border-radius: 6px;
  padding: 2rem;
  text-align: center;
  margin-top: 3rem;
  border: 1px solid ${colors.border};

  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const CTATitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${colors.text.dark};
  margin-bottom: 1rem;
  font-family: inherit;

  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

const CTADescription = styled.p`
  font-size: 1rem;
  color: ${colors.text.medium};
  margin-bottom: 1.5rem;
  line-height: 1.5;
  font-family: inherit;

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const CTAButton = styled.button`
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  position: relative;
  overflow: hidden;
  color: white;
  font-family: inherit;
  background: ${colors.accent};
  box-shadow: 0 2px 8px ${colors.shadow};

  &:hover {
    background: ${colors.accentHover};
    transform: translateY(-2px);
    box-shadow: 0 4px 16px ${colors.shadow};
  }

  @media (max-width: 768px) {
    padding: 0.875rem 1.5rem;
    font-size: 0.9rem;
    gap: 0.375rem;

    &:hover {
      transform: translateY(-1px);
    }
  }
`;

const AdminControls = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid ${colors.border};

  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const AdminButton = styled.button`
  background: ${colors.accent};
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 2px 4px ${colors.shadow};

  &:hover {
    background: ${colors.accentHover};
    transform: translateY(-1px);
    box-shadow: 0 4px 8px ${colors.shadow};
  }

  &.delete {
    background: #dc2626;

    &:hover {
      background: #b91c1c;
    }
  }
`;

interface BlogDetailClientProps {
  initialPost?: BlogPost | null;
}

export default function BlogDetailClient({
  initialPost,
}: BlogDetailClientProps) {
  const { id: postId } = useParams<{ id: string }>();
  const router = useRouter();
  const { accountStatus } = useAuth();
  const [post, setPost] = useState<BlogPost | null>(initialPost || null);
  const [loading, setLoading] = useState(!initialPost);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const isAdmin = accountStatus === "admin";

  useEffect(() => {
    // If we already have initial post data, don't fetch again unless user is admin
    if (initialPost && !isAdmin) {
      return;
    }

    const loadPost = async () => {
      if (!postId) {
        setError("포스트 ID가 없습니다.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Admin users can see all posts, regular users can only see published posts
        const postData = isAdmin
          ? await fetchBlogPost(postId)
          : await fetchPublishedBlogPost(postId);

        if (!postData) {
          setError("포스트를 찾을 수 없습니다.");
        } else {
          setPost(postData);
        }
      } catch (err) {
        console.error("Failed to fetch blog post:", err);
        setError("포스트를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [postId, isAdmin, initialPost]);

  const handleBack = () => {
    router.push("/blog");
  };

  const handleMeetupClick = () => {
    router.push("/meetup");
  };

  const handleEditPost = () => {
    setShowEditor(true);
  };

  const handleDeletePost = async () => {
    if (!postId) return;

    if (!window.confirm("정말로 이 포스트를 삭제하시겠습니까?")) {
      return;
    }

    try {
      await deleteBlogPost(postId);
      router.push("/blog");
    } catch (err) {
      console.error("Failed to delete blog post:", err);
      setError("블로그 포스트 삭제에 실패했습니다.");
    }
  };

  const handleSavePost = async (postData: Partial<BlogPost>) => {
    if (!postId) return;

    try {
      await updateBlogPost(postId, postData);
      setShowEditor(false);

      // Reload the post to see changes
      const updatedPost = isAdmin
        ? await fetchBlogPost(postId)
        : await fetchPublishedBlogPost(postId);

      if (updatedPost) {
        setPost(updatedPost);
      }
    } catch (err) {
      console.error("Failed to save blog post:", err);
      setError("블로그 포스트 저장에 실패했습니다.");
    }
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderContent = (content: string) => {
    // Enhanced markdown-like rendering with better bold text handling
    let processedContent = content
      // Normalize quad-asterisks to double-asterisks, but only if they surround content
      .replace(/\*{4}([\s\S]+?)\*{4}/g, "**$1**")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(
        /!\[([^\]]*)\]\(([^)]*)\s+"([^"]*)"?\)/g,
        '<img alt="$1" src="$2" class="size-$3" />'
      )
      .replace(
        /!\[([^\]]*)\]\(([^)]*)\)/g,
        '<img alt="$1" src="$2" class="size-medium" />'
      );

    // Support for bold text with heavy font weight: **text**
    // This regex ensures that it doesn't accidentally match parts of HTML tags
    processedContent = processedContent.replace(
      /\*\*([^*\n]+?)\*\*/g,
      "<strong>$1</strong>"
    );

    // Convert newlines to <br /> after processing other markdown
    processedContent = processedContent.replace(/\n/g, "<br />");

    return processedContent;
  };

  if (showEditor && post) {
    return (
      <BlogEditor
        post={post}
        onSave={handleSavePost}
        onCancel={handleCloseEditor}
      />
    );
  }

  if (loading) {
    return (
      <DetailContainer>
        <LoadingState>포스트를 불러오는 중...</LoadingState>
      </DetailContainer>
    );
  }

  if (error || !post) {
    return (
      <DetailContainer>
        <ErrorState>{error || "포스트를 찾을 수 없습니다."}</ErrorState>
        <BackButton onClick={handleBack}>← Back to Blog</BackButton>
      </DetailContainer>
    );
  }

  return (
    <DetailContainer>
      <BackButton onClick={handleBack}>← Back to Blog</BackButton>

      <FeaturedImage
        $hasImage={!!post.featuredImage}
        $imageUrl={post.featuredImage}
      >
        {!post.featuredImage && <ImagePlaceholder>📝</ImagePlaceholder>}
        {isAdmin && (
          <StatusBadge $status={post.status}>{post.status}</StatusBadge>
        )}
      </FeaturedImage>

      <PostHeader>
        <PostTitle>{post.title}</PostTitle>
        <PostMeta>
          <AuthorAvatar
            src="/images/logos/1cup_logo.jpg"
            alt="English Cup Logo"
          />
          <AuthorInfo>
            <AuthorName>영어 한잔 운영진</AuthorName>
            <PostDate>
              {formatDate(post.publishedAt || post.createdAt)}
            </PostDate>
          </AuthorInfo>
        </PostMeta>

        {post.tags && post.tags.length > 0 && (
          <TagsContainer>
            {post.tags.map((tag, index) => (
              <Tag key={index}>{tag}</Tag>
            ))}
          </TagsContainer>
        )}
      </PostHeader>

      <PostContent
        dangerouslySetInnerHTML={{
          __html: renderContent(post.content),
        }}
      />

      <CTASection>
        <CTATitle>영어 실력을 진짜로 키우고 싶다면?</CTATitle>
        <CTADescription>
          통번역사 및 다양한 백그라운드를 가진 멤버들과 함께하는 영어 밋업에
          참여해보세요.
          <br />
          매주 실전 영어를 연습하고, 커뮤니케이션 능력을 한 단계 높여보세요. 🚀
        </CTADescription>
        <CTAButton onClick={handleMeetupClick}>
          <span>🚀</span>
          밋업 확인하기
        </CTAButton>
      </CTASection>

      {isAdmin && (
        <AdminControls>
          <AdminButton onClick={handleEditPost}>Edit Post</AdminButton>
          <AdminButton className="delete" onClick={handleDeletePost}>
            Delete Post
          </AdminButton>
        </AdminControls>
      )}
    </DetailContainer>
  );
}
