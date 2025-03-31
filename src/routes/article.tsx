import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, Timestamp, updateDoc, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';

interface ArticleData {
  content: {
    english: string[];
    korean: string[];
  };
  keywords: string[]; // Changed to just array of word strings
  timestamp: Timestamp;
  title: {
    english: string;
    korean: string;
  };
  url: string;
}

interface WordData {
  categories: {
    english: string[];
    korean: string[];
  };
  definitions: {
    english: string;
    korean: string;
  };
  examples: Array<{
    english: string[];
    korean: string[];
  }>;
  synonyms: string[];
  antonyms: string[];
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
  position: relative;
  
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
    padding: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: transparent;
    
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

// Add new styled components for the improved modal layout
const ModalSection = styled.div`
  margin-bottom: 1.5rem;
  
  @media (max-width: 768px) {
    margin-bottom: 1.2rem;
  }
`;

const ModalSectionTitle = styled.div`
  font-size: 0.85rem;
  color: ${colors.text.light};
  margin-bottom: 0.5rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;


const DualText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const KoreanText = styled.div`
  font-size: 0.95rem;
  color: ${colors.text.medium};
  line-height: 1.5;
  position: relative;
  padding-left: 0.8rem;
  font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 2px;
    background: ${colors.accent};
    border-radius: 2px;
  }
  
  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const ExampleKoreanText = styled(KoreanText)`
  font-style: normal;
  margin-top: 0.5rem;
  padding-left: 0.8rem;
  font-size: 0.9rem;
  opacity: 0.9;
`;

const ModalSynonyms = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
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

// Update the ModalWord component for better styling
const ModalWord = styled.h3`
  font-size: 2rem;
  font-weight: 700;
  color: ${colors.primary};
  margin-bottom: 0.3rem;
  
  @media (max-width: 768px) {
    font-size: 1.7rem;
  }
`;

// Update the ModalMeaning component
const ModalMeaning = styled.p`
  font-size: 1.1rem;
  color: ${colors.text.dark};
  line-height: 1.6;
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

// Update the Example component
const ModalExample = styled.div`
  font-size: 1rem;
  font-style: italic;
  color: ${colors.text.medium};
  line-height: 1.6;
  
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

// Update the ProfileButton component to be positioned at the top and include text
const ProfileButton = styled.button`
  background: transparent;
  color: ${colors.text.medium};
  border: 1px solid ${colors.primaryPale};
  border-radius: 20px;
  padding: 0.4rem 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  font-size: 0.9rem;
  margin-top: 0.5rem;
  
  @media (max-width: 768px) {
    font-size: 0.85rem;
    padding: 0.3rem 0.7rem;
    top: 1rem;
    right: 1rem;
  }
  
  @media (max-width: 480px) {
    top: 0.8rem;
    right: 0.8rem;
  }
  
  &:hover {
    background: ${colors.primaryPale};
    transform: translateY(-1px);
  }
`;

// Modify the InfoContainer to add space for the profile button
const InfoContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  gap: 0.8rem;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    gap: 0.6rem;
  }
`;

// Keywords display components
const Categories = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-bottom: 0.5rem;
`;

const Category = styled.span`
  font-size: 0.65rem;
  background: ${colors.accent};
  color: white;
  padding: 0.1rem 0.4rem;
  border-radius: 30px;
  font-weight: 500;
`;

const SaveButton = styled.button`
  border: none;
  background-color: ${colors.primaryDark};
  color: white;
  font-size: 0.9rem;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  margin-left: 1rem;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  
  &:hover {
    background-color: ${colors.primary};
    transform: translateY(-1px);
    box-shadow: 0 3px 6px rgba(0,0,0,0.15);
  }
  
  &:disabled {
    background-color: #cccccc;
    cursor: default;
    transform: none;
    box-shadow: none;
    opacity: 0.7;
  }
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
    padding: 0.3rem 0.7rem;
  }
`;

const SavedIndicator = styled.div`
  display: inline-flex;
  align-items: center;
  color: ${colors.accent};
  font-size: 0.9rem;
  margin-left: 1rem;
  font-weight: 500;
  
  &::before {
    content: '✓';
    margin-right: 0.3rem;
    font-weight: bold;
  }
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
  }
`;

const WordTitleRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.3rem;
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
  const { currentUser } = useAuth(); // Get the current user from auth context
  const navigate = useNavigate(); // Add this line to import useNavigate
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isKoreanTitleVisible, setIsKoreanTitleVisible] = useState(false);
  const [visibleKoreanParagraphs, setVisibleKoreanParagraphs] = useState<number[]>([]);
  const [currentKeywordIndex, setCurrentKeywordIndex] = useState(0);
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [selectedWordData, setSelectedWordData] = useState<WordData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isQuickReading, setIsQuickReading] = useState(false);
  const [wordDetails, setWordDetails] = useState<Record<string, WordData>>({});
  const [wordLoading, setWordLoading] = useState<Record<string, boolean>>({});
  const [savedWords, setSavedWords] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!articleId) return;

      try {
        const articleRef = doc(db, 'articles', articleId);
        const articleSnap = await getDoc(articleRef);

        if (articleSnap.exists()) {
          const data = articleSnap.data() as ArticleData;
          setArticle(data);
          
          // Prefetch word details for all keywords
          if (data.keywords && data.keywords.length > 0) {
            data.keywords.forEach(word => {
              fetchWordDetails(word);
            });
          }
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

  // Fetch user's saved words when user changes
  useEffect(() => {
    const fetchSavedWords = async () => {
      if (!currentUser) {
        setSavedWords([]);
        return;
      }
      
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setSavedWords(userData.saved_words || []);
        } else {
          // Create user document if it doesn't exist
          await setDoc(userRef, {
            saved_words: []
          });
          setSavedWords([]);
        }
      } catch (err) {
        console.error('Error fetching saved words:', err);
        setSavedWords([]);
      }
    };
    
    fetchSavedWords();
  }, [currentUser]);

  const fetchWordDetails = async (word: string) => {
    // Skip if already fetched or currently fetching
    if (wordDetails[word] || wordLoading[word]) return;
    
    setWordLoading(prev => ({ ...prev, [word]: true }));
    
    // Set a timeout to ensure wordLoading is reset even if the fetch operation fails
    const timeoutId = setTimeout(() => {
      setWordLoading(prev => {
        // Only reset if it's still loading (operation didn't complete)
        if (prev[word]) {
          console.error(`Fetch timeout for word "${word}"`);
          return { ...prev, [word]: false };
        }
        return prev;
      });
    }, 5000); // 5 seconds timeout
    
    try {
      const wordRef = doc(db, 'words', word);
      const wordSnap = await getDoc(wordRef);
      
      if (wordSnap.exists()) {
        const wordData = wordSnap.data() as WordData;
        setWordDetails(prev => ({ ...prev, [word]: wordData }));
      } else {
        console.error(`Word "${word}" not found in the database`);
      }
    } catch (err) {
      console.error(`Error fetching word "${word}":`, err);
    } finally {
      clearTimeout(timeoutId); // Clear the timeout as the operation completed
      setWordLoading(prev => ({ ...prev, [word]: false }));
    }
  };

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

  const openKeywordModal = async (word: string) => {
    setSelectedKeyword(word);
    
    // Get word details if not already loaded
    if (!wordDetails[word]) {
      await fetchWordDetails(word);
    }
    
    setSelectedWordData(wordDetails[word] || null);
    setIsModalOpen(true);
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

  const handleSaveWord = async (word: string) => {
    if (!currentUser || isSaving) return;
    
    setIsSaving(true);
    
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      
      if (savedWords.includes(word)) {
        // Remove word if already saved
        await updateDoc(userRef, {
          saved_words: arrayRemove(word)
        });
        setSavedWords(prevWords => prevWords.filter(w => w !== word));
      } else {
        // Add word if not saved
        await updateDoc(userRef, {
          saved_words: arrayUnion(word)
        });
        setSavedWords(prevWords => [...prevWords, word]);
      }
    } catch (err) {
      console.error('Error saving word:', err);
      alert('단어 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // Add a navigation function
  const navigateToProfile = () => {
    navigate('/profile');
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
      <ProfileButton onClick={navigateToProfile} aria-label="Go to profile">
        👤 내 계정
      </ProfileButton>
      
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
              {keywords.map((word, index) => {
                const wordData = wordDetails[word];
                // Skip rendering cards that have failed to load or are still loading
                const isLoading = wordLoading[word];
                if (!wordData && !isLoading) return null;
                
                return (
                  <KeywordCard 
                    key={index} 
                    onClick={() => openKeywordModal(word)}
                  >
                    <Word>{word}</Word>
                    {wordData && (
                      <>
                        {wordData.categories?.english && wordData.categories.english.length > 0 && (
                          <Categories>
                            {wordData.categories.english.slice(0, 2).map((cat, idx) => (
                              <Category key={idx}>{cat}</Category>
                            ))}
                          </Categories>
                        )}
                        <Meaning>{wordData.definitions.english}</Meaning>
                        {wordData.synonyms && wordData.synonyms.length > 0 && (
                          <Synonyms>
                            {wordData.synonyms.slice(0, 3).map((syn, idx) => (
                              <Synonym key={idx}>{syn}</Synonym>
                            ))}
                          </Synonyms>
                        )}
                        {wordData.examples && wordData.examples.length > 0 && wordData.examples[0].english.length > 0 && (
                          <Example>"{wordData.examples[0].english[0]}"</Example>
                        )}
                      </>
                    )}
                    {isLoading && <Meaning>Loading word details...</Meaning>}
                  </KeywordCard>
                );
              })}
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
          {selectedKeyword && selectedWordData && (
            <>
              <WordTitleRow>
                <ModalWord>{selectedKeyword}</ModalWord>
                {currentUser ? (
                  savedWords.includes(selectedKeyword) ? (
                    <SavedIndicator>저장됨</SavedIndicator>
                  ) : (
                    <SaveButton 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveWord(selectedKeyword);
                      }}
                      disabled={isSaving}
                    >
                      {isSaving ? '저장 중...' : '⭐️ 단어장에 추가'}
                    </SaveButton>
                  )
                ) : null}
              </WordTitleRow>
              
              {/* Categories */}
              {selectedWordData.categories?.english && selectedWordData.categories.english.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.2rem' }}>
                  {selectedWordData.categories.english.map((category, idx) => (
                    <span 
                      key={idx} 
                      style={{ 
                        fontSize: '0.8rem', 
                        color: colors.accent, 
                        backgroundColor: colors.primaryPale,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        fontStyle: 'italic'
                      }}
                    >
                      {category}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Definition Section */}
              <ModalSection>
                <ModalSectionTitle>Definition</ModalSectionTitle>
                <DualText>
                  <ModalMeaning>{selectedWordData.definitions.english}</ModalMeaning>
                  <KoreanText>{selectedWordData.definitions.korean}</KoreanText>
                </DualText>
              </ModalSection>
              
              {/* Synonyms Section */}
              {selectedWordData.synonyms && selectedWordData.synonyms.length > 0 && (
                <ModalSection>
                  <ModalSectionTitle>Synonyms</ModalSectionTitle>
                  <ModalSynonyms>
                    {selectedWordData.synonyms.map((syn, idx) => (
                      <ModalSynonym key={idx}>{syn}</ModalSynonym>
                    ))}
                  </ModalSynonyms>
                </ModalSection>
              )}
              
              {/* Antonyms Section */}
              {selectedWordData.antonyms && selectedWordData.antonyms.length > 0 && (
                <ModalSection>
                  <ModalSectionTitle>Antonyms</ModalSectionTitle>
                  <ModalSynonyms>
                    {selectedWordData.antonyms.map((ant, idx) => (
                      <ModalSynonym key={idx}>{ant}</ModalSynonym>
                    ))}
                  </ModalSynonyms>
                </ModalSection>
              )}
              
              {/* Examples Section */}
              {selectedWordData.examples && selectedWordData.examples.length > 0 && (
                <ModalSection>
                  <ModalSectionTitle>Examples</ModalSectionTitle>
                  <div style={{ 
                    borderRadius: '8px',
                    padding: '0.5rem 0'
                  }}>
                    {selectedWordData.examples[0].english.map((example, idx) => (
                      <div key={idx} style={{ 
                        marginBottom: idx < selectedWordData.examples[0].english.length - 1 ? '1.2rem' : 0,
                        paddingBottom: idx < selectedWordData.examples[0].english.length - 1 ? '1.2rem' : 0,
                        borderBottom: idx < selectedWordData.examples[0].english.length - 1 ? `1px solid ${colors.primaryPale}` : 'none'
                      }}>
                        <ModalExample>"{example}"</ModalExample>
                        {selectedWordData.examples[0].korean && selectedWordData.examples[0].korean[idx] && (
                          <ExampleKoreanText>
                            {selectedWordData.examples[0].korean[idx]}
                          </ExampleKoreanText>
                        )}
                      </div>
                    ))}
                  </div>
                </ModalSection>
              )}
            </>
          )}
          {selectedKeyword && !selectedWordData && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div style={{ 
                fontSize: '1.2rem', 
                color: colors.text.medium, 
                marginBottom: '0.5rem' 
              }}>
                Loading details...
              </div>
              <div style={{
                width: '40px',
                height: '40px',
                margin: '1rem auto',
                border: `3px solid ${colors.primaryPale}`,
                borderTop: `3px solid ${colors.accent}`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}></div>
              <style>
                {`
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}
              </style>
            </div>
          )}
        </ModalContent>
      </ModalOverlay>
    </ArticleContainer>
  );
};

export default Article;
