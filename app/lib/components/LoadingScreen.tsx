import styled, { keyframes } from "styled-components";

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #fdf9f6;
`;

const Spinner = styled.div`
  border: 4px solid #f5ebe6;
  border-top: 4px solid #c8a27a;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: ${spin} 1s linear infinite;
  margin-bottom: 20px;
`;

const LoadingText = styled.div`
  font-size: 18px;
  font-weight: 500;
  color: #4a2f23;
  text-align: center;
`;

export default function LoadingScreen() {
  return (
    <Wrapper>
      <Spinner />
      <LoadingText>로그인 처리 중...</LoadingText>
    </Wrapper>
  );
}
