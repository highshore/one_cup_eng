"use client";

import { styled } from "styled-components";
import { auth, storage, db, functions } from "../lib/firebase/firebase";
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
import GlobalLoadingScreen from "../lib/components/GlobalLoadingScreen";
import { saveFeedback } from "../lib/services/feedback_service";

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

// Responsive wrapper for main sections
const MainSectionsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;

  @media (min-width: 768px) {
    flex-direction: row;
    gap: 20px;

    > * {
      flex: 1;
    }
  }
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

const InfoValueWithIcon = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #f8f9fa;
  }

  .username-text {
    font-size: 0.9rem;
    font-weight: 500;
    font-family: inherit;
  }
`;

const PencilIcon = styled.svg`
  width: 14px;
  height: 14px;
  color: #666;
  transition: color 0.2s ease;

  ${InfoValueWithIcon}:hover & {
    color: #2c1810;
  }
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
  nextBillingDate?: Date | null;
  cancelledDate?: Date;
  paymentMethod?: string;
  billingKey?: string;
  billingCancelled?: boolean;
}

interface UserData {
  last_received: Date;
  received_articles: string[];
  saved_words: string[];
  createdAt: Date;
  hasActiveSubscription?: boolean;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  billingKey?: string;
  paymentMethod?: string;
  billingCancelled?: boolean;
  account_status?: string;
  gdg_member?: boolean;
}

const defaultUserImage = "/images/default_user.jpg"; // Using public folder

// Survey options
const cancellationReasons = [
  "모임 시간이 저와 맞지 않았어요",
  "모임 장소가 불편했어요",
  "기대했던 만큼의 가치를 느끼지 못했어요",
  "좀 더 체계적인 학습을 원했어요",
  "혼자 공부하는 걸 더 선호해요",
  "개인 사정으로 참여가 어려워졌어요",
  "단기 목표를 달성했어요",
  "가격이 지속적으로 부담되었어요",
  "모임 분위기나 멤버 구성과 잘 맞지 않았어요",
];

const refundReasons = [
  "결제 후 마음이 바뀌었어요 (단순 변심)",
  "결제/이용 과정에서 문제가 있었어요",
  "모임 시간이 저와 맞지 않았어요",
  "모임 장소가 불편했어요",
  "기대했던 만큼의 가치를 느끼지 못했어요",
  "좀 더 체계적인 학습을 원했어요",
  "혼자 공부하는 걸 더 선호해요",
  "개인 사정으로 참여가 어려워졌어요",
  "단기 목표를 달성했어요",
  "가격이 지속적으로 부담되었어요",
  "모임 분위기나 멤버 구성과 잘 맞지 않았어요",
];

// Add new styled components for the updated cancellation flow
const CancellationOptionsDialog = styled.div`
  background: white;
  padding: 2.5rem;
  border-radius: 20px;
  max-width: 480px;
  width: 90%;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
`;

const OptionButton = styled.button`
  width: 100%;
  padding: 1.25rem 1.5rem;
  margin: 0.75rem 0;
  border: 1px solid #e8eaed;
  border-radius: 12px;
  background: #fafbfc;
  color: #333;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  position: relative;

  &:hover {
    border-color: #2c1810;
    background: #f8f9fa;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(44, 24, 16, 0.1);
  }

  &:active {
    transform: translateY(0);
  }

  .option-title {
    display: block;
    font-weight: 600;
    margin-bottom: 0.4rem;
    color: #1f2937;
    font-size: 1rem;
  }

  .option-description {
    display: block;
    font-size: 0.85rem;
    color: #6b7280;
    line-height: 1.5;
    font-weight: 400;
  }
`;

const RefundOptionButton = styled(OptionButton)`
  border-color: #f3f4f6;
  background: #f9fafb;

  &:hover {
    border-color: #d1d5db;
    background: #f3f4f6;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  }

  .option-title {
    color: #6b7280;
    font-weight: 500;
    font-size: 0.9rem;
  }

  .option-description {
    color: #9ca3af;
    font-size: 0.8rem;
  }
`;

