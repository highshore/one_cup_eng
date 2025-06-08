import { Link } from "react-router-dom";
import styled from "styled-components";
import { useState, useEffect } from "react";
import React from "react";
import { useAuth } from "../contexts/auth_context";
import { auth } from "../../firebase";

// Import logo
import logo from "../assets/1cup_logo_new.svg";
import logoWhite from "../assets/1cup_logo_new_white.svg";
import defaultUser from "../assets/default_user.jpg";

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
  }
`;

const MobileMenuItem = styled(Link)<{ $isOpen?: boolean }>`
  padding: 1.5rem 2rem;
  text-decoration: none;
  font-size: 1.2rem;
  font-weight: 500;
  text-align: center;
  width: 100%;
  transition: color 0.3s ease, background-color 0.3s ease,
    border-color 0.3s ease;

  // Text and border transparency based on $isOpen
  color: ${({ $isOpen }) => ($isOpen ? colors.text.medium : "transparent")};
  border-bottom: 1px solid
    ${({ $isOpen }) => ($isOpen ? colors.primaryPale : "transparent")};

  &:hover {
    background-color: ${({ $isOpen }) =>
      $isOpen ? colors.primaryPale : "transparent"};
  }

  // Disable pointer events when menu is closed
  pointer-events: ${({ $isOpen }) => ($isOpen ? "auto" : "none")};
`;

const MobileAuthButton = styled(Link)<{ $isOpen?: boolean }>`
  margin: 2rem auto;
  width: 80%;
  max-width: 300px;
  padding: 0.8rem 0;
  border-radius: 20px;
  font-weight: 600;
  text-decoration: none;
  text-align: center;
  transition: background-color 0.3s ease, color 0.3s ease;

  // Button transparency based on $isOpen
  background-color: ${({ $isOpen }) =>
    $isOpen ? colors.primary : "transparent"};
  color: ${({ $isOpen }) => ($isOpen ? "white" : "transparent")};

  &:hover {
    background-color: ${({ $isOpen }) =>
      $isOpen ? colors.primaryDark : "transparent"};
  }

  // Disable pointer events when menu is closed
  pointer-events: ${({ $isOpen }) => ($isOpen ? "auto" : "none")};
