"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styled from "styled-components";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/auth_context";
import { useGnb } from "../contexts/gnb_context";
import { colors } from "../constants/colors";

// Extend with component-local tokens
const subscription = { active: "#00a000", inactive: "#808080" } as const;

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

  &:hover {
    color: white;
    text-decoration: none;
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

const ProfileButton = styled(Link)<{
  $isActiveSubscription: boolean | null;
  $isGdgMember?: boolean;
}>`
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
  ${(props) =>
    props.$isGdgMember
      ? `
    background: conic-gradient(from 90deg,
      #1a73e8 0deg 45deg,
      #ea4335 45deg 150deg,
      #fbbc05 150deg 210deg,
      #34a853 210deg 315deg,
      #1a73e8 315deg 360deg
    );
    padding: 2px;
  `
      : `
    border: 2px solid ${
      props.$isActiveSubscription === true
        ? subscription.active
        : props.$isActiveSubscription === false
        ? subscription.inactive
        : colors.accent
    };
  `}
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
    props.$isActive ? subscription.active : subscription.inactive};
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
  transition: all 0.3s ease; // Smooth transition for transparency and transform

  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem;
    gap: 1rem;

    // Transform based on $isOpen for smooth slide animation
    transform: ${({ $isOpen }) =>
      $isOpen ? "translateY(0)" : "translateY(-100%)"};

    // Background transparency based on $isOpen
    background-color: ${({ $isOpen }) => ($isOpen ? "white" : "transparent")};
    box-shadow: ${({ $isOpen }) =>
      $isOpen ? "0 2px 10px rgba(0, 0, 0, 0.1)" : "none"};

    // Disable pointer events when closed to prevent interference with content behind
    pointer-events: ${({ $isOpen }) => ($isOpen ? "auto" : "none")};

    /* Control visibility of menu items */
    visibility: ${({ $isOpen }) => ($isOpen ? "visible" : "hidden")};

    & > * {
      opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
      transition: opacity 0.2s ease-in-out;
      pointer-events: ${({ $isOpen }) => ($isOpen ? "auto" : "none")};
    }
  }
`;

const MobileMenuItem = styled.button<{ $isMenuOpen?: boolean }>`
  color: ${({ $isMenuOpen }) =>
    $isMenuOpen ? colors.primary : colors.primaryPale};
  text-decoration: none;
  font-size: 1.1rem;
  font-weight: 500;
  padding: 0.5rem 1rem;
  width: 100%;
  text-align: center;
  border-radius: 8px;
  transition: background-color 0.2s, color 0.2s;
  background: none;
  border: none;
  cursor: pointer;
  pointer-events: auto;

  &:hover {
    background-color: ${colors.primaryPale};
    color: ${colors.primary};
  }

  &:active {
    background-color: ${colors.accent};
    color: ${colors.primary};
  }
`;

const MobileAuthButton = styled(Link)`
  background-color: ${colors.primary};
  color: white;
  padding: 0.75rem 3rem;
  border-radius: 20px;
  font-weight: 600;
  text-decoration: none;
  text-align: center;

  &:hover {
    color: white;
    text-decoration: none;
  }

  @media (max-width: 768px) {
    display: block;
    width: 100%;
  }
`;

interface GNBProps {
  // Add any props you might need in the future
  variant?: "home" | "default";
}

export default function GNB({ variant = "default" }: GNBProps) {
  const { currentUser, isLoading, logout, hasActiveSubscription, isGdgMember } =
    useAuth();
  const { isTransparent, setIsTransparent } = useGnb();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const navbarRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const isHomePage = variant === "home";

  // Scroll handler for homepage transparency
  useEffect(() => {
    if (!isHomePage) {
      setIsTransparent(false);
      return;
    }

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      if (scrollTop > 50) {
        setIsTransparent(false);
      } else {
        setIsTransparent(true);
      }
    };

    // Set initial state
    setIsTransparent(true);

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Call once to set initial state

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isHomePage, setIsTransparent]);

  const handleAuthClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      // Get the full URL path including hash for client-side routing
      const currentPath =
        window.location.pathname +
        window.location.search +
        window.location.hash;
      const authUrl = `/auth?redirect=${encodeURIComponent(currentPath)}`;
      window.location.href = authUrl;
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!isMobileMenuOpen);
  };
  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleMobileNavigation = (href: string) => {
    closeMobileMenu();
    router.push(href);
  };

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
        !navbarRef.current.contains(event.target as Node) &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
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

  // Close mobile menu on route change
  useEffect(() => {
    closeMobileMenu();
  }, [pathname]);

  // Use the context's transparency state instead of just checking homepage
  const shouldBeTransparent = isHomePage && isTransparent;

  return (
    <>
      <NavbarContainer $isTransparent={shouldBeTransparent} ref={navbarRef}>
        <NavbarContent>
          <HamburgerButton
            className="hamburger-btn"
            onClick={toggleMobileMenu}
            $isTransparent={shouldBeTransparent}
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
                  shouldBeTransparent
                    ? "/images/logos/1cup_logo_new_white.svg"
                    : "/images/logos/1cup_logo_new.svg"
                }
                alt="1 Cup English Logo"
              />
            </LogoLink>
          </LogoContainer>

          <MenuContainer>
            <MenuItem href="/shadow" $isTransparent={shouldBeTransparent}>
              쉐도잉
            </MenuItem>
            <MenuItem href="/meetup" $isTransparent={shouldBeTransparent}>
              밋업
            </MenuItem>
            <MenuItem href="/blog" $isTransparent={shouldBeTransparent}>
              블로그
            </MenuItem>
          </MenuContainer>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {isLoading ? null : currentUser ? (
              <ProfileWrapper>
                <ProfileButton
                  href="/profile"
                  $isActiveSubscription={hasActiveSubscription}
                  $isGdgMember={isGdgMember === true}
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
              <AuthButton href="/auth" onClick={handleAuthClick}>
                로그인 · 가입
              </AuthButton>
            )}
          </div>
        </NavbarContent>
      </NavbarContainer>
      <MobileMenuContainer
        className="mobile-menu"
        $isOpen={isMobileMenuOpen}
        ref={mobileMenuRef}
      >
        <MobileMenuItem
          onClick={() => handleMobileNavigation("/shadow")}
          $isMenuOpen={isMobileMenuOpen}
        >
          쉐도잉
        </MobileMenuItem>
        <MobileMenuItem
          onClick={() => handleMobileNavigation("/meetup")}
          $isMenuOpen={isMobileMenuOpen}
        >
          밋업
        </MobileMenuItem>
        <MobileMenuItem
          onClick={() => handleMobileNavigation("/blog")}
          $isMenuOpen={isMobileMenuOpen}
        >
          블로그
        </MobileMenuItem>
        <div style={{ marginTop: "1rem" }}>
          {currentUser ? (
            <>
              <MobileMenuItem
                onClick={() => handleMobileNavigation("/profile")}
                $isMenuOpen={isMobileMenuOpen}
              >
                마이페이지
              </MobileMenuItem>
              <MobileMenuItem
                onClick={handleLogout}
                $isMenuOpen={isMobileMenuOpen}
              >
                로그아웃
              </MobileMenuItem>
            </>
          ) : (
            <MobileAuthButton
              href="/auth"
              onClick={(e) => {
                handleAuthClick(e);
                closeMobileMenu();
              }}
            >
              로그인 · 가입
            </MobileAuthButton>
          )}
        </div>
      </MobileMenuContainer>
    </>
  );
}
