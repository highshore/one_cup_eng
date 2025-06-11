"use client";

import { styled } from "styled-components";
import { auth, storage, db, functions } from "../../lib/firebase/firebase";
import { useState, useEffect } from "react";
import {
  getDownloadURL,
  ref,
  uploadBytes,
  deleteObject,
} from "firebase/storage";
import { updateProfile, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { format } from "date-fns";
import { ko } from "date-fns/locale/ko";
import { httpsCallable } from "firebase/functions";

// Updated Wrapper to use full width and follow layout guidelines
const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 10px;
  padding: 20px 0px;
  max-width: 920px;
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
const StatusBadge = styled.span.withConfig({
  shouldForwardProp: (prop) => prop !== "active",
})<{ active?: boolean }>`
  display: inline-block;
  background-color: ${(props) => (props.active ? "#00a000" : "#808080")};
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 1rem;
  font-weight: 600;
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
  background-color: #e74c3c;
  &:hover {
    background-color: #c0392b;
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
  margin: -10px 0;
  max-height: 300px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  scrollbar-width: thin;
  scrollbar-color: rgba(44, 24, 16, 0.5) transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: rgba(44, 24, 16, 0.3);
    border-radius: 6px;
  }
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

const AlertCard = styled(Card).withConfig({
  shouldForwardProp: (prop) => prop !== "type",
})<{ type: "error" | "success" }>`
  background-color: ${(props) =>
    props.type === "success" ? "#e8f5e9" : "#ffebee"};
  margin-bottom: 1rem;
  border-radius: 20px;

  p {
    color: ${(props) => (props.type === "success" ? "#2e7d32" : "#c62828")};
  }
`;

// Define SubscriptionInfo section
const SubscriptionInfo = styled(TransparentCard)``;

const SubscribeAgainButton = styled(Button)`
  background-color: #2c1810;
  width: 100%;
  &:hover {
    background-color: #4a2d1d;
  }
`;

// New style for the cancel subscription link
const CancelLinkButton = styled.button`
  background-color: transparent;
  color: #808080; // Muted gray color
  padding: 0.5rem; // Minimal padding
  border: none;
  border-radius: 4px; // Slight rounding
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;

  &:hover {
    color: #c0392b; // Subtle danger color on hover
    text-decoration: underline;
  }

  &:disabled {
    color: #bdbdbd; // Disabled color
    cursor: not-allowed;
    text-decoration: none;
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

const defaultUserImage = "/default_user.jpg"; // Using public folder

export default function ProfileClient() {
  const user = auth.currentUser;
  const [avatar, setAvatar] = useState(user?.photoURL || "");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();
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
        router.push("/auth");
        return;
      }

      try {
        setLoading(true);

        // Set avatar here instead of waiting for user data
        if (user.photoURL) {
          console.log("Profile - Found photoURL:", user.photoURL);

          try {
            // Just add a cache-busting parameter and use the URL directly
            const url = new URL(user.photoURL);
            url.searchParams.set("t", Date.now().toString());
            setAvatar(url.toString());
          } catch (error) {
            console.log("Profile - Invalid URL format:", user.photoURL, error);
            // Even if URL format is invalid, still use the photoURL as-is
            setAvatar(user.photoURL);
          }
        } else {
          console.log("Profile - No photoURL found for user");
          setAvatar("");
        }

        const userDocRef = doc(db, `users/${user.uid}`);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          const userDataObj = {
            cat_business: data.cat_business || false,
            cat_tech: data.cat_tech || false,
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
  }, [user, router]);

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

        console.log("Profile - Uploaded new avatar:", avatarUrl);

        // Update the profile
        await updateProfile(user, {
          photoURL: avatarUrl,
        });

        console.log("Profile - Updated user profile with new photoURL");

        // Add cache-busting parameter and update local state
        const urlWithCacheBuster = new URL(avatarUrl);
        urlWithCacheBuster.searchParams.set("t", Date.now().toString());
        setAvatar(urlWithCacheBuster.toString());

        setSuccessMessage("Profile picture updated successfully!");

        // Clear file input
        e.target.value = "";
      } catch (error) {
        console.error("Profile - Error uploading avatar:", error);
        setError("Failed to upload image. Please try again.");
        e.target.value = "";
      } finally {
        setIsLoading(false);
      }
    }
  };

  const deleteAvatar = async () => {
    if (!user || !avatar) return;

    try {
      setError("");
      setSuccessMessage(null);
      setIsLoading(true);

      // Delete from storage
      const locationRef = ref(storage, `avatars/user_${user.uid}`);
      await deleteObject(locationRef);

      console.log("Profile - Deleted avatar from storage");

      // Update the profile to remove photoURL
      await updateProfile(user, {
        photoURL: "",
      });

      console.log("Profile - Updated user profile to remove photoURL");

      // Update local state
      setAvatar("");
      setSuccessMessage("Profile picture deleted successfully!");
    } catch (error) {
      console.error("Profile - Error deleting avatar:", error);
      if (
        error instanceof Error &&
        error.message.includes("object-not-found")
      ) {
        // If the file doesn't exist in storage, still update the profile
        try {
          await updateProfile(user, {
            photoURL: "",
          });
          setAvatar("");
          setSuccessMessage("Profile picture removed successfully!");
        } catch (updateError) {
          console.error(
            "Profile - Error updating profile after delete:",
            updateError
          );
          setError("Failed to remove profile picture. Please try again.");
        }
      } else {
        setError("Failed to delete profile picture. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("User signed out successfully");
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
      setError("Failed to sign out. Please try again.");
    }
  };

  const navigateToArticle = (articleId: string) => {
    router.push(`/blog/${articleId}`);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayName(e.target.value);
  };

  const saveDisplayName = async () => {
    if (!user) return;

    try {
      await updateProfile(user, {
        displayName: displayName,
      });
      setIsEditingName(false);
      setSuccessMessage("Display name updated successfully!");
    } catch (error) {
      console.error("Error updating display name:", error);
      setError("Failed to update display name. Please try again.");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      saveDisplayName();
    }
  };

  const handleCancelSubscription = async () => {
    if (!user || !subscriptionData.billingKey) {
      setError("구독 정보를 찾을 수 없습니다.");
      return;
    }

    setCancelInProgress(true);
    setError("");

    try {
      // Call the cancel subscription function
      const cancelSubscription = httpsCallable(functions, "cancelSubscription");
      const result = await cancelSubscription({
        userId: user.uid,
        billingKey: subscriptionData.billingKey,
      });

      console.log("Subscription cancellation result:", result.data);

      if (result.data && (result.data as any).success) {
        // Update local state
        setSubscriptionData((prev) => ({
          ...prev,
          status: "canceled",
          cancelledDate: new Date(),
        }));

        // Update user data in Firestore
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
          hasActiveSubscription: false,
          subscriptionEndDate: new Date(),
        });

        setSuccessMessage("구독이 성공적으로 해지되었습니다.");
        setShowCancelDialog(false);
      } else {
        throw new Error(
          (result.data as any)?.message || "구독 해지에 실패했습니다."
        );
      }
    } catch (error) {
      console.error("Error canceling subscription:", error);
      setError(
        error instanceof Error
          ? error.message
          : "구독 해지 중 오류가 발생했습니다. 고객 서비스에 문의해주세요."
      );
    } finally {
      setCancelInProgress(false);
    }
  };

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
                  <AvatarImg
                    src={avatar}
                    alt="Profile"
                    onError={(e) => {
                      // If image fails to load, fall back to default
                      const target = e.target as HTMLImageElement;
                      target.onerror = null; // Prevent infinite error loop
                      target.src = defaultUserImage;
                      console.log(
                        "Profile - Image failed to load, using default"
                      );
                      // Don't update avatar state - keep the URL even if it doesn't load
                    }}
                  />
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
          <StatusBadge active={subscriptionData.status === "active"}>
            {subscriptionData.status === "active"
              ? "상태: 이용 중"
              : "상태: 비활성화"}
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
            <InfoLabel>최근 결제일</InfoLabel>
            <InfoValue>{formatDate(subscriptionData.startDate)}</InfoValue>
          </InfoRow>

          <InfoRow>
            <InfoLabel>다음 결제일</InfoLabel>
            <InfoValue>
              {subscriptionData.status === "active"
                ? formatDate(subscriptionData.nextBillingDate)
                : "-"}
            </InfoValue>
          </InfoRow>

          <div
            style={{
              marginTop: "1.5rem",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            {subscriptionData.status === "active" && (
              <CancelLinkButton onClick={() => setShowCancelDialog(true)}>
                멤버십 해지하기
              </CancelLinkButton>
            )}

            {subscriptionData.status === "canceled" && (
              <SubscribeAgainButton onClick={() => router.push("/payment")}>
                멤버십 시작하기
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
                {cancelInProgress ? "처리 중..." : "해지하기"}
              </DangerButton>
            </ButtonGroup>
          </ConfirmationDialog>
        </ConfirmationOverlay>
      )}
    </Wrapper>
  );
}
