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

const FooterContainer = styled.footer`
  background-color: transparent;
  padding: 2rem 1.5rem;
  border-top: 1px solid ${colors.primaryPale};
  font-size: 0.8rem;
  color: ${colors.text.medium};
  text-align: center;
  
  /* Prevent automatic phone/email link detection */
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  
  /* Remove styling from any auto-generated links */
  a {
    color: inherit !important;
    text-decoration: none !important;
    pointer-events: none !important;
  }

  @media (max-width: 768px) {
    padding: 1.5rem 1rem;
    font-size: 0.75rem;
  }
`;

const FooterContent = styled.div`
  max-width: 850px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  
  /* Improve line height for wrapped text within each div */
  > div {
    line-height: 1.4;
    
    @media (max-width: 768px) {
      line-height: 1.5;
    }
  }
`;

const FooterLink = styled.a`
  color: ${colors.text.medium};
  text-decoration: none;

  &:hover {
    color: ${colors.primary};
    text-decoration: underline;
  }
`;

const FooterDivider = styled.span`
  color: ${colors.text.light};
  margin: 0 0.5rem;
`;

export default function Footer() {
  return (
    <FooterContainer>
      <FooterContent>
        <div>
          <FooterLink href="/policy/privacy">개인정보 취급방침</FooterLink>
          <FooterDivider>|</FooterDivider>
          <FooterLink href="/policy/terms">이용약관</FooterLink>
        </div>
        <div>
          네이티브피티 | 549-04-02156 | 대표자 김수겸 | 이메일
          hello@1cupenglish.com
        </div>
        <div>통신판매업 신고번호 제2022-서울종로-1744호</div>
        <div>서울특별시 성북구 안암로9가길 9-8, 303호</div>
        <div>'영어 한잔'은 '네이티브피티'의 영어교육 서비스 브랜드입니다.</div>
        <div>ⓒ2025 All Rights Reserved.</div>
      </FooterContent>
    </FooterContainer>
  );
}
