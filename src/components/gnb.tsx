import { Link } from "react-router-dom";
import styled from "styled-components";
import { useState } from "react";
import React from "react";
import { useAuth } from "../contexts/AuthContext";

// Import logo
import logo from "../assets/1cup_logo_circular.png";
import defaultUser from "../assets/default_user.png";

// Define colors for consistency
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

const NavbarContainer = styled.nav`
  background-color: white;
  height: 60px;
  display: flex;
  justify-content: center;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) {
    height: 50px;
  }
`;

const NavbarContent = styled.div`
  max-width: 850px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;

  @media (max-width: 768px) {
    padding: 0 1rem;
  }
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;

  @media (max-width: 768px) {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
  }
`;

const LogoLink = styled(Link)`
  display: flex;
  align-items: center;
  text-decoration: none;
`;

const Logo = styled.img`
  height: 32px;
  margin-right: 8px;

  @media (max-width: 768px) {
    height: 28px;
    margin-right: 6px;
  }
`;

const BrandName = styled.span`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${colors.primary};

  @media (max-width: 768px) {
    font-size: 1.1rem;
  }
`;

const MenuContainer = styled.div`
  display: flex;
  gap: 1.3rem;

  @media (max-width: 768px) {
    display: none;
  }
`;

const MenuItem = styled(Link)`
  color: ${colors.text.medium};
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  padding: 0.4rem 0.3rem;
  transition: color 0.2s ease;

  &:hover {
    color: ${colors.primary};
  }
`;

const AuthButton = styled(Link)`
  background-color: ${colors.primary};
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: ${colors.primaryDark};
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

// Hamburger menu components
const HamburgerButton = styled.button`
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  z-index: 1001;
  margin-left: -8px;
  color: ${colors.primary};

  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
  }
`;

const IconSvg = styled.svg`
  width: 40px;
  height: 40px;
`;

const ProfileButton = styled(Link)`
  color: ${colors.primary};
  border: none;
  height: 36px;
  width: 36px;
  overflow: hidden;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid ${colors.primary};
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  @media (max-width: 768px) {
    position: absolute;
    right: 1rem;
    height: 30px;
    width: 30px;
  }
`;

const ProfileImage = styled.img`
  width: 30px;
  height: 30px;
  object-fit: cover;
  border-radius: 50%;
`;

const MobileMenuContainer = styled.div<{ isOpen: boolean }>`
  display: none;

  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    background-color: white;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    padding-top: 80px;
    transition: transform 0.3s ease-in-out;
    transform: ${({ isOpen }) =>
      isOpen ? "translateY(0)" : "translateY(-100%)"};
    z-index: 999;
  }
`;

const MobileMenuItem = styled(Link)`
  padding: 1.5rem 2rem;
  color: ${colors.text.medium};
  text-decoration: none;
  font-size: 1.2rem;
  font-weight: 500;
  text-align: center;
  border-bottom: 1px solid ${colors.primaryPale};

  &:hover {
    background-color: ${colors.primaryPale};
  }
`;

const MobileAuthButton = styled(Link)`
  margin: 2rem auto;
  width: 80%;
  max-width: 300px;
  background-color: ${colors.primary};
  color: white;
  padding: 0.8rem 0;
  border-radius: 20px;
  font-weight: 600;
  text-decoration: none;
  text-align: center;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: ${colors.primaryDark};
  }
`;

interface GNBProps {
  // Add any props you might need in the future
}

export default function GNB({}: GNBProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { currentUser } = useAuth();

  // Handle clicking outside the menu to close it
  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // If the menu is open and the click is not inside the menu or hamburger button
      if (
        isMenuOpen &&
        !target.closest(".mobile-menu") &&
        !target.closest(".hamburger-btn")
      ) {
        setIsMenuOpen(false);
      }
    };

    // Add the event listener when the menu is open
    if (isMenuOpen) {
      document.addEventListener("click", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [isMenuOpen]);

  return (
    <NavbarContainer>
      <NavbarContent>
        <HamburgerButton
          className="hamburger-btn"
          onClick={(e) => {
            e.stopPropagation(); // Prevent click from immediately closing the menu
            setIsMenuOpen(!isMenuOpen);
          }}
        >
          {isMenuOpen ? (
            <IconSvg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </IconSvg>
          ) : (
            <IconSvg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </IconSvg>
          )}
        </HamburgerButton>

        <LogoContainer>
          <LogoLink to="/">
            <Logo src={logo} alt="영어 한잔 로고" />
            <BrandName>영어 한잔</BrandName>
          </LogoLink>
        </LogoContainer>

        <MenuContainer>
          <MenuItem to="/about">서비스 소개</MenuItem>
          <MenuItem to="/pricing">요금제</MenuItem>
          <MenuItem to="/stories">고객후기</MenuItem>
          <MenuItem to="/faq">자주 묻는 질문</MenuItem>
        </MenuContainer>

        {currentUser ? (
          <ProfileButton to="/profile">
            <ProfileImage src={defaultUser} alt="사용자 프로필" />
          </ProfileButton>
        ) : (
          <AuthButton to="/auth">시작하기</AuthButton>
        )}

        <MobileMenuContainer className="mobile-menu" isOpen={isMenuOpen}>
          <MobileMenuItem to="/about" onClick={() => setIsMenuOpen(false)}>
            서비스 소개
          </MobileMenuItem>
          <MobileMenuItem to="/pricing" onClick={() => setIsMenuOpen(false)}>
            요금제
          </MobileMenuItem>
          <MobileMenuItem to="/stories" onClick={() => setIsMenuOpen(false)}>
            고객후기
          </MobileMenuItem>
          <MobileMenuItem to="/faq" onClick={() => setIsMenuOpen(false)}>
            자주 묻는 질문
          </MobileMenuItem>
          {currentUser ? (
            <ProfileButton to="/profile">
              <ProfileImage src={defaultUser} alt="사용자 프로필" />
            </ProfileButton>
          ) : (
            <MobileAuthButton to="/auth" onClick={() => setIsMenuOpen(false)}>
              시작하기
            </MobileAuthButton>
          )}
        </MobileMenuContainer>
      </NavbarContent>
    </NavbarContainer>
  );
}