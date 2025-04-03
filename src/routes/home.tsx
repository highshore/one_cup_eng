import { useState } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";

// Define colors object since it's not exported from layout.tsx
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

// Hero Section
const HeroSection = styled.section`
  background: linear-gradient(135deg, #990033, #FF4500); /* Hermes orange gradient */
  color: white;
  padding: 6rem 2rem;
  text-align: center;
  position: relative;
  overflow: hidden;
`;

// Background bubbles effect
const BubbleBackground = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  z-index: 0;
  
  &::before, &::after {
    content: "";
    position: absolute;
    width: 300px;
    height: 300px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    filter: blur(20px);
  }
  
  &::before {
    top: -100px;
    left: -50px;
    width: 600px;
    height: 600px;
    background: radial-gradient(
      circle,
      rgba(255, 255, 255, 0.12) 0%,
      rgba(255, 255, 255, 0.05) 50%,
      rgba(255, 255, 255, 0) 70%
    );
  }
  
  &::after {
    bottom: -150px;
    right: -50px;
    width: 400px;
    height: 400px;
    background: radial-gradient(
      circle,
      rgba(255, 255, 255, 0.1) 0%,
      rgba(255, 255, 255, 0.03) 60%,
      rgba(255, 255, 255, 0) 70%
    );
  }
