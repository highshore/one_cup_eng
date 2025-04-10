import { styled } from "styled-components";
import { auth, storage, db } from "../firebase";
import { useState, useEffect } from "react";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { updateProfile, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { format } from "date-fns";
import { ko } from "date-fns/locale/ko";
import defaultUserImage from "../assets/default_user.png";

// Updated Wrapper to use full width and follow layout guidelines
const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 10px;
  padding: 20px;
  max-width: 850px;
  margin: 0 auto;
`;

// Transparent bordered card
const TransparentCard = styled.div`
  background-color: transparent;
  border: 1px solid #ddd;
  border-radius: 20px;
  padding: 20px;
  width: 100%;
  margin-bottom: 20px;
  font-family: inherit; /* Ensure consistent font */
`;

// Set consistent card width according to layout's content width
const Card = styled.div`
  background-color: transparent;
  border-radius: 8px;
  padding: 20px;
  width: 100%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  font-family: inherit; /* Ensure consistent font */
`;

// User Info section with avatar on right
const UserInfoSection = styled(TransparentCard)`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const UserInfoContent = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
`;

const UserDetails = styled.div`
  flex: 1;
`;

const UserAvatarSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-left: 20px;
`;

const AvatarActions = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 8px;
`;

const AvatarActionButton = styled.div`
  font-size: 12px;
  color: #777;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: #2c1810;
    text-decoration: underline;
  }
`;

const InfoLabel = styled.span`
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.25rem;
  width: 80px;
  display: inline-block;
  text-align: left;
`;

const InfoValue = styled.span`
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  font-family: inherit; /* Ensure consistent font */
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  font-size: 16px;
`;

const SectionTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 20px;
  color: #333;
  border-bottom: 1px solid #ddd;
  padding-bottom: 15px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const SectionContent = styled.div`
  padding-top: 10px;
  width: 100%;
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
  position: relative;

  &:hover::after {
    content: "변경";
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.5);
    color: white;
    font-size: 12px;
    text-align: center;
    padding: 4px 0;
  }

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

const NameInput = styled.input`
  font-size: 16px;
  font-weight: 500;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: white;
  width: 200px;
  outline: none;

  &:focus {
    border-color: #4caf50;
    box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
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
  color: #4caf50;
  font-size: 18px;
  cursor: pointer;
`;

// Subscription styles
const StatusBadge = styled.span<{ active?: boolean }>`
  display: inline-block;
  background-color: ${(props) => (props.active ? "#800000" : "#007bff")};
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 16px;
  font-size: 0.875rem;
  font-weight: 500;
  margin-left: 10px;
`;

const Button = styled.button`
  background-color: #2c1810;
  color: white;
  font-weight: 600;
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 20px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  &:hover {
    background-color: #3a66e5;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  &:disabled {
    background-color: #a0b0e0;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const DangerButton = styled(Button)`
  background-color: #d73a49;

  &:hover {
    background-color: #c92532;
  }
`;

const ConfirmationOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ConfirmationDialog = styled.div`
  background-color: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  justify-content: flex-end;
`;

const CancelButton = styled(Button)`
  background-color: #757575;

  &:hover {
    background-color: #616161;
  }
