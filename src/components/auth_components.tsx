import styled from "styled-components";
import { Link as RouterLink } from "react-router-dom";
import { ReactNode } from "react";
import logoImage from "../assets/1cup_logo_circular.png";

// Define colors to match with layout.tsx
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

// Layout Components
export const PageWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100%;
  background-color: ${colors.primaryBg};
`;

export const ContentContainer = styled.div`
  width: 420px;
  padding: 50px 0px;
`;

export const Header = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  padding: 20px;
  z-index: 100;
  display: flex;
  align-items: center;
`;

export const Logo = styled.img`
  height: 30px;
  width: 30px;
  margin-right: 10px;
`;

export const ServiceName = styled.h1`
  font-size: 24px;
  font-weight: 600;
  color: ${colors.text.dark};
`;

export const Footer = styled.footer`
  position: fixed;
  bottom: 15px;
  left: 0;
  width: 100%;
  padding: 15px 0;
  text-align: center;
  font-size: 14px;
  color: ${colors.text.medium};
`;

export const FooterLink = styled.a`
  color: ${colors.text.medium};
  text-decoration: none;
  margin: 0 5px;

  &:hover {
    text-decoration: underline;
  }
`;

// Form Components
export const FormWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 20px 0;
`;

export const Title = styled.h1`
  font-size: 32px;
  font-weight: 600;
  margin-bottom: 30px;
  text-align: center;
  color: ${colors.text.dark};
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  margin-bottom: 20px;
  box-sizing: border-box;
  min-height: 150px;
`;

export const InputWrapper = styled.div`
  position: relative;
  width: 100%;
  margin-bottom: 10px;
  box-sizing: border-box;
  min-height: 60px;
`;

export const InputField = styled.input`
  width: 100%;
  padding: 15px;
  border-radius: 50px;
  border: 1.5px solid ${colors.primaryPale};
  font-size: 16px;
  outline: none;
  background-color: white;
  transition: border-color 0.3s;
  box-sizing: border-box;
  height: 54px;
  margin: 0;
  position: relative;
  z-index: 1;

  &:focus {
    border-color: ${colors.primary};
  }

  &:focus + label {
    color: ${colors.primary};
  }

  &:not(:focus):not(:placeholder-shown) + label {
    transform: translateY(-24px) scale(0.8);
    color: ${colors.text.light};
    background-color: white;
    padding: 0 5px;
  }

  &:focus + label,
  &:not(:placeholder-shown) + label {
    transform: translateY(-24px) scale(0.8);
    background-color: white;
    padding: 0 5px;
  }

  &::placeholder {
    color: transparent;
  }

  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus {
    -webkit-text-fill-color: inherit;
    -webkit-box-shadow: 0 0 0px 1000px white inset;
    transition: background-color 5000s ease-in-out 0s;
    background-clip: content-box !important;
  }
`;

export const InputLabel = styled.label`
  position: absolute;
  left: 24px;
  top: 16px;
  color: ${colors.text.light};
  font-size: 16px;
  pointer-events: none;
  transition: 0.3s ease all;
  transform-origin: left top;
  z-index: 1;
`;

export const SubmitButton = styled.input`
  padding: 15px;
  border-radius: 50px;
  border: none;
  background-color: ${colors.primary};
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
  height: 54px;
  width: 100%;
  display: block;
  box-sizing: border-box;
  transition: background-color 0.3s;
  position: relative;
  outline: none;

  &:hover {
    background-color: ${colors.primaryLight};
  }

  &:active {
    transform: translateY(1px);
    transition: transform 0.1s;
  }

  &:focus {
    outline: none;
  }

  &:disabled {
    background-color: #b0b0b0;
    cursor: not-allowed;
  }
`;

// Utility Components
export const RecaptchaContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 1rem 0;
`;

export const SwitcherLink = styled.a`
  display: block;
  text-align: center;
  margin-top: 1rem;
  color: ${colors.text.dark};
  text-decoration: none;
  font-size: 0.875rem;

  &:hover {
    text-decoration: underline;
  }
`;

export const Error = styled.p`
  color: #d93025;
  margin-bottom: 12px;
  text-align: center;
  font-size: 14px;
`;

export const Link = styled(RouterLink)`
  text-decoration: none;
  color: ${colors.text.dark};
  font-size: 14px;
  margin: 4px 0px;
  text-align: center;
  &:hover {
    text-decoration: underline;
  }
`;

export const Divider = styled.div`
  display: flex;
  align-items: center;
  margin: 25px 0;
  width: 100%;

  &::before,
  &::after {
    content: "";
    flex: 1;
    border-bottom: 1px solid #ddd;
  }

  span {
    padding: 0 15px;
    color: #666;
    font-size: 14px;
  }
`;

// Layout Component
interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <PageWrapper>
      <ContentContainer>
        <Header>
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              textDecoration: "none",
            }}
          >
            <Logo src={logoImage} alt="1 Cup English Logo" />
            <ServiceName>1 Cup English</ServiceName>
          </Link>
        </Header>
        {children}
        <Footer>
          <FooterLink href="/policy/terms">이용약관</FooterLink>|
          <FooterLink href="/policy/privacy">개인정보처리방침</FooterLink>
        </Footer>
      </ContentContainer>
    </PageWrapper>
  );
}
