import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { BlogPost } from "../types/blog_types";
import {
  fetchBlogPost,
  fetchPublishedBlogPost,
  deleteBlogPost,
  updateBlogPost,
} from "../services/blog_service";
import { useAuth } from "../../../shared/contexts/auth_context";
import { BlogEditor } from "../components/blog_editor";

// Define colors for consistency
const colors = {
  primary: "#2C1810",
  primaryLight: "#4A2F23",
  primaryDark: "#1A0F0A",
  primaryPale: "#F5EBE6",
  primaryBg: "#FDF9F6",
  accent: "#C8A27A",
  text: {
    dark: "#2C1810",
    medium: "#4A2F23",
    light: "#8B6B4F",
  },
};

const DetailContainer = styled.div`
  padding: 2rem 0;
  font-family: "Noto Sans KR", sans-serif;

  @media (max-width: 768px) {
    padding: 1rem 0;
  }
`;

const BackButton = styled.button`
  background: ${colors.primaryPale};
  color: ${colors.text.dark};
  border: none;
  border-radius: 25px;
  padding: 0.6rem 1.25rem;
  font-size: 0.95rem;
  font-weight: 600;
  font-family: "Noto Sans KR", sans-serif;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;

  &:hover {
    background: ${colors.accent};
    color: white;
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    margin-bottom: 1.25rem;
  }
`;

const FeaturedImage = styled.div<{ $hasImage: boolean; $imageUrl?: string }>`
  width: 100%;
  height: 350px;
  background: ${(props) =>
    props.$hasImage && props.$imageUrl
      ? `url(${props.$imageUrl}) center/cover`
      : `linear-gradient(135deg, ${colors.accent} 0%, ${colors.primary} 100%)`};
  border-radius: 16px;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  @media (max-width: 768px) {
    height: 220px;
    border-radius: 14px;
    margin-bottom: 1.25rem;
  }
`;

const ImagePlaceholder = styled.div`
  color: white;
  font-size: 4rem;
  font-weight: 300;
  opacity: 0.8;

  @media (max-width: 768px) {
    font-size: 3rem;
  }
`;

const StatusBadge = styled.div<{ $status: string }>`
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: white;
  background: ${(props) => {
    switch (props.$status) {
      case "published":
        return "#22c55e";
      case "draft":
        return "#f59e0b";
      case "archived":
        return "#6b7280";
      default:
        return "#6b7280";
    }
  }};

  @media (max-width: 768px) {
    font-size: 0.8rem;
    padding: 4px 12px;
  }
`;

const PostHeader = styled.header`
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    margin-bottom: 1.25rem;
  }
`;

const PostTitle = styled.h1`
  font-size: 2.2rem;
  font-weight: 800;
  color: ${colors.text.dark};
  margin-bottom: 0.75rem;
  line-height: 1.25;
  font-family: "Noto Sans KR", sans-serif;

  @media (max-width: 768px) {
    font-size: 1.8rem;
    margin-bottom: 0.6rem;
    line-height: 1.3;
  }
`;

const PostMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid ${colors.primaryPale};
  font-family: "Noto Sans KR", sans-serif;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.4rem;
    align-items: flex-start;
    margin-bottom: 0.6rem;
    padding-bottom: 0.6rem;
  }
`;

const AuthorInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: ${colors.text.medium};
  font-size: 0.95rem;
  font-family: "Noto Sans KR", sans-serif;
  font-weight: 500;
`;

const PostDate = styled.span`
  color: ${colors.text.light};
  font-size: 0.85rem;
  font-family: "Noto Sans KR", sans-serif;
  font-weight: 400;
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 1.25rem;

  @media (max-width: 768px) {
    margin-bottom: 1rem;
    gap: 0.3rem;
  }
`;

const Tag = styled.span`
  background: ${colors.primaryPale};
  color: ${colors.text.medium};
  padding: 0.3rem 0.8rem;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 500;
  font-family: "Noto Sans KR", sans-serif;

  @media (max-width: 768px) {
    font-size: 0.75rem;
    padding: 0.25rem 0.7rem;
    border-radius: 14px;
  }
`;

