import { Link } from "react-router-dom";
import styled from "styled-components";
import { useState, useEffect } from "react";
import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../firebase";

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
  border: 2px solid ${colors.accent};
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
  const [profileImageUrl, setProfileImageUrl] = useState(defaultUser);

  // Update profile image only when user logs in or when avatar is explicitly changed
  useEffect(() => {
    // Get the current user
    const user = auth.currentUser;

    // Load profile image only when user object changes or avatar update is detected
    if (user?.photoURL) {
      console.log("GNB - Loading photoURL:", user.photoURL);
      
      try {
        // Store in localStorage to persist across page navigation
        const storedAvatarUrl = localStorage.getItem('user_avatar_url');
        const currentAvatarTimestamp = localStorage.getItem('avatar_update_timestamp');
        
        // Only update if avatar URL changed or if timestamp indicates an update
        if (!storedAvatarUrl || storedAvatarUrl !== user.photoURL || currentAvatarTimestamp) {
          const url = new URL(user.photoURL);
          // Add cache-busting only when avatar is updated
          if (currentAvatarTimestamp) {
            url.searchParams.set("t", currentAvatarTimestamp);
            // Clear the timestamp after using it
            localStorage.removeItem('avatar_update_timestamp');
          }
          
          const newAvatarUrl = url.toString();
          setProfileImageUrl(newAvatarUrl);
          localStorage.setItem('user_avatar_url', user.photoURL);
        } else {
          // Use the already processed URL with any existing cache busting
          setProfileImageUrl(storedAvatarUrl);
        }
      } catch (error) {
        console.log("GNB - Invalid URL format:", user.photoURL, error);
        // If URL is not a valid URL format, just use it as-is
        setProfileImageUrl(user.photoURL);
        localStorage.setItem('user_avatar_url', user.photoURL);
      }
    } else {
      console.log("GNB - No photoURL found for user");
      setProfileImageUrl(defaultUser);
      localStorage.removeItem('user_avatar_url');
    }
  }, [currentUser]);

  // Listen for avatar updates via storage events (works across tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "avatar_update_timestamp" && auth.currentUser?.photoURL) {
        try {
          const url = new URL(auth.currentUser.photoURL);
          url.searchParams.set("t", Date.now().toString());
          setProfileImageUrl(url.toString());
          localStorage.setItem('user_avatar_url', auth.currentUser.photoURL);
          localStorage.removeItem('avatar_update_timestamp');
        } catch (error) {
          console.log("GNB - Error updating avatar from storage event:", error);
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
          <MenuItem to="/meetup">Meet Up</MenuItem>
          <MenuItem to="/community">Community</MenuItem>
          <MenuItem to="/guide">Guide</MenuItem>
        </MenuContainer>

        {currentUser ? (
          <ProfileButton to="/profile">
            <ProfileImage
              src={profileImageUrl}
              alt="사용자 프로필"
              onError={(e) => {
                // If image fails to load, fall back to default
                const target = e.target as HTMLImageElement;
                target.onerror = null; // Prevent infinite error loop
                target.src = defaultUser;
              }}
            />
          </ProfileButton>
        ) : (
          <AuthButton to="/auth">시작하기</AuthButton>
        )}

        <MobileMenuContainer className="mobile-menu" isOpen={isMenuOpen}>
          <MobileMenuItem to="/meetup" onClick={() => setIsMenuOpen(false)}>
            Meetup
          </MobileMenuItem>
          <MobileMenuItem to="/guide" onClick={() => setIsMenuOpen(false)}>
            Guide
          </MobileMenuItem>
          <MobileMenuItem to="/community" onClick={() => setIsMenuOpen(false)}>
            Community
          </MobileMenuItem>
          {currentUser ? (
            <ProfileButton to="/profile">
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
