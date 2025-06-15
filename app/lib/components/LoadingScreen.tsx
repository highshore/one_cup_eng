import styled from "styled-components";
import dynamic from "next/dynamic";
import loadingAnimation from "../../../public/animations/loading.json";

const Wrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #fdf9f6;
`;

const LoadingAnimation = styled.div`
  width: 250px;
  height: 250px;

  @media (max-width: 768px) {
    width: 200px;
    height: 200px;
  }
`;

// Dynamic import for Lottie to avoid SSR issues
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

interface LoadingScreenProps {
  // Removed text prop since we're not showing text anymore
}

export default function LoadingScreen(props: LoadingScreenProps) {
  return (
    <Wrapper>
      <LoadingAnimation>
        <Lottie animationData={loadingAnimation} />
      </LoadingAnimation>
    </Wrapper>
  );
}
