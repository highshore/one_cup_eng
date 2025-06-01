import React, { useState, useRef, useEffect } from "react";
import styled, { css } from "styled-components";
import { Link } from "react-router-dom"; // Import Link
import {
  FaChevronLeft,
  FaChevronRight,
  FaFilter,
  FaChevronDown,
  FaQuestionCircle,
} from "react-icons/fa";

// Define video item type
type VideoItem = {
  id: string;
  difficulty: "novice" | "intermediate" | "advanced";
};

// Define row data type
type RowData = {
  title: string;
  videos: VideoItem[];
};

// Define colors matching the layout.tsx palette
const colors = {
  primary: "#2C1810",
  primaryLight: "#4A2F23",
  primaryDark: "#1A0F0A",
  primaryPale: "#F5EBE6",
  primaryBg: "#fafafa",
  accent: "#C8A27A",
  text: {
    dark: "#2C1810",
    medium: "#4A2F23",
    light: "#8B6B4F",
  },
};

// Define your styled components here if needed, or import from a shared file
// For example:
const LibraryContainer = styled.div`
  width: 100%;
  box-sizing: border-box;
  padding: 2rem 0 0 0; // Parent ContentContainer handles L/R padding and top padding
  // overflow-x: hidden; // Remove this to allow buttons to be fully visible
`;

const TabSliderWrapper = styled.div`
  position: relative;
  width: 100%;
  margin-bottom: 2rem; // Keep existing margin
`;

const TabContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  width: 100%;
  overflow-x: hidden; // We will control scroll with buttons
  scroll-behavior: smooth;
  box-sizing: border-box;

  // Hide scrollbar visually if it ever appears due to overflow-x:auto temporarily
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

const TabScrollButton = styled.button<{
  direction: "left" | "right";
  disabled?: boolean;
}>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 30px; // Smaller size
  height: 30px; // Smaller size
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 5; // Lower z-index than video buttons, but still above tabs
  opacity: ${(props) => (props.disabled ? 0.0 : 0.7)};
  pointer-events: ${(props) => (props.disabled ? "none" : "auto")};
  transition: all 0.2s ease;

  &:hover {
    opacity: 1;
    background-color: white;
  }

  ${
    (props) =>
      props.direction === "left"
        ? `left: -15px;` // Centered on edge
        : `right: -15px;` // Centered on edge
  }

  svg {
    font-size: 0.8rem; // Smaller icon
    color: #333;
  }
`;

const TabButton = styled.button<{ isActive: boolean }>`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 2rem;
  background-color: ${(props) =>
    props.isActive ? colors.primary : colors.primaryPale};
  color: ${(props) => (props.isActive ? "white" : colors.primary)};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  box-shadow: ${(props) =>
    props.isActive ? `0 4px 6px rgba(0, 0, 0, 0.1)` : "none"};

  &:hover {
    background-color: ${(props) =>
      props.isActive ? colors.primaryDark : "#e8d9d0"};
    transform: translateY(-1px);
  }
`;

const SliderRow = styled.div`
  margin-bottom: 1rem;
  width: 100%; // Fill available width
`;

const RowTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${colors.primary};
  width: 100%; // Fill available width
  // No max-width, no L/R padding, no margin:auto needed here
`;

const VideosContainerWrapper = styled.div`
  position: relative;
  width: 100%;
  // Ensure no overflow:hidden here, default 'visible' is correct
`;

const VideosContainer = styled.div`
  display: flex;
  gap: 1rem;
  overflow-x: hidden; // Necessary for scroll control & clips children outside its padding-box
  box-sizing: border-box;
  position: relative;
  width: 100%;
  scroll-behavior: smooth;
  padding: 1rem 0rem;
`;

const ScrollButton = styled.button<{
  direction: "left" | "right";
  disabled?: boolean;
}>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100;
  opacity: ${(props) => (props.disabled ? 0.0 : 0.9)};
  pointer-events: ${(props) => (props.disabled ? "none" : "auto")};
  transition: all 0.25s ease;

  &:hover {
    opacity: 1;
    background-color: white;
    transform: translateY(-50%) scale(1.05);
  }

  // Adjust positioning to account for container padding
  ${(props) =>
    props.direction === "left"
      ? `left: calc(-40px + 1rem);`
      : `right: calc(-40px + 1rem);`}

  svg {
    font-size: 1.2rem;
    color: #333;
  }
