import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import { BlogPost } from "../types/blog_types";
import {
  uploadBlogImage,
  validateBlogImageFiles,
} from "../services/blog_image_service";

// Define colors for YC-style design
const colors = {
  primary: "#000000",
  primaryLight: "#333333",
  primaryDark: "#000000",
  primaryPale: "#f8f9fa",
  primaryBg: "#ffffff",
  accent: "#FF6600", // YC Orange
  accentHover: "#E55A00",
  accentLight: "#FFF4E6",
  text: {
    dark: "#000000",
    medium: "#666666",
    light: "#999999",
  },
  border: "#e1e5e9",
  shadow: "rgba(0, 0, 0, 0.1)",
  backgroundGray: "#f6f6f6",
};

const EditorOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  overflow-y: auto;
`;

const EditorContainer = styled.div`
  background: white;
  border-radius: 8px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;

  @media (max-width: 768px) {
    max-height: 95vh;
    border-radius: 6px;
  }
`;

const EditorHeader = styled.div`
  padding: 1.5rem 2rem;
  border-bottom: 1px solid ${colors.border};
  background: ${colors.primaryPale};
  border-radius: 8px 8px 0 0;

  @media (max-width: 768px) {
    padding: 1.25rem 1.5rem;
    border-radius: 6px 6px 0 0;
  }
`;

const EditorTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${colors.text.dark};
  margin: 0;
  font-family: inherit;

  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

const EditorForm = styled.form`
  padding: 2rem;

  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    margin-bottom: 1.25rem;
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: ${colors.text.dark};
  font-size: 0.9rem;
  font-family: inherit;

  @media (max-width: 768px) {
    font-size: 0.85rem;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${colors.border};
  border-radius: 4px;
  font-size: 1rem;
  color: ${colors.text.dark};
  background: white;
  transition: all 0.2s ease;
  box-sizing: border-box;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: ${colors.accent};
    box-shadow: 0 0 0 3px rgba(255, 102, 0, 0.1);
  }

  &::placeholder {
    color: ${colors.text.light};
  }

  @media (max-width: 768px) {
    padding: 0.625rem;
    font-size: 0.9rem;
  }
`;

const ContentEditor = styled.textarea`
  width: 100%;
  min-height: 300px;
  padding: 1rem;
  border: 1px solid ${colors.border};
  border-radius: 4px;
  font-size: 1rem;
  color: ${colors.text.dark};
  background: white;
  transition: all 0.2s ease;
  resize: vertical;
  font-family: inherit;
  line-height: 1.6;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${colors.accent};
    box-shadow: 0 0 0 3px rgba(255, 102, 0, 0.1);
  }

  &::placeholder {
    color: ${colors.text.light};
  }

  @media (max-width: 768px) {
    padding: 0.875rem;
    font-size: 0.9rem;
    min-height: 250px;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${colors.border};
  border-radius: 4px;
  font-size: 1rem;
  color: ${colors.text.dark};
  background: white;
  transition: all 0.2s ease;
  box-sizing: border-box;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: ${colors.accent};
    box-shadow: 0 0 0 3px rgba(255, 102, 0, 0.1);
  }

  @media (max-width: 768px) {
    padding: 0.625rem;
    font-size: 0.9rem;
  }
`;

const TagsInput = styled(Input)`
  &::placeholder {
    color: ${colors.text.light};
  }
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${colors.border};

  @media (max-width: 768px) {
    flex-direction: column-reverse;
    gap: 0.75rem;
    margin-top: 1.5rem;
    padding-top: 1.25rem;
  }
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    padding: 0.875rem 1.5rem;
    font-size: 0.85rem;
    justify-content: center;
  }
`;

const PrimaryButton = styled(Button)`
  background: ${colors.accent};
  color: white;
  box-shadow: 0 2px 4px ${colors.shadow};

  &:hover:not(:disabled) {
    background: ${colors.accentHover};
    transform: translateY(-1px);
    box-shadow: 0 4px 8px ${colors.shadow};
  }
`;

const SecondaryButton = styled(Button)`
  background: transparent;
  color: ${colors.text.medium};
  border: 1px solid ${colors.border};

  &:hover:not(:disabled) {
    background: ${colors.primaryPale};
    border-color: ${colors.accent};
    color: ${colors.accent};
  }
`;

const FileInput = styled.input`
  display: none;
