import styled from "styled-components";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../shared/contexts/auth_context";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../../firebase";

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

const CommunityContainer = styled.div`
  max-width: 850px;
  width: 100%;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  min-height: 70vh;
  font-family: "Avenir", "Avenir Next", -apple-system, BlinkMacSystemFont,
    "Segoe UI", "Roboto", "Oxygen", "Ubuntu", sans-serif;

  @media (max-width: 768px) {
    padding: 1.5rem 1rem;
  }
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  color: ${colors.text.dark};
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    font-size: 1.8rem;
  }
`;

const Description = styled.p`
  color: ${colors.text.medium};
  font-size: 1rem;
  line-height: 1.6;
`;

const ForumSection = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  color: ${colors.text.dark};
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid ${colors.primaryPale};
`;

const TopicList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const TopicCard = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1.25rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
`;

const TopicHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const TopicTitle = styled(Link)`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${colors.text.dark};
  text-decoration: none;

  &:hover {
    color: ${colors.accent};
  }
`;

const TopicMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  color: ${colors.text.light};
  font-size: 0.85rem;
`;

const TopicAuthor = styled.span`
  color: ${colors.text.medium};
`;

const TopicExcerpt = styled.p`
  color: ${colors.text.medium};
  font-size: 0.95rem;
  line-height: 1.5;
  margin-top: 0.5rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const Stats = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 0.75rem;
`;

const Stat = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: ${colors.text.light};
  font-size: 0.85rem;
`;

const ActionButton = styled.button`
  background-color: ${colors.accent};
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${colors.primaryLight};
  }

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 1.5rem;
  gap: 1rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${colors.text.light};
`;

const LoginPrompt = styled.div`
  background-color: ${colors.primaryPale};
  padding: 1.25rem;
  border-radius: 8px;
  margin-top: 2rem;
  line-height: 1.5;
  text-align: center;
`;

const LoginLink = styled(Link)`
  color: ${colors.primaryDark};
  font-weight: 600;
  text-decoration: underline;

  &:hover {
    color: ${colors.accent};
  }
`;

const AnnouncementSection = styled.div`
  margin-bottom: 2rem;
`;

const AnnouncementCard = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1.25rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  margin-bottom: 1rem;
  border-left: 4px solid ${colors.accent};
`;

const AnnouncementTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${colors.text.dark};
  margin-bottom: 0.5rem;
`;

const AnnouncementContent = styled.div`
  color: ${colors.text.medium};
  font-size: 0.95rem;
  line-height: 1.5;
  margin-bottom: 1rem;
  white-space: pre-wrap;
`;

const AnnouncementDate = styled.div`
  font-size: 0.85rem;
  color: ${colors.text.light};
  text-align: right;
`;

const AnnouncementActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const IconButton = styled.button`
  background: none;
  border: none;
  color: ${colors.text.medium};
  cursor: pointer;
  padding: 0.25rem;
  font-size: 0.9rem;

  &:hover {
    color: ${colors.accent};
  }
`;

const DeleteIconButton = styled(IconButton)`
  &:hover {
    color: #d32f2f;
  }
`;

const AddAnnouncementForm = styled.form`
  background: white;
  border-radius: 8px;
  padding: 1.25rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  margin-top: 1rem;
`;

const AnnouncementInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 1rem;
  font-family: inherit;
  margin-bottom: 1rem;

  &:focus {
    outline: none;
    border-color: ${colors.accent};
    box-shadow: 0 0 0 2px rgba(200, 162, 122, 0.2);
  }
`;

const AnnouncementTextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 1rem;

  &:focus {
    outline: none;
    border-color: ${colors.accent};
    box-shadow: 0 0 0 2px rgba(200, 162, 122, 0.2);
  }
`;

const SubmitButton = styled.button`
  background-color: ${colors.accent};
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${colors.primaryLight};
  }

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const CancelButton = styled.button`
  background-color: transparent;
  color: ${colors.text.medium};
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${colors.primaryPale};
  }
`;

// Add a new styled component for the admin button
const AdminButton = styled.button`
  background-color: ${colors.primary};
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background-color: ${colors.primaryLight};
  }
