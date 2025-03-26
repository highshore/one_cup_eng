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

export default function Layout() {
  return (
    <LayoutContainer>
      <Outlet />
    </LayoutContainer>
  )
}