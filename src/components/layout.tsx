import { Outlet } from "react-router-dom";
import styled from "styled-components";

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

const LayoutContainer = styled.div`
  min-height: 100vh;
  width: 100%;
  background-color: ${colors.primaryBg};
  display: flex;
  flex-direction: column;
  position: relative;
  max-width: 100vw;
  overflow-x: hidden;
  
  @media (max-width: 768px) {
    /* Force proper sizing on mobile */
    min-height: -webkit-fill-available;
    width: 100vw;
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(to right, ${colors.primary}, ${colors.accent});
  }
`;

// This ContentContainer helps ensure proper scaling on mobile
const ContentContainer = styled.div`
  width: 100%;
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
`;

const Footer = styled.footer`
  background-color: ${colors.primaryBg};
  padding: 2rem 1.5rem;
  border-top: 1px solid ${colors.primaryPale};
  font-size: 0.8rem;
  color: ${colors.text.medium};
  text-align: center;
  
  @media (max-width: 768px) {
    padding: 1.5rem 1rem;
    font-size: 0.8rem;
  }
`;

const FooterContent = styled.div`
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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

export default function Layout() {
  return (
    <LayoutContainer>
      <ContentContainer>
        <Outlet />
      </ContentContainer>
      <Footer>
        <FooterContent>
          <div>
            <FooterLink href="/policy/privacy">개인정보 취급방침</FooterLink>
            <FooterDivider>|</FooterDivider>
            <FooterLink href="/policy/terms">이용약관</FooterLink>
          </div>
          <div>
            영어 한잔 | 549-04-02156 | 대표자 김수겸 | 이메일 hello@nativept.kr
          </div>
          <div>통신판매업 신고번호 제2022-서울종로-1744호</div>
          <div>서울특별시 성북구 안암로9가길 9-8, 303호</div>
          <div>'영어한잔'은 '네이티브피티'의 영어교육 서비스 브랜드입니다.</div>
          <div>ⓒ2025 All Rights Reserved.</div>
        </FooterContent>
      </Footer>
    </LayoutContainer>
  )
}