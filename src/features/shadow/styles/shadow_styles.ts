import styled from "styled-components";

// Modern color palette
export const colors = {
  primary: "#3c2e26",
  primaryDark: "#2c1810",
  primaryLight: "#5d4037",
  secondary: "#8d6e63",
  accent: "#d4a574",
  success: "#4e7c59",
  warning: "#c17817",
  error: "#a8423f",
  background: "#faf8f6",
  surface: "#ffffff",
  surfaceElevated: "#ffffff",
  text: {
    primary: "#2c1810",
    secondary: "#3c2e26",
    muted: "#8d6e63",
    inverse: "#ffffff",
  },
  border: {
    light: "#e8ddd4",
    medium: "#d7c7b8",
    dark: "#a69080",
  },
  shadow: {
    sm: "0 1px 3px rgba(44, 24, 16, 0.1), 0 1px 2px rgba(44, 24, 16, 0.06)",
    md: "0 4px 6px rgba(44, 24, 16, 0.07), 0 2px 4px rgba(44, 24, 16, 0.06)",
    lg: "0 10px 15px rgba(44, 24, 16, 0.1), 0 4px 6px rgba(44, 24, 16, 0.05)",
    xl: "0 20px 25px rgba(44, 24, 16, 0.1), 0 10px 10px rgba(44, 24, 16, 0.04)",
  },
};

export const ShadowContainer = styled.div`
  width: 100%;
  padding: 2rem 0rem;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  max-width: 960px;
  margin: 0 auto;
  min-height: 100vh;
`;

export const Title = styled.h1`
  color: ${colors.text.primary};
  width: 100%;
  text-align: center;
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(
    135deg,
    ${colors.primary},
    ${colors.primaryLight}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

export const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  background: linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark});
  color: ${colors.text.inverse};
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${colors.shadow.sm};
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      135deg,
      ${colors.primaryLight},
      ${colors.accent}
    );
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: ${colors.shadow.lg};

    &::before {
      opacity: 1;
    }
  }

  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: ${colors.shadow.md};
  }

  &:disabled {
    background: ${colors.border.medium};
    color: ${colors.text.muted};
    cursor: not-allowed;
    transform: none;
    box-shadow: none;

    &::before {
      display: none;
    }
  }

  span {
    position: relative;
    z-index: 1;
  }
`;

export const ColorCodedSentence = styled.div`
  margin: 1.5rem 0;
  padding: 1.5rem;
  border-radius: 16px;
  line-height: 2;
  font-size: 1.1rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }
`;

export const WordWithScoreContainer = styled.div`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin: 0 1px;
  vertical-align: top;
  position: relative;
`;

export const ScoreDisplaySpan = styled.span`
  font-size: 0.7em;
  color: ${colors.text.muted};
  margin-top: 2px;
  line-height: 1;
  font-weight: 500;
`;

export const SyllableSpan = styled.span<{
  color: string;
  isOmitted?: boolean;
  isInserted?: boolean;
  hasUnexpectedBreak?: boolean;
  hasMissingBreak?: boolean;
}>`
  color: ${(props) => {
    if (props.isOmitted) return colors.error;
    switch (props.color) {
      case "green":
        return colors.success;
      case "orange":
        return colors.warning;
      case "red":
        return colors.error;
      default:
        return colors.text.muted;
    }
  }};
  font-weight: 600;
  padding: 4px 2px;
  border-radius: 0;
  margin: 0 1px;
  transition: all 0.2s ease;
  text-decoration: ${(props) => (props.isOmitted ? "line-through" : "none")};
  font-style: ${(props) =>
    props.isOmitted || props.isInserted ? "italic" : "normal"};
  opacity: ${(props) => (props.isOmitted ? 0.85 : 1)};

  ${(props) =>
    props.hasUnexpectedBreak &&
    `
    border-bottom: 3px dotted ${colors.warning};
    padding-bottom: 1px; 
  `}
  ${(props) =>
    props.hasMissingBreak &&
    `
    border-bottom: 3px dashed ${colors.primaryLight};
    padding-bottom: 1px;
  `}

  &:hover {
    transform: scale(1.05);
  }
`;

export const ErrorMessage = styled.p`
  color: ${colors.error};
  width: 100%;
  text-align: center;
  font-weight: 500;
  padding: 1rem;
  background: ${colors.error}10;
  border: 1px solid ${colors.error}30;
  border-radius: 12px;
  margin: 1rem 0;
  box-shadow: ${colors.shadow.sm};
`;

export const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid ${colors.border.light};
  border-radius: 50%;
  border-top-color: ${colors.primary};
  animation: spin 1s ease-in-out infinite;
  margin-right: 0.5rem;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 1rem;

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid ${colors.border.light};
    border-radius: 50%;
    border-top-color: ${colors.primary};
    animation: spin 1s ease-in-out infinite;
  }

  .text {
    font-size: 1.1rem;
    color: ${colors.text.secondary};
    font-weight: 500;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export const VideoContainer = styled.div`
  margin-bottom: 2rem;
  width: 100%;
  aspect-ratio: 16 / 9;
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: ${colors.shadow.xl};
  background: linear-gradient(135deg, ${colors.background}, ${colors.surface});
  border: 1px solid ${colors.border.light};
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${colors.shadow.xl}, 0 0 0 1px ${colors.primary}20;
  }

  iframe {
    width: 100%;
    height: 100%;
    border: none;
    border-radius: 20px;
  }
`;

export const StatusIndicator = styled.div<{
  type: "success" | "warning" | "error" | "info";
}>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
  margin-top: 0.5rem;
  border: 1px solid;

  ${(props) => {
    switch (props.type) {
      case "success":
        return `
          background: ${colors.success}10;
          border-color: ${colors.success}30;
          color: ${colors.success};
        `;
      case "warning":
        return `
          background: ${colors.warning}10;
          border-color: ${colors.warning}30;
          color: ${colors.warning};
        `;
      case "error":
        return `
          background: ${colors.error}10;
          border-color: ${colors.error}30;
          color: ${colors.error};
        `;
      case "info":
      default:
        return `
          background: ${colors.primary}10;
          border-color: ${colors.primary}30;
          color: ${colors.primary};
        `;
    }
  }}
`;

export const SentenceTextDisplay = styled.div`
  font-size: 1.15rem;
  line-height: 1.7;
  margin-bottom: 1rem;
  color: ${colors.text.primary};
  font-weight: 400;
  letter-spacing: 0.01em;
`;