// Survey Dialog Components
const SurveyDialog = styled.div`
  background: white;
  padding: 2.5rem;
  border-radius: 20px;
  max-width: 520px;
  width: 90%;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
  max-height: 80vh;
  overflow-y: auto;
`;

const SurveyQuestion = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1.5rem;
  line-height: 1.5;
`;

const SurveyOptions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
`;

const SurveyOption = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 0.9rem;
  line-height: 1.4;

  &:hover {
    background-color: #f8f9fa;
  }

  input[type="checkbox"] {
    margin: 0;
    transform: scale(1.1);
  }
`;

const OtherReasonInput = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9rem;
  resize: vertical;
  font-family: inherit;
  margin-top: 0.5rem;

  &:focus {
    outline: none;
    border-color: #2c1810;
    box-shadow: 0 0 0 3px rgba(44, 24, 16, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const SurveyButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 2rem;
`;

const SurveySubmitButton = styled.button`
  background-color: #2c1810;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background-color: #4a2d1d;
    transform: translateY(-1px);
  }

  &:disabled {
    background-color: #9ca3af;
    cursor: not-allowed;
    transform: none;
  }
`;

const SurveyCancelButton = styled.button`
  background-color: #f3f4f6;
  color: #6b7280;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: #e5e7eb;
    color: #374151;
  }
`;

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
  const [showCancellationOptions, setShowCancellationOptions] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [cancelInProgress, setCancelInProgress] = useState(false);
  const [stopBillingInProgress, setStopBillingInProgress] = useState(false);

  // Survey states
  const [showCancellationSurvey, setShowCancellationSurvey] = useState(false);
  const [showRefundSurvey, setShowRefundSurvey] = useState(false);
  const [cancellationSurveyReasons, setCancellationSurveyReasons] = useState<
    string[]
  >([]);
  const [refundSurveyReasons, setRefundSurveyReasons] = useState<string[]>([]);
  const [cancellationOtherReason, setCancellationOtherReason] = useState("");
  const [refundOtherReason, setRefundOtherReason] = useState("");
  const [surveyInProgress, setSurveyInProgress] = useState(false);
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
            last_received: data.last_received?.toDate() || new Date(0),
            received_articles: data.received_articles || [],
            saved_words: data.saved_words || [],
            createdAt: data.createdAt?.toDate() || new Date(),
            hasActiveSubscription: data.hasActiveSubscription || false,
            subscriptionStartDate: data.subscriptionStartDate?.toDate(),
            subscriptionEndDate: data.subscriptionEndDate?.toDate(),
            billingKey: data.billingKey,
            paymentMethod: data.paymentMethod,
            billingCancelled: data.billingCancelled || false,
            account_status: data.account_status,
            gdg_member: data.gdg_member || false,
          };

          setUserData(userDataObj);

          // Set subscription data
          const subData: SubscriptionData = {
            status: userDataObj.hasActiveSubscription ? "active" : "canceled",
            startDate: userDataObj.subscriptionStartDate,
            cancelledDate: userDataObj.subscriptionEndDate,
            paymentMethod: userDataObj.paymentMethod || "카드",
            billingKey: userDataObj.billingKey,
            billingCancelled: userDataObj.billingCancelled || false,
          };

          // Calculate next billing date (one month from start date) only if billing is not cancelled
          if (
            subData.startDate &&
            subData.status === "active" &&
            !subData.billingCancelled
          ) {
            const nextBillingDate = new Date(subData.startDate);
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
            subData.nextBillingDate = nextBillingDate;
          } else {
            subData.nextBillingDate = null;
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
      setIsLoading(true);

      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: displayName,
      });

      // Update Firestore users collection
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        displayName: displayName,
        updatedAt: new Date(),
      });

      setIsEditingName(false);
      setSuccessMessage("유저명이 성공적으로 변경되었습니다!");
    } catch (error) {
      console.error("Error updating display name:", error);
      setError("유저명 변경에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      saveDisplayName();
    }
  };

  const handleStopNextBilling = async () => {
    // Show survey first
    setShowCancellationOptions(false);
    setShowCancellationSurvey(true);
  };

  const submitCancellationSurvey = async () => {
    if (!user) {
      setError("사용자 정보를 찾을 수 없습니다.");
      return;
    }

    setSurveyInProgress(true);
    setError("");

    try {
      // Save survey data first
      await saveFeedback(
        "cancellation",
        cancellationSurveyReasons,
        cancellationOtherReason
      );

      // Call the stop next billing function
      const stopNextBilling = httpsCallable(functions, "stopNextBilling");
      const result = await stopNextBilling({
        reason: "User requested stop billing",
      });

      console.log("Stop billing result:", result.data);

      if (result.data && (result.data as any).success) {
        // Update local state - subscription is still active but billing is cancelled
        setSubscriptionData((prev) => ({
          ...prev,
          status: "active", // Keep as active since user retains membership
          billingCancelled: true, // Billing is cancelled but key is preserved
          nextBillingDate: null, // No next billing date since billing is cancelled
        }));

        setSuccessMessage((result.data as any).message);
        setShowCancellationSurvey(false);

        // Reset survey data
        setCancellationSurveyReasons([]);
        setCancellationOtherReason("");
      } else {
        throw new Error(
          (result.data as any)?.message || "결제 중단에 실패했습니다."
        );
      }
    } catch (error) {
      console.error("Error stopping next billing:", error);
      setError(
        error instanceof Error
          ? error.message
          : "결제 중단 중 오류가 발생했습니다. 고객 서비스에 문의해주세요."
      );
    } finally {
      setSurveyInProgress(false);
    }
  };

  const handleReactivateBilling = async () => {
    if (!user) {
      setError("사용자 정보를 찾을 수 없습니다.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Update user data in Firestore to reactivate billing
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        billingCancelled: false, // Reactivate billing
        reactivatedAt: new Date(),
      });

      // Update local state and recalculate next billing date
      setSubscriptionData((prev) => {
        const nextBillingDate = prev.startDate
          ? (() => {
              const date = new Date(prev.startDate);
              date.setMonth(date.getMonth() + 1);
              return date;
            })()
          : null;

        return {
          ...prev,
          billingCancelled: false,
          nextBillingDate,
        };
      });

      setSuccessMessage(
        "결제가 성공적으로 재활성화되었습니다. 다음 결제일부터 정기결제가 재개됩니다."
      );
    } catch (error) {
      console.error("Error reactivating billing:", error);
      setError(
        error instanceof Error
          ? error.message
          : "결제 재활성화 중 오류가 발생했습니다. 고객 서비스에 문의해주세요."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    // Show survey first
    setShowRefundDialog(false);
    setShowRefundSurvey(true);
  };

  const submitRefundSurvey = async () => {
    if (!user || !subscriptionData.billingKey) {
      setError("구독 정보를 찾을 수 없습니다.");
      return;
    }

    setSurveyInProgress(true);
    setError("");

    try {
      // Save survey data first
      await saveFeedback("refund", refundSurveyReasons, refundOtherReason);

      // Call the cancel subscription function (original refund logic)
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

        setSuccessMessage("구독이 성공적으로 해지되고 환불 처리되었습니다.");
        setShowRefundSurvey(false);

        // Reset survey data
        setRefundSurveyReasons([]);
        setRefundOtherReason("");
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
      setSurveyInProgress(false);
    }
  };

  // Survey helper functions
  const handleCancellationReasonChange = (reason: string, checked: boolean) => {
    if (checked) {
      setCancellationSurveyReasons((prev) => [...prev, reason]);
    } else {
      setCancellationSurveyReasons((prev) => prev.filter((r) => r !== reason));
    }
  };

  const handleRefundReasonChange = (reason: string, checked: boolean) => {
    if (checked) {
      setRefundSurveyReasons((prev) => [...prev, reason]);
    } else {
      setRefundSurveyReasons((prev) => prev.filter((r) => r !== reason));
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return "-";
    return format(date, "yyyy년 MM월 dd일", { locale: ko });
  };

  if (loading) {
    return <GlobalLoadingScreen />;
  }

  return (
    <>
      {isLoading && <GlobalLoadingScreen size="small" />}
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

        <MainSectionsWrapper>
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
                        <CheckmarkIcon onClick={saveDisplayName}>
                          ✓
                        </CheckmarkIcon>
                      </NameEditContainer>
                    ) : (
                      <InfoValueWithIcon onClick={() => setIsEditingName(true)}>
                        <span className="username-text">
                          {user?.displayName
                            ? user.displayName
                            : "유저명을 정해주세요"}
                        </span>
                        <PencilIcon
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </PencilIcon>
                      </InfoValueWithIcon>
                    )}
                  </InfoRow>

                  <InfoRow>
                    <InfoLabel>휴대폰</InfoLabel>
                    <InfoValue>{user?.phoneNumber || "번호 없음"}</InfoValue>
                  </InfoRow>

                  <InfoRow>
                    <InfoLabel>가입일</InfoLabel>
                    <InfoValue>
                      {userData?.createdAt
                        ? formatDate(userData.createdAt)
                        : "-"}
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
              {userData?.account_status !== "admin" &&
                userData?.account_status === "leader" && (
                  <StatusBadge active>상태: 영어 한잔 리더</StatusBadge>
                )}
              {userData?.account_status !== "admin" && userData?.gdg_member && (
                <StatusBadge active>상태: GDG 멤버</StatusBadge>
              )}
              {((!userData?.gdg_member &&
                userData?.account_status !== "leader") ||
                userData?.account_status === "admin") && (
                <StatusBadge active={subscriptionData.status === "active"}>
                  {subscriptionData.status === "active"
                    ? subscriptionData.billingCancelled
                      ? "상태: 이용 중 (결제 중단됨)"
                      : "상태: 이용 중"
                    : "상태: 비활성화"}
                </StatusBadge>
              )}
            </SectionTitle>

            <SectionContent>
              <InfoRow>
                <InfoLabel>최근 결제일</InfoLabel>
                <InfoValue>
                  {userData?.account_status !== "admin" &&
                  (userData?.gdg_member ||
                    userData?.account_status === "leader")
                    ? "해당 없음"
                    : formatDate(subscriptionData.startDate)}
                </InfoValue>
              </InfoRow>

              <InfoRow>
                <InfoLabel>다음 결제일</InfoLabel>
                <InfoValue>
                  {userData?.account_status !== "admin" &&
                  (userData?.gdg_member ||
                    userData?.account_status === "leader")
                    ? "해당 없음"
                    : subscriptionData.status === "active" &&
                      !subscriptionData.billingCancelled &&
                      subscriptionData.nextBillingDate
                    ? formatDate(subscriptionData.nextBillingDate)
                    : subscriptionData.billingCancelled
                    ? "결제 중단됨"
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
                {!(
                  userData?.account_status !== "admin" &&
                  (userData?.gdg_member ||
                    userData?.account_status === "leader")
                ) &&
                  subscriptionData.status === "active" &&
                  !subscriptionData.billingCancelled && (
                    <CancelLinkButton
                      onClick={() => setShowCancellationOptions(true)}
                    >
                      멤버십 중지하기
                    </CancelLinkButton>
                  )}

                {subscriptionData.status === "active" &&
                  subscriptionData.billingCancelled && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.9rem",
                          color: "#666",
                          textAlign: "right",
                        }}
                      >
                        다음 결제가 중단되었습니다. 구독 기간 만료 시까지
                        서비스를 이용하실 수 있습니다.
                      </div>
                      <SubscribeAgainButton
                        onClick={() => handleReactivateBilling()}
                      >
                        결제 재활성화하기
                      </SubscribeAgainButton>
                    </div>
                  )}

                {subscriptionData.status === "canceled" && (
                  <SubscribeAgainButton onClick={() => router.push("/payment")}>
                    멤버십 시작하기
                  </SubscribeAgainButton>
                )}
              </div>
            </SectionContent>
          </SubscriptionInfo>
        </MainSectionsWrapper>

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
                      {article.date
                        ? formatDate(article.date)
                        : "날짜 정보 없음"}
                    </ArticleDate>
                  </ArticleItem>
                ))
              ) : (
                <div
                  style={{
                    padding: "1rem",
                    textAlign: "center",
                    color: "#888",
                  }}
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

        {/* Cancellation Options Dialog */}
        {showCancellationOptions && (
          <ConfirmationOverlay>
            <CancellationOptionsDialog>
              <SectionTitle
                style={{
                  fontSize: "1.3rem",
                  marginBottom: "0.5rem",
                  color: "#1f2937",
                }}
              >
                멤버십 중지 옵션
              </SectionTitle>
              <p
                style={{
                  marginBottom: "1.75rem",
                  color: "#6b7280",
                  lineHeight: "1.6",
                  fontSize: "0.95rem",
                  textAlign: "center",
                }}
              >
                어떤 방식으로 멤버십을 중지하시겠습니까?
              </p>

              <OptionButton
                onClick={handleStopNextBilling}
                disabled={stopBillingInProgress}
              >
                <span className="option-title">다음 결제 중단하기 (권장)</span>
                <span className="option-description">
                  현재 구독 기간까지는 서비스를 계속 이용하고, 다음 결제부터
                  중단됩니다. 환불은 없지만 남은 기간 동안 서비스를 모두 사용할
                  수 있습니다.
                </span>
              </OptionButton>

              <div
                style={{
                  margin: "1.75rem 0 0.75rem 0",
                  padding: "1.25rem 0 0 0",
                  borderTop: "1px solid #f3f4f6",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    marginBottom: "0.75rem",
                    fontSize: "0.8rem",
                    color: "#9ca3af",
                    fontWeight: "500",
                  }}
                >
                  또는
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#6b7280",
                    cursor: "pointer",
                    textDecoration: "underline",
                    lineHeight: "1.4",
                    transition: "color 0.2s ease",
                  }}
                  onClick={() => {
                    setShowCancellationOptions(false);
                    setShowRefundDialog(true);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#374151";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#6b7280";
                  }}
                >
                  결제 취소하고 환불받기
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#9ca3af",
                      marginTop: "0.25rem",
                      textDecoration: "none",
                    }}
                  >
                    (즉시 서비스 중단, 이용 기간에 따라 환불)
                  </div>
                </div>
              </div>

              <ButtonGroup style={{ marginTop: "1.5rem" }}>
                <CancelButton
                  onClick={() => setShowCancellationOptions(false)}
                  disabled={stopBillingInProgress}
                  style={{
                    background: "#f3f4f6",
                    color: "#6b7280",
                    border: "none",
                    borderRadius: "10px",
                    padding: "0.75rem 1.5rem",
                    fontSize: "0.95rem",
                    fontWeight: "500",
                  }}
                >
                  취소
                </CancelButton>
              </ButtonGroup>
            </CancellationOptionsDialog>
          </ConfirmationOverlay>
        )}

        {/* Refund Confirmation Dialog */}
        {showRefundDialog && (
          <ConfirmationOverlay>
            <ConfirmationDialog>
              <SectionTitle>환불 처리</SectionTitle>
              <p style={{ marginBottom: "1rem" }}>
                정말로 구독을 해지하고 환불받으시겠습니까?
              </p>
              <p style={{ marginBottom: "1rem", color: "#e74c3c" }}>
                해지 시 즉시 서비스 이용이 중단되며, 이용 기간에 따라 환불
                처리됩니다.
              </p>
              <ButtonGroup>
                <CancelButton
                  onClick={() => {
                    setShowRefundDialog(false);
                    setShowCancellationOptions(true);
                  }}
                  disabled={cancelInProgress}
                >
                  뒤로가기
                </CancelButton>
                <DangerButton
                  onClick={handleCancelSubscription}
                  disabled={cancelInProgress}
                >
                  {cancelInProgress ? "처리 중..." : "환불 처리하기"}
                </DangerButton>
              </ButtonGroup>
            </ConfirmationDialog>
          </ConfirmationOverlay>
        )}

        {/* Cancellation Survey Dialog */}
        {showCancellationSurvey && (
          <ConfirmationOverlay>
            <SurveyDialog>
              <SurveyQuestion>
                서비스를 해지하신 이유가 무엇인가요? (해당되는 항목을 모두
                선택해 주세요.)
              </SurveyQuestion>

              <SurveyOptions>
                {cancellationReasons.map((reason, index) => (
                  <SurveyOption key={index}>
                    <input
                      type="checkbox"
                      checked={cancellationSurveyReasons.includes(reason)}
                      onChange={(e) =>
                        handleCancellationReasonChange(reason, e.target.checked)
                      }
                    />
                    <span>{reason}</span>
                  </SurveyOption>
                ))}

                <SurveyOption>
                  <input
                    type="checkbox"
                    checked={cancellationOtherReason !== ""}
                    onChange={(e) => {
                      if (!e.target.checked) {
                        setCancellationOtherReason("");
                      }
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <span>기타 (자유롭게 작성해 주세요):</span>
                    <OtherReasonInput
                      value={cancellationOtherReason}
                      onChange={(e) =>
                        setCancellationOtherReason(e.target.value)
                      }
                      placeholder="기타 사유를 입력해주세요..."
                    />
                  </div>
                </SurveyOption>
              </SurveyOptions>

              <SurveyButtonGroup>
                <SurveyCancelButton
                  onClick={() => {
                    setShowCancellationSurvey(false);
                    setShowCancellationOptions(true);
                    setCancellationSurveyReasons([]);
                    setCancellationOtherReason("");
                  }}
                  disabled={surveyInProgress}
                >
                  뒤로가기
                </SurveyCancelButton>
                <SurveySubmitButton
                  onClick={submitCancellationSurvey}
                  disabled={
                    surveyInProgress ||
                    (cancellationSurveyReasons.length === 0 &&
                      cancellationOtherReason.trim() === "")
                  }
                >
                  {surveyInProgress ? "처리 중..." : "다음 결제 중단하기"}
                </SurveySubmitButton>
              </SurveyButtonGroup>
            </SurveyDialog>
          </ConfirmationOverlay>
        )}

        {/* Refund Survey Dialog */}
        {showRefundSurvey && (
          <ConfirmationOverlay>
            <SurveyDialog>
              <SurveyQuestion>
                환불을 요청하신 이유가 무엇인가요? (해당되는 항목을 모두 선택해
                주세요.)
              </SurveyQuestion>

              <SurveyOptions>
                {refundReasons.map((reason, index) => (
                  <SurveyOption key={index}>
                    <input
                      type="checkbox"
                      checked={refundSurveyReasons.includes(reason)}
                      onChange={(e) =>
                        handleRefundReasonChange(reason, e.target.checked)
                      }
                    />
                    <span>{reason}</span>
                  </SurveyOption>
                ))}

                <SurveyOption>
                  <input
                    type="checkbox"
                    checked={refundOtherReason !== ""}
                    onChange={(e) => {
                      if (!e.target.checked) {
                        setRefundOtherReason("");
                      }
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <span>기타 (자유롭게 작성해 주세요):</span>
                    <OtherReasonInput
                      value={refundOtherReason}
                      onChange={(e) => setRefundOtherReason(e.target.value)}
                      placeholder="기타 사유를 입력해주세요..."
                    />
                  </div>
                </SurveyOption>
              </SurveyOptions>

              <SurveyButtonGroup>
                <SurveyCancelButton
                  onClick={() => {
                    setShowRefundSurvey(false);
                    setShowRefundDialog(true);
                    setRefundSurveyReasons([]);
                    setRefundOtherReason("");
                  }}
                  disabled={surveyInProgress}
                >
                  뒤로가기
                </SurveyCancelButton>
                <SurveySubmitButton
                  onClick={submitRefundSurvey}
                  disabled={
                    surveyInProgress ||
                    (refundSurveyReasons.length === 0 &&
                      refundOtherReason.trim() === "")
                  }
                >
                  {surveyInProgress ? "처리 중..." : "환불 처리하기"}
                </SurveySubmitButton>
              </SurveyButtonGroup>
            </SurveyDialog>
          </ConfirmationOverlay>
        )}
      </Wrapper>
    </>
  );
}
