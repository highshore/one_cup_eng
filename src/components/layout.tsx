import { Outlet } from "react-router-dom";
import styled from "styled-components";
import GNB from "./gnb";
import Footer from "./footer";

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
`;

// This ContentContainer helps ensure proper scaling on mobile
const ContentContainer = styled.div`
  width: 100%;
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  padding-top: 60px; /* Add space for the fixed navbar using padding instead of margin */
  max-width: 850px;
  margin-left: auto;
  margin-right: auto;
  
  @media (max-width: 768px) {
    /* Force proper sizing on mobile */
    padding-top: 50px;
  }
`;

export default function Layout() {
  return (
    <LayoutContainer>
      <GNB />
      <ContentContainer>
        <Outlet />
      </ContentContainer>
      <Footer />
    </LayoutContainer>
  );
}
