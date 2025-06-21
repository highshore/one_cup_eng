"use client";

import { useState, useEffect } from "react";
import styled from "styled-components";
import { auth, db } from "../lib/firebase/firebase";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  orderBy,
  Timestamp,
  where,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale/ko";

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  gap: 30px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
`;

const RefreshButton = styled.button`
  background-color: #2c1810;
  color: white;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background-color: #4a2d1d;
    transform: translateY(-1px);
  }

  &:disabled {
    background-color: #9ca3af;
    cursor: not-allowed;
    transform: none;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const StatCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
`;

const StatNumber = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 8px;
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatSubtext = styled.div`
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 2px solid #e5e7eb;
  margin-bottom: 20px;
`;

const Tab = styled.button<{ active: boolean }>`
  padding: 12px 24px;
  background: none;
  border: none;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  color: ${(props) => (props.active ? "#2c1810" : "#6b7280")};
  border-bottom: 3px solid
    ${(props) => (props.active ? "#2c1810" : "transparent")};
  transition: all 0.2s ease;

  &:hover {
    color: #2c1810;
    background-color: #f9fafb;
  }
`;

const ContentSection = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
`;

const SectionTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 20px;
`;

const UsersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const UserCard = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background-color: #f9fafb;
    border-color: #d1d5db;
  }
`;

const UserInfo = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: 2fr 2fr 1fr 1fr 1fr;
  gap: 16px;
  align-items: center;
`;

const UserName = styled.div`
  font-weight: 600;
  color: #1f2937;
  font-size: 14px;
`;

const UserEmail = styled.div`
  color: #6b7280;
  font-size: 13px;
`;

const UserStatus = styled.div<{ active: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background-color: ${(props) => (props.active ? "#dcfce7" : "#fee2e2")};
  color: ${(props) => (props.active ? "#166534" : "#dc2626")};
`;

const UserDate = styled.div`
  color: #6b7280;
  font-size: 12px;
`;

const FeedbackList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FeedbackCard = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #d1d5db;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
`;

const FeedbackHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
`;

const FeedbackCategory = styled.div<{ category: string }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background-color: ${(props) =>
    props.category === "cancellation" ? "#fef3c7" : "#dbeafe"};
  color: ${(props) =>
    props.category === "cancellation" ? "#92400e" : "#1e40af"};
`;

const FeedbackDate = styled.div`
  color: #6b7280;
  font-size: 12px;
`;

const FeedbackUser = styled.div`
  color: #374151;
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 8px;
`;

const FeedbackReasons = styled.div`
  margin-bottom: 12px;
`;

const ReasonsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 8px 0;
`;

const ReasonItem = styled.li`
  padding: 4px 0;
  color: #4b5563;
  font-size: 14px;

  &:before {
    content: "•";
    color: #9ca3af;
    margin-right: 8px;
  }
`;

const FeedbackOther = styled.div`
  background-color: #f9fafb;
  border-left: 3px solid #e5e7eb;
  padding: 12px;
  margin-top: 8px;
  border-radius: 4px;
  font-style: italic;
  color: #4b5563;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  color: #6b7280;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  color: #6b7280;
`;

// Interfaces
interface UserData {
  id: string;
  email?: string;
  displayName?: string;
  createdAt?: Timestamp;
  hasActiveSubscription?: boolean;
  billingCancelled?: boolean;
  subscriptionStartDate?: Timestamp;
  subscriptionEndDate?: Timestamp;
  account_status?: string;
}

interface FeedbackData {
  id: string;
  userId: string;
  category: "cancellation" | "refund";
  reasons: string[];
  otherReason?: string;
  timestamp: Timestamp;
}

interface DashboardStats {
  totalMembers: number;
  activeSubscriptions: number;
  cancelledBilling: number;
  newMembersThisMonth: number;
}

export default function AdminClient() {
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "members" | "feedback"
  >("dashboard");
  const [users, setUsers] = useState<UserData[]>([]);
  const [feedback, setFeedback] = useState<FeedbackData[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeSubscriptions: 0,
    cancelledBilling: 0,
    newMembersThisMonth: 0,
  });
  const router = useRouter();

  useEffect(() => {
    const checkAdminAccess = async () => {
      console.log("Admin access check starting...");

      // Wait for Firebase Auth to initialize
      const user = auth.currentUser;
      if (!user) {
        console.log("No user found, redirecting to auth");
        router.push("/auth");
        return;
      }

      console.log("User found:", user.email, "UID:", user.uid);

      try {
        // Check user's account_status in Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          console.log("User document does not exist in Firestore");
          router.push("/");
          return;
        }

        const userData = userDoc.data();
        console.log("User data from Firestore:", userData);
        console.log("Account status:", userData.account_status);

        if (userData.account_status !== "admin") {
          console.log("User is not admin, redirecting to home");
          router.push("/");
          return;
        }

        console.log("User is admin, loading dashboard data");
        setAuthChecking(false);
        // User is admin, load dashboard data
        loadDashboardData();
      } catch (error) {
        console.error("Error checking admin access:", error);
        router.push("/");
      }
    };

    // Add a small delay to ensure Firebase Auth is ready
    const timer = setTimeout(() => {
      checkAdminAccess();
    }, 1000);

    return () => clearTimeout(timer);
  }, [router]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchUsers(), fetchFeedback()]);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const usersQuery = query(
        collection(db, "users"),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(usersQuery);

      const usersData: UserData[] = [];
      snapshot.forEach((doc) => {
        usersData.push({
          id: doc.id,
          ...doc.data(),
        } as UserData);
      });

      setUsers(usersData);
      calculateStats(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchFeedback = async () => {
    try {
      const feedbackQuery = query(
        collection(db, "feedback"),
        orderBy("timestamp", "desc")
      );
      const snapshot = await getDocs(feedbackQuery);

      const feedbackData: FeedbackData[] = [];
      snapshot.forEach((doc) => {
        feedbackData.push({
          id: doc.id,
          ...doc.data(),
        } as FeedbackData);
      });

      setFeedback(feedbackData);
    } catch (error) {
      console.error("Error fetching feedback:", error);
    }
  };

  const calculateStats = (usersData: UserData[]) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const newStats: DashboardStats = {
      totalMembers: usersData.length,
      activeSubscriptions: usersData.filter((u) => u.hasActiveSubscription)
        .length,
      cancelledBilling: usersData.filter((u) => u.billingCancelled).length,
      newMembersThisMonth: usersData.filter(
        (u) => u.createdAt && u.createdAt.toDate() >= startOfMonth
      ).length,
    };

    setStats(newStats);
  };

  const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp) return "-";
    return format(timestamp.toDate(), "yyyy.MM.dd", { locale: ko });
  };

  const formatDateTime = (timestamp?: Timestamp) => {
    if (!timestamp) return "-";
    return format(timestamp.toDate(), "yyyy.MM.dd HH:mm", { locale: ko });
  };

  const renderDashboard = () => (
    <>
      <StatsGrid>
        <StatCard>
          <StatNumber>{stats.totalMembers}</StatNumber>
          <StatLabel>Total Members</StatLabel>
          <StatSubtext>All registered users</StatSubtext>
        </StatCard>

        <StatCard>
          <StatNumber>{stats.activeSubscriptions}</StatNumber>
          <StatLabel>Active Subscriptions</StatLabel>
          <StatSubtext>Currently subscribed members</StatSubtext>
        </StatCard>

        <StatCard>
          <StatNumber>{stats.cancelledBilling}</StatNumber>
          <StatLabel>Cancelled Billing</StatLabel>
          <StatSubtext>Members who stopped billing</StatSubtext>
        </StatCard>

        <StatCard>
          <StatNumber>{stats.newMembersThisMonth}</StatNumber>
          <StatLabel>New This Month</StatLabel>
          <StatSubtext>New members this month</StatSubtext>
        </StatCard>
      </StatsGrid>
    </>
  );

  const renderMembers = () => (
    <ContentSection>
      <SectionTitle>Member Management ({users.length} members)</SectionTitle>
      <UsersList>
        {users.map((user) => (
          <UserCard key={user.id}>
            <UserInfo>
              <div>
                <UserName>{user.displayName || "No Name"}</UserName>
                <UserEmail>{user.email}</UserEmail>
              </div>

              <div>{/* Categories section removed as deprecated */}</div>

              <UserStatus active={!!user.hasActiveSubscription}>
                {user.hasActiveSubscription ? "Active" : "Inactive"}
              </UserStatus>

              <div>
                {user.billingCancelled && (
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#dc2626",
                      fontWeight: "500",
                    }}
                  >
                    Billing Stopped
                  </div>
                )}
              </div>

              <UserDate>{formatDate(user.createdAt)}</UserDate>
            </UserInfo>
          </UserCard>
        ))}
      </UsersList>
    </ContentSection>
  );

  const renderFeedback = () => (
    <ContentSection>
      <SectionTitle>User Feedback ({feedback.length} items)</SectionTitle>
      <FeedbackList>
        {feedback.length === 0 ? (
          <EmptyState>No feedback yet.</EmptyState>
        ) : (
          feedback.map((item) => (
            <FeedbackCard key={item.id}>
              <FeedbackHeader>
                <FeedbackCategory category={item.category}>
                  {item.category === "cancellation"
                    ? "Subscription Stop"
                    : "Refund Request"}
                </FeedbackCategory>
                <FeedbackDate>{formatDateTime(item.timestamp)}</FeedbackDate>
              </FeedbackHeader>

              <FeedbackUser>User ID: {item.userId}</FeedbackUser>

              <FeedbackReasons>
                <strong>Selected Reasons:</strong>
                <ReasonsList>
                  {item.reasons.map((reason, index) => (
                    <ReasonItem key={index}>{reason}</ReasonItem>
                  ))}
                </ReasonsList>
              </FeedbackReasons>

              {item.otherReason && (
                <FeedbackOther>
                  <strong>Additional Comments:</strong>
                  <br />
                  {item.otherReason}
                </FeedbackOther>
              )}
            </FeedbackCard>
          ))
        )}
      </FeedbackList>
    </ContentSection>
  );

  if (authChecking) {
    return (
      <Wrapper>
        <LoadingSpinner>Checking admin privileges...</LoadingSpinner>
      </Wrapper>
    );
  }

  if (loading) {
    return (
      <Wrapper>
        <LoadingSpinner>Loading data...</LoadingSpinner>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <Header>
        <Title>Admin Dashboard</Title>
        <RefreshButton onClick={loadDashboardData}>Refresh</RefreshButton>
      </Header>

      <TabContainer>
        <Tab
          active={activeTab === "dashboard"}
          onClick={() => setActiveTab("dashboard")}
        >
          Dashboard
        </Tab>
        <Tab
          active={activeTab === "members"}
          onClick={() => setActiveTab("members")}
        >
          Members
        </Tab>
        <Tab
          active={activeTab === "feedback"}
          onClick={() => setActiveTab("feedback")}
        >
          Feedback
        </Tab>
      </TabContainer>

      {activeTab === "dashboard" && renderDashboard()}
      {activeTab === "members" && renderMembers()}
      {activeTab === "feedback" && renderFeedback()}
    </Wrapper>
  );
}
