import { useState } from "react";
import styled from "styled-components";
import { getFunctions, httpsCallable } from "firebase/functions";

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 20px;
`;

const Button = styled.button`
  background-color: #4caf50;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 20px;
  
  &:hover {
    background-color: #45a049;
  }
  
  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const ResultContainer = styled.div`
  margin-top: 20px;
  padding: 15px;
  border-radius: 4px;
  background-color: #f5f5f5;
  overflow-x: auto;
`;

const ResultTitle = styled.h3`
  font-size: 18px;
  margin-bottom: 10px;
`;

const StatusBox = styled.div<{ status: "success" | "error" | "idle" }>`
  padding: 10px;
  margin-top: 15px;
  border-radius: 4px;
  background-color: ${(props) => 
    props.status === "success" ? "#dff0d8" : 
    props.status === "error" ? "#f2dede" : "#f5f5f5"};
  color: ${(props) => 
    props.status === "success" ? "#3c763d" : 
    props.status === "error" ? "#a94442" : "#333"};
`;

export default function Admin() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState<"success" | "error" | "idle">("idle");

  const handleSendLinks = async () => {
    setIsLoading(true);
    setStatus("idle");
    
    try {
      const functions = getFunctions();
      const testSendLinks = httpsCallable(functions, 'testSendLinksToUsers');
      
      const response = await testSendLinks();
      setResult(response.data);
      setStatus("success");
      console.log("Function result:", response.data);
    } catch (error) {
      console.error("Error calling function:", error);
      setResult(error);
      setStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Wrapper>
      <Title>Admin Panel</Title>
      
      <Button 
        onClick={handleSendLinks} 
        disabled={isLoading}
      >
        {isLoading ? "Sending..." : "Test Send Links to Users"}
      </Button>
      
      {result && (
        <ResultContainer>
          <ResultTitle>Function Result:</ResultTitle>
          <pre>{JSON.stringify(result, null, 2)}</pre>
          
          <StatusBox status={status}>
            {status === "success" ? "Successfully sent messages!" : 
             status === "error" ? "Error sending messages" : ""}
          </StatusBox>
          
          {status === "success" && result.stats && (
            <div>
              <p>Tech recipients: {result.stats.techCount}</p>
              <p>Business recipients: {result.stats.businessCount}</p>
              <p>Expiry notifications: {result.stats.expiryCount}</p>
            </div>
          )}
        </ResultContainer>
      )}
    </Wrapper>
  );
} 