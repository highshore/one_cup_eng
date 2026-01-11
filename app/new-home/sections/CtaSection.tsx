import styled, { keyframes } from "styled-components";
import { useRouter } from "next/navigation";
import { RocketLaunchIcon } from "@heroicons/react/24/outline";
import { useI18n } from "../../lib/i18n/I18nProvider";

const MOBILE_NAV_GUTTER = "1rem";

const gradientShine = keyframes`
  0% { background-position: -100% center; }
  100% { background-position: 100% center; }
`;

const CTAWrapper = styled.div`
  width: 100%;
  background: #f5f5f5;
  margin: 0;
  padding: 4rem 0;

  @media (max-width: 768px) {
    padding: 3rem 0;
  }
`;

const CTAInner = styled.div`
  max-width: 960px;
  margin: 0 auto;
  padding: 0 1.5rem;

  @media (max-width: 768px) {
    padding: 0 ${MOBILE_NAV_GUTTER};
  }
`;

const CTASectionCard = styled.div`
  position: relative;
  border-radius: 20px;
  padding: 3rem;
  text-align: center;
  width: 100%;
  overflow: hidden;

  @media (max-width: 768px) {
    padding: 2rem;
  }
`;

const CTAVideoBackground = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
`;

const CTAOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  z-index: 1;
`;

const CTAContent = styled.div`
  position: relative;
  z-index: 2;
  max-width: 760px;
  margin: 0 auto;
`;

const CTATitle = styled.h3`
  font-size: 1.75rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 1rem;
  font-family: inherit;
  white-space: pre-wrap;

  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

const CTADescription = styled.p`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 1.5rem;
  line-height: 1.5;
  font-family: inherit;
  white-space: pre-wrap;

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const CTAButton = styled.button`
  padding: 0.85rem 1.75rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  position: relative;
  overflow: hidden;
  color: white;
  font-family: inherit;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      120deg,
      rgba(255, 255, 255, 0) 15%,
      rgba(255, 255, 255, 0.2) 50%,
      rgba(255, 255, 255, 0) 85%
    );
    background-size: 200% 100%;
    animation: ${gradientShine} 2.5s linear infinite;
    pointer-events: none;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.5);
  }

  svg {
    width: 1.1rem;
    height: 1.1rem;
  }

  @media (max-width: 768px) {
    padding: 0.875rem 1.5rem;
    font-size: 0.9rem;
    gap: 0.375rem;
  }
`;

export default function CtaSection() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <CTAWrapper>
      <CTAInner>
        <CTASectionCard>
          <CTAVideoBackground autoPlay loop muted playsInline>
            <source src="/assets/blog/manhattan.mp4" type="video/mp4" />
          </CTAVideoBackground>
          <CTAOverlay />
          <CTAContent>
            <CTATitle>{t.home.cta.title}</CTATitle>
            <CTADescription>{t.home.cta.description}</CTADescription>
            <CTAButton onClick={() => router.push("/meetup")}>
              <RocketLaunchIcon />
              {t.home.cta.button}
            </CTAButton>
          </CTAContent>
        </CTASectionCard>
      </CTAInner>
    </CTAWrapper>
  );
}
