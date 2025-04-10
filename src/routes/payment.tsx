import React, { useRef, useEffect, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

// Declare global type for PaypleCpayAuthCheck
declare global {
  interface Window {
    PaypleCpayAuthCheck: (obj: any) => void;
    MainBodyAction?: (action: string) => void;
  }
}

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
const PaymentContainer = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
`;

const FormTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${colors.primary};
  margin-bottom: 1.5rem;
  text-align: center;
`;

const FormGroup = styled.div`
  margin-bottom: 1.2rem;
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-size: 0.9rem;
  font-weight: 500;
  color: ${colors.text.medium};
  margin-bottom: 0.5rem;
`;

const Input = styled.input`
  padding: 0.8rem;
  border: 1px solid ${colors.primaryPale};
  border-radius: 8px;
  font-size: 1rem;
  transition: border 0.3s ease;
  background-color: #FFFFFF;

  &:focus {
    outline: none;
    border-color: ${colors.accent};
  }
`;

const Select = styled.select`
  padding: 0.8rem;
  border: 1px solid ${colors.primaryPale};
  border-radius: 8px;
  font-size: 1rem;
  transition: border 0.3s ease;
  background-color: #FFFFFF;

  &:focus {
    outline: none;
    border-color: ${colors.accent};
  }
`;

const PayButton = styled.button`
  width: 100%;
  padding: 1rem;
  background-color: ${colors.primary};
  color: white;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  font-weight: 700;
  font-size: 1.1rem;
  transition: all 0.2s ease;
  margin-top: 1rem;

  &:hover {
    background-color: ${colors.primaryLight};
    transform: translateY(-2px);
  }

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
    transform: none;
  }
`;

const SelectGroup = styled.div`
  display: flex;
  gap: 1rem;
  
  @media (max-width: 480px) {
    flex-direction: column;
    gap: 0.5rem;
  }
`;

// Define interfaces for payment form data
interface PaymentFormData {
  is_direct: string;
  pay_type: string;
  work_type: string;
  card_ver: string;
  payple_payer_id: string;
  buyer_no: string;
  buyer_name: string;
  buyer_hp: string;
  buyer_email: string;
  buy_goods: string;
  buy_total: string;
  buy_istax: string;
  buy_taxtotal: string;
  order_num: string;
  pay_year: string;
  pay_month: string;
  is_reguler: string;
  is_taxsave: string;
  simple_flag: string;
  auth_type: string;
}

interface PaymentResult {
  PCD_PAY_RST: string;
  PCD_PAY_MSG: string;
  PCD_PAY_OID?: string;
  PCD_PAY_TYPE?: string;
  PCD_PAY_WORK?: string;
  PCD_PAYER_ID?: string;
  PCD_PAYER_NO?: string;
  PCD_PAYER_NAME?: string;
  PCD_PAY_GOODS?: string;
  PCD_PAY_TOTAL?: string;
  [key: string]: any;
}

const Payment: React.FC = () => {
  // Handle browser back button to close payment window
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e) {
        (window as any).MainBodyAction?.('close');
      }
    };
    
    window.onpopstate = handlePopState;
    
    return () => {
      window.onpopstate = null;
    };
  }, []);

  const navigate = useNavigate();
  const formData = useRef<PaymentFormData>({
    // Default form values
    is_direct: 'Y',
    pay_type: 'card',
    work_type: 'PAY',
    card_ver: '01',
    payple_payer_id: '',
    buyer_no: '2335',
    buyer_name: '홍길동',
    buyer_hp: '01012345678',
    buyer_email: 'test@payple.kr',
    buy_goods: '휴대폰',
    buy_total: '1000',
    buy_istax: 'Y',
    buy_taxtotal: '',
    order_num: createOid(),
    pay_year: '2025',
    pay_month: '4',
    is_reguler: 'Y',
    is_taxsave: 'N',
    simple_flag: 'Y',
    auth_type: 'sms'
  });

  // Initialize form with default values
  useEffect(() => {
    const handleUIDisplay = () => {
      // For card payment display settings
      const cardVerView = document.getElementById('card_ver_view');
      const taxsaveView = document.getElementById('taxsave_view');
      const isRegulerView = document.getElementById('is_reguler_view');
      const payYearView = document.getElementById('pay_year_view');
      const payMonthView = document.getElementById('pay_month_view');
      
      if (cardVerView) cardVerView.style.display = '';
      if (taxsaveView) taxsaveView.style.display = 'none';
      if (isRegulerView) isRegulerView.style.display = '';
      if (payYearView) payYearView.style.display = '';
      if (payMonthView) payMonthView.style.display = '';
      
      // Set default select values
      const selects = {
        simple_flag: document.getElementById('simple_flag') as HTMLSelectElement,
        is_direct: document.getElementById('is_direct') as HTMLSelectElement,
        pay_type: document.getElementById('pay_type') as HTMLSelectElement,
        card_ver: document.getElementById('card_ver') as HTMLSelectElement,
        is_reguler: document.getElementById('is_reguler') as HTMLSelectElement,
        pay_year: document.getElementById('pay_year') as HTMLSelectElement,
        pay_month: document.getElementById('pay_month') as HTMLSelectElement,
        work_type: document.getElementById('work_type') as HTMLSelectElement,
        auth_type: document.getElementById('auth_type') as HTMLSelectElement
      };
      
      if (selects.simple_flag) selects.simple_flag.value = 'Y';
      if (selects.is_direct) selects.is_direct.value = 'Y';
      if (selects.pay_type) selects.pay_type.value = 'card';
      if (selects.card_ver) selects.card_ver.value = '01';
      if (selects.is_reguler) selects.is_reguler.value = 'Y';
      if (selects.pay_year) selects.pay_year.value = '2025';
      if (selects.pay_month) selects.pay_month.value = '4';
      if (selects.work_type) selects.work_type.value = 'PAY';
      if (selects.auth_type) selects.auth_type.value = 'sms';
    };
    
    handleUIDisplay();
    
    // Setup event listeners for form elements
    const payTypeSelect = document.getElementById('pay_type') as HTMLSelectElement;
    const cardVerSelect = document.getElementById('card_ver') as HTMLSelectElement;
    
    const handlePayTypeChange = (e: Event) => {
      const target = e.target as HTMLSelectElement;
      const cardVerView = document.getElementById('card_ver_view');
      const taxsaveView = document.getElementById('taxsave_view');
      
      if (target.value === 'card') {
        if (taxsaveView) taxsaveView.style.display = 'none';
        if (cardVerView) cardVerView.style.display = '';
      } else {
        if (taxsaveView) taxsaveView.style.display = '';
        if (cardVerView) cardVerView.style.display = 'none';
      }
    };
    
    const handleCardVerChange = () => {
      const isRegulerView = document.getElementById('is_reguler_view');
      const payYearView = document.getElementById('pay_year_view');
      const payMonthView = document.getElementById('pay_month_view');
      const workTypeAuthOption = document.querySelector('#work_type option[value*="AUTH"]') as HTMLOptionElement;
      
      if (cardVerSelect.value === '01') {
        if (isRegulerView) isRegulerView.style.display = '';
        if (payYearView) payYearView.style.display = '';
        if (payMonthView) payMonthView.style.display = '';
        if (workTypeAuthOption) workTypeAuthOption.disabled = false;
      } else {
        if (isRegulerView) isRegulerView.style.display = 'none';
        if (payYearView) payYearView.style.display = 'none';
        if (payMonthView) payMonthView.style.display = 'none';
        if (workTypeAuthOption) workTypeAuthOption.disabled = true;
      }
    };
    
    if (payTypeSelect) {
      payTypeSelect.addEventListener('change', handlePayTypeChange);
    }
    
    if (cardVerSelect) {
      cardVerSelect.addEventListener('change', handleCardVerChange);
    }
    
    return () => {
      if (payTypeSelect) {
        payTypeSelect.removeEventListener('change', handlePayTypeChange);
      }
      if (cardVerSelect) {
        cardVerSelect.removeEventListener('change', handleCardVerChange);
      }
    };
  }, []);

  // Load Payple script when component mounts
  useEffect(() => {
    // Check if script is already loaded
    if (!document.getElementById('paypleScript')) {
      const script = document.createElement('script');
      script.id = 'paypleScript';
      script.src = 'https://cpay.payple.kr/js/cpay.payple.1.0.1.js';
      script.async = true;
      
      // Append script to document
      document.head.appendChild(script);
      
      return () => {
        // Clean up script when component unmounts
        const scriptElement = document.getElementById('paypleScript');
        if (scriptElement) {
          document.head.removeChild(scriptElement);
        }
      };
    }
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    formData.current[e.target.name as keyof PaymentFormData] = e.target.value;
  };

  // Handle payment result callback
  const getResult = (res: PaymentResult) => {
    if (res.PCD_PAY_RST === 'success') {

      // Navigate to result page with payment data
      navigate('/payment-result', { 
        state: { payResult: res }
      });
    } else {
      // Show payment failure message
      window.alert(res.PCD_PAY_MSG);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Payment parameters:', formData);
    console.log('PaypleCpayAuthCheck exists:', typeof window.PaypleCpayAuthCheck === 'function');
    
    // Generate order ID if not already set
    if (!formData.current.order_num) {
      formData.current.order_num = createOid();
    }
    
    const paymentObj: Record<string, any> = {};
    
    // Common settings
    paymentObj.PCD_PAY_TYPE = formData.current.pay_type;
    paymentObj.PCD_PAY_WORK = formData.current.work_type;
    
    if (formData.current.pay_type === 'card') {
      paymentObj.PCD_CARD_VER = formData.current.card_ver || '01';
    }
    
    paymentObj.PCD_PAYER_AUTHTYPE = formData.current.auth_type;
    paymentObj.PCD_REGULER_FLAG = formData.current.is_reguler;
    paymentObj.PCD_PAY_YEAR = formData.current.pay_year;
    paymentObj.PCD_PAY_MONTH = formData.current.pay_month;

    // Set result URL based on direct payment setting
    if (formData.current.is_direct === 'Y') {
      paymentObj.PCD_RST_URL = process.env.REACT_APP_REMOTE_HOSTNAME + '/api';
    } else {
      paymentObj.PCD_RST_URL = '/payment-result';
    }
    
    // Set callback function
    paymentObj.callbackFunction = getResult;

    // For AUTH work type (billing key registration)
    if (formData.current.work_type === 'AUTH') {
      paymentObj.PCD_PAYER_NO = formData.current.buyer_no;
      paymentObj.PCD_PAYER_NAME = formData.current.buyer_name;
      paymentObj.PCD_PAYER_HP = formData.current.buyer_hp;
      paymentObj.PCD_PAYER_EMAIL = formData.current.buyer_email;
      paymentObj.PCD_TAXSAVE_FLAG = formData.current.is_taxsave;
      paymentObj.PCD_REGULER_FLAG = formData.current.is_reguler;
      paymentObj.PCD_SIMPLE_FLAG = formData.current.simple_flag;
    } else {
      // For standard payment (single or regular)
      if (formData.current.simple_flag !== 'Y' || formData.current.payple_payer_id === '') {
        // Regular payment
        paymentObj.PCD_PAYER_NO = formData.current.buyer_no;
        paymentObj.PCD_PAYER_NAME = formData.current.buyer_name;
        paymentObj.PCD_PAYER_HP = formData.current.buyer_hp;
        paymentObj.PCD_PAYER_EMAIL = formData.current.buyer_email;
        paymentObj.PCD_PAY_GOODS = formData.current.buy_goods;
        paymentObj.PCD_PAY_TOTAL = formData.current.buy_total;
        paymentObj.PCD_PAY_TAXTOTAL = formData.current.buy_taxtotal;
        paymentObj.PCD_PAY_ISTAX = formData.current.buy_istax;
        paymentObj.PCD_PAY_OID = formData.current.order_num;
        paymentObj.PCD_REGULER_FLAG = formData.current.is_reguler;
        paymentObj.PCD_PAY_YEAR = formData.current.pay_year;
        paymentObj.PCD_PAY_MONTH = formData.current.pay_month;
        paymentObj.PCD_TAXSAVE_FLAG = formData.current.is_taxsave;
      } else if (formData.current.simple_flag === 'Y' && formData.current.payple_payer_id !== '') {
        // Simple payment with registered billing key
        paymentObj.PCD_SIMPLE_FLAG = formData.current.simple_flag;
        paymentObj.PCD_PAYER_ID = formData.current.payple_payer_id;
        
        paymentObj.PCD_PAYER_NO = formData.current.buyer_no;
        paymentObj.PCD_PAY_GOODS = formData.current.buy_goods;
        paymentObj.PCD_PAY_TOTAL = formData.current.buy_total;
        paymentObj.PCD_PAY_TAXTOTAL = formData.current.buy_taxtotal;
        paymentObj.PCD_PAY_ISTAX = formData.current.buy_istax;
        paymentObj.PCD_PAY_OID = formData.current.order_num;
        paymentObj.PCD_REGULER_FLAG = formData.current.is_reguler;
        paymentObj.PCD_PAY_YEAR = formData.current.pay_year;
        paymentObj.PCD_PAY_MONTH = formData.current.pay_month;
        paymentObj.PCD_TAXSAVE_FLAG = formData.current.is_taxsave;
      }
    }

    // Set client key
    paymentObj.clientKey = process.env.REACT_APP_CLIENT_KEY;
    
    // Debug logs
    console.log("Payment parameters:", paymentObj);
    console.log("PaypleCpayAuthCheck function exists:", typeof window.PaypleCpayAuthCheck === 'function');
    
    // Call payment gateway
    try {
      window.PaypleCpayAuthCheck(paymentObj);
    } catch (error) {
      console.error("Payment gateway error:", error);
      alert("결제 시스템 초기화 중 오류가 발생했습니다. 페이지를 새로고침 후 다시 시도해주세요.");
    }
  };

  return (
    <PaymentContainer>
      <FormTitle>결제 정보 입력</FormTitle>
      
      <form id="orderForm" name="orderForm">
        <SelectGroup>
          <FormGroup>
            <Label>결제 유형</Label>
            <Select name="simple_flag" id="simple_flag" defaultValue="Y" onChange={handleInputChange}>
              <option value="N">단건결제</option>
              <option value="Y">간편결제</option>
            </Select>
          </FormGroup>
          
          <FormGroup>
            <Label>결제창 방식</Label>
            <Select name="is_direct" id="is_direct" defaultValue="Y" onChange={handleInputChange}>
              <option value="N">POPUP</option>
              <option value="Y">DIRECT</option>
            </Select>
          </FormGroup>
        </SelectGroup>
        
        <SelectGroup>
          <FormGroup>
            <Label>결제 수단</Label>
            <Select id="pay_type" name="pay_type" defaultValue="card" onChange={handleInputChange}>
              <option value="transfer">계좌이체결제</option>
              <option value="card">신용카드</option>
            </Select>
          </FormGroup>
          
          <FormGroup id="card_ver_view">
            <Label>결제창 선택</Label>
            <Select id="card_ver" name="card_ver" defaultValue="01" onChange={handleInputChange}>
              <option value="">결제창 선택</option>
              <option value="01">카드 정기</option>
              <option value="02">카드 일반</option>
            </Select>
          </FormGroup>
        </SelectGroup>
        
        <FormGroup>
          <Label htmlFor="payple_payer_id">[간편결제] 페이플 결제자 ID</Label>
          <Input type="text" name="payple_payer_id" id="payple_payer_id" defaultValue="" onChange={handleInputChange} />
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="buyer_no">구매자 고유번호</Label>
          <Input type="text" name="buyer_no" id="buyer_no" defaultValue={formData.current.buyer_no} onChange={handleInputChange} />
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="buyer_name">구매자 이름</Label>
          <Input type="text" name="buyer_name" id="buyer_name" defaultValue={formData.current.buyer_name} onChange={handleInputChange} />
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="buyer_hp">구매자 휴대폰번호</Label>
          <Input type="text" name="buyer_hp" id="buyer_hp" defaultValue={formData.current.buyer_hp} onChange={handleInputChange} />
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="buyer_email">구매자 Email</Label>
          <Input type="text" name="buyer_email" id="buyer_email" defaultValue={formData.current.buyer_email} onChange={handleInputChange} />
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="buy_goods">구매상품</Label>
          <Input type="text" name="buy_goods" id="buy_goods" defaultValue={formData.current.buy_goods} onChange={handleInputChange} />
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="buy_total">결제금액</Label>
          <Input type="text" name="buy_total" id="buy_total" defaultValue={formData.current.buy_total} onChange={handleInputChange} />
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="buy_istax">과세여부</Label>
          <Select id="buy_istax" name="buy_istax" defaultValue="Y" onChange={handleInputChange}>
            <option value="Y">과세</option>
            <option value="N">비과세</option>
          </Select>
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="buy_taxtotal">부가세</Label>
          <Input type="text" name="buy_taxtotal" id="buy_taxtotal" defaultValue="" onChange={handleInputChange} />
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="order_num">주문번호</Label>
          <Input type="text" name="order_num" id="order_num" defaultValue={formData.current.order_num} onChange={handleInputChange} />
        </FormGroup>
        
        <FormGroup id="is_reguler_view">
          <Label htmlFor="is_reguler">정기결제</Label>
          <Select id="is_reguler" name="is_reguler" defaultValue="Y" onChange={handleInputChange}>
            <option value="N">N</option>
            <option value="Y">Y</option>
          </Select>
        </FormGroup>
        
        <FormGroup id="pay_year_view">
          <Label htmlFor="pay_year">정기결제 구분년도</Label>
          <Select id="pay_year" name="pay_year" defaultValue="2025" onChange={handleInputChange}>
            <option value="">===</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
            <option value="2021">2021</option>
            <option value="2020">2020</option>
            <option value="2019">2019</option>
          </Select>
        </FormGroup>
        
        <FormGroup id="pay_month_view">
          <Label htmlFor="pay_month">정기결제 구분월</Label>
          <Select id="pay_month" name="pay_month" defaultValue="4" onChange={handleInputChange}>
            <option value="">===</option>
            <option value="12">12</option>
            <option value="11">11</option>
            <option value="10">10</option>
            <option value="9">9</option>
            <option value="8">8</option>
            <option value="7">7</option>
            <option value="6">6</option>
            <option value="5">5</option>
            <option value="4">4</option>
            <option value="3">3</option>
            <option value="2">2</option>
            <option value="1">1</option>
          </Select>
        </FormGroup>
        
        <FormGroup id="taxsave_view" style={{ display: 'none' }}>
          <Label htmlFor="is_taxsave">현금영수증</Label>
          <Select id="is_taxsave" name="is_taxsave" defaultValue="N" onChange={handleInputChange}>
            <option value="N">N</option>
            <option value="Y">Y</option>
          </Select>
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="work_type">결제요청방식</Label>
          <Select id="work_type" name="work_type" defaultValue="PAY" onChange={handleInputChange}>
            <option value="CERT">결제요청&gt; 결제확인&gt; 결제완료</option>
            <option value="PAY">결제요청&gt; 결제완료</option>
            <option value="AUTH">인증</option>
          </Select>
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="auth_type">재결제 인증방식</Label>
          <Select id="auth_type" name="auth_type" defaultValue="sms" onChange={handleInputChange}>
            <option value="sms">문자</option>
            <option value="pwd">패스워드</option>
          </Select>
        </FormGroup>
      </form>
      
      <PayButton id="orderFormSubmit" onClick={handleSubmit}>결제하기</PayButton>
    </PaymentContainer>
  );
};

/* 
 * Oid 생성 함수
 */
const createOid = (): string => {
  const now_date = new Date();
  const now_year = now_date.getFullYear();
  let now_month = (now_date.getMonth() + 1).toString();
  now_month = (parseInt(now_month) < 10) ? '0' + now_month : now_month;
  let now_day = now_date.getDate().toString();
  now_day = (parseInt(now_day) < 10) ? '0' + now_day : now_day;
  const datetime = now_date.getTime();
  return 'test' + now_year + now_month + now_day + datetime;
};

export default Payment;
