import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../../../shared/contexts/auth_context";
import { BlogPost } from "../types/blog_types";
import { 
  fetchBlogPosts, 
  fetchAllBlogPosts,
  createBlogPost, 
  updateBlogPost, 
  deleteBlogPost 
} from "../services/blog_service";
import { BlogEditor } from "../components/blog_editor";
import { BlogPostCard } from "../components/blog_post_card";

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

const BlogContainer = styled.div`
  padding: 1.5rem 0;
  font-family: "Noto Sans KR", sans-serif;

  @media (max-width: 768px) {
    padding: 1rem 0;
  }
`;

const AdminControls = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1.5rem;
  gap: 0.75rem;

  @media (max-width: 768px) {
    justify-content: center;
    flex-wrap: wrap;
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

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    padding: 8px 16px;
    font-size: 0.9rem;
  }
`;

const BlogGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
  align-items: start; /* Prevent stretching if cards have different content lengths */

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.25rem;
    margin-top: 1.25rem;
  }

  /* Ensure cards don't get too wide even on very large screens */
  & > * {
    max-width: 600px;
    justify-self: center;
  }
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  font-size: 1.2rem;
  color: ${colors.text.medium};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  color: ${colors.text.light};
  background: white;
  border-radius: 16px;
  border: 2px dashed ${colors.primaryPale};
  font-family: "Noto Sans KR", sans-serif;

  h3 {
    font-size: 1.4rem;
    margin-bottom: 0.75rem;
    color: ${colors.text.medium};
    font-family: "Noto Sans KR", sans-serif;
    font-weight: 600;
  }

  p {
    font-size: 0.95rem;
    line-height: 1.5;
    font-family: "Noto Sans KR", sans-serif;
  }

  @media (max-width: 768px) {
    padding: 2.5rem 1.5rem;
    
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
  color: #dc3545;
  background: #fff5f5;
  border-radius: 12px;
  border: 1px solid #f5c6cb;
  margin: 2rem 0;
`;

export default function Blog() {
  const { accountStatus } = useAuth();
  const navigate = useNavigate();
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

  // Check if user is admin
  const isAdmin = accountStatus === "admin";

  // Fetch blog posts on component mount
  useEffect(() => {
    loadBlogPosts();
  }, [isAdmin]); // Re-fetch when admin status changes

  const loadBlogPosts = async () => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      
      // Admin users see all posts, regular users see only published posts
      const posts = isAdmin ? await fetchAllBlogPosts() : await fetchBlogPosts();
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
      console.log('Saving blog post with data:', postData);
      
      if (editingPost) {
        // Update existing post
        console.log('Updating existing post:', editingPost.id);
        await updateBlogPost(editingPost.id, postData);
      } else {
        // Create new post
        console.log('Creating new post');
        await createBlogPost(postData);
      }
      
      setShowEditor(false);
      setEditingPost(null);
      await loadBlogPosts(); // Refresh the list
    } catch (err) {
      console.error("Failed to save blog post:", err);
      console.error("Error details:", err);
      
      // Show more specific error message
      let errorMessage = "블로그 포스트 저장에 실패했습니다.";
      if (err instanceof Error) {
        errorMessage += " 오류: " + err.message;
      }
      
      setError(errorMessage);
      alert(errorMessage);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("정말로 이 포스트를 삭제하시겠습니까?")) {
      return;
    }

    try {
      await deleteBlogPost(postId);
      await loadBlogPosts(); // Refresh the list
    } catch (err) {
      console.error("Failed to delete blog post:", err);
      setError("블로그 포스트 삭제에 실패했습니다.");
    }
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setEditingPost(null);
  };

  const handlePostClick = (post: BlogPost) => {
    navigate(`/blog/${post.id}`);
  };

  if (loading) {
    return (
      <BlogContainer>
        <LoadingState>블로그 포스트를 불러오는 중...</LoadingState>
      </BlogContainer>
    );
  }

  if (error) {
    return (
      <BlogContainer>
        <ErrorState>{error}</ErrorState>
      </BlogContainer>
    );
  }

  return (
    <BlogContainer>
      {isAdmin && (
        <AdminControls>
          <AdminButton onClick={handleCreatePost}>
            ✏️ 새 포스트 작성
          </AdminButton>
        </AdminControls>
      )}

      {showEditor && (
        <BlogEditor
          post={editingPost}
          onSave={handleSavePost}
          onCancel={handleCloseEditor}
        />
      )}

      {blogPosts.length === 0 ? (
        <EmptyState>
          <h3>아직 블로그 포스트가 없습니다</h3>
          <p>
            {isAdmin 
              ? "첫 번째 블로그 포스트를 작성해보세요!"
              : "곧 흥미로운 포스트들을 만나보실 수 있습니다."
            }
          </p>
        </EmptyState>
      ) : (
        <BlogGrid>
          {blogPosts.map((post) => (
            <BlogPostCard
              key={post.id}
              post={post}
              isAdmin={isAdmin}
              onEdit={() => handleEditPost(post)}
              onDelete={() => handleDeletePost(post.id)}
              onClick={() => handlePostClick(post)}
            />
          ))}
        </BlogGrid>
      )}
    </BlogContainer>
  );
} 