"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/auth_context";
import { useGnb } from "../contexts/gnb_context";

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
  subscription: {
    active: "#00a000",
    inactive: "#808080",
  },
};

const NavbarContainer = styled.nav<{ $isTransparent?: boolean }>`
  background-color: ${(props) =>
    props.$isTransparent ? "transparent" : "white"};
  height: 60px;
  display: flex;
  justify-content: center;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  box-shadow: ${(props) =>
    props.$isTransparent ? "none" : "0 2px 10px rgba(0, 0, 0, 0.1)"};
  transition: background-color 0.3s ease, box-shadow 0.3s ease;

  @media (max-width: 768px) {
    height: 50px;
  }
`;

const NavbarContent = styled.div`
  max-width: 960px;
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
  height: 24px;

  @media (max-width: 768px) {
    height: 22px;
    margin-right: 6px;
  }
`;

const MenuContainer = styled.div`
  display: flex;
  gap: 1.3rem;

  @media (max-width: 768px) {
    display: none;
  }
`;

const MenuItem = styled(Link)<{ $isTransparent?: boolean }>`
  color: ${(props) => (props.$isTransparent ? "white" : colors.text.medium)};
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  padding: 0.4rem 0.3rem;
  transition: color 0.2s ease;

  &:hover {
    color: ${(props) =>
      props.$isTransparent ? colors.primaryPale : colors.primary};
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
const HamburgerButton = styled.button<{ $isTransparent?: boolean }>`
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  z-index: 1001;
  margin-left: -8px;
  color: ${(props) => (props.$isTransparent ? "white" : colors.primary)};
  transition: color 0.3s ease;

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

// Wrapper for Profile Button and Status Indicator
const ProfileWrapper = styled.div`
  position: relative;
  display: inline-flex; // Or inline-block
  vertical-align: middle; // Align with other GNB items if needed
`;

const ProfileButton = styled(Link)<{ $isActiveSubscription: boolean | null }>`
  // position: relative; // Removed: Wrapper now handles relative positioning
  color: ${colors.primary};
  border: none;
  height: 36px;
  width: 36px;
  overflow: hidden;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid
    ${(props) =>
      props.$isActiveSubscription === true
        ? colors.subscription.active
        : props.$isActiveSubscription === false
        ? colors.subscription.inactive
        : colors.accent};
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  @media (max-width: 768px) {
    // position: absolute; // Removed for GNB header mobile view
    // right: 1rem;        // Removed for GNB header mobile view
    height: 30px;
    width: 30px;
  }
`;

// New component for the status indicator circle
const StatusIndicator = styled.div<{ $isActive: boolean }>`
  position: absolute;
  bottom: 0px;
  right: 0px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: ${(props) =>
    props.$isActive
      ? colors.subscription.active
      : colors.subscription.inactive};
  border: 1.5px solid white;
  box-sizing: border-box;
  z-index: 1;
`;

const ProfileImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
`;

const MobileMenuContainer = styled.div<{
  $isOpen: boolean;
}>`
  display: none; // Default for desktop
  will-change: transform;

  // Common styles for the mobile menu
  position: fixed;
  top: 50px;
  left: 0;
  right: 0;
  z-index: 999;
  max-height: calc(100vh - 50px);
  overflow-y: auto;
  transition: background-color 0.3s ease; // Smooth transition for transparency

  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem;
    gap: 1rem;

    // Always positioned at translateY(0), but transparency controlled by $isOpen
    transform: translateY(0);

    // Background transparency based on $isOpen
    background-color: ${({ $isOpen }) => ($isOpen ? "white" : "transparent")};
    box-shadow: ${({ $isOpen }) =>
      $isOpen ? "0 2px 10px rgba(0, 0, 0, 0.1)" : "none"};

    // Disable pointer events when closed to prevent interference with content behind
    pointer-events: ${({ $isOpen }) => ($isOpen ? "auto" : "none")};

    /* Hide menu items when not open */
    & > * {
      opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
      transition: opacity 0.2s ease-in-out;
    }
  }
`;

const MobileMenuItem = styled(Link)<{ $isTransparent?: boolean }>`
  color: ${({ $isTransparent }) =>
    $isTransparent ? colors.primaryPale : colors.primary};
  text-decoration: none;
  font-size: 1.1rem;
  font-weight: 500;
  padding: 0.5rem 1rem;
  width: 100%;
  text-align: center;
  border-radius: 8px;
  transition: background-color 0.2s, color 0.2s;

  &:hover {
    background-color: ${colors.primaryPale};
    color: ${colors.primary};
  }
