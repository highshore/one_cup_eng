"use client";

import styled from "styled-components";

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

const GuideContainer = styled.div`
  max-width: 800px;
  margin-top: 20px;
  padding: 1.5rem 1.5rem;
  min-height: 100vh;
  font-family: "Avenir", "Avenir Next", -apple-system, BlinkMacSystemFont,
    "Segoe UI", "Roboto", "Oxygen", "Ubuntu", sans-serif;

  @media (max-width: 768px) {
    padding: 1rem 0.8rem;
    margin-top: 20px;
    width: 100%;
  }
`;

const Title = styled.h1`
  font-size: 2rem;
  color: ${colors.text.dark};
  margin-bottom: 1.5rem;
  text-align: left;

  @media (max-width: 768px) {
    font-size: 1.8rem;
    margin-bottom: 1.2rem;
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  color: ${colors.primary};
  margin-top: 2rem;
  margin-bottom: 1.2rem;
  font-weight: 600;

  @media (max-width: 768px) {
    font-size: 1.3rem;
    margin-top: 1.8rem;
  }
`;

const SubSectionTitle = styled.h3`
  font-size: 1.25rem;
  color: ${colors.primaryLight};
  margin-top: 1.8rem;
  margin-bottom: 1rem;
  font-weight: 600;

  @media (max-width: 768px) {
    font-size: 1.15rem;
    margin-top: 1.5rem;
  }
`;

const Content = styled.div`
  color: ${colors.text.medium};
  line-height: 1.8;
  font-size: 1rem;

  @media (max-width: 768px) {
    font-size: 0.95rem;
  }
`;

const RequirementBox = styled.div`
  background-color: ${colors.primaryPale};
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border-left: 4px solid ${colors.accent};
`;

const StepContainer = styled.div`
  margin-bottom: 1.2rem;
`;

const Step = styled.div`
  display: flex;
  margin-bottom: 1rem;
  align-items: flex-start;

  @media (max-width: 768px) {
    margin-bottom: 1.5rem;
  }
`;

const StepNumber = styled.div`
  background-color: ${colors.accent};
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-right: 12px;
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: 22px;
    height: 22px;
    font-size: 0.9rem;
  }
`;

const StepContent = styled.div`
  flex: 1;
`;

const Faq = styled.div`
  margin-bottom: 1.2rem;

  @media (max-width: 768px) {
    margin-bottom: 1.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid ${colors.primaryPale};
  }
`;

const Question = styled.div`
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: ${colors.text.dark};

  @media (max-width: 768px) {
    font-size: 0.95rem;
    line-height: 1.4;
  }
`;

const Answer = styled.div`
  margin-bottom: 1.2rem;
  color: ${colors.text.medium};

  @media (max-width: 768px) {
    font-size: 0.9rem;
    line-height: 1.6;
    margin-bottom: 0.8rem;
  }
`;

const StepImage = styled.img`
  width: 100%;
  max-width: 400px;
  border-radius: 8px;
  margin: 0.8rem 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) {
    max-width: 100%;
    margin: 0.6rem 0;
    border-radius: 6px;
  }
`;

export default function GuidePage() {
  return (
    <GuideContainer>
      <Title>이용 가이드</Title>
      <Content>
        <SectionTitle>이용 전 필수 사항</SectionTitle>
        <RequirementBox>
          <p>
            신규 회원이실 경우 https://1cupenglish.com/ 에서 휴대폰 번호로
            회원가입을 하셔야 정상적인 서비스 이용이 가능합니다.
          </p>
        </RequirementBox>

        <SubSectionTitle>회원가입 방법</SubSectionTitle>
        <StepContainer>
          <Step>
            <StepNumber>1</StepNumber>
            <StepContent>
              <p>https://1cupenglish.com/ 접속 후 "Start Now" 터치</p>
              <StepImage
                src="/assets/guide/homepage.jpeg"
                alt="영어 한잔 홈페이지 화면"
              />
            </StepContent>
          </Step>

          <Step>
            <StepNumber>2</StepNumber>
            <StepContent>
              <p>
                휴대폰으로 로그인 화면에서 사용 중인 휴대폰 번호 입력 후
                "인증번호 전송" 터치
              </p>
              <StepImage
                src="/assets/guide/signup.jpeg"
                alt="영어 한잔 회원가입 화면"
              />
            </StepContent>
          </Step>

          <Step>
            <StepNumber>3</StepNumber>
            <StepContent>
              <p>인증번호 입력 후 로그인</p>
              <StepImage
                src="/assets/guide/profile.jpeg"
                alt="영어 한잔 프로필 화면"
              />
            </StepContent>
          </Step>

          <Step>
            <StepNumber>4</StepNumber>
            <StepContent>
              <p>카카오톡에서 매일 아침 영어 기사 수신하기</p>
              <StepImage
                src="/assets/guide/kakao.jpeg"
                alt="영어 한잔 카카오톡 채널 화면"
              />
            </StepContent>
          </Step>

          <Step>
            <StepNumber>5</StepNumber>
            <StepContent>
              <p>기사 페이지에서 영어 학습하기</p>
              <StepImage
                src="/assets/guide/article.jpeg"
                alt="영어 한잔 기사 화면"
              />
            </StepContent>
          </Step>
        </StepContainer>

        <SectionTitle>자주 묻는 질문</SectionTitle>

        <SubSectionTitle>컨텐츠 관련</SubSectionTitle>
        <Faq>
          <Question>Q. 카카오톡 뉴스는 어떻게 받아볼 수 있나요?</Question>
          <Answer>
            A. 서비스 결제 후, https://1cupenglish.com/ 에 본인 휴대폰 번호로
            회원 가입을 하시면 다음 날부터 매일 오전 8시에 자동으로 발송됩니다.
            결제 시간이 새벽 12시~오전 7시인 경우 당일에도 수신이 가능합니다.
            <br />
            예시 1) 10월 8일 오전 7시에 구매 시: 8일 오전 중 발송
            <br />
            예시 2) 10월 8일 오후 1시 구매 시: 9일 오전 중 발송
          </Answer>
        </Faq>
      </Content>
    </GuideContainer>
  );
}
