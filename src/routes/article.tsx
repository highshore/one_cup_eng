import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import styled from 'styled-components';

interface ArticleData {
  content: {
    english: string[];
    korean: string[];
  };
  keywords: Array<{
    example: string;
    meaning: string;
    synonyms: string[];
    word: string;
  }>;
  timestamp: Timestamp;
  title: {
    english: string;
    korean: string;
  };
  url: string;
}

// Color palette based on #990033 (burgundy)
const colors = {
  primary: '#990033',
  primaryLight: '#cc0044',
  primaryDark: '#800029',
  primaryPale: '#ffebf0',
  primaryBg: '#fff5f7',
  text: {
    dark: '#2d2d2d',
    medium: '#4a4a4a',
    light: '#6e6e6e'
  }
};

const ArticleContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  background: #ffffff;
  min-height: 100vh;
`;

const Title = styled.h1`
  font-size: 2rem;
  margin: 2rem 0;
  color: ${colors.text.dark};
  font-weight: 700;
  line-height: 1.2;
  cursor: pointer;
  
  &:hover {
    color: ${colors.primary};
  }
`;

const Subtitle = styled.h2<{ isVisible: boolean }>`
  font-size: 1.8rem;
  margin-bottom: 2rem;
  color: ${colors.text.medium};
  font-weight: 500;
  line-height: 1.3;
  max-height: ${props => props.isVisible ? '200px' : '0'};
  overflow: hidden;
  opacity: ${props => props.isVisible ? 1 : 0};
  transition: all 0.3s ease;
  margin-top: ${props => props.isVisible ? '0.5rem' : '0'};
`;

const SectionTitle = styled.h3`
  font-size: 1.4rem;
  margin-bottom: 1.5rem;
  color: ${colors.primary};
  font-weight: 600;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid ${colors.primaryPale};
`;

const ContentSection = styled.div`
  margin-bottom: 3.5rem;
  width: 100%;
`;

const Paragraph = styled.p`
  font-size: 1.1rem;
  line-height: 1.8;
  margin-bottom: 1rem;
  color: ${colors.text.dark};
  font-weight: 400;
  cursor: pointer;
  
  &:hover {
    color: ${colors.primary};
  }
`;

const KoreanParagraph = styled.p<{ isVisible: boolean }>`
  font-size: 1.1rem;
  line-height: 1.8;
  margin-bottom: ${props => props.isVisible ? '1rem' : '0'};
  color: ${colors.text.dark};
  font-weight: 400;
  background: ${colors.primaryBg};
  padding: 0.8rem;
  border-radius: 8px;
  max-height: ${props => props.isVisible ? '500px' : '0'};
  opacity: ${props => props.isVisible ? 1 : 0};
  overflow: hidden;
  transition: all 0.3s ease;
  margin-top: ${props => props.isVisible ? '0.4rem' : '0'};
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  font-size: 1.2rem;
  color: ${colors.text.medium};
  background: #ffffff;
`;

const ErrorContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  font-size: 1.2rem;
  color: ${colors.primary};
  background: #ffffff;
`;

const KeywordsSection = styled.div`
  margin-bottom: 3rem;
  position: relative;
  width: 100%;
  box-sizing: border-box;
  display: block;
`;

const KeywordsContainer = styled.div`
  position: relative;
  width: 100%;
  margin: 0;
  overflow: visible;
  box-sizing: border-box;
  display: block;
`;

const KeywordsSlider = styled.div`
  display: flex;
  overflow-x: hidden;
  scroll-behavior: smooth;
  padding: 1rem 0;
  width: 100%;
  box-sizing: border-box;
  
  /* Add extra space at the end to ensure last cards are fully visible */
  &::after {
    content: '';
    flex: 0 0 20px;
  }
`;

const KeywordCard = styled.div`
  flex: 0 0 250px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
  padding: 1.2rem;
  margin-right: 0.5rem;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  border-left: 3px solid ${colors.primary};
  box-sizing: border-box;
  cursor: pointer;
  
  &:first-child {
    margin-left: 0;
  }
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.09);
  }
`;

const Word = styled.h4`
  font-size: 1.2rem;
  font-weight: 700;
  color: ${colors.primary};
  margin-bottom: 0.5rem;
`;

const Meaning = styled.p`
  font-size: 0.8rem;
  color: ${colors.text.dark};
  line-height: 1.5;
  margin-bottom: 0.8rem;
`;

const Synonyms = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.8rem;
`;

const Synonym = styled.span`
  font-size: 0.7rem;
  background: ${colors.primaryPale};
  color: ${colors.primaryDark};
  padding: 0.2rem 0.5rem;
  border-radius: 30px;
  font-weight: 500;
`;

const Example = styled.div`
  font-size: 0.8rem;
  font-style: italic;
  color: ${colors.text.medium};
  line-height: 1.5;
  padding-top: 0.6rem;
  border-top: 1px dashed ${colors.primaryPale};
