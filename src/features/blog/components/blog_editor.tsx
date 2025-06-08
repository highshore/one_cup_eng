import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import { BlogPost } from "../types/blog_types";
import { uploadBlogImage, validateBlogImageFiles } from "../services/blog_image_service";

// Define colors for consistency
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
  border-radius: 16px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
  font-family: "Noto Sans KR", sans-serif;
  
  @media (max-width: 768px) {
    max-height: 95vh;
    border-radius: 14px;
  }
`;

const EditorHeader = styled.div`
  padding: 1.25rem 1.75rem;
  border-bottom: 1px solid ${colors.primaryPale};
  background: ${colors.primaryBg};
  border-radius: 16px 16px 0 0;

  @media (max-width: 768px) {
    padding: 1rem 1.25rem;
    border-radius: 14px 14px 0 0;
  }
`;

const EditorTitle = styled.h2`
  font-size: 1.4rem;
  font-weight: 700;
  color: ${colors.text.dark};
  margin: 0;
  font-family: "Noto Sans KR", sans-serif;

  @media (max-width: 768px) {
    font-size: 1.2rem;
  }
`;

const EditorForm = styled.form`
  padding: 1.5rem;

  @media (max-width: 768px) {
    padding: 1.25rem;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1.25rem;

  @media (max-width: 768px) {
    margin-bottom: 1rem;
  }
`;

const Label = styled.label`
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${colors.text.dark};
  margin-bottom: 0.4rem;
  font-family: "Noto Sans KR", sans-serif;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 2px solid ${colors.primaryPale};
  border-radius: 10px;
  font-size: 0.95rem;
  color: ${colors.text.dark};
  background: white;
  transition: all 0.2s ease;
  box-sizing: border-box;
  font-family: "Noto Sans KR", sans-serif;

  &:focus {
    outline: none;
    border-color: ${colors.accent};
    box-shadow: 0 0 0 3px rgba(200, 162, 122, 0.1);
  }

  &::placeholder {
    color: ${colors.text.light};
  }

  @media (max-width: 768px) {
    padding: 0.5rem 0.7rem;
    font-size: 0.9rem;
    border-radius: 8px;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 0.6rem 0.8rem;
  border: 2px solid ${colors.primaryPale};
  border-radius: 10px;
  font-size: 0.85rem;
  color: ${colors.text.dark};
  background: white;
  transition: all 0.2s ease;
  resize: vertical;
  font-family: "Noto Sans KR", sans-serif;
  line-height: 1.5;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${colors.accent};
    box-shadow: 0 0 0 3px rgba(200, 162, 122, 0.1);
  }

  &::placeholder {
    color: ${colors.text.light};
  }

  @media (max-width: 768px) {
    padding: 0.5rem 0.7rem;
    font-size: 0.8rem;
    min-height: 80px;
    border-radius: 8px;
  }
`;

const ContentEditor = styled.textarea`
  width: 100%;
  min-height: 280px;
  padding: 0.8rem;
  border: 2px solid ${colors.primaryPale};
  border-radius: 10px;
  font-size: 0.95rem;
  color: ${colors.text.dark};
  background: white;
  transition: all 0.2s ease;
  resize: vertical;
  font-family: "Noto Sans KR", sans-serif;
  line-height: 1.6;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${colors.accent};
    box-shadow: 0 0 0 3px rgba(200, 162, 122, 0.1);
  }

  &::placeholder {
    color: ${colors.text.light};
  }

  @media (max-width: 768px) {
    padding: 0.7rem;
    font-size: 0.9rem;
    min-height: 220px;
    border-radius: 8px;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 2px solid ${colors.primaryPale};
  border-radius: 10px;
  font-size: 0.95rem;
  color: ${colors.text.dark};
  background: white;
  transition: all 0.2s ease;
  box-sizing: border-box;
  font-family: "Noto Sans KR", sans-serif;

  &:focus {
    outline: none;
    border-color: ${colors.accent};
    box-shadow: 0 0 0 3px rgba(200, 162, 122, 0.1);
  }

  @media (max-width: 768px) {
    padding: 0.5rem 0.7rem;
    font-size: 0.9rem;
    border-radius: 8px;
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
  gap: 0.8rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.6rem;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.8rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid ${colors.primaryPale};

  @media (max-width: 768px) {
    flex-direction: column-reverse;
    gap: 0.6rem;
    margin-top: 1.25rem;
    padding-top: 1rem;
  }
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.6rem 1.25rem;
  border: none;
  border-radius: 25px;
  font-size: 0.95rem;
  font-weight: 600;
  font-family: "Noto Sans KR", sans-serif;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 110px;
  
  ${props => {
    switch (props.$variant) {
      case 'primary':
        return `
          background: ${colors.primary};
          color: white;
          box-shadow: 0 4px 12px rgba(44, 24, 16, 0.2);
          
          &:hover {
            background: ${colors.primaryLight};
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(44, 24, 16, 0.3);
          }
        `;
      case 'danger':
        return `
          background: #ef4444;
          color: white;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
          
          &:hover {
            background: #dc2626;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(239, 68, 68, 0.3);
          }
        `;
      default:
        return `
          background: ${colors.primaryPale};
          color: ${colors.text.dark};
          
          &:hover {
            background: ${colors.accent};
            color: white;
            transform: translateY(-2px);
          }
        `;
    }
  }}

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 768px) {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    min-width: 90px;
  }
`;

const CharCount = styled.div`
  text-align: right;
  font-size: 0.75rem;
  color: ${colors.text.light};
  margin-top: 0.2rem;
  font-family: "Noto Sans KR", sans-serif;
`;

const HelpText = styled.div`
  font-size: 0.75rem;
  color: ${colors.text.light};
  margin-top: 0.2rem;
  line-height: 1.4;
  font-family: "Noto Sans KR", sans-serif;
`;



const UploadButton = styled.button`
  padding: 0.6rem 0.8rem;
  background: ${colors.accent};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  font-family: "Noto Sans KR", sans-serif;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 110px;
  justify-content: center;

  &:hover {
    background: ${colors.primaryLight};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 768px) {
    padding: 0.5rem 0.7rem;
    font-size: 0.8rem;
    min-width: 90px;
    gap: 0.3rem;
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const ImagePreview = styled.div`
  margin-top: 0.4rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;

  img {
    width: 50px;
    height: 50px;
    object-fit: cover;
    border-radius: 6px;
    border: 1px solid ${colors.primaryPale};
  }

  @media (max-width: 768px) {
    margin-top: 0.3rem;
    gap: 0.3rem;
    
    img {
      width: 40px;
      height: 40px;
      border-radius: 5px;
    }
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

const ContentImageControls = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    gap: 0.375rem;
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

const UploadProgress = styled.div`
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: ${colors.primaryBg};
  border-radius: 6px;
  font-size: 0.8rem;
  color: ${colors.text.medium};
  border: 1px solid ${colors.primaryPale};
`;

interface BlogEditorProps {
  post: BlogPost | null;
  onSave: (postData: Partial<BlogPost>) => void;
  onCancel: () => void;
}

export const BlogEditor: React.FC<BlogEditorProps> = ({
  post,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    status: 'draft' as 'draft' | 'published',
    featuredImage: '',
    tags: '',
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  
  const featuredImageInputRef = useRef<HTMLInputElement>(null);
  const contentImageInputRef = useRef<HTMLInputElement>(null);

  // Initialize form data
  useEffect(() => {
    if (post) {
      setFormData({
        title: post.title || '',
        content: post.content || '',
        excerpt: post.excerpt || '',
        status: post.status as 'draft' | 'published' || 'draft',
        featuredImage: post.featuredImage || '',
        tags: post.tags?.join(', ') || '',
      });
    }
  }, [post]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    if (!formData.content.trim()) {
      alert('내용을 입력해주세요.');
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
        const tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        if (tags.length > 0) {
          postData.tags = tags;
        }
      }

      console.log('Submitting blog post data:', postData);
      await onSave(postData);
    } catch (error) {
      console.error('Failed to save post:', error);
      alert('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const handleFeaturedImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const { valid, errors } = validateBlogImageFiles(files);
    
    if (errors.length > 0) {
      alert('이미지 업로드 오류:\n' + errors.join('\n'));
      return;
    }

    if (valid.length === 0) return;

    try {
      setUploading(true);
      setUploadProgress('대표 이미지 업로드 중...');
      
      const imageUrl = await uploadBlogImage(valid[0]);
      
      setFormData(prev => ({
        ...prev,
        featuredImage: imageUrl
      }));
      
      setUploadProgress('');
    } catch (error) {
      console.error('Featured image upload failed:', error);
      alert('이미지 업로드에 실패했습니다: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setUploading(false);
      if (featuredImageInputRef.current) {
        featuredImageInputRef.current.value = '';
      }
    }
  };

  const handleContentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const { valid, errors } = validateBlogImageFiles(files);
    
    if (errors.length > 0) {
      alert('이미지 업로드 오류:\n' + errors.join('\n'));
      return;
    }

    if (valid.length === 0) return;

    try {
      setUploading(true);
      setUploadProgress('컨텐츠 이미지 업로드 중...');
      
      const imageUrl = await uploadBlogImage(valid[0]);
      
      // Insert image markdown at cursor position or end of content
      const imageMarkdown = `\n![이미지 설명](${imageUrl})\n`;
      const textarea = document.getElementById('content') as HTMLTextAreaElement;
      
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentContent = formData.content;
        
        const newContent = currentContent.substring(0, start) + 
                          imageMarkdown + 
                          currentContent.substring(end);
        
        setFormData(prev => ({
          ...prev,
          content: newContent
        }));
        
        // Focus back to textarea and set cursor position
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + imageMarkdown.length, start + imageMarkdown.length);
        }, 100);
      } else {
        // Fallback: append to end
        setFormData(prev => ({
          ...prev,
          content: prev.content + imageMarkdown
        }));
      }
      
      setUploadProgress('');
    } catch (error) {
      console.error('Content image upload failed:', error);
      alert('이미지 업로드에 실패했습니다: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setUploading(false);
      if (contentImageInputRef.current) {
        contentImageInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFeaturedImage = () => {
    setFormData(prev => ({
      ...prev,
      featuredImage: ''
    }));
  };

  const handleFeaturedImageButtonClick = () => {
    featuredImageInputRef.current?.click();
  };

  const handleContentImageButtonClick = () => {
    contentImageInputRef.current?.click();
  };

  const handleInsertHeader = () => {
    const textarea = document.getElementById('content') as HTMLTextAreaElement;
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentContent = formData.content;
      
      // Check if we're at the beginning of a line or add a new line
      const beforeCursor = currentContent.substring(0, start);
      const atLineStart = beforeCursor === '' || beforeCursor.endsWith('\n');
      const headerText = atLineStart ? '# ' : '\n# ';
      
      const newContent = currentContent.substring(0, start) + 
                        headerText + 
                        currentContent.substring(end);
      
      setFormData(prev => ({
        ...prev,
        content: newContent
      }));
      
      // Focus back to textarea and set cursor position after the header
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + headerText.length, start + headerText.length);
      }, 100);
    }
  };

  return (
    <EditorOverlay onClick={handleOverlayClick}>
      <EditorContainer>
        <EditorHeader>
          <EditorTitle>
            {post ? '포스트 편집' : '새 포스트 작성'}
          </EditorTitle>
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
            <CharCount>{formData.title.length}/100</CharCount>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="excerpt">요약</Label>
            <TextArea
              id="excerpt"
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              placeholder="포스트의 간단한 요약을 작성하세요 (선택사항)"
              rows={3}
            />
            <CharCount>{formData.excerpt.length}/300</CharCount>
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
              <HelpText style={{ margin: 0, fontSize: '0.75rem' }}>
                헤더는 '# ' 형식으로, 이미지는 마크다운 형식으로 커서 위치에 삽입됩니다
              </HelpText>
            </ContentImageControls>
            <ContentEditor
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="여기에 블로그 포스트 내용을 작성하세요..."
              required
            />
            <CharCount>{formData.content.length} 글자</CharCount>
            
            <HiddenFileInput
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
                <UploadButton
                  type="button"
                  onClick={handleFeaturedImageButtonClick}
                  disabled={uploading}
                >
                  📁 파일 선택
                </UploadButton>
                
                {formData.featuredImage && (
                  <ImagePreview>
                    <img src={formData.featuredImage} alt="대표 이미지 미리보기" />
                    <RemoveImageButton
                      type="button"
                      onClick={handleRemoveFeaturedImage}
                      title="이미지 제거"
                    >
                      ✕
                    </RemoveImageButton>
                  </ImagePreview>
                )}
                
                <HiddenFileInput
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
              태그는 쉼표(,)로 구분하여 입력해주세요. 독자들이 관련 포스트를 찾는데 도움이 됩니다.
            </HelpText>
          </FormGroup>

          {uploadProgress && (
            <UploadProgress>
              {uploadProgress}
            </UploadProgress>
          )}

          <ButtonGroup>
            <Button type="button" onClick={onCancel} disabled={uploading}>
              취소
            </Button>
            <Button type="submit" $variant="primary" disabled={saving || uploading}>
              {saving ? '저장 중...' : uploading ? '업로드 중...' : post ? '수정하기' : '발행하기'}
            </Button>
          </ButtonGroup>
        </EditorForm>
      </EditorContainer>
    </EditorOverlay>
  );
}; 