`;

// Additional bubble elements with more dynamic movement
const Bubble = styled.div<{ 
  size: number; 
  top: number; 
  left: number; 
  delay: number;
  opacity?: number;
}>`
  position: absolute;
  width: ${props => props.size}px;
  height: ${props => props.size}px;
  top: ${props => props.top}%;
  left: ${props => props.left}%;
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, ${props => (props.opacity || 0.15)}) 0%,
    rgba(255, 255, 255, ${props => (props.opacity ? props.opacity / 3 : 0.05)}) 60%,
    rgba(255, 255, 255, 0) 70%
  );
  border-radius: 50%;
  filter: blur(${props => Math.min(props.size / 10, 20)}px);
  animation: 
    float-${props => Math.floor(props.delay) % 4} ${props => 20 + props.delay}s ease-in-out infinite,
    pulse-${props => Math.floor(props.delay) % 3} ${props => 8 + props.delay / 2}s ease-in-out infinite;
  animation-delay: ${props => props.delay}s, ${props => props.delay / 2}s;
  
  /* Multiple animation patterns for different bubbles */
  @keyframes float-0 {
    0% {
      transform: translate(0, 0) scale(1);
    }
    25% {
      transform: translate(20px, -15px) scale(1.05);
    }
    50% {
      transform: translate(40px, -20px) scale(1.1);
    }
    75% {
      transform: translate(20px, -5px) scale(1.05);
    }
    100% {
      transform: translate(0, 0) scale(1);
    }
  }
  
  @keyframes float-1 {
    0% {
      transform: translate(0, 0) scale(1);
    }
    33% {
      transform: translate(-25px, -20px) scale(1.05);
    }
    66% {
      transform: translate(-15px, -40px) scale(1.1);
    }
    100% {
      transform: translate(0, 0) scale(1);
    }
  }
  
  @keyframes float-2 {
    0% {
      transform: translate(0, 0) scale(1);
    }
    20% {
      transform: translate(15px, -10px) scale(1.02);
    }
    40% {
      transform: translate(30px, -25px) scale(1.05);
    }
    60% {
      transform: translate(15px, -40px) scale(1.08);
    }
    80% {
      transform: translate(-10px, -20px) scale(1.05);
    }
    100% {
      transform: translate(0, 0) scale(1);
    }
  }
  
  @keyframes float-3 {
    0% {
      transform: translate(0, 0) scale(1);
    }
    30% {
      transform: translate(-20px, -30px) scale(1.05);
    }
    50% {
      transform: translate(-30px, -20px) scale(1.08);
    }
    70% {
      transform: translate(-40px, -10px) scale(1.05);
    }
    100% {
      transform: translate(0, 0) scale(1);
    }
  }
  
  /* Subtle pulsating effects */
  @keyframes pulse-0 {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  
  @keyframes pulse-1 {
    0%, 100% { opacity: 0.9; }
    30% { opacity: 0.6; }
    70% { opacity: 0.8; }
  }
  
  @keyframes pulse-2 {
    0%, 100% { opacity: 0.85; }
    25% { opacity: 1; }
    75% { opacity: 0.7; }
  }
`;

const HeroContent = styled.div`
  position: relative;
  z-index: 1;
  max-width: 800px;
  margin: 0 auto;
  
  /* Add text shadow for better contrast */
  & h1, & p {
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  }
`;

const HeroTitle = styled.h1`
  font-size: 5rem;
  font-weight: 800;
  margin-bottom: 1.5rem;
  color: black;
  position: relative;
  z-index: 1;
  
  @media (max-width: 768px) {
    font-size: 3rem;
  }
`;

const HeroSubtitle = styled.p`
  font-size: 1.5rem;
  line-height: 1.4;
  margin-bottom: 2.5rem;
  color: black;
  font-weight: 700;
  
  @media (max-width: 768px) {
    font-size: 1.6rem;
  }
`;

// Create a coffee cup shaped button with steam
const CoffeeButton = styled.div`
  position: relative;
  display: inline-block;
  margin-top: 1.5rem;
  cursor: pointer;
  z-index: 10;
`;

const CupShape = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  color: black;
  font-weight: 800;
  font-size: 1.2rem;
  text-decoration: none;
  width: 150px;
  height: 75px;
  border-radius: 8px 8px 35px 35px;
  position: relative;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.25);
  transition: all 0.3s ease;
  overflow: visible;
  border: 1px solid rgba(0, 0, 0, 0.05);

  
  /* Cup handle */
  &::after {
    content: "";
    position: absolute;
    right: -40px;
    top: 0px;
    width: 40px;
    height: 40px;
    border: 10px solid white;
    border-radius: 25px;
    border-left: none;
    transition: all 0.3s ease;
    border-top-color: white;
    border-bottom-color: white;
    border-right-color: white;
  }
  
  &:hover {
    transform: translateY(-5px);
  }
`;

// Steam animation
const Steam = styled.div`
  position: absolute;
  top: 0px;
  left: 20px;
  z-index: 2;
  pointer-events: none;
  
  &::before, &::after, &>span {
    content: "";
    position: absolute;
    width: 10px;
    height: 35px;
    background: white;
    border-radius: 50%;
    animation: steam 3s infinite ease-in-out;
    opacity: 0.7;
    filter: blur(7px);
  }
  
  &::before {
    left: 30px;
    animation-delay: 0.2s;
  }
  
  &::after {
    left: 90px;
    animation-delay: 0.5s;
    height: 45px;
  }
  
  &>span {
    left: 55px;
    animation-delay: 0s;
    height: 30px;
  }
  
  @keyframes steam {
    0% {
      transform: translateY(0) scaleX(0.8);
      opacity: 0.7;
    }
    50% {
      transform: translateY(-35px) scaleX(1.2) rotate(5deg);
      opacity: 0.4;
    }
    100% {
      transform: translateY(-70px) scaleX(0.4) rotate(-5deg);
      opacity: 0;
    }
  }
`;

// Problem Section
const ProblemSection = styled.section`
  padding: 5rem 2rem;
  background-color: ${colors.primaryBg};
  text-align: center;
`;

const SectionTitle = styled.h2`
  font-size: 2.5rem;
  color: ${colors.primary};
  margin-bottom: 3rem;
  font-weight: 700;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const ProblemList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 800px;
  margin: 0 auto 3rem;
`;

const ProblemItem = styled.div`
  background-color: white;
  padding: 1.5rem;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  font-size: 1.2rem;
  color: ${colors.text.medium};
  transition: transform 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
  }
`;

const SolutionStatement = styled.p`
  font-size: 1.5rem;
  color: ${colors.primary};
  font-weight: 600;
  margin-bottom: 2rem;
`;

// Features Section
const FeaturesSection = styled.section`
  padding: 5rem 2rem;
  background-color: white;
  text-align: center;
`;

const FeatureSlider = styled.div`
  display: flex;
  overflow-x: auto;
  gap: 2rem;
  padding: 2rem 0;
  margin: 0 auto 3rem;
  max-width: 1200px;
  scrollbar-width: none;
  
  &::-webkit-scrollbar {
    display: none;
  }
`;

const FeatureCard = styled.div`
  min-width: 300px;
  background-color: ${colors.primaryBg};
  border-radius: 15px;
  padding: 2rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  text-align: left;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: translateY(-10px);
  }
`;

const FeatureTitle = styled.h3`
  font-size: 1.5rem;
  color: ${colors.primary};
  margin-bottom: 1rem;
`;

const FeatureDescription = styled.p`
  color: ${colors.text.medium};
  line-height: 1.6;
`;

const FeatureCTA = styled.p`
  font-size: 1.2rem;
  color: ${colors.primary};
  font-weight: 600;
  margin-top: 2rem;
`;

// Testimonials Section
const TestimonialsSection = styled.section`
  padding: 5rem 2rem;
  background-color: ${colors.primaryBg};
  text-align: center;
`;

const TestimonialTabs = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 3rem;
`;

const TabButton = styled.button<{ active: boolean }>`
  background-color: ${props => props.active ? colors.primary : 'white'};
  color: ${props => props.active ? 'white' : colors.primary};
  border: 2px solid ${colors.primary};
  padding: 0.8rem 1.5rem;
  border-radius: 50px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: ${props => props.active ? colors.primaryDark : colors.primaryPale};
  }
