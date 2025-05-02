import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

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

const PageHeader = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  color: ${colors.text.dark};
  margin-bottom: 0.75rem;

  @media (max-width: 768px) {
    font-size: 1.8rem;
  }
`;

const Description = styled.p`
  color: ${colors.text.medium};
  font-size: 1rem;
  line-height: 1.6;
`;

const FormContainer = styled.form`
  background-color: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: ${colors.text.dark};
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 1rem;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: ${colors.accent};
    box-shadow: 0 0 0 2px rgba(200, 162, 122, 0.2);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 200px;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${colors.accent};
    box-shadow: 0 0 0 2px rgba(200, 162, 122, 0.2);
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
`;

const SubmitButton = styled(Button)`
  background-color: ${colors.accent};
  color: white;

  &:hover {
    background-color: ${colors.primaryLight};
  }

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const CancelButton = styled(Button)`
  background-color: transparent;
  color: ${colors.text.medium};

  &:hover {
    background-color: ${colors.primaryPale};
  }
`;

const ErrorMessage = styled.div`
  color: #d32f2f;
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: #ffebee;
  border-radius: 4px;
`;

const NewTopic = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      setError("토론을 생성하려면 로그인이 필요합니다.");
      return;
    }

    if (!title.trim() || !content.trim()) {
      setError("모든 항목을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const topicData = {
        title: title.trim(),
        content: content.trim(),
        author: currentUser.displayName || "익명",
        authorId: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        replies: 0,
        views: 0,
        likes: 0,
        likedBy: [],
      };

      const docRef = await addDoc(collection(db, "communityTopics"), topicData);
      navigate(`/community/topic/${docRef.id}`);
    } catch (err) {
      console.error("토론 생성 오류:", err);
      setError("토론 생성에 실패했습니다. 다시 시도해주세요.");
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate("/community");
  };

  return (
    <PageContainer>
      <PageHeader>
        <Title>새 토론 생성하기</Title>
        <Description>
          생각을 공유하고, 질문하거나, 커뮤니티와 대화를 시작해보세요.
        </Description>
      </PageHeader>

      <FormContainer onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="title">토론 제목</Label>
          <Input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="설명적인 제목을 입력하세요"
            required
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="content">내용</Label>
          <TextArea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="생각, 질문, 아이디어를 자세히 공유해주세요..."
            required
          />
        </FormGroup>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <ButtonContainer>
          <CancelButton type="button" onClick={handleCancel}>
            취소
          </CancelButton>
          <SubmitButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? "게시 중..." : "토론 게시하기"}
          </SubmitButton>
        </ButtonContainer>
      </FormContainer>
    </PageContainer>
  );
};

export default NewTopic;