const PostContent = styled.div`
  font-size: 1.05rem;
  line-height: 1.7;
  color: ${colors.text.dark};
  font-family: "Noto Sans KR", sans-serif;
  margin-bottom: 1.5rem;

  /* Markdown styles */
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-family: "Noto Sans KR", sans-serif;
    color: ${colors.text.dark};
    margin: 1rem 0 0 0;
    font-weight: 700;
    line-height: 1.3;
  }

  h1 {
    font-size: 1.8rem;
  }
  h2 {
    font-size: 1.6rem;
  }
  h3 {
    font-size: 1.4rem;
  }
  h4 {
    font-size: 1.2rem;
  }
  h5 {
    font-size: 1.1rem;
  }
  h6 {
    font-size: 1rem;
  }

  p {
    margin-bottom: 1.25rem;
    font-family: "Noto Sans KR", sans-serif;
  }

  img {
    max-width: 60%;
    height: auto;
    border-radius: 10px;
    margin: 1.5rem auto;
    box-shadow: 0 3px 15px rgba(0, 0, 0, 0.1);
    display: block;
    cursor: pointer;
    transition: transform 0.2s ease;

    /* Size options via class names */
    &.size-small {
      max-width: 40%;
    }
    &.size-medium {
      max-width: 60%;
    }
    &.size-large {
      max-width: 80%;
    }
    &.size-full {
      max-width: 100%;
    }

    &:hover {
      transform: scale(1.02);
    }
  }

  blockquote {
    border-left: 3px solid ${colors.accent};
    padding-left: 1.25rem;
    margin: 1.5rem 0;
    font-style: italic;
    color: ${colors.text.medium};
    font-family: "Noto Sans KR", sans-serif;
  }

  ul,
  ol {
    padding-left: 1.5rem;
    margin-bottom: 1.25rem;
    font-family: "Noto Sans KR", sans-serif;
  }

  li {
    margin-bottom: 0.4rem;
  }

  code {
    background: ${colors.primaryBg};
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-family: "Monaco", "Consolas", monospace;
    font-size: 0.9em;
  }

  pre {
    background: ${colors.primaryBg};
    padding: 1.25rem;
    border-radius: 8px;
    overflow-x: auto;
    margin: 1.25rem 0;
    border: 1px solid ${colors.primaryPale};
  }

  @media (max-width: 768px) {
    font-size: 1rem;
    line-height: 1.6;
    margin-bottom: 1.25rem;

    h1 {
      font-size: 1.6rem;
      margin: 1.25rem 0 0.6rem 0;
    }
    h2 {
      font-size: 1.4rem;
      margin: 1.25rem 0 0.6rem 0;
    }
    h3 {
      font-size: 1.2rem;
      margin: 1.25rem 0 0.6rem 0;
    }
    h4 {
      font-size: 1.1rem;
      margin: 1.25rem 0 0.6rem 0;
    }
    h5,
    h6 {
      font-size: 1rem;
      margin: 1.25rem 0 0.6rem 0;
    }

    p {
      margin-bottom: 1rem;
    }

    img {
      margin: 1.25rem auto;
      max-width: 80%; /* Larger on mobile for better readability */

      &.size-small {
        max-width: 60%;
      }
      &.size-medium {
        max-width: 80%;
      }
      &.size-large {
        max-width: 95%;
      }
      &.size-full {
        max-width: 100%;
      }
    }

    blockquote {
      padding-left: 1rem;
      margin: 1.25rem 0;
    }

    ul,
    ol {
      padding-left: 1.25rem;
      margin-bottom: 1rem;
    }

    pre {
      padding: 1rem;
      margin: 1rem 0;
    }
  }
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  font-size: 1.2rem;
  color: ${colors.text.medium};
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #dc3545;
  background: #fff5f5;
  border-radius: 12px;
  border: 1px solid #f5c6cb;
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
  margin: 3rem 0 2rem 0;
  padding: 2rem;
  background: linear-gradient(
    135deg,
    ${colors.primaryBg} 0%,
    ${colors.primaryPale} 100%
  );
  border-radius: 16px;
  border: 1px solid ${colors.primaryPale};
  text-align: center;

  @media (max-width: 768px) {
    margin: 2rem 0 1.5rem 0;
    padding: 1.5rem;
    border-radius: 12px;
  }
`;

const CTATitle = styled.h3`
  font-size: 1.4rem;
  font-weight: 700;
  color: ${colors.text.dark};
  margin-bottom: 0.75rem;
  font-family: "Noto Sans KR", sans-serif;

  @media (max-width: 768px) {
    font-size: 1.2rem;
    margin-bottom: 0.6rem;
  }
`;