`;

interface GNBProps {
  // Add any props you might need in the future
  variant?: "home" | "default";
  isAtTop?: boolean;
}

export default function GNB({
  variant = "default",
  isAtTop = false,
}: GNBProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { currentUser, hasActiveSubscription } = useAuth();
  const [profileImageUrl, setProfileImageUrl] = useState(defaultUser);

  const makeTransparent = variant === "home" && isAtTop;

  // Update profile image only when user logs in or when avatar is explicitly changed
  useEffect(() => {
    // Get the current user
    const user = auth.currentUser;

    // Load profile image only when user object changes or avatar update is detected
    if (user?.photoURL && user.photoURL.trim() !== "") {
      try {
        // Store in localStorage to persist across page navigation
        const storedAvatarUrl = localStorage.getItem("user_avatar_url");
        const currentAvatarTimestamp = localStorage.getItem(
          "avatar_update_timestamp"
        );

        // Only update if avatar URL changed or if timestamp indicates an update
        if (
          !storedAvatarUrl ||
          storedAvatarUrl !== user.photoURL ||
          currentAvatarTimestamp
        ) {
          const url = new URL(user.photoURL);
          // Add cache-busting only when avatar is updated
          if (currentAvatarTimestamp) {
            url.searchParams.set("t", currentAvatarTimestamp);
            // Clear the timestamp after using it
            localStorage.removeItem("avatar_update_timestamp");
          }

          const newAvatarUrl = url.toString();
          setProfileImageUrl(newAvatarUrl);
          localStorage.setItem("user_avatar_url", user.photoURL);
        } else {
          // Use the already processed URL with any existing cache busting
          setProfileImageUrl(storedAvatarUrl);
        }
      } catch (error) {
        // If URL is not a valid URL format, just use it as-is
        setProfileImageUrl(user.photoURL);
        localStorage.setItem("user_avatar_url", user.photoURL);
      }
    } else {
      setProfileImageUrl(defaultUser);
      localStorage.removeItem("user_avatar_url");
    }
  }, [currentUser]);

  // Listen for avatar updates via storage events (works across tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === "avatar_update_timestamp" &&
        auth.currentUser?.photoURL &&
        auth.currentUser.photoURL.trim() !== ""
      ) {
        try {
          const url = new URL(auth.currentUser.photoURL);
          url.searchParams.set("t", Date.now().toString());
          setProfileImageUrl(url.toString());
          localStorage.setItem("user_avatar_url", auth.currentUser.photoURL);
          localStorage.removeItem("avatar_update_timestamp");
        } catch (error) {
          // Silent error handling
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

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

  // Display loading indicator or default state while auth is loading
  // if (authLoading) {
  //   return <NavbarContainer>Loading...</NavbarContainer>; // Or a skeleton loader
  // }

  return (
    <>
      <NavbarContainer $isTransparent={makeTransparent}>
        <NavbarContent>
          <HamburgerButton
            className="hamburger-btn"
            $isTransparent={makeTransparent}
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
              <Logo
                src={makeTransparent ? logoWhite : logo}
                alt="영어 한잔 로고"
              />
            </LogoLink>
          </LogoContainer>

          <MenuContainer>
            {/* <MenuItem to="/guide" $isTransparent={makeTransparent}>
              가이드
            </MenuItem> */}
            <MenuItem to="/shadow" $isTransparent={makeTransparent}>
              쉐도잉
            </MenuItem>
            <MenuItem to="/meetup" $isTransparent={makeTransparent}>
              밋업
            </MenuItem>
            <MenuItem to="/blog" $isTransparent={makeTransparent}>
              블로그
            </MenuItem>
            {/* <MenuItem to="/community">커뮤니티</MenuItem> */}
          </MenuContainer>

          {currentUser ? (
            <ProfileWrapper>
              <ProfileButton
                to="/profile"
                $isActiveSubscription={hasActiveSubscription}
              >
                <ProfileImage
                  src={profileImageUrl}
                  alt="사용자 프로필"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = defaultUser;
                  }}
                />
              </ProfileButton>
              {hasActiveSubscription !== null && (
                <StatusIndicator $isActive={hasActiveSubscription} />
              )}
            </ProfileWrapper>
          ) : (
            <AuthButton to="/auth">로그인 · 가입</AuthButton>
          )}

          {/* MobileMenuContainer was here previously */}
        </NavbarContent>
      </NavbarContainer>

      {/* MobileMenuContainer is now always rendered. Its visibility is controlled by its own styles. */}
      <MobileMenuContainer className="mobile-menu" $isOpen={isMenuOpen}>
        {/* <MobileMenuItem
          to="/guide"
          onClick={() => setIsMenuOpen(false)}
          $isOpen={isMenuOpen}
        >
          가이드
        </MobileMenuItem> */}
        <MobileMenuItem
          to="/shadow"
          onClick={() => setIsMenuOpen(false)}
          $isOpen={isMenuOpen}
        >
          쉐도잉
        </MobileMenuItem>
        <MobileMenuItem
          to="/meetup"
          onClick={() => setIsMenuOpen(false)}
          $isOpen={isMenuOpen}
        >
          밋업
        </MobileMenuItem>
        <MobileMenuItem
          to="/blog"
          onClick={() => setIsMenuOpen(false)}
          $isOpen={isMenuOpen}
        >
          블로그
        </MobileMenuItem>
        {/* <MobileMenuItem to="/community" onClick={() => setIsMenuOpen(false)} $isOpen={isMenuOpen}>
          커뮤니티
        </MobileMenuItem> */}
        {!currentUser && (
          <MobileAuthButton
            to="/auth"
            onClick={() => setIsMenuOpen(false)}
            $isOpen={isMenuOpen}
          >
            시작하기
          </MobileAuthButton>
        )}
      </MobileMenuContainer>
    </>
  );
}