`;

const VideoInfo = styled.div`
  padding: 0.75rem;
  background-color: white;

  h3 {
    font-size: 0.9rem;
    font-weight: 600;
    color: ${colors.text.dark};
    margin-bottom: 0.25rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  p {
    font-size: 0.8rem;
    color: ${colors.text.medium};
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    min-height: calc(0.8rem * 1.4 * 2);
  }

  .difficulty-tags {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .difficulty-tag {
    font-size: 0.7rem;
    padding: 0.25rem 0.5rem;
    border-radius: 1rem;
    font-weight: 600;
  }

  .novice {
    background-color: #e3f2fd;
    color: #1976d2;
  }

  .intermediate {
    background-color: #e8f5e9;
    color: #388e3c;
  }

  .advanced {
    background-color: #ffebee;
    color: #d32f2f;
  }
`;

const VideoCardWrapperLink = styled(Link)`
  display: block;
  text-decoration: none;
  color: inherit;
  border-radius: 12px;
  margin-bottom: 1rem; // Or gap handled by parent flex container

  &:focus,
  &:hover {
    outline: none;
  }

  &:focus-visible {
    outline: 2px solid ${colors.accent};
    outline-offset: 2px;
  }
`;

const VideoCard = styled.div`
  width: 280px;
  flex-shrink: 0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  background-color: white;

  ${VideoCardWrapperLink}:hover & {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
  }
  // Ensure the direct child of VideoCardWrapperLink fills it if needed,
  // or that VideoCard itself handles its layout fully.
`;

const VideoFrame = styled.iframe`
  width: 100%;
  height: 157px;
  border: none;
`;

const ControlsRow = styled.div`
  display: flex;
  justify-content: space-between; // Pushes items to ends
  align-items: center; // Vertically align items
  margin-bottom: 2rem;
  position: relative; // For potential absolute positioning of children if needed elsewhere
`;

const UsageGuideWrapper = styled.div`
  position: relative; // For positioning the info box
`;

const UsageGuideButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background-color: white;
  border: 0px solid ${colors.primaryPale};
  border-radius: 0.5rem;
  color: ${colors.primary};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  &:hover {
    border-color: ${colors.accent};
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  svg {
    font-size: 1rem;
  }
`;

const UsageGuideInfoBox = styled.div<{ isVisible: boolean }>`
  position: absolute;
  top: 0;
  left: calc(100% + 1rem); // Position to the right of the button with some gap
  width: 350px; // Horizontally long
  padding: 1rem;
  background-color: white;
  border: 1px solid ${colors.primaryPale};
  border-radius: 0.5rem;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
  z-index: 1100; // Above filter dropdown
  opacity: 0;
  transform: translateX(-10px);
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
  white-space: normal; // Allow text to wrap

  ${(props) =>
    props.isVisible &&
    css`
      opacity: 1;
      transform: translateX(0);
      pointer-events: auto;
    `}

  h4 {
    font-size: 1rem;
    color: ${colors.primary};
    margin-top: 0;
    margin-bottom: 0.75rem;
  }

  p {
    font-size: 0.85rem;
    color: ${colors.text.medium};
    line-height: 1.5;
    margin-bottom: 0.5rem;
  }

  p:last-child {
    margin-bottom: 0;
  }
`;

const FilterWrapper = styled.div`
  position: relative; // Keep for dropdown positioning
`;

const FilterButton = styled.button<{ isOpen: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background-color: white;
  border: 0px solid ${colors.primaryPale};
  border-radius: 0.5rem;
  color: ${colors.primary};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  &:hover {
    border-color: ${colors.accent};
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  svg.chevron {
    transform: ${(props) => (props.isOpen ? "rotate(180deg)" : "rotate(0deg)")};
    transition: transform 0.2s ease;
  }
`;

const FilterDropdown = styled.div<{ isOpen: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background-color: white;
  border: 2px solid ${colors.primaryPale};
  border-radius: 0.5rem;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 180px;
  opacity: ${(props) => (props.isOpen ? 1 : 0)};
  transform: ${(props) =>
    props.isOpen ? "translateY(0)" : "translateY(-10px)"};
  pointer-events: ${(props) => (props.isOpen ? "auto" : "none")};
  transition: all 0.2s ease;
`;

const FilterOption = styled.button<{ isSelected: boolean }>`
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background-color: ${(props) =>
    props.isSelected ? colors.primaryPale : "transparent"};
  color: ${colors.primary};
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:first-child {
    border-radius: 0.375rem 0.375rem 0 0;
  }

  &:last-child {
    border-radius: 0 0 0.375rem 0.375rem;
  }

  &:hover {
    background-color: ${colors.primaryPale};
  }

  .difficulty-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;

    &.novice {
      background-color: #1976d2;
    }

    &.intermediate {
      background-color: #388e3c;
    }

    &.advanced {
      background-color: #d32f2f;
    }
  }
`;

const LibraryPage: React.FC = () => {
  const tabs = [
    "모든 영상",
    "비즈니스",
    "연설",
    "인터뷰",
    "발표",
    "IT",
    "영화",
    "드라마",
    "국제 정세",
    "금융",
    "의료",
  ]; // Added more tabs for testing
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isUsageGuideVisible, setIsUsageGuideVisible] = useState(false);

  const videoContainersRef = useRef<(HTMLDivElement | null)[]>([]);
  const [scrollStates, setScrollStates] = useState<
    Array<{ canScrollLeft: boolean; canScrollRight: boolean }>
  >([]);

  const tabContainerRef = useRef<HTMLDivElement | null>(null);
  const [tabScrollState, setTabScrollState] = useState<{
    canScrollLeft: boolean;
    canScrollRight: boolean;
  }>({ canScrollLeft: false, canScrollRight: false });

  const videosByRow: { [key: string]: RowData[] } = {
    "모든 영상": [
      {
        title: "젠슨 황처럼 말하기",
        videos: [
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
          { id: "lXLBTBBil2U", difficulty: "intermediate" as const },
          { id: "c-XAL2oYelI", difficulty: "advanced" as const },
          { id: "G6R7UOFx1bw", difficulty: "novice" as const },
          { id: "vOvQSqY7Jgc", difficulty: "intermediate" as const },
          { id: "vOvQSqY7Jgc", difficulty: "advanced" as const },
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
        ],
      },
      {
        title: "스티브 잡스처럼 말하기",
        videos: [
          { id: "UF8uR6Z6KLc", difficulty: "intermediate" as const },
          { id: "kYfNvmF0Bqw", difficulty: "advanced" as const },
          { id: "f60dheI4ARg", difficulty: "novice" as const },
          { id: "CeSAjK2CBEA", difficulty: "intermediate" as const },
          { id: "vOvQSqY7Jgc", difficulty: "advanced" as const },
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
          { id: "vOvQSqY7Jgc", difficulty: "intermediate" as const },
        ],
      },
    ],
    비즈니스: [
      {
        title: "Startup Insights",
        videos: [
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
          { id: "vOvQSqY7Jgc", difficulty: "intermediate" as const },
          { id: "vOvQSqY7Jgc", difficulty: "advanced" as const },
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
          { id: "vOvQSqY7Jgc", difficulty: "intermediate" as const },
        ],
      },
      {
        title: "Marketing Strategies",
        videos: [
          { id: "vOvQSqY7Jgc", difficulty: "advanced" as const },
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
          { id: "vOvQSqY7Jgc", difficulty: "intermediate" as const },
          { id: "vOvQSqY7Jgc", difficulty: "advanced" as const },
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
        ],
      },
    ],
    연설: [
      {
        title: "Inspiring Talks",
        videos: [
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
          { id: "vOvQSqY7Jgc", difficulty: "intermediate" as const },
          { id: "vOvQSqY7Jgc", difficulty: "advanced" as const },
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
          { id: "vOvQSqY7Jgc", difficulty: "intermediate" as const },
        ],
      },
      {
        title: "Famous Speeches",
        videos: [
          { id: "vOvQSqY7Jgc", difficulty: "advanced" as const },
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
          { id: "vOvQSqY7Jgc", difficulty: "intermediate" as const },
          { id: "vOvQSqY7Jgc", difficulty: "advanced" as const },
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
        ],
      },
    ],
    인터뷰: [
      {
        title: "Tech Leaders",
        videos: [
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
          { id: "vOvQSqY7Jgc", difficulty: "intermediate" as const },
          { id: "vOvQSqY7Jgc", difficulty: "advanced" as const },
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
          { id: "vOvQSqY7Jgc", difficulty: "intermediate" as const },
        ],
      },
      {
        title: "Creator Chats",
        videos: [
          { id: "vOvQSqY7Jgc", difficulty: "advanced" as const },
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
          { id: "vOvQSqY7Jgc", difficulty: "intermediate" as const },
          { id: "vOvQSqY7Jgc", difficulty: "advanced" as const },
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
        ],
      },
    ],
    발표: [
      {
        title: "Product Demos",
        videos: [
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
          { id: "vOvQSqY7Jgc", difficulty: "intermediate" as const },
          { id: "vOvQSqY7Jgc", difficulty: "advanced" as const },
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
          { id: "vOvQSqY7Jgc", difficulty: "intermediate" as const },
        ],
      },
      {
        title: "Conference Keynotes",
        videos: [
          { id: "vOvQSqY7Jgc", difficulty: "advanced" as const },
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
          { id: "vOvQSqY7Jgc", difficulty: "intermediate" as const },
          { id: "vOvQSqY7Jgc", difficulty: "advanced" as const },
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
        ],
      },
    ],
    IT: [
      {
        title: "Coding Tutorials",
        videos: [
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
          { id: "vOvQSqY7Jgc", difficulty: "intermediate" as const },
          { id: "vOvQSqY7Jgc", difficulty: "advanced" as const },
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
          { id: "vOvQSqY7Jgc", difficulty: "intermediate" as const },
        ],
      },
      {
        title: "Software Reviews",
        videos: [
          { id: "vOvQSqY7Jgc", difficulty: "advanced" as const },
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
          { id: "vOvQSqY7Jgc", difficulty: "intermediate" as const },
          { id: "vOvQSqY7Jgc", difficulty: "advanced" as const },
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
        ],
      },
    ],
    영화: [
      {
        title: "Movie Clips",
        videos: [
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
          { id: "vOvQSqY7Jgc", difficulty: "intermediate" as const },
          { id: "vOvQSqY7Jgc", difficulty: "advanced" as const },
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
          { id: "vOvQSqY7Jgc", difficulty: "intermediate" as const },
        ],
      },
      {
        title: "Trailers",
        videos: [
          { id: "vOvQSqY7Jgc", difficulty: "advanced" as const },
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
          { id: "vOvQSqY7Jgc", difficulty: "intermediate" as const },
          { id: "vOvQSqY7Jgc", difficulty: "advanced" as const },
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
        ],
      },
    ],
    드라마: [
      {
        title: "Popular Series",
        videos: [
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
          { id: "vOvQSqY7Jgc", difficulty: "intermediate" as const },
          { id: "vOvQSqY7Jgc", difficulty: "advanced" as const },
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
          { id: "vOvQSqY7Jgc", difficulty: "intermediate" as const },
        ],
      },
    ],
    "국제 정세": [
      {
        title: "News Analysis",
        videos: [
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
          { id: "vOvQSqY7Jgc", difficulty: "intermediate" as const },
          { id: "vOvQSqY7Jgc", difficulty: "advanced" as const },
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
          { id: "vOvQSqY7Jgc", difficulty: "intermediate" as const },
        ],
      },
    ],
    금융: [
      {
        title: "Market Updates",
        videos: [
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
          { id: "vOvQSqY7Jgc", difficulty: "intermediate" as const },
        ],
      },
    ],
    의료: [
      {
        title: "Health & Wellness",
        videos: [
          { id: "vOvQSqY7Jgc", difficulty: "novice" as const },
          { id: "vOvQSqY7Jgc", difficulty: "intermediate" as const },
        ],
      },
    ],
  };

  const currentVideos =
    videosByRow[activeTab as keyof typeof videosByRow] ||
    videosByRow["모든 영상"];

  const updateVideoScrollState = (rowIndex: number) => {
    const container = videoContainersRef.current[rowIndex];
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      const canScrollLeft = scrollLeft > 5; // Add a small threshold
      const canScrollRight = scrollLeft < scrollWidth - clientWidth - 5; // Add a small threshold
      setScrollStates((prev) => {
        const newState = [...prev];
        newState[rowIndex] = { canScrollLeft, canScrollRight };
        return newState;
      });
    }
  };

  const updateTabScrollState = () => {
    const container = tabContainerRef.current;
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      const canScrollLeft = scrollLeft > 5; // Threshold
      const canScrollRight = scrollLeft < scrollWidth - clientWidth - 5; // Threshold
      setTabScrollState({ canScrollLeft, canScrollRight });
    }
  };

  useEffect(() => {
    setScrollStates(
      currentVideos.map(() => ({ canScrollLeft: false, canScrollRight: true })) // Initially, assume can scroll right if content exists
    );
    setTimeout(() => {
      currentVideos.forEach((_, rowIndex) => {
        updateVideoScrollState(rowIndex);
      });
    }, 100);
    videoContainersRef.current = videoContainersRef.current.slice(
      0,
      currentVideos.length
    );

    // Initialize tab scroll state
    setTimeout(() => updateTabScrollState(), 100);
  }, [activeTab, currentVideos.length]); // Rerun for videos

  // Separate useEffect for tab scroll state, in case tabs array could change or on resize
  useEffect(() => {
    updateTabScrollState();
    window.addEventListener("resize", updateTabScrollState);
    return () => window.removeEventListener("resize", updateTabScrollState);
  }, [tabs]); // Depend on tabs array if it could ever change

  const scrollVideos = (direction: "left" | "right", rowIndex: number) => {
    const container = videoContainersRef.current[rowIndex];
    if (container) {
      const scrollAmount =
        container.clientWidth * 0.75 * (direction === "left" ? -1 : 1);
      container.scrollBy({ left: scrollAmount, behavior: "smooth" });
      setTimeout(() => updateVideoScrollState(rowIndex), 400);
    }
  };

  const scrollTabs = (direction: "left" | "right") => {
    const container = tabContainerRef.current;
    if (container) {
      const scrollAmount =
        container.clientWidth * 0.5 * (direction === "left" ? -1 : 1); // Scroll 50% of visible width
      container.scrollBy({ left: scrollAmount, behavior: "smooth" });
      setTimeout(() => updateTabScrollState(), 400); // Update state after scroll animation
    }
  };

  const filterVideosByDifficulty = (rows: RowData[]): RowData[] => {
    if (difficultyFilter === "all") return rows;

    return rows
      .map((row) => {
        const filteredRowVideos = row.videos.filter(
          (video) => video.difficulty === difficultyFilter
        );
        return { ...row, videos: filteredRowVideos };
      })
      .filter((row) => row.videos.length > 0); // Remove rows with no videos after filtering
  };

  const filteredVideos = filterVideosByDifficulty(currentVideos);

  useEffect(() => {
    setScrollStates(
      filteredVideos.map(() => ({ canScrollLeft: false, canScrollRight: true }))
    );
    setTimeout(() => {
      filteredVideos.forEach((_, rowIndex) => {
        updateVideoScrollState(rowIndex);
      });
    }, 100);
    videoContainersRef.current = videoContainersRef.current.slice(
      0,
      filteredVideos.length
    );

    // Initialize tab scroll state
    setTimeout(() => updateTabScrollState(), 100);
  }, [activeTab, difficultyFilter, filteredVideos.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isFilterOpen &&
        !(event.target as Element).closest(".filter-wrapper-class")
      ) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFilterOpen]);

  return (
    <LibraryContainer>
      <TabSliderWrapper>
        <TabScrollButton
          direction="left"
          onClick={() => scrollTabs("left")}
          disabled={!tabScrollState.canScrollLeft}
          aria-label="Scroll tabs left"
        >
          <FaChevronLeft />
        </TabScrollButton>
        <TabContainer ref={tabContainerRef} onScroll={updateTabScrollState}>
          {tabs.map((tab) => (
            <TabButton
              key={tab}
              isActive={tab === activeTab}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </TabButton>
          ))}
        </TabContainer>
        <TabScrollButton
          direction="right"
          onClick={() => scrollTabs("right")}
          disabled={!tabScrollState.canScrollRight}
          aria-label="Scroll tabs right"
        >
          <FaChevronRight />
        </TabScrollButton>
      </TabSliderWrapper>

      <ControlsRow>
        <UsageGuideWrapper
          onMouseEnter={() => setIsUsageGuideVisible(true)}
          onMouseLeave={() => setIsUsageGuideVisible(false)}
        >
          <UsageGuideButton>
            <FaQuestionCircle /> 사용법
          </UsageGuideButton>
          <UsageGuideInfoBox isVisible={isUsageGuideVisible}>
            <h4>사용 가이드</h4>
            <p>
              <strong>카테고리 탭:</strong> 원하는 영상 주제를 선택하세요. 좌우
              화살표로 더 많은 카테고리를 볼 수 있습니다.
            </p>
            <p>
              <strong>난이도 필터:</strong> 우측 상단 필터를 사용하여 영상의
              난이도(초급, 중급, 고급)별로 영상을 필터링할 수 있습니다.
            </p>
            <p>
              <strong>영상 슬라이더:</strong> 각 줄의 영상들을 좌우 화살표로
              스크롤하여 더 많은 영상을 탐색하세요.
            </p>
          </UsageGuideInfoBox>
        </UsageGuideWrapper>

        <FilterWrapper className="filter-wrapper-class">
          <FilterButton
            isOpen={isFilterOpen}
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <FaFilter />
            난이도 필터
            <FaChevronDown className="chevron" />
          </FilterButton>
          <FilterDropdown isOpen={isFilterOpen}>
            <FilterOption
              isSelected={difficultyFilter === "all"}
              onClick={() => {
                setDifficultyFilter("all");
                setIsFilterOpen(false);
              }}
            >
              All Levels
            </FilterOption>
            <FilterOption
              isSelected={difficultyFilter === "novice"}
              onClick={() => {
                setDifficultyFilter("novice");
                setIsFilterOpen(false);
              }}
            >
              <div className="difficulty-indicator novice"></div>
              Novice
            </FilterOption>
            <FilterOption
              isSelected={difficultyFilter === "intermediate"}
              onClick={() => {
                setDifficultyFilter("intermediate");
                setIsFilterOpen(false);
              }}
            >
              <div className="difficulty-indicator intermediate"></div>
              Intermediate
            </FilterOption>
            <FilterOption
              isSelected={difficultyFilter === "advanced"}
              onClick={() => {
                setDifficultyFilter("advanced");
                setIsFilterOpen(false);
              }}
            >
              <div className="difficulty-indicator advanced"></div>
              Advanced
            </FilterOption>
          </FilterDropdown>
        </FilterWrapper>
      </ControlsRow>

      {filteredVideos.map((rowData, rowIndex) => (
        <SliderRow
          key={`${activeTab}-${difficultyFilter}-${rowData.title}-${rowIndex}`}
        >
          <RowTitle>{rowData.title}</RowTitle>
          <VideosContainerWrapper>
            <ScrollButton
              direction="left"
              onClick={() => scrollVideos("left", rowIndex)}
              disabled={!scrollStates[rowIndex]?.canScrollLeft}
              aria-label="Scroll left"
            >
              <FaChevronLeft />
            </ScrollButton>
            <VideosContainer
              ref={(el) => {
                if (el) videoContainersRef.current[rowIndex] = el;
              }}
              onScroll={() => updateVideoScrollState(rowIndex)}
            >
              {rowData.videos.map((video: VideoItem) => (
                <VideoCardWrapperLink key={video.id} to="/shadow">
                  <VideoCard>
                    <VideoFrame
                      src={`https://www.youtube.com/embed/${video.id}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="Embedded youtube"
                    />
                    <VideoInfo>
                      <h3>Jensen Huang on Pain and Suffering</h3>
                      <p>
                        엔비디아 CEO 젠슨 황이 창업자들이 고통을 많이 겪어야
                        되는 이유에 대해서 설명합니다.
                      </p>
                      <div className="difficulty-tags">
                        <span className={`difficulty-tag ${video.difficulty}`}>
                          {video.difficulty.charAt(0).toUpperCase() +
                            video.difficulty.slice(1)}
                        </span>
                      </div>
                    </VideoInfo>
                  </VideoCard>
                </VideoCardWrapperLink>
              ))}
            </VideosContainer>
            <ScrollButton
              direction="right"
              onClick={() => scrollVideos("right", rowIndex)}
              disabled={!scrollStates[rowIndex]?.canScrollRight}
              aria-label="Scroll right"
            >
              <FaChevronRight />
            </ScrollButton>
          </VideosContainerWrapper>
        </SliderRow>
      ))}
    </LibraryContainer>
  );
};

export default LibraryPage;
