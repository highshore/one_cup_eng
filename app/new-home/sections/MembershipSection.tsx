import { useMemo, useCallback } from "react";
import styled, { keyframes } from "styled-components";
import { useRouter } from "next/navigation";
import { CheckBadgeIcon } from "@heroicons/react/24/outline";
import { useI18n } from "../../lib/i18n/I18nProvider";
import { SectionTitle } from "../components/SectionHeading";

type CSSVariableStyle = React.CSSProperties & {
  ["--target-width"]?: string;
  ["--delay"]?: string;
};

interface CostComparison {
  key: string;
  label: string;
  cost: number;
  displayValue: string;
  color: string;
  highlight?: boolean;
}

const MOBILE_NAV_GUTTER = "1rem";

const MembershipSectionContainer = styled.section`
  padding: 5rem 0;
  background: #0f172a;
  position: relative;
  overflow: hidden;
  color: white;
`;

const MembershipWrapper = styled.div`
  max-width: 960px;
  margin: 0 auto;
  padding: 0 1.25rem;

  @media (max-width: 768px) {
    padding: 0 ${MOBILE_NAV_GUTTER};
    text-align: center;
  }
`;

const MembershipGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 3rem;
  
  @media (min-width: 768px) {
    grid-template-columns: 1.1fr 0.9fr;
    align-items: center;
    gap: 4rem;
  }
`;

const LeftCol = styled.div`
  color: white;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    text-align: center;
    align-items: center;
    width: 100%;
  }
`;

const RightCol = styled.div`
  padding: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  position: relative;
  z-index: 1;
  overflow: visible;
  width: 100%;

  @media (max-width: 768px) {
    margin-top: 1.5rem;
    align-items: stretch;
  }
`;

const BulletList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
`;

const BulletItem = styled.p`
  font-size: 1.05rem;
  color: #ffb7c5;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;

  @media (max-width: 768px) {
    justify-content: center;
    text-align: center;
  }
`;

const ChartGridOverlay = styled.div`
  position: absolute;
  inset: 0;
  background-image: linear-gradient(0deg, rgba(255,255,255,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 100% 28px, 48px 100%;
  opacity: 0.5;
  pointer-events: none;
`;

const floatOrb = keyframes`
  0% { transform: translate3d(0, 0, 0); opacity: 0.45; }
  100% { transform: translate3d(20px, -15px, 0); opacity: 0.75; }
`;

const ChartOrb = styled.div`
  position: absolute;
  width: 160px;
  height: 160px;
  background: radial-gradient(circle, rgba(255, 120, 150, 0.35), transparent 70%);
  filter: blur(6px);
  top: -40px;
  right: -60px;
  animation: ${floatOrb} 9s ease-in-out infinite alternate;
  pointer-events: none;
`;

const spinCycle = keyframes`
  0% { transform: perspective(1000px) rotateY(0deg) scale(1); }
  10% { transform: perspective(1000px) rotateY(0deg) scale(1.02); }
  20% { transform: perspective(1000px) rotateY(360deg) scale(1.05); }
  35% { transform: perspective(1000px) rotateY(360deg) scale(1.02); }
  100% { transform: perspective(1000px) rotateY(360deg) scale(1); }
`;

const ComparisonChart = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.5);
  transform: perspective(1000px) rotateY(-5deg);
  transition: transform 0.5s ease;
  position: relative;
  overflow: hidden;
  animation: ${spinCycle} 5s ease-in-out infinite;
  width: 100%;
  max-width: none;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 60%);
    pointer-events: none;
    transform: rotate(45deg);
  }
  
  &:hover {
    transform: perspective(1000px) rotateY(0deg) scale(1.02);
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
  }
  
  @media (max-width: 768px) {
    transform: none;
    width: 100%;
    &:hover {
      transform: none;
    }
  }
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding-bottom: 0.8rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.9rem;
  font-weight: 600;
  color: #9ca3af;
`;

const CostBarContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const CostItem = styled.div<{ $delay: number }>`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  opacity: 0;
  transform: translateY(10px);
  animation: ${fadeInUp} 0.45s ease forwards;
  animation-delay: ${({ $delay }) => `${$delay}s`};
`;

const CostLabelRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  color: #e5e7eb;
  font-weight: 500;
`;

const CostBarWrapper = styled.div`
  width: 100%;
  height: 10px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 9999px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
`;

const growBar = keyframes`
  from { width: 0; }
  to { width: var(--target-width, 100%); }
`;

const shimmer = keyframes`
  0% { transform: translateX(-120%); opacity: 0; }
  30% { opacity: 0.8; }
  100% { transform: translateX(120%); opacity: 0; }
`;

const CostBar = styled.div<{ $color: string }>`
  position: relative;
  height: 100%;
  width: 0;
  background: ${props => props.$color};
  border-radius: 9999px;
  animation: ${growBar} 1.3s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: var(--delay, 0s);
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.18);
  overflow: hidden;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 45%, rgba(255,255,255,0) 80%);
    transform: translateX(-120%);
    animation: ${shimmer} 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    animation-delay: calc(var(--delay, 0s) + 0.2s);
  }
`;

const CostValue = styled.span<{ $highlight?: boolean }>`
  color: ${props => props.$highlight ? 'rgb(255, 100, 130)' : '#9ca3af'};
  font-weight: ${props => props.$highlight ? '700' : '400'};
  font-size: 0.85rem;
`;

