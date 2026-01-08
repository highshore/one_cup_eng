"use client";

import React, { useState, useEffect } from "react";
import styled, { css } from "styled-components";
import { Bars3Icon, XMarkIcon, GlobeAltIcon } from "@heroicons/react/24/outline";
import { useI18n } from "../../lib/i18n/I18nProvider";
import { useRouter } from "next/navigation";


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
  max-width: 960px; /* Changed from 80rem to 960px */
  margin: 0 auto;
  background-color: white;
  border-radius: 9999px; /* rounded-full */
  transition: all 0.3s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1.5rem;
  
  ${(props) =>
    props.$isScrolled
      ? css`
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); /* shadow-xl */
          padding-top: 0.75rem;
          padding-bottom: 0.75rem;
        `
      : css`
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
          padding-top: 0.75rem; /* Reduced padding */
          padding-bottom: 0.75rem; /* Reduced padding */
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
    gap: 1.5rem; /* Reduced gap */
    font-weight: 500;
    font-size: 0.95rem; /* Slightly smaller font */
    color: #4b5563; /* text-gray-600 */
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
    gap: 0.75rem; /* Reduced gap */
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
  padding: 0.6rem 1.25rem; /* Adjusted padding */
  border-radius: 9999px;
  font-weight: 600;
  transition: background-color 0.2s;
  border: none;
  cursor: pointer;
  font-family: inherit;

  &:hover {
    background-color: #1f2937; /* bg-gray-800 */
  }
`;

const MobileToggle = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;

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
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  z-index: 50;

  @media (min-width: 768px) {
    display: none;
  }
`;

const MobileNavLink = styled.a`
  font-size: 1.125rem;
  font-weight: 500;
  color: #1f2937;
  text-decoration: none;
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

const NewNavbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { locale, setLocale, t } = useI18n();
  const router = useRouter();

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
          {/* Login button removed as requested */}
          <JoinButton onClick={() => router.push("/auth")}>{t.nav.join}</JoinButton>
        </DesktopCTA>

        {/* Mobile Menu Toggle */}
        <MobileToggle>
          <LanguageButton onClick={toggleLanguage}>
            <LangIcon src={locale === "en" ? "/images/flags/i18n_en.jpg" : "/images/flags/i18n_ko.jpg"} alt={locale} />
            <span>{locale === "en" ? "ENG" : "한국어"}</span>
          </LanguageButton>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            {isMobileMenuOpen ? (
              <XMarkIcon width={24} height={24} />
            ) : (
              <Bars3Icon width={24} height={24} />
            )}
          </button>
        </MobileToggle>
      </NavContainer>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <MobileMenu>
              <MobileNavLink href="/shadow">{t.nav.shadowing}</MobileNavLink>
              <MobileNavLink href="/meetup">{t.nav.meetup}</MobileNavLink>
              <MobileNavLink href="/blog">{t.nav.blog}</MobileNavLink>
              <Divider />
              {/* Mobile Login Button Removed */}
              <MobileJoinButton onClick={() => router.push("/auth")}>
                {t.nav.join}
              </MobileJoinButton>
            </MobileMenu>
          )}
    </Nav>
  );
};

export default NewNavbar;
