"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { FiCalendar, FiUsers, FiRepeat } from "react-icons/fi";
import { HomeStats } from "../services/stats_service";

interface StatsSectionProps {
  stats?: HomeStats;
}

interface StatConfig {
  label: string;
  value: number;
  Icon: typeof FiCalendar;
}

const floatAura = keyframes`
  0% { transform: translate3d(-6px, -4px, 0); }
  50% { transform: translate3d(4px, 3px, 0); }
  100% { transform: translate3d(-6px, -4px, 0); }
`;

const floatDistort = keyframes`
  0% { background-position: 0% 0%; }
  50% { background-position: 100% 100%; }
  100% { background-position: 0% 0%; }
`;

const Section = styled.section`
  position: relative;
  overflow: visible; /* Allow shadows to show */
  padding: 0 0 clamp(2.5rem, 5vw, 3.5rem);
  background: transparent;

  &::before {
    content: "";
    position: absolute;
    inset: -16%;
    background-image: radial-gradient(rgba(255, 255, 255, 0.38) 0.5px, transparent 0.5px);
    background-size: 9px 9px;
    opacity: 0.28;
    mix-blend-mode: soft-light;
    animation: ${floatAura} 26s ease-in-out infinite;
  }
`;

const SectionContent = styled.div`
  position: relative;
  z-index: 1;
  max-width: 960px;
  margin: 0 auto;
  padding: 0 1.5rem;

  @media (max-width: 768px) {
    padding: 0 1.25rem;
  }
`;

const CardsGrid = styled.div`
  display: grid;
  width: 100%;
  gap: clamp(1rem, 2.5vw, 1.4rem);
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
`;

const GlassCard = styled.article`
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  min-height: clamp(120px, 22vw, 140px);
  display: flex;
  align-items: stretch;
  justify-content: center;
  box-shadow:
    0 12px 28px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);

  &:hover {
    transform: translateY(-2px);
    transition: transform 280ms ease, box-shadow 280ms ease;
    box-shadow:
      0 16px 36px rgba(0, 0, 0, 0.25),
      inset 0 1px 0 rgba(255, 255, 255, 0.6);
  }
`;

const GlassLayerBase = styled.div`
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
`;

const GlassFilter = styled(GlassLayerBase)<{ $filterId: string }>`
  z-index: 1;
  filter: ${(props) => `url(#${props.$filterId}) saturate(120%) brightness(1.1)`};
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
`;

const GlassOverlay = styled(GlassLayerBase)`
  z-index: 2;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.62) 0%, rgba(255, 255, 255, 0.22) 78%);
`;

const GlassDistortionOverlay = styled(GlassLayerBase)`
  z-index: 3;
  background:
    radial-gradient(circle at 18% 20%, rgba(255, 255, 255, 0.22) 0%, transparent 60%),
    radial-gradient(circle at 82% 82%, rgba(255, 255, 255, 0.18) 0%, transparent 65%);
  background-size: 280% 280%;
  mix-blend-mode: soft-light;
  animation: ${floatDistort} 14s ease-in-out infinite;
`;

const GlassSpecular = styled(GlassLayerBase)`
  z-index: 4;
  background: radial-gradient(
    circle at var(--pointer-x, 45%) var(--pointer-y, -15%),
    rgba(255, 255, 255, 0.6) 0%,
    rgba(255, 255, 255, 0.18) 35%,
    rgba(255, 255, 255, 0.05) 58%,
    transparent 78%
  );
  transition: background 160ms ease;
`;

const CardContent = styled.div`
  position: relative;
  z-index: 5;
  width: 100%;
  padding: clamp(1rem, 2.5vw, 1.3rem) clamp(1rem, 2.5vw, 1.4rem);
  display: grid;
  grid-template-columns: clamp(48px, 9vw, 56px) 1fr;
  align-items: center;
  gap: clamp(0.9rem, 2.5vw, 1.2rem);
`;

const IconBadge = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  width: clamp(46px, 8.5vw, 54px);
  height: clamp(46px, 8.5vw, 54px);
  background: linear-gradient(145deg, rgba(200, 200, 200, 0.4) 0%, rgba(255, 255, 255, 0.85) 78%);
  border: 1px solid rgba(220, 220, 220, 0.5);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 6px 16px rgba(0, 0, 0, 0.15);

  svg {
    width: clamp(20px, 3vw, 24px);
    height: clamp(20px, 3vw, 24px);
    color: #1a1a1a;
  }
`;

const StatCopy = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: clamp(0.25rem, 1vw, 0.4rem);
`;

const StatLabel = styled.span`
  font-size: clamp(0.8rem, 1.8vw, 0.9rem);
  font-weight: 600;
  color: #374151;
  letter-spacing: -0.01em;