`;

const MobileAuthButton = styled(Link)`
  background-color: ${colors.primary};
  color: white;
  padding: 0.8rem 0;
  border-radius: 20px;
  font-weight: 600;
  text-decoration: none;
  text-align: center;
  transition: background-color 0.3s ease, color 0.3s ease;

  &:hover {
    background-color: ${colors.primaryDark};
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

interface GNBProps {
  // Add any props you might need in the future
  variant?: "home" | "default";
}

export default function GNB({ variant = "default" }: GNBProps) {
  const { currentUser, isLoading, logout, hasActiveSubscription } = useAuth();
  const { isTransparent, setIsTransparent } = useGnb();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const navbarRef = useRef<HTMLDivElement>(null);

  const isHomePage = variant === "home";

  const createAuthUrl = () => {
    if (typeof window === "undefined") {
      return "/auth";
    }
    const currentPath = window.location.pathname + window.location.search;
    return `/auth?redirect=${encodeURIComponent(currentPath)}`;
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!isMobileMenuOpen);
  };
  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleLogout = async () => {
    try {
      await logout();
      closeMobileMenu();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        navbarRef.current &&
        !navbarRef.current.contains(event.target as Node)
      ) {
        closeMobileMenu();
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    } else {
      document.removeEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <NavbarContainer $isTransparent={isHomePage} ref={navbarRef}>
        <NavbarContent>
          <HamburgerButton
            className="hamburger-btn"
            onClick={toggleMobileMenu}
            $isTransparent={isHomePage}
          >
            {isMobileMenuOpen ? (
              <IconSvg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </IconSvg>
            ) : (
              <IconSvg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
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
            <LogoLink href="/">
              <Logo
                src={
                  isHomePage
                    ? "/images/logos/1cup_logo_new_white.svg"
                    : "/images/logos/1cup_logo_new.svg"
                }
                alt="1 Cup English Logo"
              />
            </LogoLink>
          </LogoContainer>

          <MenuContainer>
            <MenuItem href="/shadow" $isTransparent={isHomePage}>
              쉐도잉
            </MenuItem>
            <MenuItem href="/meetup" $isTransparent={isHomePage}>
              밋업
            </MenuItem>
            <MenuItem href="/blog" $isTransparent={isHomePage}>
              블로그
            </MenuItem>
          </MenuContainer>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {isLoading ? null : currentUser ? (
              <ProfileWrapper>
                <ProfileButton
                  href="/profile"
                  $isActiveSubscription={hasActiveSubscription}
                >
                  <ProfileImage
                    src={currentUser.photoURL || "/images/default_user.jpg"}
                    alt="사용자 프로필"
                    onError={(e) => {
                      e.currentTarget.src = "/images/default_user.jpg";
                    }}
                  />
                </ProfileButton>
                {hasActiveSubscription !== null && (
                  <StatusIndicator $isActive={!!hasActiveSubscription} />
                )}
              </ProfileWrapper>
            ) : (
              <AuthButton href={createAuthUrl()}>로그인 · 가입</AuthButton>
            )}
          </div>
        </NavbarContent>
      </NavbarContainer>
      <MobileMenuContainer className="mobile-menu" $isOpen={isMobileMenuOpen}>
        <MobileMenuItem
          href="/shadow"
          onClick={closeMobileMenu}
          $isTransparent={isHomePage}
        >
          쉐도잉
        </MobileMenuItem>
        <MobileMenuItem
          href="/meetup"
          onClick={closeMobileMenu}
          $isTransparent={isHomePage}
        >
          밋업
        </MobileMenuItem>
        <MobileMenuItem
          href="/blog"
          onClick={closeMobileMenu}
          $isTransparent={isHomePage}
        >
          블로그
        </MobileMenuItem>
        <div style={{ marginTop: "1rem" }}>
          {currentUser ? (
            <>
              <MobileMenuItem href="/profile" onClick={closeMobileMenu}>
                마이페이지
              </MobileMenuItem>
              <MobileMenuItem href="#" onClick={handleLogout}>
                로그아웃
              </MobileMenuItem>
            </>
          ) : (
            <MobileAuthButton href={createAuthUrl()} onClick={closeMobileMenu}>
              시작하기
            </MobileAuthButton>
          )}
        </div>
      </MobileMenuContainer>
    </>
  );
}