`;

const PricingTable = styled.div`
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin: 0 auto 3rem;
  max-width: 1000px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1.5rem;
  }
`;

const PricingCard = styled.div`
  background-color: white;
  border-radius: 15px;
  padding: 2rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: translateY(-10px);
  }
`;

const PricingTitle = styled.h3`
  font-size: 1.5rem;
  color: ${colors.primary};
  margin-bottom: 1rem;
`;

const PricingPrice = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${colors.primary};
  margin-bottom: 1rem;
`;

const PricingPeriod = styled.div`
  font-size: 1rem;
  color: ${colors.text.light};
  margin-bottom: 1.5rem;
`;

const PricingFeatures = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 2rem;
  text-align: left;
  width: 100%;
`;

const PricingFeature = styled.li`
  margin-bottom: 0.8rem;
  color: ${colors.text.medium};
  display: flex;
  align-items: center;
  
  &::before {
    content: "✓";
    color: ${colors.accent};
    margin-right: 0.5rem;
    font-weight: bold;
  }
`;

// FAQ Section
const FAQSection = styled.section`
  padding: 5rem 2rem;
  background-color: white;
  text-align: center;
`;

const FAQContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const FAQItem = styled.div`
  margin-bottom: 1.5rem;
  border: 1px solid ${colors.primaryPale};
  border-radius: 10px;
  overflow: hidden;
`;

interface FAQQuestionProps {
  isOpen: boolean;
}

const FAQQuestion = styled.div<FAQQuestionProps>`
  padding: 1.5rem;
  background-color: ${colors.primaryBg};
  font-weight: 600;
  color: ${colors.primary};
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  &::after {
    content: "${props => props.isOpen ? '−' : '+'}";
    font-size: 1.5rem;
  }
`;

interface FAQAnswerProps {
  isOpen: boolean;
}

const FAQAnswer = styled.div<FAQAnswerProps>`
  padding: ${props => props.isOpen ? '1.5rem' : '0 1.5rem'};
  max-height: ${props => props.isOpen ? '500px' : '0'};
  overflow: hidden;
  transition: all 0.3s ease;
  color: ${colors.text.medium};
  line-height: 1.6;
