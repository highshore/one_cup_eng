import { useEffect, useState, useRef } from "react";
import { styled } from "styled-components";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { getStorage, ref, getDownloadURL } from "firebase/storage";

const ArticleWrapper = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  padding-bottom: 150px; /* Increased padding to make room for the fixed audio player */
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  
  @media (max-width: 768px) {
    padding: 20px 16px;
    padding-bottom: 130px; /* Increase padding for the fixed audio player */
  }
`;

const ArticleHeader = styled.header`
  margin-bottom: 40px;
  border-bottom: 1px solid #eaeaea;
  padding-bottom: 30px;
`;

const ArticleTitle = styled.h1`
  font-size: 2.75rem;
  font-weight: 800;
  line-height: 1.2;
  color: #111827;
  margin-bottom: 24px;
  letter-spacing: -0.02em;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const ArticleMeta = styled.div`
  display: flex;
  align-items: center;
  font-size: 0.95rem;
  color: #6b7280;
  margin-bottom: 8px;
`;

const ArticleDate = styled.span`
  margin-right: 24px;
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 6px;
    height: 16px;
    width: 16px;
  }
`;

const ArticleContent = styled.div`
  line-height: 1.8;
  font-size: 1.15rem;
  color: #374151;
  
  p {
    margin-bottom: 1.5em;
  }
  
  h2 {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 1.5em 0 0.75em;
    color: #111827;
  }
  
  h3 {
    font-size: 1.35rem;
    font-weight: 600;
    margin: 1.25em 0 0.75em;
    color: #111827;
  }
  
  ul, ol {
    margin-left: 1.5em;
    margin-bottom: 1.5em;
  }
  
  li {
    margin-bottom: 0.5em;
  }
  
  blockquote {
    border-left: 4px solid #e5e7eb;
    padding-left: 1em;
    font-style: italic;
    margin: 1.5em 0;
    color: #4b5563;
  }
  
  a {
    color: #2563eb;
    text-decoration: underline;
    text-underline-offset: 2px;
    
    &:hover {
      color: #1e40af;
    }
  }
  
  @media (max-width: 768px) {
    font-size: 1.05rem;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 40px;
  font-size: 1.2rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 12px;
    animation: spin 1.5s linear infinite;
  }
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const ErrorContainer = styled.div`
  background-color: #fef2f2;
  border-radius: 8px;
  padding: 24px;
  margin: 40px 0;
`;

const ErrorMessage = styled.div`
  text-align: center;
  font-size: 1.2rem;
  color: #b91c1c;
  display: flex;
  flex-direction: column;
  align-items: center;
  
  svg {
    margin-bottom: 16px;
    height: 40px;
    width: 40px;
    color: #ef4444;
  }
`;

// New audio player styled components
const AudioPlayerContainer = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  z-index: 100;
  background-color: rgba(255, 255, 255, 0.95);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  padding: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  
  /* Center the player with a max-width */
  max-width: 800px;
  margin: 0 auto;
  
  /* Rounded corners at the top for better aesthetics */
  border-top-left-radius: 15px;
  border-top-right-radius: 15px;
  
  /* Smooth transition for any changes */
  transition: transform 0.3s ease-in-out;
  
  /* Mobile responsive adjustments */
  @media (max-width: 850px) {
    padding: 12px;
    max-width: 100%;
    border-radius: 0;
  }
  
  /* Always visible but subtle when not in use */
  &:not(:hover) {
    /* Slightly less opaque when not being interacted with */
    background-color: rgba(255, 255, 255, 0.9);
  }
`;

const AudioControlsContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 10px;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background-color: #e5e7eb;
  border-radius: 4px;
  cursor: pointer;
  position: relative;
`;

const ProgressFill = styled.div`
  height: 100%;
  background-color: #4f46e5;
  border-radius: 4px;
  position: absolute;
  top: 0;
  left: 0;
`;

const LanguageTabs = styled.div`
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 24px;
`;

const LanguageTab = styled.button<{ active: boolean }>`
  padding: 12px 24px;
  background: none;
  border: none;
  border-bottom: 2px solid ${props => props.active ? '#2563eb' : 'transparent'};
  color: ${props => props.active ? '#2563eb' : '#6b7280'};
  font-weight: ${props => props.active ? '600' : '400'};
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    color: ${props => props.active ? '#2563eb' : '#4b5563'};
  }
`;

const ParagraphContainer = styled.div`
  margin-bottom: 24px;
  position: relative;
`;

const Paragraph = styled.p`
  line-height: 1.8;
  margin-bottom: 1.5em;
`;

const Word = styled.span<{ active?: boolean, clickable: boolean }>`
  cursor: ${props => props.clickable ? 'pointer' : 'default'};
  background-color: ${props => props.active ? '#FFEB3B' : 'transparent'};
  transition: background-color 0.2s;
  display: inline-block;
  padding: 0 1px;
  border-radius: 2px;
  
  &:hover {
    background-color: ${props => props.clickable ? '#f0f7ff' : 'transparent'};
  }
