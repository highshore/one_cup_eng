import React, { useState, MouseEvent } from "react";
import { useLocation, Navigate } from "react-router-dom";
import styled from "styled-components";
import axios from "axios";

// Define color variables to match brand
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

// Styled components
const ResultContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${colors.primary};
  margin-bottom: 1.5rem;
  text-align: center;
`;

const PaymentDetailsCard = styled.div`
  border: 1px solid ${colors.primaryPale};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  background-color: ${colors.primaryBg};
`;

const DetailRow = styled.div`
  display: flex;
  margin-bottom: 0.5rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  
  &:last-child {
    border-bottom: none;
  }
`;

const DetailLabel = styled.div`
  flex: 0 0 40%;
  font-weight: 500;
  color: ${colors.text.medium};
`;

const DetailValue = styled.div`
  flex: 0 0 60%;
  color: ${colors.text.dark};
`;

const ActionButton = styled.button`
  padding: 0.8rem 1.5rem;
  background-color: ${colors.primary};
  color: white;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.2s ease;
  margin-right: 1rem;
  margin-bottom: 1rem;

  &:hover {
    background-color: ${colors.primaryLight};
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const CancelButton = styled(ActionButton)`
  background-color: #D73A49;
  
  &:hover {
    background-color: #C92532;
  }
`;

const ResultOutput = styled.div`
  margin-top: 2rem;
  padding: 1.5rem;
  border-radius: 8px;
  background-color: ${colors.primaryBg};
  border: 1px solid ${colors.primaryPale};
  
  table {
    width: 100%;
    border-collapse: collapse;
    
    td {
      padding: 0.5rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      
      &:first-child {
        font-weight: 500;
        color: ${colors.text.medium};
        width: 40%;
      }
    }
    
    tr:last-child td {
      border-bottom: none;
    }
    
    p {
      margin-bottom: 1rem;
      font-size: 1.1rem;
      color: ${colors.primary};
    }
  }
`;

// Define interface for payment result
interface PaymentResult {
  PCD_PAY_RST: string;
  PCD_PAY_MSG: string;
  PCD_PAY_OID: string;
  PCD_PAY_TYPE: string;
  PCD_PAY_WORK: string;
  PCD_PAYER_ID: string;
  PCD_PAYER_NO: string;
  PCD_PAYER_NAME: string;
  PCD_PAYER_EMAIL: string;
  PCD_REGULER_FLAG: string;
  PCD_PAY_YEAR: string;
  PCD_PAY_MONTH: string;
  PCD_PAY_GOODS: string;
  PCD_PAY_TOTAL: string;
  PCD_PAY_TAXTOTAL: string;
  PCD_PAY_ISTAX: string;
  PCD_PAY_CARDNAME?: string;
  PCD_PAY_CARDNUM?: string;
  PCD_PAY_CARDTRADENUM?: string;
  PCD_PAY_CARDAUTHNO?: string;
  PCD_PAY_CARDRECEIPT?: string;
  PCD_PAY_BANK?: string;
  PCD_PAY_BANKNAME?: string;
  PCD_PAY_BANKNUM?: string;
  PCD_PAY_BANKACCTYPE?: string;
  PCD_PAY_TIME: string;
  PCD_TAXSAVE_RST: string;
  PCD_AUTH_KEY: string;
  PCD_PAY_REQKEY: string;
  PCD_PAY_COFURL: string;
  PCD_REFUND_TOTAL: string;
  [key: string]: any;
}

// Helper function to safely extract date part from payment time
const extractDateFromPayTime = (timeString: string): string => {
  if (!timeString || typeof timeString !== 'string' || timeString.length < 8) {
    return '';
  }
  return timeString.substring(0, 8);
};

const PaymentResult: React.FC = () => {
  const location = useLocation();
  const [resultVisible, setResultVisible] = useState<boolean>(false);
  
  // Parse payment result from location
  const payResult: PaymentResult | null = location.search 
    ? JSON.parse(decodeURIComponent(location.search.substring(1))) 
    : location.state && location.state.payResult 
      ? location.state.payResult 
      : null;

  // Redirect to home if no payment result is available
  if (!payResult) {
    return <Navigate to="/" />;
  }

  // Handle payment confirmation
  const handlePayConfirm = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    if (window.confirm('결제 승인하겠습니까?')) {
      // Get form data
      const form = document.getElementById('payConfirm') as HTMLFormElement;
      const formData = new FormData(form);
      let reqData: Record<string, any> = {};
      
      // Convert form data to object
      formData.forEach((value, key) => {
        reqData[key] = value;
      });
      
      console.log('결제 요청 데이터', reqData);
      
      // Set token parameters
      const payConfirmURL = payResult.PCD_PAY_COFURL;
      const params = {
        PCD_CST_ID: process.env.REACT_APP_CST_ID,
        PCD_CUST_KEY: process.env.REACT_APP_CUST_KEY,
        PCD_AUTH_KEY: payResult.PCD_AUTH_KEY,
        PCD_PAY_TYPE: payResult.PCD_PAY_TYPE,
        PCD_PAYER_ID: payResult.PCD_PAYER_ID,
        PCD_PAY_REQKEY: payResult.PCD_PAY_REQKEY
      };
      
      // Send payment confirmation request
      axios.post(payConfirmURL, JSON.stringify(params), {
        headers: {
          'content-type': 'application/json',
          'referer': process.env.REACT_APP_HOSTNAME
        }
      })
      .then(res => {
        if (res.data.PCD_PAY_MSG) {
          setResultVisible(true);
          
          // Create result table
          const resultDiv = document.getElementById('payConfirmResult');
          if (resultDiv) {
            const table = document.createElement('table');
            let tableContent = "<p><strong>결제 요청 메시지</strong></p>";
            
            // Add data to table
            Object.entries(res.data).forEach(([key, value]) => {
              tableContent += `<tr><td>${key}</td><td>: ${value}</td></tr>`;
            });
            
            table.innerHTML = tableContent;
            
            // Clear previous results and append new table
            resultDiv.innerHTML = '';
            resultDiv.appendChild(table);
            
            // Handle success
            if (res.data.PCD_PAY_RST === 'success') {
              const confirmBtn = document.getElementById('payConfirmAction');
              const cancelBtn = document.getElementById('payConfirmCancel');
              
              if (confirmBtn) confirmBtn.style.display = 'none';
              if (cancelBtn) cancelBtn.style.display = 'inline-block';
            } else {
              window.alert(res.data.PCD_PAY_MSG);
            }
          }
        } else {
          window.alert('결제요청실패');
        }
      })
      .catch(err => {
        console.error(err);
        window.alert(err);
      });
    }
  };

  // Handle payment refund
  const handlePayRefund = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    if (window.confirm('환불(승인취소)요청을 전송합니다. \n진행하시겠습니까?')) {
      // Get auth token
      axios.post('/api/auth', { PCD_PAYCANCEL_FLAG: 'Y' })
        .then(res => {
          // Set refund parameters
          const refundURL = res.data.return_url;
          const params = {
            PCD_CST_ID: res.data.cst_id,
            PCD_CUST_KEY: res.data.custKey,
            PCD_AUTH_KEY: res.data.AuthKey,
            PCD_REFUND_KEY: process.env.REACT_APP_PCD_REFUND_KEY,
            PCD_PAYCANCEL_FLAG: "Y",
            PCD_PAY_OID: payResult.PCD_PAY_OID,
            PCD_PAY_DATE: extractDateFromPayTime(payResult.PCD_PAY_TIME),
            PCD_REFUND_TOTAL: payResult.PCD_REFUND_TOTAL,
            PCD_REGULER_FLAG: payResult.PCD_REGULER_FLAG,
            PCD_PAY_YEAR: payResult.PCD_PAY_YEAR,
            PCD_PAY_MONTH: payResult.PCD_PAY_MONTH,
          };
          
          // Send refund request
          return axios.post(refundURL, JSON.stringify(params), {
            headers: {
              'content-type': 'application/json',
              'referer': process.env.REACT_APP_HOSTNAME
            }
          });
        })
        .then(res => {
          if (res.data.PCD_PAY_MSG) {
            setResultVisible(true);
            
            // Create result table
            const resultDiv = document.getElementById('payConfirmResult');
            if (resultDiv) {
              const table = document.createElement('table');
              let tableContent = "<p><strong>환불(승인취소) 메시지</strong></p>";
              
              // Add data to table
              Object.entries(res.data).forEach(([key, value]) => {
                tableContent += `<tr><td>${key}</td><td>: ${value}</td></tr>`;
              });
              
              table.innerHTML = tableContent;
              
              // Clear previous results and append new table
              resultDiv.innerHTML = '';
              resultDiv.appendChild(table);
              
              // Handle success
              if (res.data.PCD_PAY_RST === 'success') {
                const cancelBtn = document.getElementById('payConfirmCancel');
                if (cancelBtn) cancelBtn.style.display = 'none';
                window.alert('환불(승인취소)요청 성공');
              } else {
                window.alert(res.data.PCD_PAY_MSG);
              }
            }
          } else {
            window.alert('환불(승인취소)요청 실패');
          }
        })
        .catch(err => {
          console.error(err);
          window.alert(err);
        });
    }
    
    // Show cancel button for PAY type
    if (payResult.PCD_PAY_TYPE === 'PAY') {
      const cancelBtn = document.getElementById('payConfirmCancel');
      if (cancelBtn) cancelBtn.style.display = 'inline-block';
    }
  };

  return (
    <ResultContainer>
      <SectionTitle>결제 결과</SectionTitle>
      
      <PaymentDetailsCard>
        <DetailRow>
          <DetailLabel>결제요청 결과:</DetailLabel>
          <DetailValue>{payResult.PCD_PAY_RST}</DetailValue>
        </DetailRow>
        <DetailRow>
          <DetailLabel>결과 메시지:</DetailLabel>
          <DetailValue>{payResult.PCD_PAY_MSG}</DetailValue>
        </DetailRow>
        <DetailRow>
          <DetailLabel>주문번호:</DetailLabel>
          <DetailValue>{payResult.PCD_PAY_OID}</DetailValue>
        </DetailRow>
        <DetailRow>
          <DetailLabel>결제 방법:</DetailLabel>
          <DetailValue>{payResult.PCD_PAY_TYPE}</DetailValue>
        </DetailRow>
        <DetailRow>
          <DetailLabel>업무구분:</DetailLabel>
          <DetailValue>{payResult.PCD_PAY_WORK}</DetailValue>
        </DetailRow>
        <DetailRow>
          <DetailLabel>결제자 고유ID:</DetailLabel>
          <DetailValue>{payResult.PCD_PAYER_ID}</DetailValue>
        </DetailRow>
        <DetailRow>
          <DetailLabel>회원 고유번호:</DetailLabel>
          <DetailValue>{payResult.PCD_PAYER_NO}</DetailValue>
        </DetailRow>
        
        {payResult.PCD_PAY_TYPE === 'transfer' && (
          <DetailRow>
            <DetailLabel>현금영수증 발행대상:</DetailLabel>
            <DetailValue>{payResult.PCD_PAY_BANKACCTYPE}</DetailValue>
          </DetailRow>
        )}
        
        <DetailRow>
          <DetailLabel>결제자 이름:</DetailLabel>
          <DetailValue>{payResult.PCD_PAYER_NAME}</DetailValue>
        </DetailRow>
        <DetailRow>
          <DetailLabel>결제자 Email:</DetailLabel>
          <DetailValue>{payResult.PCD_PAYER_EMAIL}</DetailValue>
        </DetailRow>
        <DetailRow>
          <DetailLabel>정기결제:</DetailLabel>
          <DetailValue>{payResult.PCD_REGULER_FLAG}</DetailValue>
        </DetailRow>
        <DetailRow>
          <DetailLabel>정기결제 구분 년도:</DetailLabel>
          <DetailValue>{payResult.PCD_PAY_YEAR}</DetailValue>
        </DetailRow>
        <DetailRow>
          <DetailLabel>정기결제 구분 월:</DetailLabel>
          <DetailValue>{payResult.PCD_PAY_MONTH}</DetailValue>
        </DetailRow>
        <DetailRow>
          <DetailLabel>결제 상품:</DetailLabel>
          <DetailValue>{payResult.PCD_PAY_GOODS}</DetailValue>
        </DetailRow>
        <DetailRow>
          <DetailLabel>결제 금액:</DetailLabel>
          <DetailValue>{payResult.PCD_PAY_TOTAL}</DetailValue>
        </DetailRow>
        
        {payResult.PCD_PAY_TYPE === 'card' && (
          <>
            <DetailRow>
              <DetailLabel>부가세:</DetailLabel>
              <DetailValue>{payResult.PCD_PAY_TAXTOTAL}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>과세여부:</DetailLabel>
              <DetailValue>{payResult.PCD_PAY_ISTAX}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>카드사명:</DetailLabel>
              <DetailValue>{payResult.PCD_PAY_CARDNAME}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>카드번호:</DetailLabel>
              <DetailValue>{payResult.PCD_PAY_CARDNUM}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>카드거래번호:</DetailLabel>
              <DetailValue>{payResult.PCD_PAY_CARDTRADENUM}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>카드승인번호:</DetailLabel>
              <DetailValue>{payResult.PCD_PAY_CARDAUTHNO}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>카드전표 URL:</DetailLabel>
              <DetailValue>{payResult.PCD_PAY_CARDRECEIPT}</DetailValue>
            </DetailRow>
          </>
        )}
        
        {payResult.PCD_PAY_TYPE === 'transfer' && (
          <>
            <DetailRow>
              <DetailLabel>은행코드:</DetailLabel>
              <DetailValue>{payResult.PCD_PAY_BANK}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>은행명:</DetailLabel>
              <DetailValue>{payResult.PCD_PAY_BANKNAME}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>계좌번호:</DetailLabel>
              <DetailValue>{payResult.PCD_PAY_BANKNUM}</DetailValue>
            </DetailRow>
          </>
        )}
        
        <DetailRow>
          <DetailLabel>결제 시간:</DetailLabel>
          <DetailValue>{payResult.PCD_PAY_TIME}</DetailValue>
        </DetailRow>
        <DetailRow>
          <DetailLabel>현금영수증 발행결과:</DetailLabel>
          <DetailValue>{payResult.PCD_TAXSAVE_RST}</DetailValue>
        </DetailRow>
      </PaymentDetailsCard>
      
      <div>
        {payResult.PCD_PAY_WORK === 'CERT' && (
          <ActionButton 
            id="payConfirmAction" 
            onClick={handlePayConfirm}
          >
            결제승인요청
          </ActionButton>
        )}
        
        <CancelButton 
          id="payConfirmCancel" 
          style={{ display: 'none' }}
          onClick={handlePayRefund}
        >
          결제승인취소
        </CancelButton>
      </div>
      
      <ResultOutput id="payConfirmResult" style={{ display: resultVisible ? 'block' : 'none' }} />
      
      <form id="payConfirm">
        <input type="hidden" name="PCD_PAY_TYPE" id="PCD_PAY_TYPE" value={payResult.PCD_PAY_TYPE} />
        <input type="hidden" name="PCD_AUTH_KEY" id="PCD_AUTH_KEY" value={payResult.PCD_AUTH_KEY} />
        <input type="hidden" name="PCD_PAYER_ID" id="PCD_PAYER_ID" value={payResult.PCD_PAYER_ID} />
        <input type="hidden" name="PCD_PAY_REQKEY" id="PCD_PAY_REQKEY" value={payResult.PCD_PAY_REQKEY} />
        <input type="hidden" name="PCD_PAY_COFURL" id="PCD_PAY_COFURL" value={payResult.PCD_PAY_COFURL} />
      </form>
    </ResultContainer>
  );
};

export default PaymentResult;