`;

// Standard button for other sections
const SubscribeButton = styled(Link)`
  display: inline-block;
  background-color: white;
  color: black;
  font-weight: 700;
  padding: 1rem 2.5rem;
  border-radius: 20px;
  text-decoration: none;
  font-size: 1.4rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.9);
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  }
`;

export default function Home() {
  const [activeTab, setActiveTab] = useState<'IT' | 'Business'>('IT');
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  
  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };
  
  const faqs = [
    {
      question: "영어 한잔은 어떤 서비스인가요?",
      answer: "영어 한잔은 하루 5분으로 영어 실력과 글로벌 감각을 키울 수 있는 서비스입니다. 월스트리트저널, 파이낸셜 타임즈 등에서 선별한 최신 영어 토픽을 제공하며, 속독 모드와 한글 번역, 주요 단어 정리까지 제공합니다."
    },
    {
      question: "구독은 언제든 취소할 수 있나요?",
      answer: "네, 언제든지 구독을 취소할 수 있습니다. 구독 취소 시 다음 결제 주기부터 서비스가 중단됩니다."
    },
    {
      question: "어떤 레벨의 영어 실력이 필요한가요?",
      answer: "영어 한잔은 다양한 레벨의 사용자를 위해 설계되었습니다. 초보자부터 고급자까지 모두 이용 가능하며, 각자의 수준에 맞게 콘텐츠를 제공합니다."
    },
    {
      question: "모바일에서도 이용 가능한가요?",
      answer: "네, 영어 한잔은 모바일 환경에 최적화되어 있어 스마트폰이나 태블릿에서도 편리하게 이용할 수 있습니다."
    }
  ];
  
  return (
    <div>
      {/* Hero Section */}
      <HeroSection>
        <BubbleBackground>
          <Bubble size={200} top={20} left={20} delay={0} opacity={0.18} />
          <Bubble size={150} top={60} left={70} delay={2} opacity={0.12} />
          <Bubble size={180} top={30} left={60} delay={1} opacity={0.15} />
          <Bubble size={120} top={70} left={30} delay={3} opacity={0.2} />
          <Bubble size={250} top={10} left={80} delay={2} opacity={0.1} />
          <Bubble size={170} top={40} left={40} delay={1.5} opacity={0.14} />
          <Bubble size={140} top={80} left={50} delay={2.5} opacity={0.17} />
          <Bubble size={220} top={15} left={45} delay={0.5} opacity={0.13} />
          <Bubble size={130} top={55} left={85} delay={3.5} opacity={0.16} />
        </BubbleBackground>
        <HeroContent>
          <HeroTitle>1 Cup English</HeroTitle>
          <HeroSubtitle>아메리카노 한잔 값으로 실전 영어 감각을 키우세요</HeroSubtitle>
          <CoffeeButton>
            <Steam>
              <span></span>
            </Steam>
            <CupShape to="/auth">Start Now</CupShape>
          </CoffeeButton>
        </HeroContent>
      </HeroSection>
      
      {/* Problem Section */}
      <ProblemSection>
        <SectionTitle>영미권 엘리트의 관심사, 궁금하지 않으신가요?</SectionTitle>
        <ProblemList>
          <ProblemItem>영어 뉴스는 너무 길고 어렵고,</ProblemItem>
          <ProblemItem>영어 학습지는 우리 생활과 동떨어진 느낌이고,</ProblemItem>
          <ProblemItem>영어 실력은 늘 제자리...</ProblemItem>
        </ProblemList>
        <SolutionStatement>저희도 그랬습니다. 그래서 '영어 한잔'을 만들었습니다.</SolutionStatement>
      </ProblemSection>
      
      {/* Features Section */}
      <FeaturesSection>
        <SectionTitle>하루 5분, 내 영어 실력을 바꾸는 시간</SectionTitle>
        <FeatureSlider>
          <FeatureCard>
            <FeatureTitle>최신 영어 토픽</FeatureTitle>
            <FeatureDescription>
              Fortune 500 기업 임원들이 가장 즐겨 읽는 Wall Street Journal, Financial Times에서 이 순간 가장 핫한 영어 토픽을 기반으로 콘텐츠를 제작합니다.
            </FeatureDescription>
          </FeatureCard>
          <FeatureCard>
            <FeatureTitle>속독 모드</FeatureTitle>
            <FeatureDescription>
              본문을 쉽게 읽을 수 있도록 도와주는 속독 모드로 빠르게 내용을 파악할 수 있습니다.
            </FeatureDescription>
          </FeatureCard>
          <FeatureCard>
            <FeatureTitle>한글 번역 및 단어 정리</FeatureTitle>
            <FeatureDescription>
              한글 번역 및 주요 단어 정리까지 제공하여 더욱 효과적인 학습이 가능합니다.
            </FeatureDescription>
          </FeatureCard>
        </FeatureSlider>
        <FeatureCTA>하루 5분으로 영어 실력과 글로벌 감각을 동시에 키워보세요!</FeatureCTA>
      </FeaturesSection>
      
      {/* Testimonials Section */}
      <TestimonialsSection>
        <SectionTitle>이용 후기</SectionTitle>
        <TestimonialTabs>
          <TabButton 
            active={activeTab === 'IT'} 
            onClick={() => setActiveTab('IT')}
          >
            IT
          </TabButton>
          <TabButton 
            active={activeTab === 'Business'} 
            onClick={() => setActiveTab('Business')}
          >
            Business
          </TabButton>
        </TestimonialTabs>
        <PricingTable>
          <PricingCard>
            <PricingTitle>30일</PricingTitle>
            <PricingPrice>4,500원</PricingPrice>
            <PricingPeriod>월</PricingPeriod>
            <PricingFeatures>
              <PricingFeature>하루 5분 영어 학습</PricingFeature>
              <PricingFeature>최신 영어 토픽 제공</PricingFeature>
              <PricingFeature>속독 모드</PricingFeature>
              <PricingFeature>한글 번역 및 단어 정리</PricingFeature>
            </PricingFeatures>
            <SubscribeButton to="/payment">지금 구독하기</SubscribeButton>
          </PricingCard>
          <PricingCard>
            <PricingTitle>90일</PricingTitle>
            <PricingPrice>12,500원</PricingPrice>
            <PricingPeriod>3개월</PricingPeriod>
            <PricingFeatures>
              <PricingFeature>하루 5분 영어 학습</PricingFeature>
              <PricingFeature>최신 영어 토픽 제공</PricingFeature>
              <PricingFeature>속독 모드</PricingFeature>
              <PricingFeature>한글 번역 및 단어 정리</PricingFeature>
              <PricingFeature>학습 진도 추적</PricingFeature>
            </PricingFeatures>
            <SubscribeButton to="/payment">지금 구독하기</SubscribeButton>
          </PricingCard>
          <PricingCard>
            <PricingTitle>180일</PricingTitle>
            <PricingPrice>24,000원</PricingPrice>
            <PricingPeriod>6개월</PricingPeriod>
            <PricingFeatures>
              <PricingFeature>하루 5분 영어 학습</PricingFeature>
              <PricingFeature>최신 영어 토픽 제공</PricingFeature>
              <PricingFeature>속독 모드</PricingFeature>
              <PricingFeature>한글 번역 및 단어 정리</PricingFeature>
              <PricingFeature>학습 진도 추적</PricingFeature>
              <PricingFeature>맞춤형 학습 추천</PricingFeature>
            </PricingFeatures>
            <SubscribeButton to="/payment">지금 구독하기</SubscribeButton>
          </PricingCard>
        </PricingTable>
      </TestimonialsSection>
      
      {/* FAQ Section */}
      <FAQSection>
        <SectionTitle>자주 묻는 질문</SectionTitle>
        <FAQContainer>
          {faqs.map((faq, index) => (
            <FAQItem key={index}>
              <FAQQuestion 
                onClick={() => toggleFAQ(index)}
                isOpen={openFAQ === index}
              >
                {faq.question}
              </FAQQuestion>
              <FAQAnswer isOpen={openFAQ === index}>
                {faq.answer}
              </FAQAnswer>
            </FAQItem>
          ))}
        </FAQContainer>
      </FAQSection>
    </div>
  );
}