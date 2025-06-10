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
import logoImage from "../../../shared/assets/1cup_logo.jpg";

// Define colors for consistency - Updated for more modern, crisp design
const colors = {
  primary: "#1a1a1a",
  primaryLight: "#333333",
  primaryDark: "#000000",
  primaryPale: "#f8f9fa",
  primaryBg: "#ffffff",
  accent: "#0066cc",
  accentHover: "#0052a3",
  text: {
    dark: "#1a1a1a",
    medium: "#4a5568",
    light: "#718096",
  },
  border: "#e2e8f0",
  shadow: "rgba(0, 0, 0, 0.1)",
};

const DetailContainer = styled.div`
  max-width: 960px;
  padding: 1.5rem 0rem;
  font-family: "Pretendard", "Noto Sans KR", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.6;
`;

const BackButton = styled.button`
  background: transparent;
  color: #424242;
  border: 1px solid ${colors.border};
  border-radius: 12px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 1.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: ${colors.primaryPale};
    border-color: ${colors.accent};
    color: ${colors.accentHover};
  }

  @media (max-width: 768px) {
    margin-bottom: 1.25rem;
  }
`;

const FeaturedImage = styled.div<{ $hasImage: boolean; $imageUrl?: string }>`
  width: 100%;
  height: 400px;
  background: ${(props) =>
    props.$hasImage && props.$imageUrl
      ? `url(${props.$imageUrl}) center/cover`
      : `linear-gradient(135deg, ${colors.primaryPale} 0%, ${colors.border} 100%)`};
  border-radius: 8px;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border: 1px solid ${colors.border};

  @media (max-width: 768px) {
    height: 250px;
    margin-bottom: 1.25rem;
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
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
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
  margin-bottom: 1.5rem;
  border-bottom: 1px solid ${colors.border};
  padding-bottom: 1.5rem;
`;

const PostTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  color: ${colors.text.dark};
  margin-bottom: 1rem;
  line-height: 1.2;
  font-family: inherit;
  letter-spacing: -0.02em;

  @media (max-width: 768px) {
    font-size: 2rem;
    margin-bottom: 0.6rem;
  }
`;

const PostMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
  font-size: 0.95rem;
  font-weight: 600;
  color: ${colors.text.dark};
  
  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const PostDate = styled.span`
  color: ${colors.text.light};
  font-size: 0.85rem;
  font-weight: 400;
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
  }
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
`;

const Tag = styled.span`
  background: ${colors.primaryPale};
  color: ${colors.text.medium};
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid ${colors.border};
`;

const PostContent = styled.div`
  font-size: 1.1rem;
  line-height: 1.7;
  color: ${colors.text.dark};
  font-family: inherit;
  margin-bottom: 1.5rem;

  /* Enhanced typography styles */
  h1, h2, h3, h4, h5, h6 {
    font-family: inherit;
    color: ${colors.text.dark};
    margin: 0.75rem 0 0.25rem 0;
    font-weight: 700;
    line-height: 1.3;
    letter-spacing: -0.01em;
  }

  h1 { font-size: 2rem; font-weight: 800; }
  h2 { font-size: 1.75rem; font-weight: 700; }
  h3 { font-size: 1.5rem; font-weight: 600; }
  h4 { font-size: 1.25rem; font-weight: 600; }
  h5 { font-size: 1.125rem; font-weight: 600; }
  h6 { font-size: 1rem; font-weight: 600; }

  /* First paragraph after heading has no top margin */
  h1 + p, h2 + p, h3 + p, h4 + p, h5 + p, h6 + p {
    margin-top: 0.4rem;
  }

  p {
    margin-bottom: 1.25rem;
    font-family: inherit;
  }

  /* Enhanced bold text styling */
  strong, b {
    font-weight: 700;
    color: ${colors.text.dark};
  }

  img {
    max-width: 60%;
    height: auto;
    border-radius: 8px;
    margin: 1.5rem auto;
    box-shadow: 0 4px 12px ${colors.shadow};
    display: block;
    cursor: pointer;
    transition: transform 0.2s ease;
    border: 1px solid ${colors.border};

    &.size-small { max-width: 40%; }
    &.size-medium { max-width: 60%; }
    &.size-large { max-width: 80%; }
    &.size-full { max-width: 100%; }

    &:hover {
      transform: scale(1.02);
      box-shadow: 0 8px 20px ${colors.shadow};
    }
  }

  blockquote {
    border-left: 4px solid ${colors.accent};
    padding-left: 1.5rem;
    margin: 1.5rem 0;
    font-style: italic;
    color: ${colors.text.medium};
    background: ${colors.primaryPale};
    padding: 0.75rem 1.5rem;
    border-radius: 0 4px 4px 0;
  }

  ul, ol {
    padding-left: 1.5rem;
    margin-bottom: 1.25rem;
  }

  li {
    margin-bottom: 0.4rem;
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
    padding: 1.25rem;
    border-radius: 8px;
    overflow-x: auto;
    margin: 1.5rem 0;
    border: 1px solid ${colors.border};
    font-family: "JetBrains Mono", "Monaco", "Consolas", monospace;
  }

  /* Better spacing for br tags */
  br {
    line-height: 1.8;
  }

  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 1.25rem;
    
    h1 { font-size: 1.75rem; }
    h2 { font-size: 1.5rem; }
    h3 { font-size: 1.25rem; }
    h4 { font-size: 1.125rem; }
    h5, h6 { font-size: 1rem; }

    h1, h2, h3, h4, h5, h6 {
      margin: 0.5rem 0 0.15rem 0;
    }

    p {
      margin-bottom: 0.5rem;
    }

    img {
      max-width: 80%;
      margin: 1.25rem auto;

      &.size-small { max-width: 60%; }
      &.size-medium { max-width: 80%; }
      &.size-large { max-width: 95%; }
      &.size-full { max-width: 100%; }
    }

    blockquote {
      padding: 0.6rem 1rem;
      margin: 1.25rem 0;
    }

    ul, ol {
      margin-bottom: 1rem;
    }

    pre {
      padding: 1rem;
      margin: 1.25rem 0;
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
  border-radius: 8px;
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
  margin: 2rem 0;
  padding: 1.75rem;
  background: linear-gradient(135deg, ${colors.primaryBg} 0%, ${colors.primaryPale} 100%);
  border-radius: 20px;
  border: 1px solid ${colors.border};
  text-align: center;

  @media (max-width: 768px) {
    margin: 1.5rem 0;
    padding: 1.5rem;
  }
`;

const CTATitle = styled.h3`
  font-size: 1.4rem;
  font-weight: 700;
  color: ${colors.text.dark};
  margin-bottom: 0.6rem;
  font-family: inherit;
  letter-spacing: -0.01em;

  @media (max-width: 768px) {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
  }
`;

const CTADescription = styled.p`
  font-size: 1rem;
  color: ${colors.text.medium};
  margin-bottom: 1.25rem;
  line-height: 1.6;
  font-family: inherit;

  @media (max-width: 768px) {
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }
`;

const CTAButton = styled.button`
  padding: 0.75rem 1.5rem;
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
  font-family: inherit;

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
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${colors.border};

  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const AdminButton = styled.button`
  background: ${colors.primary};
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
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
    background: ${colors.primaryLight};
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
          <AuthorAvatar src={logoImage} alt="영어 한잔 로고" />
          <AuthorInfo>
            <AuthorName>영어 한잔 운영진</AuthorName>
            <PostDate>{formatDate(post.publishedAt || post.createdAt)}</PostDate>
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