`;

const SliderButton = styled.button`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: white;
  color: ${colors.primary};
  border: 1px solid ${colors.primaryPale};
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 20;
  transition: all 0.2s ease;
  
  &:hover {
    background: white;
    color: ${colors.primaryLight};
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
  }
  
  &:disabled {
    color: ${colors.text.light};
    border-color: #e0e0e0;
    cursor: not-allowed;
  }
`;

const NextButton = styled(SliderButton)`
  right: -18px;
  
  &::after {
    content: '›';
    font-size: 1.5rem;
    line-height: 1;
    font-weight: 300;
  }
`;

const PrevButton = styled(SliderButton)`
  left: -18px;
  
  &::after {
    content: '‹';
    font-size: 1.5rem;
    line-height: 1;
    font-weight: 300;
  }
`;

// Modal components for keyword popup
const ModalOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  opacity: ${props => props.isOpen ? 1 : 0};
  visibility: ${props => props.isOpen ? 'visible' : 'hidden'};
  transition: opacity 0.3s ease, visibility 0.3s ease;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
  padding: 2rem;
  max-width: 90%;
  width: 500px;
  position: relative;
  transform: scale(1);
  transition: transform 0.3s ease;
  border-left: 5px solid ${colors.primary};
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  color: ${colors.text.medium};
  cursor: pointer;
  padding: 0.3rem;
  line-height: 1;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    color: ${colors.primary};
    background: ${colors.primaryPale};
  }
`;

const ModalWord = styled.h3`
  font-size: 1.8rem;
  font-weight: 700;
  color: ${colors.primary};
  margin-bottom: 1rem;
`;

const ModalMeaning = styled.p`
  font-size: 1.1rem;
  color: ${colors.text.dark};
  line-height: 1.6;
  margin-bottom: 1.5rem;
`;

const ModalSynonyms = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 1.5rem;
`;

const ModalSynonym = styled.span`
  font-size: 0.9rem;
  background: ${colors.primaryPale};
  color: ${colors.primaryDark};
  padding: 0.3rem 0.8rem;
  border-radius: 30px;
  font-weight: 500;
`;

const ModalExample = styled.div`
  font-size: 1rem;
  font-style: italic;
  color: ${colors.text.medium};
  line-height: 1.6;
  padding-top: 1rem;
  border-top: 1px dashed ${colors.primaryPale};
