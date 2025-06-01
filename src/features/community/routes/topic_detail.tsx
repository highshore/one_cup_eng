import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../../../shared/contexts/auth_context";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  addDoc,
  getDocs,
  updateDoc,
  increment,
  serverTimestamp,
  deleteDoc,
  arrayUnion,
  arrayRemove,
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

const PageContainer = styled.div`
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

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  color: ${colors.text.medium};
  text-decoration: none;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;

  &:hover {
    color: ${colors.accent};
  }

  &:before {
    content: "←";
    margin-right: 0.5rem;
  }
`;

const TopicContainer = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  margin-bottom: 2rem;
`;

const TopicHeader = styled.div`
  border-bottom: 1px solid ${colors.primaryPale};
  padding-bottom: 1rem;
  margin-bottom: 1rem;
`;

const TopicTitle = styled.h1`
  font-size: 1.75rem;
  color: ${colors.text.dark};
  margin-bottom: 0.75rem;

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const TopicMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: ${colors.text.light};
  font-size: 0.85rem;
`;

const AuthorInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const AuthorName = styled.span`
  color: ${colors.text.medium};
  font-weight: 600;
`;

const TopicDate = styled.span``;

const TopicContent = styled.div`
  color: ${colors.text.medium};
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 1rem;
  white-space: pre-wrap;
`;

const TopicActions = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 1.5rem;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  color: ${colors.text.medium};
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.25rem 0.5rem;

  &:hover {
    color: ${colors.accent};
  }
`;

const DeleteButton = styled(ActionButton)`
  color: #d32f2f;

  &:hover {
    color: #b71c1c;
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  color: ${colors.text.dark};
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid ${colors.primaryPale};
`;

const CommentsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const CommentCard = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1.25rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
`;

const CommentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`;

const CommentAuthor = styled.div`
  font-weight: 600;
  color: ${colors.text.medium};
`;

const CommentDate = styled.div`
  font-size: 0.85rem;
  color: ${colors.text.light};
`;

const CommentContent = styled.div`
  color: ${colors.text.medium};
  font-size: 0.95rem;
  line-height: 1.5;
  white-space: pre-wrap;
`;

const CommentActions = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 0.75rem;
`;

const CommentForm = styled.form`
  background: white;
  border-radius: 8px;
  padding: 1.25rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  margin-top: 1rem;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
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

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
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

const LoginPrompt = styled.div`
  background-color: ${colors.primaryPale};
  padding: 1.25rem;
  border-radius: 8px;
  margin-top: 1rem;
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

const ErrorMessage = styled.div`
  color: #d32f2f;
  padding: 0.75rem;
  background-color: #ffebee;
  border-radius: 4px;
  margin-bottom: 1rem;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${colors.text.light};
`;

const LikeButton = styled.button<{ active?: boolean }>`
  background: none;
  border: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${(props) => (props.active ? "#d32f2f" : colors.text.medium)};
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  font-size: 0.9rem;

  &:hover {
    color: ${(props) => (props.active ? "#b71c1c" : colors.accent)};
  }
`;

const LikeCount = styled.span`
  font-size: 0.85rem;
