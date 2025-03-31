import { styled } from "styled-components";
import { auth, storage, db } from "../firebase";
import { useState, useEffect } from "react";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { updateProfile, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import defaultUserImage from "../assets/default_user.png";

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-height: 100vh;
  gap: 10px; // Narrowed gap between tiles
  padding: 20px;
  overflow-y: auto;
`;

const AvatarUpload = styled.label`
  width: 80px;
  height: 80px;
  overflow: hidden;
  border-radius: 50%;
  background-color: #000;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  svg {
    width: 50px;
  }
`;

const AvatarImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const AvatarInput = styled.input`
  display: none;
`;

const Name = styled.span`
  margin-top: 10px;
  font-size: 24px;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 1px dashed transparent;
  
  &:hover {
    border-bottom: 1px dashed #666;
  }
`;

const NameInput = styled.input`
  margin-top: 10px;
  font-size: 24px;
  font-weight: 600;
  text-align: center;
  padding: 4px 8px;
  border: none;
  border-bottom: 1px solid #ccc;
  border-radius: 0;
  background-color: transparent;
  width: 100%;
  max-width: 300px;
  outline: none;
  
  &:focus {
    border-bottom: 2px solid #4CAF50;
    color: #333;
  }
`;

const NameEditContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const CheckmarkIcon = styled.span`
  position: absolute;
  right: 10px;
  color: #4CAF50;
  font-size: 18px;
  cursor: pointer;
`;

const UserInfoCard = styled.div`
  background-color: #fffdff; // Brighter with just a hint of yellow
  border-radius: 8px;
  padding: 20px;
  width: 100%;
  max-width: 400px;
  margin: 10px 0; // Reduced margin to narrow the gap
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

// Creating a ProfileCard for user info
const ProfileCard = styled(UserInfoCard)`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

// Words Card for saved words
const WordsCard = styled(UserInfoCard)`
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 16px;
`;

const InfoLabel = styled.span`
  font-weight: 500;
  color: #555;
`;

const InfoValue = styled.span`
  font-weight: 400;
  color: #333;
`;

const CategoryDisplay = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 10px;
`;

const CategoryLabel = styled.span`
  color: #333;
  margin-left: 5px;
`;