`;

const Article = () => {
  const { articleId } = useParams<{ articleId: string }>();
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isKoreanTitleVisible, setIsKoreanTitleVisible] = useState(false);
  const [visibleKoreanParagraphs, setVisibleKoreanParagraphs] = useState<number[]>([]);
  const [currentKeywordIndex, setCurrentKeywordIndex] = useState(0);
  const [selectedKeyword, setSelectedKeyword] = useState<ArticleData['keywords'][0] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!articleId) return;

      try {
        const articleRef = doc(db, 'articles', articleId);
        const articleSnap = await getDoc(articleRef);

        if (articleSnap.exists()) {
          const data = articleSnap.data() as ArticleData;
          setArticle(data);
        } else {
          setError('Article not found');
        }
      } catch (err) {
        setError('Error fetching article');
        console.error('Error fetching article:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [articleId]);

  const toggleKoreanTitle = () => {
    setIsKoreanTitleVisible(!isKoreanTitleVisible);
  };

  const toggleKoreanParagraph = (index: number) => {
    setVisibleKoreanParagraphs(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index) 
        : [...prev, index]
    );
  };

  const handleLastKeyword = () => {
    if (!article?.keywords || article.keywords.length <= 1) return;
    
    // Calculate exactly how many cards we need to show - set to the last keyword
    const totalCards = article.keywords.length;
    const lastIndex = totalCards - 1;
    
    setCurrentKeywordIndex(lastIndex);
    
    if (sliderRef.current) {
      // Account for card width and the margins between cards (0.5rem = 8px)
      const cardWidth = 250;
      const marginWidth = 8;
      
      // Calculate exact position to show the last card at the left
      const scrollPosition = lastIndex * (cardWidth + marginWidth);
      
      sliderRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  };

  const handleNextKeyword = () => {
    if (!article?.keywords) return;
    
    // Calculate the maximum index based on visible cards
    const maxIndex = Math.max(0, article.keywords.length - 1);
    
    // Special case for the second-to-last position
    if (currentKeywordIndex === maxIndex - 1) {
      return handleLastKeyword();
    }
    
    // Allow scrolling all the way to the last keyword
    if (currentKeywordIndex >= maxIndex) return;
    
    const nextIndex = currentKeywordIndex + 1;
    setCurrentKeywordIndex(nextIndex);
    
    if (sliderRef.current) {
      // Account for card width and the margins between cards (0.5rem = 8px)
      const cardWidth = 250;
      const marginWidth = 8;
      
      // Calculate exact position (each card has margin-right except the last one)
      const scrollPosition = nextIndex * (cardWidth + marginWidth);
      
      sliderRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  };

  const handlePrevKeyword = () => {
    if (currentKeywordIndex <= 0) return;
    
    const prevIndex = currentKeywordIndex - 1;
    setCurrentKeywordIndex(prevIndex);
    
    if (sliderRef.current) {
      // Account for card width and the margins between cards (0.5rem = 8px)
      const cardWidth = 250;
      const marginWidth = 8;
      
      // Calculate exact position (each card has margin-right except the last one)
      const scrollPosition = prevIndex * (cardWidth + marginWidth);
      
      sliderRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  };

  const openKeywordModal = (keyword: ArticleData['keywords'][0]) => {
    setSelectedKeyword(keyword);
    setIsModalOpen(true);
    // Prevent scrolling on the body when modal is open
    document.body.style.overflow = 'hidden';
  };

  const closeKeywordModal = () => {
    setIsModalOpen(false);
    // Re-enable scrolling when modal is closed
    document.body.style.overflow = '';
  };

  // Close modal when Escape key is pressed
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isModalOpen) {
        closeKeywordModal();
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
      // Make sure to reset body overflow in case component unmounts while modal is open
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  if (loading) return <LoadingContainer>Loading article...</LoadingContainer>;
  if (error) return <ErrorContainer>Error: {error}</ErrorContainer>;
  if (!article) return <ErrorContainer>No article found</ErrorContainer>;

  const { content = { english: [], korean: [] }, keywords = [] } = article;
  
  // Update next button visibility logic to ensure it stays visible until the last card
  const hasMoreKeywords = currentKeywordIndex < keywords.length - 1;
  // Check if we're near the end but not at the very last card
  const isAtLastButNotEnd = currentKeywordIndex >= keywords.length - 3 && currentKeywordIndex < keywords.length - 1;
  const hasPrevKeywords = currentKeywordIndex > 0;

  return (
    <ArticleContainer>
      <Title onClick={toggleKoreanTitle}>{article.title.english}</Title>
      <Subtitle isVisible={isKoreanTitleVisible}>{article.title.korean}</Subtitle>

      {content.english?.length > 0 && (
        <ContentSection>
          <SectionTitle>Content</SectionTitle>
          {content.english.map((paragraph, index) => (
            <div key={index}>
              <Paragraph onClick={() => toggleKoreanParagraph(index)}>{paragraph}</Paragraph>
              {content.korean[index] && (
                <KoreanParagraph isVisible={visibleKoreanParagraphs.includes(index)}>
                  {content.korean[index]}
                </KoreanParagraph>
              )}
            </div>
          ))}
        </ContentSection>
      )}

      {keywords && keywords.length > 0 && (
        <KeywordsSection>
          <SectionTitle>Key Vocabulary</SectionTitle>
          <KeywordsContainer>
            <KeywordsSlider ref={sliderRef}>
              {keywords.map((keyword, index) => (
                <KeywordCard 
                  key={index} 
                  onClick={() => openKeywordModal(keyword)}
                >
                  <Word>{keyword.word}</Word>
                  <Meaning>{keyword.meaning}</Meaning>
                  <Synonyms>
                    {keyword.synonyms.map((syn, idx) => (
                      <Synonym key={idx}>{syn}</Synonym>
                    ))}
                  </Synonyms>
                  <Example>"{keyword.example}"</Example>
                </KeywordCard>
              ))}
            </KeywordsSlider>
            {hasPrevKeywords && (
              <PrevButton 
                onClick={handlePrevKeyword} 
                aria-label="Previous keyword" 
              />
            )}
            {hasMoreKeywords && (
              <NextButton 
                onClick={isAtLastButNotEnd ? handleLastKeyword : handleNextKeyword} 
                aria-label="Next keyword" 
              />
            )}
          </KeywordsContainer>
        </KeywordsSection>
      )}

      {/* Keyword modal */}
      <ModalOverlay isOpen={isModalOpen} onClick={closeKeywordModal}>
        <ModalContent onClick={(e) => e.stopPropagation()}>
          <CloseButton onClick={closeKeywordModal}>×</CloseButton>
          {selectedKeyword && (
            <>
              <ModalWord>{selectedKeyword.word}</ModalWord>
              <ModalMeaning>{selectedKeyword.meaning}</ModalMeaning>
              <ModalSynonyms>
                {selectedKeyword.synonyms.map((syn, idx) => (
                  <ModalSynonym key={idx}>{syn}</ModalSynonym>
                ))}
              </ModalSynonyms>
              <ModalExample>"{selectedKeyword.example}"</ModalExample>
            </>
          )}
        </ModalContent>
      </ModalOverlay>
    </ArticleContainer>
  );
};

export default Article;