`;

interface Topic {
  id: string;
  title: string;
  author: string;
  authorId: string;
  content: string;
  createdAt: Date;
  replies: number;
  views: number;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
}

const Community = () => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [announcementLoading, setAnnouncementLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState("");
  const [newAnnouncementContent, setNewAnnouncementContent] = useState("");
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<
    string | null
  >(null);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const topicsQuery = query(
          collection(db, "communityTopics"),
          orderBy("createdAt", "desc"),
          limit(10)
        );

        const snapshot = await getDocs(topicsQuery);
        const topicsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        })) as Topic[];

        setTopics(topicsList);
      } catch (error) {
        console.error("토픽 불러오기 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchAnnouncements = async () => {
      try {
        const announcementsQuery = query(
          collection(db, "communityAnnouncements"),
          orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(announcementsQuery);
        const announcementsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        })) as Announcement[];

        setAnnouncements(announcementsList);
      } catch (error) {
        console.error("공지사항 불러오기 오류:", error);
      } finally {
        setAnnouncementLoading(false);
      }
    };

    // Update the admin check with the correctly formatted numbers
    if (currentUser) {
      const phoneNumber = currentUser.phoneNumber;
      console.log("Current user phone number:", phoneNumber); // For debugging
      if (
        phoneNumber === "+821068584123" ||
        phoneNumber === "01068584123" ||
        phoneNumber === "+8201068584123"
      ) {
        setIsAdmin(true);
      }
    }

    fetchTopics();
    fetchAnnouncements();
  }, [currentUser]);

  const handleNewTopic = () => {
    navigate("/community/new-topic");
  };

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) return;

    if (!newAnnouncementTitle.trim() || !newAnnouncementContent.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    try {
      const announcementId =
        editingAnnouncementId || `announcement_${Date.now()}`;
      const announcementData = {
        title: newAnnouncementTitle.trim(),
        content: newAnnouncementContent.trim(),
        createdAt: new Date(),
      };

      await setDoc(
        doc(db, "communityAnnouncements", announcementId),
        announcementData
      );

      // Update local state
      if (editingAnnouncementId) {
        setAnnouncements(
          announcements.map((announcement) =>
            announcement.id === editingAnnouncementId
              ? { ...announcement, ...announcementData }
              : announcement
          )
        );
        setEditingAnnouncementId(null);
      } else {
        setAnnouncements([
          { id: announcementId, ...announcementData },
          ...announcements,
        ]);
      }

      // Reset form
      setNewAnnouncementTitle("");
      setNewAnnouncementContent("");
    } catch (error) {
      console.error("공지사항 추가/수정 오류:", error);
      alert("공지사항 추가/수정에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setNewAnnouncementTitle(announcement.title);
    setNewAnnouncementContent(announcement.content);
    setEditingAnnouncementId(announcement.id);
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!isAdmin) return;

    if (window.confirm("정말로 이 공지사항을 삭제하시겠습니까?")) {
      try {
        await deleteDoc(doc(db, "communityAnnouncements", announcementId));

        // Update local state
        setAnnouncements(
          announcements.filter(
            (announcement) => announcement.id !== announcementId
          )
        );
      } catch (error) {
        console.error("공지사항 삭제 오류:", error);
        alert("공지사항 삭제에 실패했습니다. 다시 시도해주세요.");
      }
    }
  };

  const toggleAnnouncementForm = () => {
    setShowAnnouncementForm(!showAnnouncementForm);
    // Clear form fields when hiding the form
    if (showAnnouncementForm) {
      setNewAnnouncementTitle("");
      setNewAnnouncementContent("");
      setEditingAnnouncementId(null);
    }
  };

  return (
    <CommunityContainer>
      <Header>
        <Title>Community</Title>
        <Description>
          여러분의 피드백 및 경험을 공유하고, 질문하세요.
        </Description>
      </Header>

      <AnnouncementSection>
        <SectionTitle>공지사항</SectionTitle>

        {isAdmin && (
          <AdminButton onClick={toggleAnnouncementForm}>
            {showAnnouncementForm ? "✕ 취소하기" : "✏️ 새 공지사항 작성하기"}
          </AdminButton>
        )}

        {isAdmin && showAnnouncementForm && (
          <AddAnnouncementForm onSubmit={handleAddAnnouncement}>
            <AnnouncementInput
              type="text"
              value={newAnnouncementTitle}
              onChange={(e) => setNewAnnouncementTitle(e.target.value)}
              placeholder="공지사항 제목"
              required
            />
            <AnnouncementTextArea
              value={newAnnouncementContent}
              onChange={(e) => setNewAnnouncementContent(e.target.value)}
              placeholder="공지사항 내용"
              required
            />
            <ButtonContainer>
              {editingAnnouncementId && (
                <CancelButton
                  type="button"
                  onClick={() => {
                    setEditingAnnouncementId(null);
                    setNewAnnouncementTitle("");
                    setNewAnnouncementContent("");
                  }}
                >
                  취소
                </CancelButton>
              )}
              <SubmitButton type="submit">
                {editingAnnouncementId ? "공지사항 수정" : "공지사항 추가"}
              </SubmitButton>
            </ButtonContainer>
          </AddAnnouncementForm>
        )}

        {announcementLoading ? (
          <EmptyState>공지사항을 불러오는 중...</EmptyState>
        ) : announcements.length > 0 ? (
          <>
            {announcements.map((announcement) => (
              <AnnouncementCard key={announcement.id}>
                <AnnouncementTitle>{announcement.title}</AnnouncementTitle>
                <AnnouncementContent>
                  {announcement.content}
                </AnnouncementContent>
                <AnnouncementDate>
                  {new Date(announcement.createdAt).toLocaleDateString()}
                </AnnouncementDate>

                {isAdmin && (
                  <AnnouncementActions>
                    <IconButton
                      onClick={() => handleEditAnnouncement(announcement)}
                    >
                      ✏️ 수정
                    </IconButton>
                    <DeleteIconButton
                      onClick={() => handleDeleteAnnouncement(announcement.id)}
                    >
                      🗑️ 삭제
                    </DeleteIconButton>
                  </AnnouncementActions>
                )}
              </AnnouncementCard>
            ))}
          </>
        ) : (
          <EmptyState>공지사항이 없습니다.</EmptyState>
        )}
      </AnnouncementSection>

      <ForumSection>
        <SectionTitle>최근 게시글</SectionTitle>

        {loading ? (
          <EmptyState>게시글을 불러오는 중...</EmptyState>
        ) : topics.length > 0 ? (
          <TopicList>
            {topics.map((topic) => (
              <TopicCard key={topic.id}>
                <TopicHeader>
                  <TopicTitle to={`/community/topic/${topic.id}`}>
                    {topic.title}
                  </TopicTitle>
                  <TopicMeta>
                    <TopicAuthor>작성자: {topic.author}</TopicAuthor>
                    {topic.createdAt && (
                      <span>
                        {new Date(topic.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </TopicMeta>
                </TopicHeader>
                <TopicExcerpt>{topic.content}</TopicExcerpt>
                <Stats>
                  <Stat>👁️ 조회수 {topic.views || 0}</Stat>
                  <Stat>💬 댓글 {topic.replies || 0}개</Stat>
                </Stats>
              </TopicCard>
            ))}
          </TopicList>
        ) : (
          <EmptyState>
            아직 게시글이 없습니다. 첫 번째 게시글을 작성해보세요!
          </EmptyState>
        )}

        <ButtonContainer>
          {currentUser ? (
            <ActionButton onClick={handleNewTopic}>
              새 게시글 작성하기
            </ActionButton>
          ) : (
            <ActionButton disabled>새 게시글 시작하기</ActionButton>
          )}
        </ButtonContainer>

        {!currentUser && (
          <LoginPrompt>
            <p>게시글을 작성하거나 참여하려면 로그인이 필요합니다.</p>
            <p>
              <LoginLink to="/auth">로그인 또는 가입</LoginLink>을 해주세요.
            </p>
          </LoginPrompt>
        )}
      </ForumSection>
    </CommunityContainer>
  );
};

export default Community;
