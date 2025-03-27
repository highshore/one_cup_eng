import { useState, useEffect } from "react";
import styled from "styled-components";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from '../firebase';
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 20px;
`;

const Button = styled.button`
  background-color: #4caf50;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 20px;
  
  &:hover {
    background-color: #45a049;
  }
  
  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const ResultContainer = styled.div`
  margin-top: 20px;
  padding: 15px;
  border-radius: 4px;
  background-color: #f5f5f5;
  overflow-x: auto;
`;

const ResultTitle = styled.h3`
  font-size: 18px;
  margin-bottom: 10px;
`;

const StatusBox = styled.div<{ status: "success" | "error" | "idle" }>`
  padding: 10px;
  margin-top: 15px;
  border-radius: 4px;
  background-color: ${(props) => 
    props.status === "success" ? "#dff0d8" : 
    props.status === "error" ? "#f2dede" : "#f5f5f5"};
  color: ${(props) => 
    props.status === "success" ? "#3c763d" : 
    props.status === "error" ? "#a94442" : "#333"};
`;

const TabContainer = styled.div`
  display: flex;
  margin-bottom: 20px;
`;

const Tab = styled.button<{ active: boolean }>`
  padding: 10px 20px;
  background-color: ${props => props.active ? "#4caf50" : "#f1f1f1"};
  color: ${props => props.active ? "white" : "black"};
  border: none;
  border-radius: 4px;
  margin-right: 10px;
  cursor: pointer;
  font-size: 16px;
  
  &:hover {
    background-color: ${props => props.active ? "#45a049" : "#e1e1e1"};
  }
`;

const CardContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
`;

const ArticleList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-top: 20px;
  max-width: 800px;
`;

const Card = styled.div`
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 15px;
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }
`;

const ArticleCard = styled(Card)`
  cursor: pointer;
`;

const CardTitle = styled.h4`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 10px;
  color: #333;
`;

const CardContent = styled.div`
  font-size: 14px;
  color: #555;
`;

interface ArticleData {
  id: string;
  title?: {
    english: string;
    korean: string;
  };
  content?: {
    english: string[];
    korean: string[];
  };
  timestamp?: Timestamp;
  url?: string;
}

interface UserData {
  id: string;
  name?: string;
  displayName?: string;
  email?: string;
  language?: string;
  left_count?: number;
  cat_tech?: boolean;
  cat_business?: boolean;
}