`;

const LogoutButton = styled.button`
  background-color: #d73a49;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  margin-top: 10px;
  width: auto;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  &:hover {
    background-color: #c92532;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }
`;

// Enhanced article list styles
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
  background-color: transparent;
  border: 1px solid #eee;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
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

const AlertCard = styled(Card)<{ type: "error" | "success" }>`
  background-color: ${(props) =>
    props.type === "success" ? "#e8f5e9" : "#ffebee"};
  margin-bottom: 1rem;

  p {
    color: ${(props) => (props.type === "success" ? "#2e7d32" : "#c62828")};
  }
`;

// Define subscription status type
type SubscriptionStatus = "active" | "canceled" | "pending" | "unknown";

interface SubscriptionData {
  status: SubscriptionStatus;
  startDate?: Date;
  nextBillingDate?: Date;
  cancelledDate?: Date;
  paymentMethod?: string;
  billingKey?: string;
}

interface UserData {
  cat_business: boolean;
  cat_tech: boolean;
  left_count: number;
  last_received: Date;
  received_articles: string[];
  saved_words: string[];
  createdAt: Date;
  hasActiveSubscription?: boolean;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  billingKey?: string;
  paymentMethod?: string;
}

// Define SubscriptionInfo section
const SubscriptionInfo = styled(TransparentCard)``;

const SubscribeAgainButton = styled(Button)`
  background-color: #2c1810;
  font-size: 0.875rem;
  padding: 0.5rem 1rem;
  margin-top: 0.5rem;
  align-self: flex-start;

  &:hover {
    background-color: #3d241a;
  }
`;

export default function Profile() {
  const user = auth.currentUser;
  const [avatar, setAvatar] = useState(user?.photoURL || "");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [receivedArticles, setReceivedArticles] = useState<
    { id: string; title?: string; date?: Date }[]
  >([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelInProgress, setCancelInProgress] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData>({
    status: "unknown",
  });
  const [isLoading, setIsLoading] = useState(false);

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
          const userDataObj = {
            cat_business: data.cat_business || false,
            cat_tech: data.cat_tech || false,
            left_count: data.left_count || 0,
            last_received: data.last_received?.toDate() || new Date(0),
            received_articles: data.received_articles || [],
            saved_words: data.saved_words || [],
            createdAt: data.createdAt?.toDate() || new Date(),
            hasActiveSubscription: data.hasActiveSubscription || false,
            subscriptionStartDate: data.subscriptionStartDate?.toDate(),
            subscriptionEndDate: data.subscriptionEndDate?.toDate(),
            billingKey: data.billingKey,
            paymentMethod: data.paymentMethod,
          };

          setUserData(userDataObj);

          // Set subscription data
          const subData: SubscriptionData = {
            status: userDataObj.hasActiveSubscription ? "active" : "canceled",
            startDate: userDataObj.subscriptionStartDate,
            cancelledDate: userDataObj.subscriptionEndDate,
            paymentMethod: userDataObj.paymentMethod || "카드",
            billingKey: userDataObj.billingKey,
          };

          // Calculate next billing date (one month from start date)
          if (subData.startDate && subData.status === "active") {
            const nextBillingDate = new Date(subData.startDate);
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
            subData.nextBillingDate = nextBillingDate;
          }

          setSubscriptionData(subData);

          // Fetch article titles for received articles - only if we have articles
          if (data.received_articles && data.received_articles.length > 0) {
            // Limit the number of articles we fetch to improve performance
            const recentArticles = data.received_articles.slice(-10); // Just get the 10 most recent articles
            await fetchArticleTitles(recentArticles);
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

    // Optimized fetchArticleTitles to batch requests
    const fetchArticleTitles = async (articleIds: string[]) => {
      try {
        const articlesData = [];
        for (const id of articleIds) {
          const articleDoc = await getDoc(doc(db, "articles", id));
          if (articleDoc.exists()) {
            const data = articleDoc.data();
            articlesData.push({
              id: id,
              title: data.title?.english || data.title?.korean || "Untitled",
              date: data.timestamp?.toDate() || null,
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
      setError("Please log in again to upload avatar");
      return;
    }

    if (files && files.length === 1) {
      const file = files[0];

      // Check file size (limit to 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError("File too large. Please select an image under 2MB");
        e.target.value = "";
        return;
      }

      try {
        setError("");
        setSuccessMessage(null);
        setIsLoading(true);

        // Create storage reference
        const locationRef = ref(storage, `avatars/user_${user.uid}`);

        // Upload the file
        const result = await uploadBytes(locationRef, file);
        const avatarUrl = await getDownloadURL(result.ref);

        // Update the profile
        await updateProfile(user, {
          photoURL: avatarUrl,
        });

        // Update local state
        setAvatar(avatarUrl);

        // Force a reload of the current user to update in other components like GNB
        await auth.currentUser?.reload();

        // Set a timestamp to force UI refresh in other components
        localStorage.setItem("avatar_update_timestamp", Date.now().toString());

        setSuccessMessage("프로필 이미지가 업데이트 되었습니다.");
      } catch (error) {
        console.error("Error uploading avatar:", error);
        setError("Failed to upload avatar: " + (error as Error).message);
      } finally {
        setIsLoading(false);
        e.target.value = "";
      }
    }
  };

  const deleteAvatar = async () => {
    if (!user) {
      setError("Please log in again to delete avatar");
      return;
    }

    try {
      setError("");
      setSuccessMessage(null);
      setIsLoading(true);

      // 1. Update the profile with null photoURL
      await updateProfile(user, {
        photoURL: null,
      });

      // 2. Update local state
      setAvatar("");

      // 3. Force a reload of the current user to update in other components like GNB
      // This triggers the useEffect in the GNB component that listens for currentUser changes
      await auth.currentUser?.reload();

      // 4. Notify about success
      setSuccessMessage("프로필 이미지가 삭제되었습니다.");

      // 5. Optional: set a timestamp to force UI refresh
      const timestamp = Date.now();
      localStorage.setItem("avatar_update_timestamp", timestamp.toString());

      // Note: We don't actually delete the image from Firebase Storage
      // as it might be referenced elsewhere and requires admin privileges
      // to properly clean up. Firebase Storage has lifecycle rules that
      // can automatically clean up orphaned files.
    } catch (error) {
      console.error("Error deleting avatar:", error);
      setError("Failed to delete avatar: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
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
        displayName: displayName.trim() || "", // Don't set a default here, just empty string if blank
      });
      setIsEditingName(false);
      setError("");
      setSuccessMessage("이름이 업데이트 되었습니다.");
    } catch (err) {
      console.error("Error updating display name:", err);
      setError("Failed to update display name.");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      saveDisplayName();
    }
  };

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    try {
      setCancelInProgress(true);
      setError("");

      if (!user) {
        throw new Error("로그인 정보를 찾을 수 없습니다.");
      }

      // Call the backend API to cancel subscription
      const response = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "구독 취소 중 오류가 발생했습니다.");
      }

      // Update subscription data
      setSubscriptionData((prev) => ({
        ...prev,
        status: "canceled",
        cancelledDate: new Date(),
        billingKey: undefined,
      }));

      // Also update userData to reflect changes
      if (userData) {
        setUserData({
          ...userData,
          hasActiveSubscription: false,
          subscriptionEndDate: new Date(),
          billingKey: undefined,
        });
      }

      setSuccessMessage("구독이 성공적으로 취소되었습니다.");
      setShowCancelDialog(false);
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      setError(
        error.message ||
          "구독 취소 중 오류가 발생했습니다. 나중에 다시 시도해주세요."
      );
    } finally {
      setCancelInProgress(false);
    }
  };

  // Format date for display
  const formatDate = (date?: Date) => {
    if (!date) return "-";
    return format(date, "yyyy년 MM월 dd일", { locale: ko });
  };

  if (loading) {
    return <Wrapper>Loading user data...</Wrapper>;
  }

  return (
    <Wrapper>
      {error && (
        <AlertCard type="error">
          <p>{error}</p>
        </AlertCard>
      )}
      {successMessage && (
        <AlertCard type="success">
          <p>{successMessage}</p>
        </AlertCard>
      )}
      {isLoading && (
        <div style={{ textAlign: "center", marginBottom: "15px" }}>
          Uploading image... Please wait.
        </div>
      )}

      {/* User Information Section */}
      <UserInfoSection>
        <SectionTitle>기본 정보</SectionTitle>
        <SectionContent>
          <UserInfoContent>
            <UserDetails>
              <InfoRow>
                <InfoLabel>유저명</InfoLabel>
                {isEditingName ? (
                  <NameEditContainer>
                    <NameInput
                      type="text"
                      value={displayName}
                      onChange={handleNameChange}
                      placeholder="이름 입력"
                      autoFocus
                      onKeyPress={handleKeyPress}
                    />
                    <CheckmarkIcon onClick={saveDisplayName}>✓</CheckmarkIcon>
                  </NameEditContainer>
                ) : (
                  <InfoValue onClick={() => setIsEditingName(true)}>
                    {user?.displayName
                      ? user.displayName
                      : "유저명을 정해주세요"}
                  </InfoValue>
                )}
              </InfoRow>

              <InfoRow>
                <InfoLabel>휴대폰</InfoLabel>
                <InfoValue>{user?.phoneNumber || "번호 없음"}</InfoValue>
              </InfoRow>

              <InfoRow>
                <InfoLabel>가입일</InfoLabel>
                <InfoValue>
                  {userData?.createdAt ? formatDate(userData.createdAt) : "-"}
                </InfoValue>
              </InfoRow>
            </UserDetails>

            <UserAvatarSection>
              <AvatarUpload htmlFor="avatar">
                {avatar ? (
                  <AvatarImg src={avatar} alt="Profile" />
                ) : (
                  <img
                    src={defaultUserImage}
                    alt="Default Profile"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                )}
              </AvatarUpload>
              <AvatarActions>
                <AvatarActionButton
                  onClick={() => document.getElementById("avatar")?.click()}
                >
                  변경
                </AvatarActionButton>
                {avatar && (
                  <AvatarActionButton onClick={deleteAvatar}>
                    삭제
                  </AvatarActionButton>
                )}
              </AvatarActions>
              <AvatarInput
                onChange={onAvatarChange}
                id="avatar"
                type="file"
                accept="image/*"
              />
            </UserAvatarSection>
          </UserInfoContent>
        </SectionContent>
      </UserInfoSection>

      {/* Subscription Information Section */}
      <SubscriptionInfo>
        <SectionTitle>
          구독 정보
          <StatusBadge
            active={
              subscriptionData.status === "active" ||
              (userData?.left_count || 0) > 0
            }
          >
            {subscriptionData.status === "active"
              ? "활성화"
              : (userData?.left_count || 0) > 0
              ? "사용 중"
              : "비활성화"}
          </StatusBadge>
        </SectionTitle>

        <SectionContent>
          <InfoRow>
            <InfoLabel>카테고리</InfoLabel>
            <InfoValue>
              {!userData?.cat_business && !userData?.cat_tech
                ? "선택 없음"
                : `${userData?.cat_business ? "Business" : ""}${
                    userData?.cat_business && userData?.cat_tech ? ", " : ""
                  }${userData?.cat_tech ? "Tech" : ""}`}
            </InfoValue>
          </InfoRow>

          <InfoRow>
            <InfoLabel>최근 결제</InfoLabel>
            <InfoValue>{formatDate(subscriptionData.startDate)}</InfoValue>
          </InfoRow>

          <InfoRow>
            <InfoLabel>다음 결제</InfoLabel>
            <InfoValue>
              {subscriptionData.status === "active"
                ? formatDate(subscriptionData.nextBillingDate)
                : "-"}
            </InfoValue>
          </InfoRow>

          <InfoRow>
            <InfoLabel>남은 횟수</InfoLabel>
            <InfoValue>{userData?.left_count || 0}</InfoValue>
          </InfoRow>

          <div
            style={{
              marginTop: "1.5rem",
              display: "flex",
              justifyContent: "left",
            }}
          >
            {subscriptionData.status === "active" && (
              <DangerButton onClick={() => setShowCancelDialog(true)}>
                구독 해지하기
              </DangerButton>
            )}

            {subscriptionData.status === "canceled" && (
              <SubscribeAgainButton
                onClick={() => (window.location.href = "/payment")}
              >
                다시 구독하기
              </SubscribeAgainButton>
            )}
          </div>
        </SectionContent>
      </SubscriptionInfo>

      {/* Articles History Section */}
      <TransparentCard>
        <SectionTitle>영어 한잔 기록</SectionTitle>
        <SectionContent>
          <ArticlesList>
            {receivedArticles.length > 0 ? (
              [...receivedArticles].reverse().map((article) => (
                <ArticleItem
                  key={article.id}
                  onClick={() => navigateToArticle(article.id)}
                >
                  <ArticleTitle>
                    {article.title || `Article ${article.id}`}
                  </ArticleTitle>
                  <ArticleDate>
                    {article.date ? formatDate(article.date) : "날짜 정보 없음"}
                  </ArticleDate>
                </ArticleItem>
              ))
            ) : (
              <div
                style={{ padding: "1rem", textAlign: "center", color: "#888" }}
              >
                아직 받은 아티클이 없습니다
              </div>
            )}
          </ArticlesList>
        </SectionContent>
      </TransparentCard>

      {/* Vocabulary Section */}
      {userData?.saved_words && userData.saved_words.length > 0 && (
        <TransparentCard>
          <SectionTitle>저장한 단어</SectionTitle>
          <SectionContent>
            <WordsList>
              {userData.saved_words.map((word, index) => (
                <WordItem key={index}>
                  <span>{word}</span>
                </WordItem>
              ))}
            </WordsList>
          </SectionContent>
        </TransparentCard>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          width: "100%",
        }}
      >
        <LogoutButton onClick={handleLogout}>로그아웃</LogoutButton>
      </div>

      {/* Subscription Cancellation Confirmation Dialog */}
      {showCancelDialog && (
        <ConfirmationOverlay>
          <ConfirmationDialog>
            <SectionTitle>구독 해지</SectionTitle>
            <p style={{ marginBottom: "1rem" }}>
              정말로 구독을 해지하시겠습니까?
            </p>
            <p style={{ marginBottom: "1rem" }}>
              해지 시 즉시 서비스 이용이 중단되며, 이미 결제된 금액은 환불되지
              않습니다.
            </p>
            <ButtonGroup>
              <CancelButton
                onClick={() => setShowCancelDialog(false)}
                disabled={cancelInProgress}
              >
                취소
              </CancelButton>
              <DangerButton
                onClick={handleCancelSubscription}
                disabled={cancelInProgress}
              >
                {cancelInProgress ? "처리 중..." : "구독 해지"}
              </DangerButton>
            </ButtonGroup>
          </ConfirmationDialog>
        </ConfirmationOverlay>
      )}
    </Wrapper>
  );
}
