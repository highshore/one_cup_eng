import styled from "styled-components";
import homepageImg from "../assets/guide/homepage.jpeg";
import signupImg from "../assets/guide/signup.jpeg";
import profileImg from "../assets/guide/profile.jpeg";
import kakaoImg from "../assets/guide/kakao.jpeg";
import articleImg from "../assets/guide/article.jpeg";

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

const Guide = () => {
  return (
    <GuideContainer>
      <Title>이용 가이드</Title>
      <Content>
        <SectionTitle>이용 전 필수 사항</SectionTitle>
        <RequirementBox>
          <p>신규 회원이실 경우 https://1cupenglish.com/ 에서 휴대폰 번호로 회원가입을 하셔야 정상적인 서비스 이용이 가능합니다.</p>
        </RequirementBox>

        <SubSectionTitle>회원가입 방법</SubSectionTitle>
        <StepContainer>
          <Step>
            <StepNumber>1</StepNumber>
            <StepContent>
              <p>https://1cupenglish.com/ 접속 후 "Start Now" 터치</p>
              <StepImage src={homepageImg} alt="영어 한잔 홈페이지 화면" />
            </StepContent>
          </Step>
          
          <Step>
            <StepNumber>2</StepNumber>
            <StepContent>
              <p>휴대폰으로 로그인 화면에서 사용 중인 휴대폰 번호 입력 후 "인증번호 전송" 터치</p>
              <StepImage src={signupImg} alt="영어 한잔 회원가입 화면" />
            </StepContent>
          </Step>
          
          <Step>
            <StepNumber>3</StepNumber>
            <StepContent>
              <p>인증번호 입력 후 로그인</p>
              <StepImage src={profileImg} alt="영어 한잔 프로필 화면" />
            </StepContent>
          </Step>
          
          <Step>
            <StepNumber>4</StepNumber>
            <StepContent>
              <p>카카오톡에서 매일 아침 영어 기사 수신하기</p>
              <StepImage src={kakaoImg} alt="영어 한잔 카카오톡 채널 화면" />
            </StepContent>
          </Step>
          
          <Step>
            <StepNumber>5</StepNumber>
            <StepContent>
              <p>기사 페이지에서 영어 학습하기</p>
              <StepImage src={articleImg} alt="영어 한잔 기사 화면" />
            </StepContent>
          </Step>
        </StepContainer>

        <SectionTitle>자주 묻는 질문</SectionTitle>
        
        <SubSectionTitle>컨텐츠 관련</SubSectionTitle>
        <Faq>
          <Question>Q. 카카오톡 뉴스는 어떻게 받아볼 수 있나요?</Question>
          <Answer>
            A. 서비스 결제 후, https://1cupenglish.com/ 에 본인 휴대폰 번호로 회원 가입을 하시면 다음 날부터 매일 오전 8시에 자동으로 발송됩니다. 결제 시간이 새벽 12시~오전 7시인 경우 당일에도 수신이 가능합니다.<br/>
            예시 1) 10월 8일 오전 7시에 구매 시: 8일 오전 중 발송<br/>
            예시 2) 10월 8일 오후 1시 구매 시: 9일 오전 중 발송
          </Answer>
        </Faq>
        
        <Faq>
          <Question>Q: 하루에 몇 개의 뉴스를 받아볼 수 있나요?</Question>
          <Answer>
            A: 관심 분야별 최신 영어 기사 1개를 전달드립니다.
          </Answer>
        </Faq>
        
        <Faq>
          <Question>Q. 관심 분야를 변경할 수 있나요?</Question>
          <Answer>
            A. 관심 분야를 변경하고 싶으실 경우 뉴스를 받아보시는 영어한잔 카카오톡 채널에 문의 주시면 변경을 도와드리겠습니다.
          </Answer>
        </Faq>
        
        <Faq>
          <Question>Q: 관심 분야를 선택하는 기준이 있나요?</Question>
          <Answer>
            A: 관심 분야는 현재 직무나 희망 산업군에 따라 비즈니스 및 금융, IT 및 기술 중에서 선택하실 수 있습니다. 혹시 다른 분야의 기사를 원하시면 카톡 채널을 통해 건의해주시기 바랍니다.
          </Answer>
        </Faq>
        
        <Faq>
          <Question>Q. 뉴스는 어떤 것들이 발송되나요?</Question>
          <Answer>
            A. 실시간으로 세계에서 가장 화제가 되는 주제들을 영어 학습에 용이하게끔 가공하여 발송합니다.
          </Answer>
        </Faq>
        
        <Faq>
          <Question>Q: 영어 뉴스 외에 추가 학습 자료가 있나요?</Question>
          <Answer>
            A: 뉴스와 관련된 핵심 단어와 예문, 음성 청취 기능을 통해 지식을 쌓고 학습 상태를 점검할 수 있으며, 단어 단어가 잘 읽히게 해주는 속독모드를 통해 빠르게 읽기 연습도 가능합니다.
          </Answer>
        </Faq>
        
        <Faq>
          <Question>Q: 뉴스 발송 시간을 변경할 수 있나요?</Question>
          <Answer>
            A: 뉴스 발송 시간은 매일 오전 7-9시 사이로 고정되어 있어, 개별적인 변경은 어렵습니다.
          </Answer>
        </Faq>
        
        <Faq>
          <Question>Q: 카카오톡 이외의 다른 방법으로 뉴스 수신이 가능한가요?</Question>
          <Answer>
            A: 현재 카카오톡을 통한 뉴스 발송만 지원하고 있습니다.
          </Answer>
        </Faq>
        
        <Faq>
          <Question>Q: 뉴스 내용은 매일 다른가요?</Question>
          <Answer>
            A: 네, 매일 다른 주제의 최신 영어 뉴스가 큐레이션되어 발송됩니다.
          </Answer>
        </Faq>

        <SubSectionTitle>결제 및 환불</SubSectionTitle>
        <Faq>
          <Question>Q: 결제한 후 몇 일 동안 서비스를 이용할 수 있나요?</Question>
          <Answer>
            A: 30일권 기준 서비스 결제 후 기사를 30회 받으실 (매일 기사 1개이므로 대략 30일) 수 있으며, 매일 새로운 학습 자료가 제공됩니다.
          </Answer>
        </Faq>
        
        <Faq>
          <Question>Q: 결제 후 환불이 가능한가요?</Question>
          <Answer>
            A: 서비스 특성상 구매 후 영어 기사가 7회 이상 발송된 경우 환불은 어렵습니다. 7회 미만 발송 시 환불을 희망하실 경우 구매가에서 정가 기준 1회 발송 비용 (7500원/30회 = 250원)을 발송 횟수만큼 곱한 액수를 차감하여 환불을 진행합니다. 예를 들어, 구매가가 4500원이고 기사를 4회 받으셨으면 4500 - 1000 = 3500원을 받으실 수 있습니다.
          </Answer>
        </Faq>
        
        <Faq>
          <Question>Q: 서비스는 매월 자동으로 갱신되나요?</Question>
          <Answer>
            A: 영어 한잔 서비스는 자동 갱신되지 않으며, 30일 이용 기간이 끝나면 재구매를 진행해주셔야 합니다.
          </Answer>
        </Faq>

        <SubSectionTitle>기타 문의</SubSectionTitle>
        <Faq>
          <Question>Q: 영어 한잔을 여러 명이 함께 사용할 수 있나요?</Question>
          <Answer>
            A: 하나의 계정으로 여러 명이 이용하는 것은 어렵습니다.
          </Answer>
        </Faq>
        
        <Faq>
          <Question>Q: 제공된 뉴스와 학습자료는 다시 볼 수 있나요?</Question>
          <Answer>
            A: 발송된 뉴스와 학습자료는 카카오톡 채팅창에서 언제든지 다시 확인할 수 있습니다. 단, 영어 한잔과의 채팅 기록을 삭제하면 이전에 받은 링크들을 다시 확인할 수 없을 수 있으니 주의 부탁드립니다.
          </Answer>
        </Faq>
        
        <Faq>
          <Question>Q: 뉴스 자료는 인쇄가 가능한가요?</Question>
          <Answer>
            A: 네, 카카오톡으로 발송드린 링크를 PC로 접속하신 뒤, 우클릭 후 인쇄하실 수 있습니다. 다만, 자료는 모바일/웹 환경에 최적화되어 있기 때문에 인쇄 시 지원되지 않는 기능들이 있을 수 있습니다.
          </Answer>
        </Faq>
        
        <Faq>
          <Question>Q: 서비스 이용 중 문제가 발생하면 어떻게 하나요?</Question>
          <Answer>
            A: 문제가 발생할 경우, 카카오톡 '영어 한잔' 채널로 문의해 주시면 친절히 안내해 드리겠습니다. 언제든지 편하게 연락해 주세요.
          </Answer>
        </Faq>
        
        <Faq>
          <Question>Q: 예정된 시간에 기사가 도착하지 않았습니다. 어떻게 해야 하나요?</Question>
          <Answer>
            A: 기사 발송이 지연될 경우, 잠시만 기다려 주시면 개발팀에서 신속히 대응하여 문제를 해결해 드리겠습니다. 불편을 드려 죄송합니다.
          </Answer>
        </Faq>
      </Content>
    </GuideContainer>
  );
};

export default Guide; 