`;

interface Article {
  url: string;
  timestamp: { seconds: number; nanoseconds: number };
  title: {
    english: string;
    korean?: string;
  };
  content: {
    english: string[];
    korean?: string[];
  };
  audio_timestamps?: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
    word_start_times_seconds: number[];
    word_end_times_seconds: number[];
    [key: string]: any; // Allow for additional dynamic properties
  };
  audio_url?: string;
}

export default function Article() {
  const { articleId } = useParams<{ articleId: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // New state variables
  const [language, setLanguage] = useState<'english' | 'korean'>('english');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  
  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const paragraphRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Add a debug toggle
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!articleId) {
        setError("Article ID is missing");
        setLoading(false);
        return;
      }

      try {
        const articleRef = doc(db, `articles/${articleId}`);
        const articleSnap = await getDoc(articleRef);

        if (articleSnap.exists()) {
          const articleData = articleSnap.data() as Article;
          console.log("===== ARTICLE DATA =====");
          console.log("Article ID:", articleId);
          console.log("Article title:", articleData.title?.english || "No title");
          console.log("Has audio_url:", !!articleData.audio_url);
          console.log("Has audio_timestamps:", !!articleData.audio_timestamps);
          
          // Log the entire audio_timestamps to inspect its structure
          console.log("Raw audio_timestamps:", JSON.stringify(articleData.audio_timestamps, null, 2));
          
          // Check if audio_timestamps is available but might be in a different structure
          if (articleData.audio_timestamps) {
            console.log("Word timestamps length:", articleData.audio_timestamps.word_start_times_seconds?.length || 0);
            console.log("First few word timestamps:", 
              articleData.audio_timestamps.word_start_times_seconds?.slice(0, 5) || "None");
            
            // If audio_timestamps exists but word timestamps arrays are missing or empty, check if they might be in a different format
            if (!articleData.audio_timestamps.word_start_times_seconds || 
                articleData.audio_timestamps.word_start_times_seconds.length === 0) {
              
              console.log("No word timestamps found, checking for other timestamp formats...");
              
              // Look for different property names that might contain the timestamps
              const possibleWordStartProperties = Object.keys(articleData.audio_timestamps).filter(key => 
                key.includes('start') && key.includes('time') && !key.includes('character')
              );
              
              console.log("Possible word start properties:", possibleWordStartProperties);
              
              if (possibleWordStartProperties.length > 0) {
                const firstProperty = possibleWordStartProperties[0];
                console.log(`Found possible word start times in property: ${firstProperty}`);
                
                // Create a compatible structure
                if (Array.isArray(articleData.audio_timestamps[firstProperty]) && 
                    articleData.audio_timestamps[firstProperty].length > 0) {
                  
                  // Find a matching end time property
                  const matchingEndProperty = Object.keys(articleData.audio_timestamps).filter(key => 
                    key.includes('end') && key.includes('time') && !key.includes('character')
                  )[0];
                  
                  if (matchingEndProperty) {
                    console.log(`Found matching word end times in property: ${matchingEndProperty}`);
                    
                    // Initialize the standard properties if they don't exist
                    articleData.audio_timestamps.word_start_times_seconds = 
                      articleData.audio_timestamps[firstProperty];
                    articleData.audio_timestamps.word_end_times_seconds = 
                      articleData.audio_timestamps[matchingEndProperty];
                    
                    console.log("Initialized word timestamps from alternative properties:", {
                      startLength: articleData.audio_timestamps.word_start_times_seconds.length,
                      endLength: articleData.audio_timestamps.word_end_times_seconds.length
                    });
                  }
                }
              }
            }
          } else {
            console.log("No audio timestamps found in article data");
          }
          
          setArticle(articleData);
        } else {
          console.error("Document does not exist");
          setError("Article not found");
        }
      } catch (err) {
        console.error("Error fetching article:", err);
        setError("Failed to load article");
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [articleId]);

  // Get downloadable URL for audio file
  useEffect(() => {
    if (article?.audio_url && article.audio_url.startsWith('gs://')) {
      const storage = getStorage();
      const audioRef = ref(storage, article.audio_url);
      
      getDownloadURL(audioRef)
        .then(url => {
          setAudioSrc(url);
        })
        .catch(error => {
          console.error("Error getting download URL:", error);
          setAudioSrc(null);
        });
    } else if (article?.audio_url) {
      // If it's already a HTTP URL, use it directly
      setAudioSrc(article.audio_url);
    }
  }, [article]);

  // Generate word timestamps from character timestamps if needed
  useEffect(() => {
    if (!article || !article.audio_timestamps) return;
    
    // Check if character timestamps exist but word timestamps don't
    if (article.audio_timestamps.characters?.length > 0 && 
        article.audio_timestamps.character_start_times_seconds?.length > 0 &&
        article.audio_timestamps.character_end_times_seconds?.length > 0 &&
        (!article.audio_timestamps.word_start_times_seconds || 
         article.audio_timestamps.word_start_times_seconds.length === 0)) {
      
      console.log("Generating word timestamps from character timestamps");
      
      const { 
        characters, 
        character_start_times_seconds, 
        character_end_times_seconds 
      } = article.audio_timestamps;
      
      // Create a new copy of the article to avoid mutating the original
      const updatedArticle = { ...article };
      
      // Ensure audio_timestamps exists in the updated article
      if (!updatedArticle.audio_timestamps) {
        updatedArticle.audio_timestamps = {
          characters: [],
          character_start_times_seconds: [],
          character_end_times_seconds: [],
          word_start_times_seconds: [],
          word_end_times_seconds: []
        };
      }
      
      // Arrays to store word start and end times
      const wordStartTimes: number[] = [];
      const wordEndTimes: number[] = [];
      
      let wordStartIndex = 0;
      let isInWord = false;
      let currentWordText = "";
      
      // Iterate through each character to identify word boundaries with improved accuracy
      for (let i = 0; i < characters.length; i++) {
        const char = characters[i];
        
        // Check if the character is a word boundary (space, punctuation, etc.)
        const isWordBoundary = /[\s\.,;:!?'"()\[\]{}]/.test(char);
        
        if (!isInWord && !isWordBoundary) {
          // Start of a new word
          isInWord = true;
          wordStartIndex = i;
          currentWordText = char;
        } else if (isInWord && !isWordBoundary) {
          // Continue building the current word
          currentWordText += char;
        } else if (isInWord && isWordBoundary) {
          // End of a word
          isInWord = false;
          
          // Add start and end times for this word
          // For very short words (less than 3 characters), we might want to adjust the timing
          // to account for potential inaccuracies
          const startTime = character_start_times_seconds[wordStartIndex];
          const endTime = character_end_times_seconds[i - 1];
          
          // Build arrays of word-level timestamps
          wordStartTimes.push(startTime);
          wordEndTimes.push(endTime);
          
          currentWordText = "";
        }
      }
      
      // Handle the case where the text ends with a word (no trailing space)
      if (isInWord && currentWordText.length > 0) {
        // For the last word, make sure it extends to the end of the audio if appropriate
        const startTime = character_start_times_seconds[wordStartIndex];
        // Use the last character's end time
        const endTime = character_end_times_seconds[characters.length - 1];
        
        wordStartTimes.push(startTime);
        wordEndTimes.push(endTime);
      }
      
      console.log("Generated word timestamps from characters:", {
        wordCount: wordStartTimes.length,
        firstFewWords: wordStartTimes.slice(0, 5).map((time, i) => ({
          start: time,
          end: wordEndTimes[i],
          duration: wordEndTimes[i] - time
        })),
        lastFewWords: wordStartTimes.slice(-5).map((time, i) => ({
          start: time,
          end: wordEndTimes[wordStartTimes.length - 5 + i],
          duration: wordEndTimes[wordStartTimes.length - 5 + i] - time
        }))
      });
      
      // Update the article with the generated word timestamps
      if (updatedArticle.audio_timestamps) {
        updatedArticle.audio_timestamps.word_start_times_seconds = wordStartTimes;
        updatedArticle.audio_timestamps.word_end_times_seconds = wordEndTimes;
      }
      
      // Update the article state
      setArticle(updatedArticle);
    }
  }, [article]);

  // Generate fallback timestamps if no character or word timestamps exist
  useEffect(() => {
    if (!article) return;
    
    // Skip if either word or character timestamps already exist
    if (article.audio_timestamps && (
        (article.audio_timestamps.word_start_times_seconds && 
         article.audio_timestamps.word_start_times_seconds.length > 0) ||
        (article.audio_timestamps.characters && 
         article.audio_timestamps.characters.length > 0)
      )) {
      return;
    }
    
    console.log("No word or character timestamps found, generating fallback timestamps");
    
    // Create a new copy of the article to avoid mutating the original
    const updatedArticle = { ...article };
    
    // If there are no audio timestamps object at all, create one
    if (!updatedArticle.audio_timestamps) {
      updatedArticle.audio_timestamps = {
        characters: [],
        character_start_times_seconds: [],
        character_end_times_seconds: [],
        word_start_times_seconds: [],
        word_end_times_seconds: []
      };
    }
    
    // Get the total duration
    const totalDuration = duration || (audioRef.current?.duration || 300); // Default to 5 minutes if no duration
    
    if (duration === 0 && audioRef.current?.duration) {
      console.log("Using audio element duration:", audioRef.current.duration);
    }
    
    console.log("Generating timestamps based on duration:", totalDuration);
    
    // Count total words in the English content
    const totalWords = article.content.english.reduce((count, paragraph) => {
      return count + paragraph.split(' ').filter(word => word.trim() !== '').length;
    }, 0);
    
    console.log("Total word count:", totalWords);
    
    if (totalWords === 0) {
      console.log("No words found in content, can't generate timestamps");
      return;
    }
    
    // Calculate approx time per word (assume even distribution)
    const timePerWord = totalDuration / totalWords;
    
    // Generate word timestamps
    const wordStartTimes: number[] = [];
    const wordEndTimes: number[] = [];
    
    let currentTime = 0;
    article.content.english.forEach(paragraph => {
      const words = paragraph.split(' ').filter(word => word.trim() !== '');
      
      // Use forEach without parameters, just run for each element
      words.forEach(() => {
        // Each word gets a proportional time slot
        const wordDuration = timePerWord;
        
        wordStartTimes.push(currentTime);
        currentTime += wordDuration;
        wordEndTimes.push(currentTime);
      });
    });
    
    // Update the article with generated timestamps
    updatedArticle.audio_timestamps.word_start_times_seconds = wordStartTimes;
    updatedArticle.audio_timestamps.word_end_times_seconds = wordEndTimes;
    
    console.log("Generated fallback timestamps:", {
      totalWords,
      startTimesLength: wordStartTimes.length,
      firstFewStartTimes: wordStartTimes.slice(0, 5)
    });
    
    // Update the article state
    setArticle(updatedArticle);
  }, [article, duration]);

  // Audio event handlers
  useEffect(() => {
    if (!audioRef.current || !article?.audio_timestamps) {
      console.log("Audio ref or audio timestamps not available:", {
        hasAudioRef: !!audioRef.current,
        hasAudioTimestamps: !!article?.audio_timestamps,
        audioTimestampsWordCount: article?.audio_timestamps?.word_start_times_seconds?.length || 0
      });
      return;
    }
    
    const audio = audioRef.current;
    
    // Use a more frequent update interval for smoother highlighting
    let intervalId: number | null = null;
    
    // Keep track of the last update time to detect large audio jumps
    let lastUpdateTime = 0;
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      
      // Detect large time jumps (user seeking) to reset word highlighting immediately
      if (Math.abs(audio.currentTime - lastUpdateTime) > 1.0) {
        console.log("Large time jump detected, immediately updating active word");
        updateActiveWord(audio.currentTime);
      }
      
      lastUpdateTime = audio.currentTime;
    };
    
    const updateActiveWord = (currentTime: number) => {
      // Find the active word based on current time
      if (!article.audio_timestamps) return;
      
      const { word_start_times_seconds, word_end_times_seconds } = article.audio_timestamps;
      
      // Check for timestamps array validity
      if (!word_start_times_seconds?.length || !word_end_times_seconds?.length) {
        console.warn("Empty word timestamp arrays");
        return;
      }
      
      // Log more details about what we're working with
      if (currentTime > 0 && currentTime % 5 < 0.1) { // Log only occasionally to avoid console spam
        console.log("Checking active word:", {
          currentTime: currentTime.toFixed(2),
          wordTimestampsLength: word_start_times_seconds.length,
          sampleStartTimes: word_start_times_seconds.slice(0, 3),
          sampleEndTimes: word_end_times_seconds.slice(0, 3),
          lastFewStartTimes: word_start_times_seconds.slice(-3),
          lastFewEndTimes: word_end_times_seconds.slice(-3)
        });
      }
      
      // Get audio progress and duration info for adaptive algorithm
      const audioDuration = duration || audioRef.current?.duration || 1;
      const audioProgress = currentTime / audioDuration; // 0.0 to 1.0
      
      // Special case for end of article - if we're at 95%+ of the audio
      // and the last word isn't highlighted, focus on the final words
      const isNearEnd = audioProgress > 0.95;
      
      if (isNearEnd) {
        // When near the end of the audio, prioritize the last few words
        console.log(`Near end of audio (${(audioProgress * 100).toFixed(1)}%), focusing on final words`);
        
        // Find the last word that starts before the current time
        const lastWordBeforeCurrentTime = findLastWordBeforeTime(word_start_times_seconds, currentTime);
        
        if (lastWordBeforeCurrentTime !== -1) {
          // If we're close to the end and found a valid word, use it
          if (lastWordBeforeCurrentTime !== activeWordIndex) {
            console.log(`End section: Highlighting word at index ${lastWordBeforeCurrentTime}`);
            setActiveWordIndex(lastWordBeforeCurrentTime);
            scrollToActiveWord(lastWordBeforeCurrentTime);
          }
          return;
        }
      }
      
      // Improved algorithm to find the active word
      let newActiveIndex = -1;
      
      // Estimate which part of the audio we're in to adjust for potential drift in longer passages
      
      // As we get further in the audio, we might need to adjust our search window
      // to account for potential drift between audio and text timestamps
      let searchStartIndex = 0;
      let searchEndIndex = word_start_times_seconds.length - 1;
      
      // If we have a rough idea of where we are in the audio, narrow down the search range
      if (audioProgress > 0.1 && word_start_times_seconds.length > 20) {
        // Approximate which part of the word array we should be in
        const estimatedIndex = Math.floor(audioProgress * word_start_times_seconds.length);
        
        // Create a search window around the estimated position
        // The window size increases further into the audio to account for potential drift
        const windowSize = Math.max(
          20, 
          Math.floor(word_start_times_seconds.length * 0.1 * (1 + audioProgress))
        );
        
        searchStartIndex = Math.max(0, estimatedIndex - windowSize);
        searchEndIndex = Math.min(
          word_start_times_seconds.length - 1, 
          estimatedIndex + windowSize
        );
      }
      
      // First try to find a word where the current time is between start and end times
      // We'll use a small tolerance to account for slight timing discrepancies
      const tolerance = 0.05 * (1 + audioProgress); // Tolerance increases with progress
      
      // Search for exact matches within our narrowed search window
      for (let i = searchStartIndex; i <= searchEndIndex; i++) {
        const startTime = word_start_times_seconds[i];
        const endTime = word_end_times_seconds[i];
        
        // Check if current time is within this word's time range (with tolerance)
        if (currentTime >= startTime - tolerance && currentTime <= endTime + tolerance) {
          newActiveIndex = i;
          break;
        }
      }
      
      // If no exact match, find the closest word that starts before the current time
      // This is especially important for later parts of audio where timing might drift
      if (newActiveIndex === -1) {
        let closestStartTime = -1;
        let minTimeDifference = Number.MAX_VALUE;
        
        // Search only within our narrowed search window
        for (let i = searchStartIndex; i <= searchEndIndex; i++) {
          const startTime = word_start_times_seconds[i];
          const timeDifference = currentTime - startTime;
          
          // Find the word that started most recently before current time
          // but prioritize words that are closest to the current time
          if (startTime <= currentTime && timeDifference < minTimeDifference) {
            closestStartTime = i;
            minTimeDifference = timeDifference;
          }
        }
        
        // Only use this word if it's reasonably close to current time
        // This prevents highlighting words from too far in the past
        // The threshold is larger later in the audio to account for potential drift
        const maxLookbackTime = 2.0 * (1.0 + audioProgress); // Increases with progress
        
        if (closestStartTime !== -1 && minTimeDifference < maxLookbackTime) {
          newActiveIndex = closestStartTime;
        } else {
          // If we're too far from any word, look ahead instead
          let nextWordIndex = -1;
          let minFutureTime = Number.MAX_VALUE;
          
          // Search only within our narrowed search window
          for (let i = searchStartIndex; i <= searchEndIndex; i++) {
            const startTime = word_start_times_seconds[i];
            const timeUntilWord = startTime - currentTime;
            
            // Find the next upcoming word
            if (timeUntilWord > 0 && timeUntilWord < minFutureTime) {
              nextWordIndex = i;
              minFutureTime = timeUntilWord;
            }
          }
          
          // If we're very close to the next word, pre-highlight it
          if (nextWordIndex !== -1 && minFutureTime < 0.1) {
            newActiveIndex = nextWordIndex;
          }
        }
      }
      
      // Only update if the active word has changed
      if (newActiveIndex !== -1 && newActiveIndex !== activeWordIndex) {
        console.log(`Found active word at index ${newActiveIndex}, time: ${currentTime.toFixed(2)}, progress: ${(audioProgress * 100).toFixed(1)}%`);
        setActiveWordIndex(newActiveIndex);
        scrollToActiveWord(newActiveIndex);
      } else if (newActiveIndex === -1 && activeWordIndex !== -1) {
        // No active word found, clear the highlight
        console.log(`No active word found at time ${currentTime.toFixed(2)}, clearing highlight`);
        setActiveWordIndex(-1);
      }
    };
    
    // Helper function to find the last word that starts before a given time
    const findLastWordBeforeTime = (startTimes: number[], targetTime: number): number => {
      let bestIndex = -1;
      let bestTimeDifference = Number.MAX_VALUE;
      
      // Start from the end and work backwards for efficiency
      for (let i = startTimes.length - 1; i >= 0; i--) {
        const timeDifference = targetTime - startTimes[i];
        
        if (timeDifference >= 0 && timeDifference < bestTimeDifference) {
          bestIndex = i;
          bestTimeDifference = timeDifference;
          
          // If we're extremely close, we can stop searching
          if (timeDifference < 0.05) break;
        }
      }
      
      return bestIndex;
    };
    
    const startInterval = () => {
      if (intervalId) clearInterval(intervalId);
      
      // Check every 50ms for more accurate highlighting
      intervalId = window.setInterval(() => {
        updateActiveWord(audio.currentTime);
      }, 50);
    };
    
    const stopInterval = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
    
    const handlePlay = () => {
      setIsPlaying(true);
      startInterval();
    };
    
    const handlePause = () => {
      setIsPlaying(false);
      stopInterval();
    };
    
    const handleLoadedMetadata = () => {
      console.log("Audio metadata loaded, duration:", audio.duration);
      setDuration(audio.duration);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setActiveWordIndex(-1);
      stopInterval();
    };
    
    // Force duration update if already loaded
    if (audio.readyState >= 1) {
      setDuration(audio.duration);
    }
    
    // Start interval if already playing
    if (!audio.paused) {
      startInterval();
    }
    
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      stopInterval();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [article, activeWordIndex, audioSrc]);

  // Handle play/pause
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      // When starting playback, ensure the duration is set
      if (duration === 0 && audioRef.current.duration > 0) {
        setDuration(audioRef.current.duration);
      }
      audioRef.current.play().catch(err => {
        console.error("Error playing audio:", err);
      });
    }
    
    setIsPlaying(!isPlaying);
  };

  // Handle progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !article?.audio_timestamps) return;
    
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const newTime = clickPosition * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Improved word click handler with special handling for the last word
  const handleWordClick = (startTime: number, wordIndex: number) => {
    console.log(`Word clicked, time: ${startTime}, index: ${wordIndex}, total words: ${article?.audio_timestamps?.word_start_times_seconds.length || 0}`);
    
    if (!audioRef.current || !article?.audio_timestamps) {
      console.error("Audio element or timestamps not available");
      return;
    }
    
    try {
      const { word_start_times_seconds, word_end_times_seconds } = article.audio_timestamps;
      const totalWords = word_start_times_seconds.length;
      
      // For better accuracy, especially at the end of the article:
      // 1. Validate that this word has valid timestamps
      if (wordIndex < 0 || wordIndex >= totalWords) {
        console.error(`Word index ${wordIndex} is out of bounds`);
        return;
      }
      
      // 2. Get the precise timestamp for this word
      let validTime = word_start_times_seconds[wordIndex];
      
      // Special handling for the last few words - they may need adjustment
      // We handle this differently if this is one of the last few words
      const isNearEnd = wordIndex >= totalWords - 5;
      
      if (isNearEnd) {
        console.log(`Handling click on last few words (index ${wordIndex} of ${totalWords})`);
        
        // Calculate how far this word is from the end (0 = last word, 1 = second to last, etc.)
        const distanceFromEnd = totalWords - 1 - wordIndex;
        
        // For debugging, log the timestamp information
        console.log(`Last words info:`, {
          isLastWord: distanceFromEnd === 0,
          distanceFromEnd,
          audioDuration: audioRef.current.duration,
          thisWordStart: validTime,
          thisWordEnd: word_end_times_seconds[wordIndex],
          lastWordStart: word_start_times_seconds[totalWords - 1],
          lastWordEnd: word_end_times_seconds[totalWords - 1]
        });
        
        // If this is the actual last word or very close to it, we may need to adjust
        // the timestamp to ensure it's not starting too early
        if (distanceFromEnd === 0) {
          // The last word might need special handling to prevent playing from too early
          // Compare with the audio duration
          const lastWordTime = validTime;
          const audioDuration = audioRef.current.duration;
          
          // Calculate what percentage through the audio this timestamp is
          const percentThroughAudio = (lastWordTime / audioDuration) * 100;
          console.log(`Last word timestamp is at ${percentThroughAudio.toFixed(1)}% of audio duration`);
          
          // If the last word starts too early relative to the audio duration,
          // adjust it to be closer to the end
          if (percentThroughAudio < 90 && audioDuration > 10) {
            // This suggests a significant mismatch - the last word should be near the end
            // Adjust the timestamp to be closer to the end, but leave some buffer
            const adjustedTime = audioDuration * 0.95;
            console.log(`Adjusting last word timestamp from ${validTime} to ${adjustedTime}`);
            validTime = adjustedTime;
          }
        }
      }
      
      // 3. Log diagnostic information for debugging
      console.log(`Setting audio time to: ${validTime} for word at index ${wordIndex}`);
      console.log(`Word timestamp info:`, {
        startTime: validTime,
        endTime: word_end_times_seconds[wordIndex],
        audioDuration: audioRef.current.duration,
        percentIntoAudio: (validTime / audioRef.current.duration * 100).toFixed(2) + '%'
      });
      
      // 4. Set the current time of the audio element
      audioRef.current.currentTime = validTime;
      setCurrentTime(validTime);
      
      // 5. Update the active word index immediately
      setActiveWordIndex(wordIndex);
      
      // 6. Start playback if not already playing
      if (!isPlaying) {
        console.log("Starting playback");
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
            console.log("Playback started successfully");
          })
          .catch(err => {
            console.error("Failed to start playback:", err);
          });
      }
    } catch (error) {
      console.error("Error navigating to timestamp:", error);
    }
  };
  
  // Scroll to active word
  const scrollToActiveWord = (wordIndex: number) => {
    // Find which paragraph contains this word
    if (!article?.audio_timestamps || !article?.content?.english?.length) return;
    
    // This is a simplification - you'd need to calculate which paragraph contains the word
    // For a complete implementation, you'd need to track word indices per paragraph
    // const characterCount = article.audio_timestamps.characters.length;
    const wordCount = article.audio_timestamps.word_start_times_seconds.length;
    
    // Avoid division by zero
    if (wordCount === 0) return;
    
    // This is a placeholder logic - you'd need to implement the actual mapping
    const paragraphIndex = Math.floor(wordIndex / (wordCount / article.content.english.length));
    
    if (paragraphRefs.current[paragraphIndex]) {
      paragraphRefs.current[paragraphIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  };

  // Format timestamp to readable date
  const formatDate = (timestamp?: { seconds: number; nanoseconds: number }) => {
    if (!timestamp) return 'Unknown date';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Format time for audio player (mm:ss)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Process paragraphs with word-level timestamps for the English content
  const renderParagraphs = () => {
    if (!article) return null;
    
    // Ensure we have content for the selected language
    const content = article.content?.[language] || [];
    
    if (content.length === 0) {
      return <p>No content available for this language.</p>;
    }
    
    if (!article.audio_timestamps || language !== 'english') {
      // Simple paragraph rendering without audio sync
      return content.map((paragraph, index) => (
        <ParagraphContainer 
          key={index}
          ref={el => { paragraphRefs.current[index] = el; }}
        >
          <Paragraph>{paragraph}</Paragraph>
        </ParagraphContainer>
      ));
    }
    
    // Debug audio timestamp data
    console.log("Audio timestamps for rendering:", {
      wordCount: article.audio_timestamps.word_start_times_seconds?.length || 0,
      characterCount: article.audio_timestamps.characters?.length || 0,
      activeWordIndex
    });
    
    // Memoize word timestamps to avoid recalculating on every render
    const wordStartTimes = article.audio_timestamps.word_start_times_seconds || [];
    const wordEndTimes = article.audio_timestamps.word_end_times_seconds || [];
    
    if (wordStartTimes.length === 0) {
      console.warn("No word timestamps available in audio_timestamps");
      // Fallback to simple rendering if no timestamps
      return content.map((paragraph, index) => (
        <ParagraphContainer 
          key={index}
          ref={el => { paragraphRefs.current[index] = el; }}
        >
          <Paragraph>{paragraph}</Paragraph>
        </ParagraphContainer>
      ));
    }
    
    // Extra validation to ensure word start and end times match
    if (wordStartTimes.length !== wordEndTimes.length) {
      console.warn(`Word timestamps mismatch: ${wordStartTimes.length} start times vs ${wordEndTimes.length} end times`);
    }
    
    // Collect all words from all paragraphs for timestamp mapping
    const allWords: string[] = [];
    const paragraphStartIndices: number[] = [0];
    
    content.forEach((paragraph) => {
      const words = paragraph.split(' ').filter(word => word.trim() !== '');
      allWords.push(...words);
      paragraphStartIndices.push(paragraphStartIndices[paragraphStartIndices.length - 1] + words.length);
    });
    
    // Log word count match for debugging
    console.log("Word count match check:", {
      totalWordsInContent: allWords.length,
      totalTimestamps: wordStartTimes.length,
      match: allWords.length === wordStartTimes.length ? "✅ Perfect match" : "❌ Mismatch"
    });
    
    // Now render each paragraph with its words
    let wordCounter = 0;
    return content.map((paragraph, paragraphIndex) => {
      const words = paragraph.split(' ').filter(word => word.trim() !== '');
      
      // Log the first few words of each paragraph for debugging
      if (paragraphIndex === 0) {
        console.log(`Paragraph ${paragraphIndex} first few words:`, words.slice(0, 5));
      }
      
      const renderedWords = words.map((word, wordIndex) => {
        const currentWordIndex = wordCounter;
        const hasTimestamp = currentWordIndex < wordStartTimes.length;
        
        // Keep track of the current word index
        const thisWordIndex = wordCounter;
        wordCounter++;
        
        if (!hasTimestamp) {
          return <Word key={wordIndex} clickable={false}>{word} </Word>;
        }
        
        const startTime = wordStartTimes[thisWordIndex];
        const isActive = thisWordIndex === activeWordIndex;
        
        // Add extra debugging to ensure the correct word is being highlighted
        if (isActive) {
          console.log(`Active word: "${word}" at index ${thisWordIndex}, time: ${startTime}`);
        }
        
        return (
          <Word 
            key={wordIndex} 
            active={isActive}
            clickable={true}
            onClick={() => {
              console.log(`Clicked word: "${word}" at index ${thisWordIndex}, time: ${startTime}`);
              handleWordClick(startTime, thisWordIndex);
            }}
            title={`Jump to ${formatTime(startTime)}`}
          >
            {word}{' '}
          </Word>
        );
      });
      
      return (
        <ParagraphContainer 
          key={paragraphIndex}
          ref={el => { paragraphRefs.current[paragraphIndex] = el; }}
        >
          <Paragraph>{renderedWords}</Paragraph>
        </ParagraphContainer>
      );
    });
  };

  // Effect to handle audio source initialization
  useEffect(() => {
    if (audioRef.current && audioSrc) {
      // Reset playback state when audio source changes
      setIsPlaying(false);
      setCurrentTime(0);
      setActiveWordIndex(-1);
      
      // Preload metadata to get duration as soon as possible
      audioRef.current.load();
      
      console.log("Audio source initialized:", audioSrc);
    }
  }, [audioSrc]);

  // Effect to apply playback rate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Handle playback rate change
  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
  };

  // Add a smooth scrolling behavior to the document to enhance UX when navigating
  useEffect(() => {
    // Add smooth scrolling behavior to the document when component mounts
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Clean up when component unmounts
    return () => {
      document.documentElement.style.scrollBehavior = '';
    };
  }, []);

  if (loading) {
    return (
      <ArticleWrapper>
        <LoadingContainer>
          <LoadingMessage>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
            </svg>
            Loading article...
          </LoadingMessage>
        </LoadingContainer>
      </ArticleWrapper>
    );
  }

  if (error) {
    return (
      <ArticleWrapper>
        <ErrorContainer>
          <ErrorMessage>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {error}
          </ErrorMessage>
        </ErrorContainer>
      </ArticleWrapper>
    );
  }

  if (!article) {
    return (
      <ArticleWrapper>
        <ErrorContainer>
          <ErrorMessage>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            Article not found
          </ErrorMessage>
        </ErrorContainer>
      </ArticleWrapper>
    );
  }

  const hasKoreanTranslation = article.content.korean && article.content.korean.length > 0;
  const hasAudio = !!article.audio_url;

  return (
    <ArticleWrapper>
      <ArticleHeader>
        <ArticleTitle>
          {article.title[language] || article.title.english}
        </ArticleTitle>
        <ArticleMeta>
          <ArticleDate>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            {formatDate(article.timestamp)}
          </ArticleDate>
        </ArticleMeta>
      </ArticleHeader>

      {/* Audio Player (if available) */}
      {hasAudio && audioSrc && (
        <AudioPlayerContainer>
          <audio 
            ref={audioRef} 
            src={audioSrc} 
            preload="metadata"
            onLoadedMetadata={(e) => {
              const duration = (e.target as HTMLAudioElement).duration;
              console.log("Audio metadata loaded, duration:", duration);
              setDuration(duration);
            }}
            onCanPlay={() => console.log("Audio can play now")}
            onError={(e) => console.error("Audio loading error:", e)} 
          />
          
          <AudioControlsContainer>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button 
                onClick={togglePlayPause}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#f0f2f5'
                }}
              >
                {isPlaying ? (
                  <span>⏸️</span>
                ) : (
                  <span>▶️</span>
                )}
              </button>
              <span style={{ fontFamily: 'monospace', minWidth: '120px' }}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            
            <div style={{ display: 'flex', gap: '5px' }}>
              {[0.75, 1, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handlePlaybackRateChange(rate)}
                  style={{
                    background: playbackRate === rate ? '#e0e7ff' : '#f9fafb',
                    border: playbackRate === rate ? '1px solid #818cf8' : '1px solid #e5e7eb',
                    borderRadius: '5px',
                    padding: '4px 8px',
                    fontSize: '0.875rem',
                    fontWeight: playbackRate === rate ? 'bold' : 'normal',
                    cursor: 'pointer',
                    color: playbackRate === rate ? '#4f46e5' : '#4b5563'
                  }}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </AudioControlsContainer>
          
          <ProgressBar onClick={handleProgressClick}>
            <ProgressFill style={{ width: `${(currentTime / duration) * 100}%` }} />
          </ProgressBar>
        </AudioPlayerContainer>
      )}

      {/* Language tabs (if Korean translation is available) */}
      {hasKoreanTranslation && (
        <LanguageTabs>
          <LanguageTab 
            active={language === 'english'} 
            onClick={() => setLanguage('english')}
          >
            English
          </LanguageTab>
          <LanguageTab 
            active={language === 'korean'} 
            onClick={() => setLanguage('korean')}
          >
            Korean
          </LanguageTab>
        </LanguageTabs>
      )}

      {/* Article content with synchronized text highlighting */}
      <ArticleContent>
        {renderParagraphs()}
      </ArticleContent>

      {/* Debug toggle - only in development */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
          <button 
            onClick={() => setShowDebug(!showDebug)} 
            style={{ padding: '5px 10px', background: '#eee', border: '1px solid #ddd' }}
          >
            {showDebug ? 'Hide Debug' : 'Show Debug'}
          </button>
          
          {showDebug && article?.audio_timestamps && (
            <div style={{ marginTop: '10px', fontSize: '12px' }}>
              <p>Current time: {currentTime.toFixed(2)}</p>
              <p>Active word index: {activeWordIndex}</p>
              <p>Word count: {article.audio_timestamps.word_start_times_seconds?.length || 0}</p>
              <p>First few word timestamps: {(article.audio_timestamps.word_start_times_seconds?.slice(0, 5) || []).map(t => t.toFixed(2)).join(', ')}</p>
              
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #ddd' }}>
                <p><strong>Character Timestamps:</strong></p>
                <p>Character count: {article.audio_timestamps.characters?.length || 0}</p>
                {article.audio_timestamps.characters?.length > 0 ? (
                  <>
                    <p>First 10 characters: "{article.audio_timestamps.characters.slice(0, 10).join('')}"</p>
                    <p>First few character timestamps: {(article.audio_timestamps.character_start_times_seconds?.slice(0, 5) || []).map(t => t.toFixed(2)).join(', ')}</p>
                  </>
                ) : (
                  <p>No character timestamps available</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </ArticleWrapper>
  );
} 