`;

const FileInputLabel = styled.label`
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background: ${colors.primaryPale};
  color: ${colors.text.dark};
  border: 1px solid ${colors.border};
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${colors.primaryLight};
    color: white;
    border-color: ${colors.primaryLight};
  }

  @media (max-width: 768px) {
    padding: 0.625rem 1.25rem;
    font-size: 0.85rem;
  }
`;

const ImagePreview = styled.div`
  margin-top: 1rem;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid ${colors.border};
  max-width: 300px;

  img {
    width: 100%;
    height: auto;
    display: block;
  }

  @media (max-width: 768px) {
    max-width: 100%;
  }
`;

const UploadProgress = styled.div`
  margin-top: 0.5rem;
  color: ${colors.text.medium};
  font-size: 0.85rem;
`;

const ErrorMessage = styled.div`
  color: #dc2626;
  font-size: 0.85rem;
  margin-top: 0.5rem;
`;

const HelpText = styled.div`
  color: ${colors.text.light};
  font-size: 0.85rem;
  margin-top: 0.5rem;
  line-height: 1.4;
`;

const ContentImageControls = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    gap: 0.375rem;
  }
`;

const FormattingControls = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
  padding: 0.5rem;
  background: ${colors.primaryBg};
  border-radius: 8px;

  @media (max-width: 768px) {
    gap: 0.4rem;
    padding: 0.4rem;
  }
`;

const FormatButton = styled.button<{ $active?: boolean }>`
  background: ${(props) => (props.$active ? colors.accent : "white")};
  color: ${(props) => (props.$active ? "white" : colors.text.dark)};
  border: 1px solid ${colors.border};
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
  font-weight: 600;
  font-family: "Noto Sans KR", sans-serif;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.3rem;

  &:hover {
    background: ${(props) =>
      props.$active ? colors.primaryLight : colors.primaryPale};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    padding: 0.3rem 0.5rem;
    font-size: 0.8rem;
  }
`;

const FeaturedImageUploadSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ContentImageButton = styled.button`
  padding: 0.5rem 0.75rem;
  background: ${colors.primaryPale};
  color: ${colors.text.dark};
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.375rem;

  &:hover {
    background: ${colors.accent};
    color: white;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    padding: 0.4rem 0.6rem;
    font-size: 0.75rem;
  }
`;

const RemoveImageButton = styled.button`
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: #dc2626;
    transform: scale(1.1);
  }
