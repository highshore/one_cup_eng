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

// Color palette based on #2C1810 (Rich coffee brown)
const colors = {
  primary: '#2C1810',
  primaryLight: '#4A2F23',
  primaryDark: '#1A0F0A',
  primaryPale: '#F5EBE6',
  primaryBg: '#FDF9F6',
  accent: '#C8A27A',
  text: {
    dark: '#2C1810',
    medium: '#4A2F23',
    light: '#8B6B4F'
  }
};

const ArticleContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  min-height: 100vh;
  font-family: 'Avenir', 'Avenir Next', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
  
  @media (max-width: 768px) {
    padding: 1.5rem 1rem;
    width: 100%;
    min-height: auto; /* Fix for mobile height issues */
    overflow-x: hidden;
  }
  
  @media (max-width: 480px) {
    padding: 1.2rem 0.8rem;
  }
`;

const Title = styled.h1`
  font-size: 2.2rem;
  margin: 2rem 0 0 0;
  color: ${colors.text.dark};
  font-weight: 700;
  line-height: 1.2;
  cursor: pointer;
  font-family: 'Avenir', 'Avenir Next', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  
  @media (max-width: 768px) {
    font-size: 1.8rem;
    margin: 1.5rem 0 0 0;
  }
  
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
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
  }
`;

const CalloutBox = styled.div`
  background: linear-gradient(135deg, ${colors.primaryPale} 0%, ${colors.primaryBg} 100%);
  padding: 1.2rem 1.5rem;
  border-radius: 20px;
  margin-bottom: 2rem;
  font-size: 0.95rem;
  color: ${colors.text.medium};
  border: 1px dotted ${colors.accent};
  display: flex;
  align-items: center;
  gap: 0.8rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  
  @media (max-width: 768px) {
    font-size: 0.9rem;
    margin-bottom: 1.5rem;
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  }
  
  &::before {
    content: '✨';
    font-size: 1.4rem;
    background: ${colors.accent};
    padding: 0.5rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(200, 162, 122, 0.2);
    
    @media (max-width: 768px) {
      font-size: 1.2rem;
      padding: 0.4rem;
    }
  }
`;

const ReadingTime = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${colors.text.medium};
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
  background: ${colors.primaryPale};
  border-radius: 20px;
  height: 2.2rem;
  box-sizing: border-box;
  
  &::before {
    content: '⏱';
    font-size: 1.1rem;
  }
  
  @media (max-width: 768px) {
    font-size: 0.85rem;
    padding: 0.4rem 0.8rem;
    height: 2rem;
  }
`;

const SectionTitle = styled.h3`
  font-size: 1.4rem;
  margin-bottom: 1.5rem;
  color: ${colors.primary};
  font-weight: 600;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid ${colors.primaryPale};
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
    margin-bottom: 1.2rem;
  }
`;

const ContentSection = styled.div`
  margin-bottom: 2rem;
  width: 100%;
  background: ${colors.primaryBg};
`;

const Paragraph = styled.p`
  font-size: 1.1rem;
  line-height: 1.8;
  color: ${colors.text.dark};
  font-weight: 400;
  cursor: pointer;
  
  @media (max-width: 768px) {
    font-size: 1.3rem;
    line-height: 1.7;
  }
  
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
  background: ${colors.primaryPale};
  padding: 1.2rem;
  border-radius: 8px;
  max-height: ${props => props.isVisible ? '500px' : '0'};
  opacity: ${props => props.isVisible ? 1 : 0};
  overflow: hidden;
  transition: all 0.3s ease;
  margin-top: ${props => props.isVisible ? '0.4rem' : '0'};
  border-left: 3px solid ${colors.accent};
  
  @media (max-width: 768px) {
    font-size: 1rem;
    line-height: 1.7;
    padding: 1rem;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  font-size: 1.2rem;
  color: ${colors.text.medium};
  background: ${colors.primaryBg};
`;

const ErrorContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  font-size: 1.2rem;
  color: ${colors.primary};
  background: ${colors.primaryBg};
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
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  
  @media (max-width: 768px) {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch; /* for smoother scrolling on iOS */
    scrollbar-width: none; /* Firefox */
    &::-webkit-scrollbar {
      display: none; /* Chrome, Safari and Opera */
    }
  }
  
  &:active {
    cursor: grabbing;
  }
  
  /* Add extra space at the end to ensure last cards are fully visible */
  &::after {
    content: '';
    flex: 0 0 20px;
  }
`;

const KeywordCard = styled.div`
  flex: 0 0 250px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.05);
  padding: 1.2rem;
  margin-right: 0.5rem;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  border: 1px solid ${colors.primaryPale};
  border-left: 3px solid ${colors.accent};
  box-sizing: border-box;
  cursor: pointer;
  
  @media (max-width: 768px) {
    flex: 0 0 230px;
    padding: 1rem;
  }
  
  &:first-child {
    margin-left: 0;
  }
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
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
  
  @media (max-width: 768px) {
    width: 32px;
    height: 32px;
  }
  
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
  
  @media (max-width: 768px) {
    right: -16px;
  }
  
  &::after {
    content: '›';
    font-size: 1.5rem;
    line-height: 1;
    font-weight: 300;
  }
`;

const PrevButton = styled(SliderButton)`
  left: -18px;
  
  @media (max-width: 768px) {
    left: -16px;
  }
  
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
  -webkit-overflow-scrolling: touch; /* Better scrolling on iOS */
  touch-action: none; /* Prevent scrolling behind modal */
`;

const ModalContent = styled.div`
  background: ${colors.primaryBg};
  border-radius: 12px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
  padding: 2rem;
  max-width: 90%;
  width: 500px;
  position: relative;
  transform: scale(1);
  transition: transform 0.3s ease;
  border-left: 5px solid ${colors.accent};
  border: 1px solid ${colors.primaryPale};
  overflow-y: auto; /* Allow scrolling within modal if content is too tall */
  max-height: 90vh; /* Limit height on small screens */
  
  @media (max-width: 768px) {
    padding: 1.5rem;
    width: 85%;
    max-height: 80vh;
  }
  
  @media (max-width: 480px) {
    padding: 1.2rem;
    width: 90%;
    max-height: 75vh;
  }
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
  
  @media (max-width: 768px) {
    top: 0.8rem;
    right: 0.8rem;
  }
  
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
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const ModalMeaning = styled.p`
  font-size: 1.1rem;
  color: ${colors.text.dark};
  line-height: 1.6;
  margin-bottom: 1.5rem;
  
  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 1.2rem;
  }
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
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
    padding: 0.25rem 0.6rem;
  }
`;

const ModalExample = styled.div`
  font-size: 1rem;
  font-style: italic;
  color: ${colors.text.medium};
  line-height: 1.6;
  padding-top: 1rem;
  border-top: 1px dashed ${colors.primaryPale};
  
  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const QuickReadingToggle = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: ${colors.primary};
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  cursor: pointer;
  height: 2.2rem;
  box-sizing: border-box;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  
  @media (max-width: 768px) {
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
    height: 2rem;
  }
  
  &:hover {
    background: ${colors.primaryLight};
    transform: translateY(-1px);
  }
  
  &.active {
    background: ${colors.accent};
  }
`;

const InfoContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  gap: 0.8rem;
  
  @media (max-width: 768px) {
    gap: 0.6rem;
  }
