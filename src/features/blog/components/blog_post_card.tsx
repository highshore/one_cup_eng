import React from "react";
import styled from "styled-components";
import { BlogPost } from "../types/blog_types";

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

const CardContainer = styled.article`
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
  border: 1px solid ${colors.primaryPale};
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  font-family: "Noto Sans KR", sans-serif;
  
  aspect-ratio: 4 / 3;
  max-width: 100%;
  display: flex;
  flex-direction: column;

  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.12);
    border-color: ${colors.accent};
  }

  @media (max-width: 768px) {
    border-radius: 14px;
  aspect-ratio: 4 / 3;
    
    &:hover {
      transform: translateY(-3px);
    }
  }
`;

const FeaturedImage = styled.div<{ $hasImage: boolean; $imageUrl?: string }>`
  width: 100%;
  flex: 0 0 55%; /* Takes up 55% of the card height */
  background: ${props => 
    props.$hasImage && props.$imageUrl 
      ? `url(${props.$imageUrl}) center/cover` 
      : `linear-gradient(135deg, ${colors.accent} 0%, ${colors.primary} 100%)`
  };
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 768px) {
    flex: 0 0 50%; /* Slightly smaller on mobile for more content space */
  }
`;

const ImagePlaceholder = styled.div`
  color: white;
  font-size: 3rem;
  font-weight: 300;
  opacity: 0.8;

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const StatusBadge = styled.div<{ $status: string }>`
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 3px 10px;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: "Noto Sans KR", sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: white;
  background: ${props => {
    switch (props.$status) {
      case 'published': return '#22c55e';
      case 'draft': return '#f59e0b';
      case 'archived': return '#6b7280';
      default: return '#6b7280';
    }
  }};

  @media (max-width: 768px) {
    font-size: 0.65rem;
    padding: 2px 8px;
    top: 8px;
    right: 8px;
  }
`;

const CardContent = styled.div`
  flex: 1; /* Takes up remaining space after image */
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  min-height: 0; /* Allow content to shrink if needed */

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const ContentMain = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const ContentFooter = styled.div`
  margin-top: auto;
  padding-top: 0.5rem;
`;

const PostTitle = styled.h2`
  font-size: 1.4rem;
  font-weight: 700;
  color: ${colors.text.dark};
  margin-bottom: 0.6rem;
  line-height: 1.3;
  font-family: "Noto Sans KR", sans-serif;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;

  @media (max-width: 768px) {
    font-size: 1.2rem;
    margin-bottom: 0.5rem;
  }
`;

const PostExcerpt = styled.p`
  font-size: 0.95rem;
  color: ${colors.text.medium};
  line-height: 1.5;
  margin-bottom: 0.8rem;
  font-family: "Noto Sans KR", sans-serif;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;

  @media (max-width: 768px) {
    font-size: 0.85rem;
    margin-bottom: 0.7rem;
    line-height: 1.4;
  }
`;

const PostMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  font-size: 0.8rem;
  color: ${colors.text.light};
  font-family: "Noto Sans KR", sans-serif;

  @media (max-width: 768px) {
    font-size: 0.75rem;
    margin-bottom: 0.6rem;
  }
`;

const Author = styled.span`
  font-weight: 600;
  color: ${colors.text.medium};
  font-family: "Noto Sans KR", sans-serif;
`;

const PostDate = styled.span`
  color: ${colors.text.light};
  font-family: "Noto Sans KR", sans-serif;
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.75rem;

  @media (max-width: 768px) {
    gap: 0.3rem;
    margin-bottom: 0.6rem;
  }
`;

const Tag = styled.span`
  background: ${colors.primaryPale};
  color: ${colors.text.medium};
  padding: 0.2rem 0.6rem;
  border-radius: 16px;
  font-size: 0.7rem;
  font-weight: 500;
  font-family: "Noto Sans KR", sans-serif;

  @media (max-width: 768px) {
    font-size: 0.65rem;
    padding: 0.15rem 0.5rem;
    border-radius: 14px;
  }
`;



const AdminActions = styled.div`
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  gap: 0.4rem;
  opacity: 0;
  transition: opacity 0.3s ease;

  ${CardContainer}:hover & {
    opacity: 1;
  }

  @media (max-width: 768px) {
    top: 8px;
    left: 8px;
    gap: 0.3rem;
  }
`;

const ActionButton = styled.button`
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: ${colors.text.dark};
  font-size: 0.85rem;
  font-family: "Noto Sans KR", sans-serif;

  &:hover {
    background: white;
    transform: scale(1.1);
  }

  &.edit {
    color: #3b82f6;
  }

  &.delete {
    color: #ef4444;
  }

  @media (max-width: 768px) {
    width: 28px;
    height: 28px;
    font-size: 0.75rem;
  }
`;

interface BlogPostCardProps {
  post: BlogPost;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClick?: () => void;
}

export const BlogPostCard: React.FC<BlogPostCardProps> = ({
  post,
  isAdmin,
  onEdit,
  onDelete,
  onClick
}) => {
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getExcerpt = () => {
    if (post.excerpt) return post.excerpt;
    
    // Create excerpt from content if not provided
    const textContent = post.content.replace(/<[^>]*>/g, ''); // Strip HTML
    return textContent.length > 150 
      ? textContent.substring(0, 150) + '...'
      : textContent;
  };

  return (
    <CardContainer onClick={onClick}>
      <FeaturedImage 
        $hasImage={!!post.featuredImage} 
        $imageUrl={post.featuredImage}
      >
        {!post.featuredImage && (
          <ImagePlaceholder>📝</ImagePlaceholder>
        )}
        
        {isAdmin && (
          <>
            <StatusBadge $status={post.status}>
              {post.status}
            </StatusBadge>
            <AdminActions>
              <ActionButton className="edit" onClick={handleEdit} title="편집">
                ✏️
              </ActionButton>
              <ActionButton className="delete" onClick={handleDelete} title="삭제">
                🗑️
              </ActionButton>
            </AdminActions>
          </>
        )}
      </FeaturedImage>

      <CardContent>
        <ContentMain>
          <PostTitle>{post.title}</PostTitle>
          <PostExcerpt>{getExcerpt()}</PostExcerpt>
        </ContentMain>
        
        <ContentFooter>
          <PostMeta>
            <Author>by 영어 한잔</Author>
            <PostDate>{formatDate(post.publishedAt || post.createdAt)}</PostDate>
          </PostMeta>

          {post.tags && post.tags.length > 0 && (
            <TagsContainer>
              {post.tags.slice(0, 3).map((tag, index) => (
                <Tag key={index}>{tag}</Tag>
              ))}
              {post.tags.length > 3 && (
                <Tag>+{post.tags.length - 3}</Tag>
              )}
            </TagsContainer>
          )}
        </ContentFooter>
      </CardContent>
    </CardContainer>
  );
}; 