`;

interface Topic {
  id: string;
  title: string;
  content: string;
  author: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  views: number;
  replies: number;
  likes: number;
  likedBy: string[];
}

interface Comment {
  id: string;
  content: string;
  author: string;
  authorId: string;
  createdAt: Date;
  topicId: string;
  likes: number;
  likedBy: string[];
}

const TopicDetail = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTopicAndComments = async () => {
      if (!topicId) return;

      try {
        const topicDoc = doc(db, "communityTopics", topicId);
        const topicSnap = await getDoc(topicDoc);

        if (topicSnap.exists()) {
          // Increment view count
          await updateDoc(topicDoc, {
            views: increment(1),
          });

          const topicData = {
            id: topicSnap.id,
            ...topicSnap.data(),
            createdAt: topicSnap.data().createdAt?.toDate() || new Date(),
            updatedAt: topicSnap.data().updatedAt?.toDate() || new Date(),
            likedBy: topicSnap.data().likedBy || [],
            likes: topicSnap.data().likes || 0,
          } as Topic;

          setTopic(topicData);

          // Fetch comments
          const commentsQuery = query(
            collection(db, "communityComments"),
            where("topicId", "==", topicId),
            orderBy("createdAt", "asc")
          );

          const commentsSnap = await getDocs(commentsQuery);
          const commentsData = commentsSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            likedBy: doc.data().likedBy || [],
            likes: doc.data().likes || 0,
          })) as Comment[];

          setComments(commentsData);
        } else {
          setError("토픽을 찾을 수 없습니다");
        }
      } catch (err) {
        console.error("토픽 세부 정보 불러오기 오류:", err);
        setError("토픽 로드에 실패했습니다. 다시 시도해주세요.");
      } finally {
        setLoading(false);
      }
    };

    fetchTopicAndComments();
  }, [topicId]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      setError("댓글을 작성하려면 로그인이 필요합니다.");
      return;
    }

    if (!newComment.trim()) {
      setError("댓글 내용을 입력해주세요");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const commentData = {
        content: newComment.trim(),
        author: currentUser.displayName || "익명",
        authorId: currentUser.uid,
        createdAt: serverTimestamp(),
        topicId,
        likes: 0,
        likedBy: [],
      };

      await addDoc(collection(db, "communityComments"), commentData);

      // Update topic replies count
      if (topicId) {
        await updateDoc(doc(db, "communityTopics", topicId), {
          replies: increment(1),
        });
      }

      // Refresh comments
      const commentsQuery = query(
        collection(db, "communityComments"),
        where("topicId", "==", topicId),
        orderBy("createdAt", "asc")
      );

      const commentsSnap = await getDocs(commentsQuery);
      const commentsData = commentsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Comment[];

      setComments(commentsData);
      setNewComment("");
    } catch (err) {
      console.error("댓글 추가 오류:", err);
      setError("댓글 추가에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTopic = async () => {
    if (!topicId || !currentUser || !topic) return;

    if (topic.authorId !== currentUser.uid) {
      setError("자신의 토픽만 삭제할 수 있습니다");
      return;
    }

    if (
      window.confirm(
        "정말로 이 토픽을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다."
      )
    ) {
      try {
        // Delete all comments
        const commentsQuery = query(
          collection(db, "communityComments"),
          where("topicId", "==", topicId)
        );

        const commentsSnap = await getDocs(commentsQuery);

        const deleteCommentPromises = commentsSnap.docs.map((commentDoc) =>
          deleteDoc(doc(db, "communityComments", commentDoc.id))
        );

        await Promise.all(deleteCommentPromises);

        // Delete the topic
        await deleteDoc(doc(db, "communityTopics", topicId));

        navigate("/community");
      } catch (err) {
        console.error("토픽 삭제 오류:", err);
        setError("토픽 삭제에 실패했습니다. 다시 시도해주세요.");
      }
    }
  };

  const handleDeleteComment = async (
    commentId: string,
    commentAuthorId: string
  ) => {
    if (!currentUser) return;

    if (commentAuthorId !== currentUser.uid) {
      setError("자신의 댓글만 삭제할 수 있습니다");
      return;
    }

    if (window.confirm("정말로 이 댓글을 삭제하시겠습니까?")) {
      try {
        await deleteDoc(doc(db, "communityComments", commentId));

        // Update topic replies count
        if (topicId) {
          await updateDoc(doc(db, "communityTopics", topicId), {
            replies: increment(-1),
          });
        }

        // Update local comments state
        setComments(comments.filter((comment) => comment.id !== commentId));
      } catch (err) {
        console.error("댓글 삭제 오류:", err);
        setError("댓글 삭제에 실패했습니다. 다시 시도해주세요.");
      }
    }
  };

  const handleLikeTopic = async () => {
    if (!currentUser || !topicId || !topic) return;

    const topicRef = doc(db, "communityTopics", topicId);
    const userHasLiked = topic.likedBy.includes(currentUser.uid);

    try {
      if (userHasLiked) {
        // Unlike
        await updateDoc(topicRef, {
          likes: increment(-1),
          likedBy: arrayRemove(currentUser.uid),
        });

        setTopic({
          ...topic,
          likes: topic.likes - 1,
          likedBy: topic.likedBy.filter((id) => id !== currentUser.uid),
        });
      } else {
        // Like
        await updateDoc(topicRef, {
          likes: increment(1),
          likedBy: arrayUnion(currentUser.uid),
        });

        setTopic({
          ...topic,
          likes: topic.likes + 1,
          likedBy: [...topic.likedBy, currentUser.uid],
        });
      }
    } catch (err) {
      console.error("토픽 좋아요/취소 오류:", err);
      setError("토픽 좋아요/취소에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!currentUser || !commentId) return;

    const commentRef = doc(db, "communityComments", commentId);
    const comment = comments.find((c) => c.id === commentId);

    if (!comment) return;

    const userHasLiked = comment.likedBy.includes(currentUser.uid);

    try {
      if (userHasLiked) {
        // Unlike
        await updateDoc(commentRef, {
          likes: increment(-1),
          likedBy: arrayRemove(currentUser.uid),
        });

        setComments(
          comments.map((c) =>
            c.id === commentId
              ? {
                  ...c,
                  likes: c.likes - 1,
                  likedBy: c.likedBy.filter((id) => id !== currentUser.uid),
                }
              : c
          )
        );
      } else {
        // Like
        await updateDoc(commentRef, {
          likes: increment(1),
          likedBy: arrayUnion(currentUser.uid),
        });

        setComments(
          comments.map((c) =>
            c.id === commentId
              ? {
                  ...c,
                  likes: c.likes + 1,
                  likedBy: [...c.likedBy, currentUser.uid],
                }
              : c
          )
        );
      }
    } catch (err) {
      console.error("댓글 좋아요/취소 오류:", err);
      setError("댓글 좋아요/취소에 실패했습니다. 다시 시도해주세요.");
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingState>토픽 로딩 중...</LoadingState>
      </PageContainer>
    );
  }

  if (error && !topic) {
    return (
      <PageContainer>
        <BackLink to="/community">커뮤니티로 돌아가기</BackLink>
        <ErrorMessage>{error}</ErrorMessage>
      </PageContainer>
    );
  }

  if (!topic) {
    return (
      <PageContainer>
        <BackLink to="/community">커뮤니티로 돌아가기</BackLink>
        <ErrorMessage>토픽을 찾을 수 없습니다</ErrorMessage>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <BackLink to="/community">커뮤니티로 돌아가기</BackLink>

      <TopicContainer>
        <TopicHeader>
          <TopicTitle>{topic.title}</TopicTitle>
          <TopicMeta>
            <AuthorInfo>
              <AuthorName>{topic.author}</AuthorName>
            </AuthorInfo>
            <TopicDate>
              {new Date(topic.createdAt).toLocaleDateString()}{" "}
              {new Date(topic.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </TopicDate>
          </TopicMeta>
        </TopicHeader>

        <TopicContent>{topic.content}</TopicContent>

        <TopicActions>
          {currentUser ? (
            <LikeButton
              onClick={handleLikeTopic}
              active={topic.likedBy.includes(currentUser.uid)}
            >
              {topic.likedBy.includes(currentUser.uid) ? "♥" : "♡"}
              <LikeCount>{topic.likes || 0}</LikeCount>
            </LikeButton>
          ) : (
            <LikeButton disabled>
              ♡ <LikeCount>{topic.likes || 0}</LikeCount>
            </LikeButton>
          )}

          {currentUser && topic && currentUser.uid === topic.authorId && (
            <DeleteButton onClick={handleDeleteTopic}>토픽 삭제</DeleteButton>
          )}
        </TopicActions>
      </TopicContainer>

      <SectionTitle>댓글 ({comments.length})</SectionTitle>

      {comments.length > 0 ? (
        <CommentsList>
          {comments.map((comment) => (
            <CommentCard key={comment.id}>
              <CommentHeader>
                <CommentAuthor>{comment.author}</CommentAuthor>
                <CommentDate>
                  {new Date(comment.createdAt).toLocaleDateString()}{" "}
                  {new Date(comment.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </CommentDate>
              </CommentHeader>
              <CommentContent>{comment.content}</CommentContent>

              <CommentActions>
                {currentUser ? (
                  <LikeButton
                    onClick={() => handleLikeComment(comment.id)}
                    active={comment.likedBy.includes(currentUser.uid)}
                  >
                    {comment.likedBy.includes(currentUser.uid) ? "♥" : "♡"}
                    <LikeCount>{comment.likes || 0}</LikeCount>
                  </LikeButton>
                ) : (
                  <LikeButton disabled>
                    ♡ <LikeCount>{comment.likes || 0}</LikeCount>
                  </LikeButton>
                )}

                {currentUser && currentUser.uid === comment.authorId && (
                  <DeleteButton
                    onClick={() =>
                      handleDeleteComment(comment.id, comment.authorId)
                    }
                  >
                    삭제
                  </DeleteButton>
                )}
              </CommentActions>
            </CommentCard>
          ))}
        </CommentsList>
      ) : (
        <CommentCard>
          <CommentContent>
            아직 댓글이 없습니다. 첫 댓글을 작성해보세요!
          </CommentContent>
        </CommentCard>
      )}

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {currentUser ? (
        <CommentForm onSubmit={handleCommentSubmit}>
          <TextArea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="댓글 추가..."
            required
          />
          <ButtonContainer>
            <SubmitButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? "게시 중..." : "댓글 게시하기"}
            </SubmitButton>
          </ButtonContainer>
        </CommentForm>
      ) : (
        <LoginPrompt>
          <p>댓글을 작성하려면 로그인이 필요합니다.</p>
          <p>
            <LoginLink to="/auth">로그인 또는 가입</LoginLink>하여 토론에
            참여하세요.
          </p>
        </LoginPrompt>
      )}
    </PageContainer>
  );
};

export default TopicDetail;
