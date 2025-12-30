"use client";

import styled from "styled-components";

// Clean, minimal blog palette from BlogClient.tsx
const blog = {
  text: { dark: "#111111", medium: "#555555", light: "#8A8A8A" },
  border: "#e5e7eb",
  shadow: "rgba(0,0,0,0.08)",
} as const;

const GuideContainer = styled.div`
  padding: 4rem 1rem;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  background-color: transparent;
  min-height: 100vh;
  max-width: 800px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 2rem 1rem;
  }
`;

const Header = styled.header`
  margin-bottom: 3rem;
  text-align: center;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  color: ${blog.text.dark};
  margin-bottom: 1rem;
  letter-spacing: -0.02em;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: ${blog.text.medium};
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
`;

const ContentCard = styled.article`
  background: #ffffff;
  border: 1px solid ${blog.border};
  border-radius: 16px;
  padding: 3rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 20px ${blog.shadow};

  @media (max-width: 768px) {
    padding: 1.5rem;
    border-radius: 12px;
  }
`;

const Paragraph = styled.p`
  font-size: 1.05rem;
  line-height: 1.8;
  color: ${blog.text.medium};
  margin-bottom: 1.5rem;
  white-space: pre-wrap;

  strong {
    color: ${blog.text.dark};
    font-weight: 600;
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const StepList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin: 2.5rem 0;
`;

const StepCard = styled.div`
  background: #f8f9fa;
  border: 1px solid ${blog.border};
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: #d1d5db;
    background: #ffffff;
    box-shadow: 0 4px 12px ${blog.shadow};
  }
`;

const StepHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
`;

const StepNumber = styled.div`
  width: 32px;
  height: 32px;
  background: #1a1d22;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  flex-shrink: 0;
`;

const StepTitle = styled.h3`
  font-size: 1.15rem;
  font-weight: 600;
  color: ${blog.text.dark};
  margin: 0;
`;

const StepContent = styled.div`
  font-size: 0.95rem;
  line-height: 1.6;
  color: ${blog.text.medium};
  margin: 0;
  padding-left: calc(32px + 1rem);
  
  @media (max-width: 768px) {
    padding-left: 0;
    margin-top: 0.75rem;
  }
`;

const StepImage = styled.img`
  display: block;
  width: 100%;
  height: auto;
  border-radius: 8px;
  border: 1px solid ${blog.border};
  margin-top: 1rem;
`;

const Divider = styled.div`
  height: 1px;
  background: ${blog.border};
  margin: 2rem 0;
  width: 100%;
`;

export default function GuidePage() {
  return (
    <GuideContainer>
      <Header>
        <Title>이용 가이드</Title>
        <Subtitle>영어 한잔 밋업에 오신 것을 환영합니다</Subtitle>
      </Header>

      <ContentCard>
        <Paragraph>
          안녕하세요. 영어 한잔 밋업을 운영하고 있는 카일입니다. 저희 밋업을 선택해주셔서 감사합니다.
        </Paragraph>
        <Paragraph>
          저는 군 통역병으로 커리어를 시작해 IT 유니콘 기업과 대기업에서 통역사로 근무하며 수천 회의 비즈니스 미팅을 통역해왔습니다. 단순 계산만 해도 하루 2회, 연 300일, 5년 기준으로 약 3,000회 이상의 미팅 경험을 쌓았습니다. 이와 함께 주요 임원을 포함한 직장인들을 대상으로 비즈니스 영어 과외도 지속적으로 진행해왔습니다.
        </Paragraph>
        <Paragraph>
          AI 시대가 오면서 모두가 영어를 배워야 하는 시대는 이미 지났다고 생각합니다. 하지만 중국이나 일본에 비해 내수시장이 작은 한국에서 세계 패권국의 언어를 자유롭게 구사하는 능력은 지금도, 앞으로도 분명한 경쟁력입니다. 저 역시 통역사로서의 커리어를 정리하고 엔지니어의 길을 걷고 있지만, 글로벌 커리어의 기회가 왔을 때 반드시 잡겠다는 마음으로 지금도 영어 실력을 꾸준히 갈고 있습니다.
        </Paragraph>
        <Paragraph>
          이 밋업은 수익을 목적으로 만든 모임이 아닙니다. 저와 멤버 모두가 실제로 성장하기 위해 만든 공간입니다. 멤버십 비용은 참여에 대한 최소한의 책임감과 인센티브를 만들기 위한 장치일 뿐이며, 멤버십비가 타 모임에 비해 저렴한만큼 멤버 선정과 운영 기준은 엄격하게 유지하고 있습니다. 저희와 장기적으로 함께 성장하고 싶으시다면 아래 내용을 꼭 확인해주시기 바랍니다.
        </Paragraph>

        <Divider />

        <StepList>
          <StepCard>
            <StepHeader>
              <StepNumber>1</StepNumber>
              <StepTitle>밋업 신청</StepTitle>
            </StepHeader>
            <StepContent>
              밋업 신청은 밋업 신청 페이지를 통해 가능합니다. 매주 안암과 광화문 등 주요 권역에서 주 1회 밋업을 진행하고 있으며, 멤버십이 유지되는 동안 참여 횟수 제한 없이 자유롭게 참석하실 수 있습니다.
              <StepImage src="/assets/guide/image1.png" alt="밋업 신청 화면" />
            </StepContent>
          </StepCard>

          <StepCard>
            <StepHeader>
              <StepNumber>2</StepNumber>
              <StepTitle>밋업 상세 내용 확인</StepTitle>
            </StepHeader>
            <StepContent>
              밋업에 대한 상세 정보는 모집 중인 밋업을 클릭하신 뒤 확인하실 수 있습니다. 여기에서 기사, 일정, 장소, 주의사항 등 밋업 참여에 필요한 모든 정보를 확인하실 수 있습니다.
              <StepImage src="/assets/guide/image2.png" alt="밋업 상세 내용 화면" />
            </StepContent>
          </StepCard>

          <StepCard>
            <StepHeader>
              <StepNumber>3</StepNumber>
              <StepTitle>토픽 확인</StepTitle>
            </StepHeader>
            <StepContent>
              밋업 페이지 상단의 토픽을 클릭하시면 해당 주차에 사용할 기사를 확인하실 수 있습니다. 주로 월스트리트저널과 파이낸셜타임스 기사를 활용하고 있으며, 토론에 집중할 수 있도록 구성되어 있습니다. 다만 저작권 문제로 인해 밋업에 직접 참여하시는 멤버 외에는 외부 공개를 허용하지 않고 있습니다. 기사 내용을 외부로 배포하거나 공유할 경우 즉시 강퇴 사유가 되니 반드시 유의해주시기 바랍니다.
              <StepImage src="/assets/guide/image3.png" alt="토픽 확인 화면" />
            </StepContent>
          </StepCard>
        </StepList>

        <Paragraph>
          영어 한잔 밋업은 가볍게 영어를 경험해보는 모임이 아니라, 장기적으로 소프트 스킬을 갈고 쌓으며 서로가 성장하도록 장려하는 공간입니다. 이 방향성에 공감하신다면 밋업에서 뵙기를 고대하겠습니다.
        </Paragraph>
      </ContentCard>
    </GuideContainer>
  );
}