const CtaButton = styled.button`
  background: rgb(128, 0, 33);
  color: white;
  font-weight: 700;
  padding: 1rem 2.5rem;
  border-radius: 9999px;
  transition: all 0.2s;
  box-shadow: 0 10px 15px -3px rgba(128, 0, 33, 0.3);
  width: max-content;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;

  &:hover {
    background: rgb(150, 0, 40);
    transform: translateY(-2px);
    box-shadow: 0 15px 20px -3px rgba(128, 0, 33, 0.4);
  }

  @media (max-width: 768px) {
    margin: 0 auto;
  }
`;

export default function MembershipSection() {
  const { t, locale } = useI18n();
  const router = useRouter();

  const membershipSectionTitleLines = t.home.pricingNew.sectionTitle.split('\n');
  const membershipAccessBullet = useMemo(
    () => t.home.pricingNew.leftTitle.replace(/\n/g, " "),
    [t.home.pricingNew.leftTitle]
  );

  const formatCostValue = useCallback(
    (value: number) =>
      locale === "ko"
        ? `${value.toLocaleString("ko-KR")}원`
        : `${value.toLocaleString("en-US")} KRW`,
    [locale]
  );

  const costComparisons: CostComparison[] = useMemo(() => {
    const labels = t.home.pricingNew.chart.labels;
    return [
      {
        key: "oneCup",
        label: labels.oneCup,
        cost: 1212,
        displayValue: formatCostValue(1212),
        color: "linear-gradient(90deg, #ff7aa2, #ff4d8f)",
        highlight: true,
      },
      {
        key: "exchange",
        label: labels.exchange,
        cost: 5000,
        displayValue: formatCostValue(5000),
        color: "linear-gradient(90deg, #4b5563, #6b7280)",
      },
      {
        key: "phone",
        label: labels.phone,
        cost: 20000,
        displayValue: `${formatCostValue(20000)}~`,
        color: "linear-gradient(90deg, #6366f1, #8b5cf6)",
      },
      {
        key: "academy",
        label: labels.academy,
        cost: 35000,
        displayValue: `${formatCostValue(35000)}~`,
        color: "linear-gradient(90deg, #f97316, #fb923c)",
      },
      {
        key: "premium",
        label: labels.premium,
        cost: 60000,
        displayValue: `${formatCostValue(60000)}~`,
        color: "linear-gradient(90deg, #22d3ee, #38bdf8)",
      },
    ];
  }, [formatCostValue, t, locale]);

  const maxCost = useMemo(
    () => Math.max(...costComparisons.map((item) => item.cost), 1),
    [costComparisons]
  );

  return (
    <MembershipSectionContainer>
      <MembershipWrapper>
        <MembershipGrid>
          <LeftCol>
            <SectionTitle style={{ color: 'white' }}>
              {membershipSectionTitleLines[0]}
              {membershipSectionTitleLines[1] && (
                <>
                  <br />
                  <span style={{ color: '#ffb7c5' }}>{membershipSectionTitleLines[1]}</span>
                </>
              )}
            </SectionTitle>
            <div style={{ marginBottom: '2rem' }}>
              <BulletList>
                {[membershipAccessBullet, t.home.pricingNew.referralDiscount].map((text, idx) => (
                  <BulletItem key={idx}>
                    <CheckBadgeIcon width={20} style={{ flexShrink: 0 }} />
                    {text}
                  </BulletItem>
                ))}
              </BulletList>
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                 <p style={{ color: '#cbd5f5', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
                  {t.home.pricingNew.caveats.line1}<br/>
                  {t.home.pricingNew.caveats.line2}<br/>
                  {t.home.pricingNew.caveats.line3}<br/>
                  {t.home.pricingNew.caveats.line4}
                </p>
              </div>
            </div>
            <CtaButton onClick={() => router.push("/payment")}>
              {t.home.pricing.cta}
            </CtaButton>
          </LeftCol>
          <RightCol>
            <ComparisonChart>
              <ChartGridOverlay />
              <ChartOrb />
              <ChartHeader>
                <span>{t.home.pricingNew.chart.header}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#6b7280' }}>{t.home.pricingNew.chart.unit}</span>
              </ChartHeader>
              <CostBarContainer>
                {costComparisons.map((item, index) => {
                  const widthPercent = Math.max(
                    1.5,
                    (item.cost / maxCost) * 100
                  );
                  const barStyle: CSSVariableStyle = {
                    "--target-width": `${widthPercent}%`,
                    "--delay": `${index * 0.08}s`,
                  };
                  return (
                    <CostItem key={item.key} $delay={index * 0.08}>
                      <CostLabelRow>
                        <span
                          style={{
                            color: item.highlight ? "#ffffff" : "#e5e7eb",
                            fontWeight: item.highlight ? 700 : 500,
                          }}
                        >
                          {item.label}
                        </span>
                        <CostValue $highlight={item.highlight}>
                          {item.displayValue}
                        </CostValue>
                      </CostLabelRow>
                      <CostBarWrapper>
                        <CostBar $color={item.color} style={barStyle} />
                      </CostBarWrapper>
                    </CostItem>
                  );
                })}
              </CostBarContainer>
            </ComparisonChart>
          </RightCol>
        </MembershipGrid>
      </MembershipWrapper>
    </MembershipSectionContainer>
  );
}
