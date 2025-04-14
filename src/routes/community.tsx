import styled from "styled-components";

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

const CommunityContainer = styled.div`
  max-width: 800px;
  margin-top: 60px;
  padding: 2rem 1.5rem;
  min-height: 100vh;
  font-family: "Avenir", "Avenir Next", -apple-system, BlinkMacSystemFont,
    "Segoe UI", "Roboto", "Oxygen", "Ubuntu", sans-serif;

  @media (max-width: 768px) {
    padding: 1.5rem 1rem;
  }
`;

const Title = styled.h1`
  font-size: 2rem;
  color: ${colors.text.dark};
  margin-bottom: 2rem;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 1.8rem;
  }
`;

const Content = styled.div`
  color: ${colors.text.medium};
  line-height: 1.8;
  font-size: 1rem;

  @media (max-width: 768px) {
    font-size: 0.95rem;
  }
`;

const Community = () => {
  return (
    <CommunityContainer>
      <Title>Community</Title>
      <Content>
        <p>This is the community page. Content will be added later.</p>
      </Content>
    </CommunityContainer>
  );
};

export default Community; 