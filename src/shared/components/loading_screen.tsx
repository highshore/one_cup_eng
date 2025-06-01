import styled from "styled-components";
import Lottie from "react-lottie";
import animationData from "../assets/loading.json";

const Wrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #fdf9f6;
`;

const defaultOptions = {
  loop: true,
  autoplay: true,
  animationData: animationData,
  rendererSettings: {
    preserveAspectRatio: "xMidYMid slice",
  },
};

export default function LoadingScreen() {
  return (
    <Wrapper>
      <Lottie options={defaultOptions} height={250} width={250} />
    </Wrapper>
  );
}