const CategoryIcon = styled.span<{ active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background-color: ${props => props.active ? '#4CAF50' : '#e0e0e0'};
  color: white;
  font-size: 12px;
`;

const LogoutButton = styled.button`
  background-color: #999; // Grayer color as requested
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 10px;
  width: 100%; // Same width as cards
  max-width: 400px; // Match card width
  
  &:hover {
    background-color: #777;
  }
`;

// Enhanced article list styles
const ArticlesSection = styled(UserInfoCard)`
`;

const SectionTitle = styled.h3`
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 15px;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
`;

const ArticlesList = styled.div`
  max-height: 250px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
`;

const ArticleItem = styled.div`
  padding: 12px;
  border-radius: 6px;
  background-color: white;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  
  &:hover {
    background-color: #fafafa;
    transform: translateY(-2px);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  }
`;

const ArticleTitle = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 5px;
`;

const ArticleDate = styled.div`
  font-size: 12px;
  color: #777;
`;

const WordItem = styled.div`
  padding: 8px 12px;
  margin: 6px 0;
  border-radius: 4px;
  background-color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  }
`;

const WordsList = styled.div`
  max-height: 200px;
  overflow-y: auto;
  margin-top: 15px;
`;

const PhoneNumber = styled.p`
  margin-top: 8px;
  font-size: 16px;
  color: #555;
`;

interface UserData {
  cat_business: boolean;
  cat_tech: boolean;
  left_count: number;
  last_received: Date;
  received_articles: string[];
  saved_words: string[];
  createdAt: Date;
}

export default function Profile() {
  const user = auth.currentUser;
  const [avatar, setAvatar] = useState(user?.photoURL || defaultUserImage);
  const [avatarTimestamp, setAvatarTimestamp] = useState(Date.now());
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [receivedArticles, setReceivedArticles] = useState<{id: string, title?: string, date?: Date}[]>([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || "");

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        navigate("/auth");
        return;
      }

      try {
        setLoading(true);
        const userDocRef = doc(db, `users/${user.uid}`);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData({
            cat_business: data.cat_business || false,
            cat_tech: data.cat_tech || false,
            left_count: data.left_count || 0,
            last_received: data.last_received?.toDate() || new Date(0),
            received_articles: data.received_articles || [],
            saved_words: data.saved_words || [],
            createdAt: data.createdAt?.toDate() || new Date(),
          });
          
          // Also update avatar from user object to ensure it's current
          if (user.photoURL) {
            setAvatar(user.photoURL);
            setAvatarTimestamp(Date.now());
          }
          
          // Fetch article titles for received articles
          if (data.received_articles && data.received_articles.length > 0) {
            await fetchArticleTitles(data.received_articles);
          }
        } else {
          setError("페이지를 새로고침해주세요!");
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("Failed to load user data.");
      } finally {
        setLoading(false);
      }
    };

    // Update fetchArticleTitles to also fetch dates
    const fetchArticleTitles = async (articleIds: string[]) => {
      try {
        const articlesData = [];
        for (const id of articleIds) {
          const articleDoc = await getDoc(doc(db, 'articles', id));
          if (articleDoc.exists()) {
            const data = articleDoc.data();
            articlesData.push({
              id: id,
              title: data.title?.english || data.title?.korean || 'Untitled',
              date: data.timestamp?.toDate() || null
            });
          } else {
            articlesData.push({ id: id });
          }
        }
        setReceivedArticles(articlesData);
      } catch (error) {
        console.error("Error fetching article titles:", error);
      }
    };

    fetchUserData();
  }, [user, navigate]);

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    if (!user) {
      console.error("No user found when trying to upload avatar");
      setError("Please log in again to upload avatar");
      return;
    }
    
    if (files && files.length === 1) {
      const file = files[0];
      console.log("File selected:", file.name, "size:", file.size);
      
      // Check file size (limit to 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError("File too large. Please select an image under 2MB");
        return;
      }
      
      const locationRef = ref(storage, `avatars/${user.uid}`);
      console.log("Uploading to:", `avatars/${user.uid}`);
      
      try {
        setError("Uploading image...");
        
        // Convert image to smaller size before uploading
        const resizedFile = await resizeImage(file, 300, 300);
        
        const result = await uploadBytes(locationRef, resizedFile || file);
        console.log("Upload successful, getting download URL");
        
        const avatarUrl = await getDownloadURL(result.ref);
        console.log("Download URL received:", avatarUrl);
        
        // Update the profile first, then update local state
        await updateProfile(user, {
          photoURL: avatarUrl,
        });
        
        // Force a reload to ensure avatar URL is properly updated with timestamp
        setAvatar(avatarUrl);
        setAvatarTimestamp(Date.now());
        setError("Profile photo updated successfully!");
        
        console.log("User profile updated successfully");
      } catch (error) {
        console.error("Error uploading avatar:", error);
        setError(
          "Failed to upload avatar. Error: " + (error as Error).message
        );
      }
    }
  };
  
  // Helper function to resize image before upload
  const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<File | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert canvas to file
          canvas.toBlob((blob) => {
            if (!blob) {
              resolve(null);
              return;
            }
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(resizedFile);
          }, file.type, 0.7);
        };
        
        if (readerEvent.target?.result) {
          img.src = readerEvent.target.result as string;
        } else {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Redirect to auth screen
      navigate("/auth");
    } catch (err) {
      console.error("Error signing out:", err);
      setError("Failed to sign out.");
    }
  };

  const navigateToArticle = (articleId: string) => {
    navigate(`/article/${articleId}`);
  };

  // Add function to handle display name changes
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayName(e.target.value);
  };

  // Add function to save display name
  const saveDisplayName = async () => {
    if (!user) return;
    
    try {
      await updateProfile(user, {
        displayName: displayName.trim() || "Anonymous User"
      });
      setIsEditingName(false);
      setError("");
    } catch (err) {
      console.error("Error updating display name:", err);
      setError("Failed to update display name.");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      saveDisplayName();
    }
  };

  if (loading) {
    return <Wrapper>Loading user data...</Wrapper>;
  }

  // Reorder components with vocabulary tile at the end
  const renderContent = () => {
    if (!userData) return null;
    
    return (
      <>
        <ProfileCard>
          <AvatarUpload htmlFor="avatar">
            <AvatarImg 
              src={`${avatar}?t=${avatarTimestamp}`}
              key={avatarTimestamp}
              alt="Profile"
            />
          </AvatarUpload>
          
          {isEditingName ? (
            <NameEditContainer>
              <NameInput
                type="text"
                value={displayName}
                onChange={handleNameChange}
                placeholder="Enter your name"
                autoFocus
                onKeyPress={handleKeyPress}
              />
              <CheckmarkIcon onClick={saveDisplayName}>✓</CheckmarkIcon>
            </NameEditContainer>
          ) : (
            <Name onClick={() => setIsEditingName(true)}>
              {user?.displayName ? user.displayName : "유저명을 정해주세요"}
            </Name>
          )}
          
          <PhoneNumber>{user?.phoneNumber || "No phone number"}</PhoneNumber>
        </ProfileCard>
        
        <UserInfoCard>
          <InfoRow>
            <InfoLabel>Articles Remaining:</InfoLabel>
            <InfoValue>{userData.left_count}</InfoValue>
          </InfoRow>
          
          <InfoRow>
            <InfoLabel>Last Article Received:</InfoLabel>
            <InfoValue>
              {new Date(userData.last_received).getFullYear() < 1001 
                ? 'Not yet' 
                : userData.last_received.toLocaleDateString()}
            </InfoValue>
          </InfoRow>
          
          <InfoRow>
            <InfoLabel>Member Since:</InfoLabel>
            <InfoValue>
              {userData.createdAt.toLocaleDateString()}
            </InfoValue>
          </InfoRow>
          
          <h3 style={{ marginTop: '20px', marginBottom: '10px' }}>Selected Categories</h3>
          
          <CategoryDisplay>
            <CategoryIcon active={userData.cat_tech}>
              {userData.cat_tech ? "✓" : ""}
            </CategoryIcon>
            <CategoryLabel>Technology</CategoryLabel>
          </CategoryDisplay>
          
          <CategoryDisplay>
            <CategoryIcon active={userData.cat_business}>
              {userData.cat_business ? "✓" : ""}
            </CategoryIcon>
            <CategoryLabel>Business</CategoryLabel>
          </CategoryDisplay>
        </UserInfoCard>
        
        {userData.received_articles.length > 0 && (
          <ArticlesSection>
            <SectionTitle>Your Articles</SectionTitle>
            <ArticlesList>
              {receivedArticles.map((article) => (
                <ArticleItem 
                  key={article.id} 
                  onClick={() => navigateToArticle(article.id)}
                >
                  <ArticleTitle>
                    {article.title || `Article ${article.id}`}
                  </ArticleTitle>
                  <ArticleDate>
                    {article.date ? article.date.toLocaleDateString() : 'No date available'}
                  </ArticleDate>
                </ArticleItem>
              ))}
            </ArticlesList>
          </ArticlesSection>
        )}
        
        {/* Moved vocab tile to the end as requested */}
        {userData.saved_words.length > 0 && (
          <WordsCard>
            <SectionTitle>Saved Words</SectionTitle>
            <WordsList>
              {userData.saved_words.map((word, index) => (
                <WordItem key={index}>
                  <span>{word}</span>
                </WordItem>
              ))}
            </WordsList>
          </WordsCard>
        )}
      </>
    );
  };

  return (
    <Wrapper>
      <AvatarInput
        type="file"
        accept="image/*"
        id="avatar"
        onChange={onAvatarChange}
      />
      
      {renderContent()}

      <LogoutButton onClick={handleLogout}>Logout</LogoutButton>

      {error && <span style={{ color: "red" }}>{error}</span>}
    </Wrapper>
  );
}
