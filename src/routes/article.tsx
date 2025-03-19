import { useEffect, useState } from "react";
import { styled } from "styled-components";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const ArticleWrapper = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  
  @media (max-width: 768px) {
    padding: 20px 16px;
  }
`;

const ArticleHeader = styled.header`
  margin-bottom: 40px;
  border-bottom: 1px solid #eaeaea;
  padding-bottom: 30px;
`;

const ArticleTitle = styled.h1`
  font-size: 2.75rem;
  font-weight: 800;
  line-height: 1.2;
  color: #111827;
  margin-bottom: 24px;
  letter-spacing: -0.02em;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const ArticleMeta = styled.div`
  display: flex;
  align-items: center;
  font-size: 0.95rem;
  color: #6b7280;
  margin-bottom: 8px;
`;

const ArticleDate = styled.span`
  margin-right: 24px;
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 6px;
    height: 16px;
    width: 16px;
  }
`;

const ArticleContent = styled.div`
  line-height: 1.8;
  font-size: 1.15rem;
  color: #374151;
  
  p {
    margin-bottom: 1.5em;
  }
  
  h2 {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 1.5em 0 0.75em;
    color: #111827;
  }
  
  h3 {
    font-size: 1.35rem;
    font-weight: 600;
    margin: 1.25em 0 0.75em;
    color: #111827;
  }
  
  ul, ol {
    margin-left: 1.5em;
    margin-bottom: 1.5em;
  }
  
  li {
    margin-bottom: 0.5em;
  }
  
  blockquote {
    border-left: 4px solid #e5e7eb;
    padding-left: 1em;
    font-style: italic;
    margin: 1.5em 0;
    color: #4b5563;
  }
  
  a {
    color: #2563eb;
    text-decoration: underline;
    text-underline-offset: 2px;
    
    &:hover {
      color: #1e40af;
    }
  }
  
  @media (max-width: 768px) {
    font-size: 1.05rem;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 40px;
  font-size: 1.2rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 12px;
    animation: spin 1.5s linear infinite;
  }
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const ErrorContainer = styled.div`
  background-color: #fef2f2;
  border-radius: 8px;
  padding: 24px;
  margin: 40px 0;
`;

const ErrorMessage = styled.div`
  text-align: center;
  font-size: 1.2rem;
  color: #b91c1c;
  display: flex;
  flex-direction: column;
  align-items: center;
  
  svg {
    margin-bottom: 16px;
    height: 40px;
    width: 40px;
    color: #ef4444;
  }
`;

interface Article {
  title: string;
  content: string;
  createdAt?: { seconds: number; nanoseconds: number };
}

export default function Article() {
  const { articleId } = useParams<{ articleId: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!articleId) {
        setError("Article ID is missing");
        setLoading(false);
        return;
      }

      try {
        const articleRef = doc(db, `articles/${articleId}`);
        const articleSnap = await getDoc(articleRef);

        if (articleSnap.exists()) {
          setArticle(articleSnap.data() as Article);
        } else {
          setError("Article not found");
        }
      } catch (err) {
        console.error("Error fetching article:", err);
        setError("Failed to load article");
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [articleId]);

  // Format timestamp to readable date
  const formatDate = (timestamp?: { seconds: number; nanoseconds: number }) => {
    if (!timestamp) return 'Unknown date';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <ArticleWrapper>
        <LoadingContainer>
          <LoadingMessage>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
            </svg>
            Loading article...
          </LoadingMessage>
        </LoadingContainer>
      </ArticleWrapper>
    );
  }

  if (error) {
    return (
      <ArticleWrapper>
        <ErrorContainer>
          <ErrorMessage>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {error}
          </ErrorMessage>
        </ErrorContainer>
      </ArticleWrapper>
    );
  }

  if (!article) {
    return (
      <ArticleWrapper>
        <ErrorContainer>
          <ErrorMessage>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            Article not found
          </ErrorMessage>
        </ErrorContainer>
      </ArticleWrapper>
    );
  }

  // Process content to add proper HTML formatting
  // In a real app, you'd use a markdown parser or rich text editor
  const formattedContent = article.content.split('\n\n').map((paragraph, index) => (
    <p key={index}>{paragraph}</p>
  ));

  return (
    <ArticleWrapper>
      <ArticleHeader>
        <ArticleTitle>{article.title}</ArticleTitle>
        <ArticleMeta>
          <ArticleDate>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            {formatDate(article.createdAt)}
          </ArticleDate>
        </ArticleMeta>
      </ArticleHeader>
      <ArticleContent>
        {formattedContent}
      </ArticleContent>
    </ArticleWrapper>
  );
} 