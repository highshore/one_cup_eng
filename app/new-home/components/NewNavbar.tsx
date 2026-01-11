"use client";

import React, { useState, useEffect } from "react";
import styled, { css } from "styled-components";
import { Bars3Icon, XMarkIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useI18n } from "../../lib/i18n/I18nProvider";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/contexts/auth_context";


const Nav = styled.nav<{ $isScrolled: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  transition: all 0.3s ease;
  padding: 1.5rem 1rem 0;
  font-family: inherit; /* Ensure font consistency */

  @media (min-width: 768px) {
    padding: 1.5rem 0 0; /* Adjusted padding to center with max-width */
  }
`;

const NavContainer = styled.div<{ $isScrolled: boolean }>`
  max-width: 960px;
  margin: 0 auto;
  background-color: white;
  border-radius: 9999px;
  transition: all 0.3s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1.5rem;
  color: #1f2937;
  border: 1px solid rgba(15, 23, 42, 0.06);
  
  ${(props) =>
    props.$isScrolled
      ? css`
          box-shadow: 0 35px 70px -30px rgba(15, 23, 42, 0.65),
            0 18px 45px -25px rgba(15, 23, 42, 0.55);
          padding-top: 0.7rem;
          padding-bottom: 0.7rem;
        `
      : css`
          box-shadow: 0 20px 45px -30px rgba(15, 23, 42, 0.5),
            0 6px 18px rgba(15, 23, 42, 0.12);
          padding-top: 0.85rem;
          padding-bottom: 0.85rem;
        `}
`;

const LogoSection = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const LogoImage = styled.img`
  height: 1.5rem;
  width: auto;
  object-fit: contain;

  @media (min-width: 768px) {
    height: 1.5rem;
  }
`;

const DesktopLinks = styled.div`
  display: none;
  
  @media (min-width: 768px) {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    font-weight: 500;
    font-size: 0.95rem;
    color: #4b5563;
  }
`;

const NavLink = styled.a`
  cursor: pointer;
  transition: color 0.2s;
  text-decoration: none;
  color: inherit;

  &:hover {
    color: black;
  }
`;

const DesktopCTA = styled.div`
  display: none;
  
  @media (min-width: 768px) {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
`;

const LanguageButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #4b5563;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  transition: all 0.2s;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;

  &:hover {
    color: black;
    background-color: #f3f4f6;
  }
`;

const LangIcon = styled.img`
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #e5e7eb;
`;

const JoinButton = styled.button`
  background-color: black;
  color: white;
  padding: 0.6rem 1.25rem;
  border-radius: 9999px;
  font-weight: 600;
  transition: background-color 0.2s;
  border: none;
  cursor: pointer;
  font-family: inherit;

  &:hover {
    background-color: #1f2937;
  }
`;

const MobileToggle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;

  @media (min-width: 768px) {
    display: none;
  }
`;

const MobileMenu = styled.div`
  position: absolute;
  top: 6rem;
  left: 1rem;
  right: 1rem;
  background-color: white;
  border-radius: 1rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  z-index: 50;

  @media (min-width: 768px) {
    display: none;
  }
`;

const MobileNavButton = styled.button`
  font-size: 1.05rem;
  font-weight: 500;
  color: #1f2937;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  width: 100%;
  text-align: center;
`;

const Divider = styled.hr`
  border-color: #f3f4f6;
  border-top-width: 1px;
  width: 100%;
`;

const MobileJoinButton = styled.button`
  width: 100%;
  background-color: black;
  color: white;
  padding: 0.75rem 0;
  border-radius: 9999px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  font-family: inherit;
`;

type AvatarVariant = "gdg" | "active" | "inactive" | "default";

const AvatarButton = styled.button<{ $variant: AvatarVariant }>`
  position: relative;
  border: ${({ $variant }) => {
    switch ($variant) {
      case "gdg":
        return "none";
      case "active":
        return "2px solid #22c55e";
      case "inactive":
        return "2px solid #d1d5db";
      default:
        return "2px solid rgba(17, 24, 39, 0.15)";
    }
  }};
  background: ${({ $variant }) =>
    $variant === "gdg"
      ? "conic-gradient(from 90deg, #4285f4, #db4437, #fbbc05, #34a853, #4285f4)"
      : "white"};
  width: 42px;
  height: 42px;
  border-radius: 50%;
  padding: ${({ $variant }) => ($variant === "gdg" ? "2px" : "0")};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.15);

  &:hover {
    transform: scale(1.05);
  }

  @media (max-width: 768px) {
    width: 34px;
    height: 34px;
  }
`;

const AvatarInner = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
`;

const AvatarFallback = styled.span`
  font-weight: 700;
  color: #111827;
`;

const AvatarStatusDot = styled.span`
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #22c55e;
  border: 2px solid white;
  bottom: -1px;
  right: -1px;
`;

const HamburgerButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: #111827;
  cursor: pointer;
`;

const MenuToggleButton = styled.button`
  background: #111827;
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`;

const NewNavbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { locale, setLocale, t } = useI18n();
  const router = useRouter();
  const { currentUser, logout, hasActiveSubscription, isGdgMember } = useAuth();
  const isLoggedIn = Boolean(currentUser);
  const avatarSrc = currentUser?.photoURL || "/images/logos/1cup_logo_new.svg";
  const avatarInitial =
    currentUser?.displayName?.charAt(0).toUpperCase() ?? "U";
  const avatarVariant: AvatarVariant = isGdgMember
    ? "gdg"
    : hasActiveSubscription === true
    ? "active"
    : currentUser
    ? "inactive"
    : "default";

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleLanguage = () => {
    setLocale(locale === "en" ? "ko" : "en");
  };

  const handleNavigate = (path: string) => {
    router.push(path);
    setIsMobileMenuOpen(false);
  };

  const handleJoin = () => {
    handleNavigate("/auth");
  };

  const handleProfileNav = () => {
    handleNavigate("/profile");
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsMobileMenuOpen(false);
      router.push("/");
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  return (
    <Nav $isScrolled={isScrolled}>
      <NavContainer $isScrolled={isScrolled}>
        {/* Logo */}
        <LogoSection onClick={() => router.push("/")} style={{ cursor: "pointer" }}>
          <LogoImage
            src="/images/logos/1cup_logo_new.svg"
            alt="One Cup"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const parent = e.currentTarget.parentElement;
              if (parent) {
                // Check if fallback already exists to avoid duplicates
                if (!parent.querySelector(".fallback-logo")) {
                  const span = document.createElement("span");
                  span.innerText = "☕ ONE CUP";
                  span.className = "fallback-logo";
                  span.style.fontSize = "1.25rem";
                  span.style.fontWeight = "900";
                  span.style.fontFamily = "sans-serif";
                  parent.appendChild(span);
                }
              }
            }}
          />
        </LogoSection>

            {/* Desktop Links */}
            <DesktopLinks>
              <NavLink href="/shadow">{t.nav.shadowing}</NavLink>
              <NavLink href="/meetup">{t.nav.meetup}</NavLink>
              <NavLink href="/blog">{t.nav.blog}</NavLink>
            </DesktopLinks>

        {/* Desktop CTA */}
        <DesktopCTA>
          <LanguageButton onClick={toggleLanguage}>
            <LangIcon src={locale === "en" ? "/images/flags/i18n_en.jpg" : "/images/flags/i18n_ko.jpg"} alt={locale} />
            <span>{locale === "en" ? "ENG" : "한국어"}</span>
          </LanguageButton>
          {isLoggedIn ? (
            <AvatarButton
              onClick={handleProfileNav}
              aria-label={locale === "en" ? "Go to profile" : "프로필로 이동"}
              $variant={avatarVariant}
            >
              <AvatarInner>
                {currentUser?.photoURL ? (
                  <AvatarImage src={avatarSrc} alt="profile" referrerPolicy="no-referrer" />
                ) : (
                  <AvatarFallback>{avatarInitial}</AvatarFallback>
                )}
              </AvatarInner>
              {avatarVariant === "active" && <AvatarStatusDot />}
            </AvatarButton>
          ) : (
            <JoinButton onClick={handleJoin}>{t.nav.join}</JoinButton>
          )}
        </DesktopCTA>

        {/* Mobile Menu Toggle */}
        <MobileToggle>
          <LanguageButton onClick={toggleLanguage}>
            <LangIcon src={locale === "en" ? "/images/flags/i18n_en.jpg" : "/images/flags/i18n_ko.jpg"} alt={locale} />
            <span>{locale === "en" ? "ENG" : "한국어"}</span>
          </LanguageButton>
          {isLoggedIn ? (
            <>
              <AvatarButton
                onClick={handleProfileNav}
                aria-label={locale === "en" ? "Go to profile" : "프로필로 이동"}
                $variant={avatarVariant}
              >
                <AvatarInner>
                  {currentUser?.photoURL ? (
                    <AvatarImage src={avatarSrc} alt="profile" referrerPolicy="no-referrer" />
                  ) : (
                    <AvatarFallback>{avatarInitial}</AvatarFallback>
                  )}
                </AvatarInner>
                {avatarVariant === "active" && <AvatarStatusDot />}
              </AvatarButton>
              <MenuToggleButton
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={locale === "en" ? "Toggle menu" : "메뉴 열기"}
              >
                {isMobileMenuOpen ? (
                  <XMarkIcon width={18} height={18} />
                ) : (
                  <ChevronDownIcon width={18} height={18} />
                )}
              </MenuToggleButton>
            </>
          ) : (
            <HamburgerButton
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="메뉴 열기"
            >
              {isMobileMenuOpen ? (
                <XMarkIcon width={24} height={24} />
              ) : (
                <Bars3Icon width={24} height={24} />
              )}
            </HamburgerButton>
          )}
        </MobileToggle>
      </NavContainer>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <MobileMenu>
              <MobileNavButton onClick={() => handleNavigate("/shadow")}>
                {t.nav.shadowing}
              </MobileNavButton>
              <MobileNavButton onClick={() => handleNavigate("/meetup")}>
                {t.nav.meetup}
              </MobileNavButton>
              <MobileNavButton onClick={() => handleNavigate("/blog")}>
                {t.nav.blog}
              </MobileNavButton>
              <Divider />
              {isLoggedIn ? (
                <>
                  <MobileNavButton onClick={handleProfileNav}>
                    {locale === "en" ? "My Account" : "내 계정"}
                  </MobileNavButton>
                  <MobileJoinButton onClick={handleLogout}>
                    {locale === "en" ? "Logout" : "로그아웃"}
                  </MobileJoinButton>
                </>
              ) : (
                <MobileJoinButton onClick={handleJoin}>
                  {t.nav.join}
                </MobileJoinButton>
              )}
            </MobileMenu>
          )}
    </Nav>
  );
};

export default NewNavbar;