`;

const StatValue = styled.span`
  font-size: clamp(1.6rem, 3.5vw, 2rem);
  font-weight: 800;
  letter-spacing: -0.025em;
  color: #1f2937;
  text-shadow: none;
`;

const HiddenSvg = styled.svg`
  position: absolute;
  width: 0;
  height: 0;
  pointer-events: none;
`;

export default function StatsSection({ stats }: StatsSectionProps) {
  const filterId = useId().replace(/:/g, "");
  const displacementMapId = `${filterId}-displace`;
  const cardsRef = useRef<Array<HTMLDivElement | null>>([]);

  // Hardcoded values
  const totalMeetups = 26;
  const totalMembers = 41;
  const retentionRate = 90;

  const statsData = useMemo<StatConfig[]>(
    () => [
      { label: "밋업 진행 횟수", value: totalMeetups, Icon: FiCalendar },
      { label: "누적 유료 멤버 수", value: totalMembers, Icon: FiUsers },
      { label: "재참여율", value: retentionRate, Icon: FiRepeat },
    ],
    [totalMeetups, totalMembers, retentionRate]
  );

  const [displayValues, setDisplayValues] = useState<number[]>([0, 0, 0]);

  useEffect(() => {
    let animationFrame: number | null = null;
    const targets = [totalMeetups, totalMembers, retentionRate];
    const start = performance.now();
    const duration = 1500;

    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const values = targets.map((target) => Math.round(target * eased));
      setDisplayValues(values);
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    setDisplayValues([0, 0, 0]);
    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [totalMeetups, totalMembers, retentionRate]);

  useEffect(() => {
    const displacementNode = document.querySelector<SVGFEDisplacementMapElement>(
      `#${displacementMapId}`
    );

    cardsRef.current = cardsRef.current.slice(0, statsData.length);
    const cleanups: Array<() => void> = [];

    cardsRef.current.forEach((card) => {
      if (!card) return;

      const handleMouseMove = (event: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const specular = card.querySelector(
          "[data-role='glass-specular']"
        ) as HTMLDivElement | null;

        if (specular) {
          specular.style.setProperty("--pointer-x", `${x}px`);
          specular.style.setProperty("--pointer-y", `${y}px`);
        }

        if (displacementNode) {
          const distanceFromCenter = Math.hypot(
            x - rect.width / 2,
            y - rect.height / 2
          );
          const normalized = Math.min(
            1,
            distanceFromCenter / (Math.max(rect.width, rect.height) * 0.75)
          );
          const scale = 62 - normalized * 32;
          displacementNode.setAttribute("scale", scale.toFixed(2));
        }
      };

      const handleMouseLeave = () => {
        const specular = card.querySelector(
          "[data-role='glass-specular']"
        ) as HTMLDivElement | null;
        if (specular) {
          specular.style.removeProperty("--pointer-x");
          specular.style.removeProperty("--pointer-y");
        }
        if (displacementNode) {
          displacementNode.setAttribute("scale", "62");
        }
      };

      card.addEventListener("mousemove", handleMouseMove);
      card.addEventListener("mouseleave", handleMouseLeave);

      cleanups.push(() => {
        card.removeEventListener("mousemove", handleMouseMove);
        card.removeEventListener("mouseleave", handleMouseLeave);
      });
    });

    return () => {
      cleanups.forEach((teardown) => teardown());
    };
  }, [statsData.length, displacementMapId]);

  return (
    <Section>
      <HiddenSvg>
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="turbulence"
            baseFrequency="0.008"
            numOctaves="2"
            result="noise"
          />
          <feDisplacementMap
            id={displacementMapId}
            in="SourceGraphic"
            in2="noise"
            scale="62"
            xChannelSelector="R"
            yChannelSelector="B"
          />
        </filter>
      </HiddenSvg>

      <SectionContent>
        <CardsGrid>
          {statsData.map(({ Icon, label }, index) => {
            const displayValue = displayValues[index] ?? 0;
            const formattedValue = label === "재참여율" 
              ? `${displayValue}%+` 
              : displayValue.toLocaleString();
            return (
              <GlassCard
                key={label}
                ref={(node: HTMLElement | null) => {
                  cardsRef.current[index] = node as HTMLDivElement | null;
                }}
              >
                <GlassFilter $filterId={filterId} />
                <GlassOverlay />
                <GlassDistortionOverlay />
                <GlassSpecular data-role="glass-specular" />
                <CardContent>
                  <IconBadge>
                    <Icon />
                  </IconBadge>
                  <StatCopy>
                    <StatLabel>{label}</StatLabel>
                    <StatValue>{formattedValue}</StatValue>
                  </StatCopy>
                </CardContent>
              </GlassCard>
            );
          })}
        </CardsGrid>
      </SectionContent>
    </Section>
  );
}