const CTADescription = styled.p`
  font-size: 1rem;
  color: ${colors.text.medium};
  margin-bottom: 1.5rem;
  line-height: 1.5;
  font-family: "Noto Sans KR", sans-serif;

  @media (max-width: 768px) {
    font-size: 0.9rem;
    margin-bottom: 1.25rem;
  }
`;

const CTAButton = styled.button`
  padding: 1rem 2rem;
  border: none;
  border-radius: 20px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  position: relative;
  overflow: hidden;
  color: white;
  font-family: "Noto Sans KR", sans-serif;

  /* Gradient background similar to event detail join button */
  background: linear-gradient(
    90deg,
    #000000 0%,
    #000000 25%,
    #1a0808 35%,
    #2a0808 45%,
    #3a1010 50%,
    #2a0808 55%,
    #1a0808 65%,
    #000000 75%,
    #000000 100%
  );
  background-size: 200% 100%;
  animation: ${gradientShine} 3s ease-in-out infinite;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
  }

  @media (max-width: 768px) {
    padding: 0.875rem 1.5rem;
    font-size: 14px;
    border-radius: 16px;
    gap: 6px;

    &:hover {
      transform: translateY(-1px);
    }
  }
`;

const AdminControls = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    justify-content: center;
    margin-bottom: 1.25rem;
  }
`;

const AdminButton = styled.button`
  background: ${colors.primary};
  color: white;
  border: none;
  border-radius: 25px;
  padding: 10px 20px;
  font-size: 0.95rem;
  font-weight: 600;
  font-family: "Noto Sans KR", sans-serif;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 3px 10px rgba(44, 24, 16, 0.2);

  &:hover {
    background: ${colors.primaryLight};
    transform: translateY(-1px);
    box-shadow: 0 5px 15px rgba(44, 24, 16, 0.3);
  }

  &.delete {
    background: #dc3545;

    &:hover {
      background: #c82333;
    }
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    padding: 8px 16px;
    font-size: 0.9rem;
  }
`;

export default function BlogDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { accountStatus } = useAuth();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const isAdmin = accountStatus === "admin";

  useEffect(() => {
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
  }, [postId, isAdmin]);

  const handleBack = () => {
    navigate("/blog");
  };

  const handleMeetupClick = () => {
    navigate("/meetup");
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
      navigate("/blog");
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
    // Enhanced markdown-like rendering
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

    // Convert newlines to <br />
    processedContent = processedContent.replace(/\n/g, "<br />");

    // Support for bold text: **text**
    // This regex ensures that it doesn't accidentally match parts of HTML tags
    processedContent = processedContent.replace(
      /\*\*(\S(?:[\s\S]*?\S)?)\*\*/g,
      "<strong>$1</strong>"
    );

    return processedContent;
  };

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
        <BackButton onClick={handleBack}>← 블로그로 돌아가기</BackButton>
      </DetailContainer>
    );
  }

  return (
    <DetailContainer>
      <BackButton onClick={handleBack}>← 블로그로 돌아가기</BackButton>

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
          <AuthorInfo>
            <span>by 영어 한잔</span>
          </AuthorInfo>
          <PostDate>{formatDate(post.publishedAt || post.createdAt)}</PostDate>
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
        <CTATitle>✨ 영어 실력 향상을 위한 다음 단계</CTATitle>
        <CTADescription>
          통번역사 출신 운영진이 직접 리딩하는 영어 모임에 참여해보세요!
          <br />
          매주 실전 토론을 통해 영어 커뮤니케이션 실력을 향상시키세요.
        </CTADescription>
        <CTAButton onClick={handleMeetupClick}>
          <span>🚀</span>
          밋업 확인하기
        </CTAButton>
      </CTASection>

      {isAdmin && (
        <AdminControls>
          <AdminButton onClick={handleEditPost}>
            <span>✏️</span>
            수정하기
          </AdminButton>
          <AdminButton className="delete" onClick={handleDeletePost}>
            <span>🗑️</span>
            삭제하기
          </AdminButton>
        </AdminControls>
      )}

      {showEditor && post && (
        <BlogEditor
          post={post}
          onSave={handleSavePost}
          onCancel={handleCloseEditor}
        />
      )}
    </DetailContainer>
  );
}