`;

interface BlogEditorProps {
  post: BlogPost | null;
  onSave: (postData: Partial<BlogPost>) => void;
  onCancel: () => void;
}

export const BlogEditor: React.FC<BlogEditorProps> = ({
  post,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    excerpt: "",
    status: "draft" as "draft" | "published",
    featuredImage: "",
    tags: "",
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  const featuredImageInputRef = useRef<HTMLInputElement>(null);
  const contentImageInputRef = useRef<HTMLInputElement>(null);

  // Initialize form data
  useEffect(() => {
    if (post) {
      setFormData({
        title: post.title || "",
        content: post.content || "",
        excerpt: post.excerpt || "",
        status: (post.status as "draft" | "published") || "draft",
        featuredImage: post.featuredImage || "",
        tags: post.tags?.join(", ") || "",
      });
    }
  }, [post]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    if (!formData.content.trim()) {
      alert("내용을 입력해주세요.");
      return;
    }

    setSaving(true);

    try {
      const postData: Partial<BlogPost> = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        status: formData.status,
      };

      // Only include fields that have values - avoid undefined values which Firestore rejects
      if (formData.excerpt.trim()) {
        postData.excerpt = formData.excerpt.trim();
      }

      if (formData.featuredImage.trim()) {
        postData.featuredImage = formData.featuredImage.trim();
      }

      if (formData.tags.trim()) {
        const tags = formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);
        if (tags.length > 0) {
          postData.tags = tags;
        }
      }

      console.log("Submitting blog post data:", postData);
      await onSave(postData);
    } catch (error) {
      console.error("Failed to save post:", error);
      alert("저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const handleFeaturedImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const { valid, errors } = validateBlogImageFiles(files);

    if (errors.length > 0) {
      alert("이미지 업로드 오류:\n" + errors.join("\n"));
      return;
    }

    if (valid.length === 0) return;

    try {
      setUploading(true);
      setUploadProgress("대표 이미지 업로드 중...");
      setUploadError(null);

      const imageUrl = await uploadBlogImage(valid[0]);

      setFormData((prev) => ({
        ...prev,
        featuredImage: imageUrl,
      }));

      setUploadProgress("");
    } catch (error) {
      console.error("Featured image upload failed:", error);
      setUploadError(
        "이미지 업로드에 실패했습니다: " +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setUploading(false);
      if (featuredImageInputRef.current) {
        featuredImageInputRef.current.value = "";
      }
    }
  };

  const handleContentImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const { valid, errors } = validateBlogImageFiles(files);

    if (errors.length > 0) {
      alert("이미지 업로드 오류:\n" + errors.join("\n"));
      return;
    }

    if (valid.length === 0) return;

    try {
      setUploading(true);
      setUploadProgress("컨텐츠 이미지 업로드 중...");
      setUploadError(null);

      const imageUrl = await uploadBlogImage(valid[0]);

      // Insert image markdown at cursor position or end of content
      const imageMarkdown = `\n![이미지 설명](${imageUrl})\n`;
      const textarea = document.getElementById(
        "content"
      ) as HTMLTextAreaElement;

      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentContent = formData.content;

        const newContent =
          currentContent.substring(0, start) +
          imageMarkdown +
          currentContent.substring(end);

        setFormData((prev) => ({
          ...prev,
          content: newContent,
        }));

        // Focus back to textarea and set cursor position
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(
            start + imageMarkdown.length,
            start + imageMarkdown.length
          );
        }, 100);
      } else {
        // Fallback: append to end
        setFormData((prev) => ({
          ...prev,
          content: prev.content + imageMarkdown,
        }));
      }

      setUploadProgress("");
    } catch (error) {
      console.error("Content image upload failed:", error);
      setUploadError(
        "이미지 업로드에 실패했습니다: " +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setUploading(false);
      if (contentImageInputRef.current) {
        contentImageInputRef.current.value = "";
      }
    }
  };

  const handleRemoveFeaturedImage = () => {
    setFormData((prev) => ({
      ...prev,
      featuredImage: "",
    }));
  };

  const handleFeaturedImageButtonClick = () => {
    featuredImageInputRef.current?.click();
  };

  const handleContentImageButtonClick = () => {
    contentImageInputRef.current?.click();
  };

  const handleInsertHeader = () => {
    const textarea = document.getElementById("content") as HTMLTextAreaElement;

    if (textarea) {
      // Save current scroll position to prevent jumping
      const scrollTop = textarea.scrollTop;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentContent = formData.content;

      // Check if we're at the beginning of a line or add a new line
      const beforeCursor = currentContent.substring(0, start);
      const atLineStart = beforeCursor === "" || beforeCursor.endsWith("\n");
      const headerText = atLineStart ? "# " : "\n# ";

      const newContent =
        currentContent.substring(0, start) +
        headerText +
        currentContent.substring(end);

      setFormData((prev) => ({
        ...prev,
        content: newContent,
      }));

      // Focus back to textarea and set cursor position after the header
      setTimeout(() => {
        textarea.setSelectionRange(
          start + headerText.length,
          start + headerText.length
        );
        // Restore scroll position to prevent jumping to top
        textarea.scrollTop = scrollTop;
        textarea.focus();
      }, 50);
    }
  };

  const handleFormatText = (formatType: "bold" | "crimson") => {
    const textarea = document.getElementById("content") as HTMLTextAreaElement;

    if (textarea) {
      const scrollTop = textarea.scrollTop;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const originalContent = formData.content;

      // The segment of text that is actually selected by the user
      const selectedText = originalContent.substring(start, end);

      // Don't do anything if the selection is empty
      if (!selectedText) {
        return;
      }

      let formattedSelection = "";
      if (formatType === "bold") {
        // Make sure to format as **text** without any extra line breaks
        formattedSelection = `**${selectedText}**`;
      } else if (formatType === "crimson") {
        formattedSelection = `<span style="color: crimson; font-weight: bold;">${selectedText}</span>`;
      }

      const newContent =
        originalContent.substring(0, start) +
        formattedSelection +
        originalContent.substring(end);

      setFormData((prev) => ({
        ...prev,
        content: newContent,
      }));

      // Restore focus and cursor position - place cursor right after the formatted text
      setTimeout(() => {
        const newCursorPos = start + formattedSelection.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.scrollTop = scrollTop;
        textarea.focus();
      }, 50);
    }
  };

  return (
    <EditorOverlay onClick={handleOverlayClick}>
      <EditorContainer>
        <EditorHeader>
          <EditorTitle>{post ? "포스트 편집" : "새 포스트 작성"}</EditorTitle>
        </EditorHeader>

        <EditorForm onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="title">제목 *</Label>
            <Input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              placeholder="블로그 포스트 제목을 입력하세요"
              required
            />
            <HelpText>제목은 100자 이내로 작성해주세요.</HelpText>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="excerpt">요약</Label>
            <Input
              id="excerpt"
              name="excerpt"
              type="text"
              value={formData.excerpt}
              onChange={handleChange}
              placeholder="포스트의 간단한 요약을 작성하세요 (선택사항)"
            />
            <HelpText>요약은 300자 이내로 작성해주세요.</HelpText>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="content">내용 *</Label>
            <ContentImageControls>
              <ContentImageButton
                type="button"
                onClick={handleInsertHeader}
                disabled={uploading}
              >
                📝 헤더 삽입
              </ContentImageButton>
              <ContentImageButton
                type="button"
                onClick={handleContentImageButtonClick}
                disabled={uploading}
              >
                🖼️ 이미지 삽입
              </ContentImageButton>
              <HelpText style={{ margin: 0, fontSize: "0.75rem" }}>
                헤더는 '# ' 형식으로, 이미지는 마크다운 형식으로 커서 위치에
                삽입됩니다
              </HelpText>
            </ContentImageControls>
            <FormattingControls>
              <FormatButton
                type="button"
                onClick={() => handleFormatText("bold")}
                disabled={uploading}
                title="굵은 텍스트"
              >
                <strong>B</strong>
                굵게
              </FormatButton>
              <FormatButton
                type="button"
                onClick={() => handleFormatText("crimson")}
                disabled={uploading}
                title="빨간 굵은 텍스트"
                style={{ color: "crimson" }}
              >
                <strong style={{ color: "crimson" }}>A</strong>
                빨간색
              </FormatButton>
              <HelpText style={{ margin: 0, fontSize: "0.75rem" }}>
                텍스트를 선택한 후 버튼을 클릭하거나, 버튼을 클릭하여 서식을
                삽입하세요
              </HelpText>
            </FormattingControls>
            <ContentEditor
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="여기에 블로그 포스트 내용을 작성하세요..."
              required
            />
            <HelpText>내용은 최소 100자 이상 작성해주세요.</HelpText>

            <FileInput
              ref={contentImageInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleContentImageUpload}
            />
          </FormGroup>

          <FormRow>
            <FormGroup>
              <Label htmlFor="status">상태</Label>
              <Select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="draft">초안</option>
                <option value="published">발행</option>
              </Select>
            </FormGroup>

            <FormGroup>
              <Label>대표 이미지</Label>
              <FeaturedImageUploadSection>
                <FileInputLabel htmlFor="featured-image">
                  파일 선택
                </FileInputLabel>

                {formData.featuredImage && (
                  <ImagePreview>
                    <img
                      src={formData.featuredImage}
                      alt="대표 이미지 미리보기"
                    />
                    <RemoveImageButton
                      type="button"
                      onClick={handleRemoveFeaturedImage}
                      title="이미지 제거"
                    >
                      ✕
                    </RemoveImageButton>
                  </ImagePreview>
                )}

                <FileInput
                  id="featured-image"
                  ref={featuredImageInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFeaturedImageUpload}
                />
              </FeaturedImageUploadSection>
            </FormGroup>
          </FormRow>

          <FormGroup>
            <Label htmlFor="tags">태그</Label>
            <TagsInput
              id="tags"
              name="tags"
              type="text"
              value={formData.tags}
              onChange={handleChange}
              placeholder="태그를 쉼표로 구분하여 입력하세요 (예: 영어학습, 비즈니스, 팁)"
            />
            <HelpText>
              태그는 쉼표(,)로 구분하여 입력해주세요. 독자들이 관련 포스트를
              찾는데 도움이 됩니다.
            </HelpText>
          </FormGroup>

          {uploadError && <ErrorMessage>{uploadError}</ErrorMessage>}
          {uploadProgress && <UploadProgress>{uploadProgress}</UploadProgress>}

          <ButtonGroup>
            <SecondaryButton
              type="button"
              onClick={onCancel}
              disabled={uploading}
            >
              취소
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={saving || uploading}>
              {saving
                ? "저장 중..."
                : uploading
                ? "업로드 중..."
                : post
                ? "수정하기"
                : "발행하기"}
            </PrimaryButton>
          </ButtonGroup>
        </EditorForm>
      </EditorContainer>
    </EditorOverlay>
  );
};