export default function Admin() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState<"success" | "error" | "idle">("idle");
  const [activeTab, setActiveTab] = useState<'links' | 'articles' | 'users'>('links');
  const [articles, setArticles] = useState<ArticleData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [fetchingArticles, setFetchingArticles] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);

  useEffect(() => {
    if (activeTab === 'articles' && articles.length === 0) {
      fetchArticles();
    }
    if (activeTab === 'users' && users.length === 0) {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchArticles = async () => {
    setFetchingArticles(true);
    try {
      const articlesCollection = collection(db, 'articles');
      const articlesSnapshot = await getDocs(articlesCollection);
      const articlesList = articlesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ArticleData[];
      
      // Sort articles by timestamp (most recent first)
      const sortedArticles = articlesList.sort((a, b) => {
        const dateA = a.timestamp?.toDate?.() ? a.timestamp.toDate() : new Date(0);
        const dateB = b.timestamp?.toDate?.() ? b.timestamp.toDate() : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      
      setArticles(sortedArticles);
    } catch (error) {
      console.error("Error fetching articles:", error);
    } finally {
      setFetchingArticles(false);
    }
  };

  const fetchUsers = async () => {
    setFetchingUsers(true);
    try {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const usersList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserData[];
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setFetchingUsers(false);
    }
  };

  const handleSendLinks = async () => {
    setIsLoading(true);
    setStatus("idle");
    
    try {
      const functions = getFunctions();
      const testSendLinks = httpsCallable(functions, 'testSendLinksToUsers');
      
      const response = await testSendLinks();
      setResult(response.data);
      setStatus("success");
      console.log("Function result:", response.data);
    } catch (error) {
      console.error("Error calling function:", error);
      setResult(error);
      setStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  const renderArticleCard = (article: ArticleData) => {
    const handleArticleClick = () => {
      navigate(`/article/${article.id}`);
    };

    return (
      <ArticleCard key={article.id} onClick={handleArticleClick}>
        <CardTitle>{article.title?.english || 'Untitled'}</CardTitle>
        <CardContent>
          <p><strong>ID:</strong> {article.id}</p>
          <p><strong>Korean Title:</strong> {article.title?.korean || 'No Korean title'}</p>
          <p><strong>Date:</strong> {article.timestamp?.toDate?.() ? article.timestamp.toDate().toLocaleDateString() : 'No date'}</p>
        </CardContent>
      </ArticleCard>
    );
  };

  const renderUserCard = (user: UserData) => {
    return (
      <Card key={user.id}>
        <CardTitle>{user.name || user.displayName || user.email || 'Unknown User'}</CardTitle>
        <CardContent>
          <p><strong>ID:</strong> {user.id}</p>
          <p><strong>Left Count:</strong> {user.left_count !== undefined ? user.left_count : 'N/A'}</p>
          {user.cat_tech && <p>Tech category</p>}
          {user.cat_business && <p>Business category</p>}
        </CardContent>
      </Card>
    );
  };

  return (
    <Wrapper>
      <Title>Admin Panel</Title>
      
      <TabContainer>
        <Tab 
          active={activeTab === 'links'} 
          onClick={() => setActiveTab('links')}
        >
          Send Links
        </Tab>
        <Tab 
          active={activeTab === 'articles'} 
          onClick={() => setActiveTab('articles')}
        >
          Articles
        </Tab>
        <Tab 
          active={activeTab === 'users'} 
          onClick={() => setActiveTab('users')}
        >
          Users
        </Tab>
      </TabContainer>
      
      {/* Links Tab Content */}
      {activeTab === 'links' && (
        <>
          <Button 
            onClick={handleSendLinks} 
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Test Send Links to Users"}
          </Button>
          
          {result && (
            <ResultContainer>
              <ResultTitle>Function Result:</ResultTitle>
              <pre>{JSON.stringify(result, null, 2)}</pre>
              
              <StatusBox status={status}>
                {status === "success" ? "Successfully sent messages!" : 
                 status === "error" ? "Error sending messages" : ""}
              </StatusBox>
              
              {status === "success" && result.stats && (
                <div>
                  <p>Tech recipients: {result.stats.techCount}</p>
                  <p>Business recipients: {result.stats.businessCount}</p>
                  <p>Expiry notifications: {result.stats.expiryCount}</p>
                </div>
              )}
            </ResultContainer>
          )}
        </>
      )}
      
      {/* Articles Tab Content */}
      {activeTab === 'articles' && (
        <>
          <Button 
            onClick={fetchArticles} 
            disabled={fetchingArticles}
          >
            {fetchingArticles ? "Loading..." : "Refresh Articles"}
          </Button>
          
          {fetchingArticles ? (
            <p>Loading articles...</p>
          ) : (
            <>
              <ResultTitle>Articles ({articles.length})</ResultTitle>
              <ArticleList>
                {articles.map(renderArticleCard)}
              </ArticleList>
            </>
          )}
        </>
      )}
      
      {/* Users Tab Content */}
      {activeTab === 'users' && (
        <>
          <Button 
            onClick={fetchUsers} 
            disabled={fetchingUsers}
          >
            {fetchingUsers ? "Loading..." : "Refresh Users"}
          </Button>
          
          {fetchingUsers ? (
            <p>Loading users...</p>
          ) : (
            <>
              <ResultTitle>Users ({users.length})</ResultTitle>
              <CardContainer>
                {users.map(renderUserCard)}
              </CardContainer>
            </>
          )}
        </>
      )}
    </Wrapper>
  );
} 