`;

const highlightFirstLetters = (text: string): string => {
  // Split text into words, preserving punctuation
  const words = text.split(/(\s+|[.,!?;:'"()\[\]{}—\-])/);
  
  return words.map(word => {
    // Skip if it's just whitespace or punctuation
    if (!word.trim() || /^[.,!?;:'"()\[\]{}—\-]$/.test(word)) {
      return word;
    }
    
    // Calculate how many letters to highlight
    const highlightCount = Math.max(1, Math.min(5, Math.floor(word.length / 2)));
    
    // Split the word into highlighted and non-highlighted parts
    const highlighted = word.slice(0, highlightCount);
    const rest = word.slice(highlightCount);
    
    // Return the word with highlighted part
    return `<span class="highlighted">${highlighted}</span>${rest}`;
  }).join('');
};

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
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isQuickReading, setIsQuickReading] = useState(false);

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

  useEffect(() => {
    if (isQuickReading && article) {
      // Get all text content elements
      const textElements = document.querySelectorAll('.article-text');
      
      textElements.forEach(element => {
        const originalText = element.getAttribute('data-original-text') || element.textContent || '';
        element.innerHTML = highlightFirstLetters(originalText);
      });
    } else {
      // Restore original text
      const textElements = document.querySelectorAll('.article-text');
      textElements.forEach(element => {
        const originalText = element.getAttribute('data-original-text') || '';
        element.textContent = originalText;
      });
    }
  }, [isQuickReading, article]);

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
      // Determine card width based on screen size
      const isMobile = window.innerWidth <= 768;
      const cardWidth = isMobile ? 230 : 250;
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
      // Determine card width based on screen size
      const isMobile = window.innerWidth <= 768;
      const cardWidth = isMobile ? 230 : 250;
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
      // Determine card width based on screen size
      const isMobile = window.innerWidth <= 768;
      const cardWidth = isMobile ? 230 : 250;
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!sliderRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - sliderRef.current.offsetLeft);
    setScrollLeft(sliderRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !sliderRef.current) return;
    e.preventDefault();
    const x = e.pageX - sliderRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    sliderRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!sliderRef.current) return;
    setIsDragging(true);
    setStartX(e.touches[0].pageX - sliderRef.current.offsetLeft);
    setScrollLeft(sliderRef.current.scrollLeft);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !sliderRef.current) return;
    const x = e.touches[0].pageX - sliderRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    sliderRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const calculateReadingTime = (content: string[]): string => {
    const totalWords = content.reduce((acc, paragraph) => {
      return acc + paragraph.split(/\s+/).length;
    }, 0);
    
    const readingTimeInSeconds = (totalWords / 150) * 60; // 150 words per minute
    const minutes = Math.floor(readingTimeInSeconds / 60);
    const seconds = Math.round(readingTimeInSeconds % 60);
    
    return `${minutes}분 ${seconds}초`;
  };

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
      <Title onClick={toggleKoreanTitle} className="article-text" data-original-text={article?.title.english}>
        {article?.title.english}
      </Title>
      <Subtitle isVisible={isKoreanTitleVisible} className="article-text" data-original-text={article?.title.korean}>
        {article?.title.korean}
      </Subtitle>
      <InfoContainer>
        <ReadingTime>
          예상 읽기 시간: {calculateReadingTime(content.english)}
        </ReadingTime>
        <QuickReadingToggle 
          onClick={() => setIsQuickReading(!isQuickReading)}
          className={isQuickReading ? 'active' : ''}
        >
          {isQuickReading ? '✕ 속독 모드 해제' : '⚡ 속독 모드'}
        </QuickReadingToggle>
      </InfoContainer>
      <CalloutBox>텍스트를 누르면 한국어 번역을 확인하실 수 있습니다</CalloutBox>

      {content.english?.length > 0 && (
        <ContentSection>
          {content.english.map((paragraph, index) => (
            <div key={index}>
              <Paragraph 
                onClick={() => toggleKoreanParagraph(index)} 
                className="article-text" 
                data-original-text={paragraph}
              >
                {paragraph}
              </Paragraph>
              {content.korean[index] && (
                <KoreanParagraph 
                  isVisible={visibleKoreanParagraphs.includes(index)}
                  className="article-text"
                  data-original-text={content.korean[index]}
                >
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
            <KeywordsSlider 
              ref={sliderRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
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
