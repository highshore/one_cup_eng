import { useParams } from "react-router-dom";
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

const PolicyContainer = styled.div`
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

const Section = styled.section`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  color: ${colors.primary};
  font-size: 1.4rem;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    font-size: 1.2rem;
  }
`;

const Paragraph = styled.p`
  margin-bottom: 1rem;
`;

const Policy = () => {
  const { type } = useParams<{ type: string }>();

  console.log("Policy type:", type);

  const privacyContent = (
    <Content>
      <Section>
        <SectionTitle>1. 개인정보의 처리 목적</SectionTitle>
        <Paragraph>
          ('1cupenglish.com'이하 '영어 한잔')은 다음의 목적을 위하여 개인정보를
          처리하고 있으며, 다음의 목적 이외의 용도로는 이용하지 않습니다.
        </Paragraph>
        <Paragraph>
          – 고객 가입의사 확인, 고객에 대한 서비스 제공에 따른 본인 식별.인증,
          회원자격 유지. 서비스 공급에 따른 금액 결제, 콘텐츠 구독 서비스 제공,
          서비스 관련 사항 안내 등 영어 한잔은 고객의 개인정보를 제 3자에게
          위탁/제공하지 않습니다.
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>2. 정보주체의 권리,의무 및 그 행사방법</SectionTitle>
        <Paragraph>
          이용자는 개인정보주체로서 다음과 같은 권리를 행사할 수 있습니다.
        </Paragraph>
        <Paragraph>
          ① 정보주체는 영어 한잔에 대해 언제든지 다음 각 호의 개인정보 보호 관련
          권리를 행사할 수 있습니다.
        </Paragraph>
        <ul>
          <li>개인정보 열람요구 오류 등이 있을 경우</li>
          <li>정정 요구</li>
          <li>삭제요구</li>
          <li>처리정지 요구</li>
        </ul>
      </Section>

      <Section>
        <SectionTitle>3. 처리하는 개인정보의 항목</SectionTitle>
        <Paragraph>
          ① 영어 한잔은 다음의 개인정보 항목을 처리하고 있습니다.
        </Paragraph>
        <ul>
          <li>필수항목 : 이메일, 휴대폰 번호, 이름</li>
        </ul>
      </Section>

      <Section>
        <SectionTitle>4. 개인정보의 파기</SectionTitle>
        <Paragraph>
          영어 한잔은 원칙적으로 개인정보 처리목적이 달성된 경우에는 지체없이
          해당 개인정보를 파기합니다. 파기의 절차, 기한 및 방법은 다음과
          같습니다.
        </Paragraph>
        <Paragraph>
          – 파기절차
          <br />
          이용자가 입력한 정보는 목적 달성 후 별도의 DB에 옮겨져 내부 방침 및
          기타 관련 법령에 따라 일정기간 저장된 후 혹은 즉시 파기됩니다. 이 때,
          DB로 옮겨진 개인정보는 법률에 의한 경우가 아니고서는 다른 목적으로
          이용되지 않습니다.
        </Paragraph>
        <Paragraph>
          -파기기한
          <br />
          이용자의 개인정보는 개인정보의 보유기간이 경과된 경우에는 보유기간의
          종료일로부터 5일 이내에, 개인정보의 처리 목적 달성, 해당 서비스의
          폐지, 사업의 종료 등 그 개인정보가 불필요하게 되었을 때에는 개인정보의
          처리가 불필요한 것으로 인정되는 날로부터 5일 이내에 그 개인정보를
          파기합니다.
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>5. 개인정보의 안전성 확보 조치</SectionTitle>
        <Paragraph>
          영어 한잔은 개인정보보호법 제29조에 따라 다음과 같이 안전성 확보에
          필요한 기술적/관리적 및 물리적 조치를 하고 있습니다.
        </Paragraph>
        <Paragraph>
          1. 개인정보 취급 직원의 최소화 및 교육
          <br />
          개인정보를 취급하는 직원을 지정하고 담당자에 한정시켜 최소화 하여
          개인정보를 관리하는 대책을 시행하고 있습니다.
        </Paragraph>
        <Paragraph>
          2. 개인정보에 대한 접근 제한
          <br />
          개인정보를 처리하는 데이터베이스시스템에 대한 접근권한의
          부여,변경,말소를 통하여 개인정보에 대한 접근통제를 위하여 필요한
          조치를 하고 있으며 침입차단시스템을 이용하여 외부로부터의 무단 접근을
          통제하고 있습니다.
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>6. 개인정보 보호 책임자</SectionTitle>
        <Paragraph>
          ① 영어 한잔은 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보
          처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이
          개인정보 보호책임자를 지정하고 있습니다.
        </Paragraph>
        <Paragraph>
          개인정보 보호책임자
          <br />
          성명 : 김수겸
          <br />
          연락처 : hello@nativept.kr
        </Paragraph>
        <Paragraph>
          ② 정보주체께서는 영어 한잔의 서비스(또는 사업)을 이용하시면서 발생한
          모든 개인정보 보호 관련 문의, 불만처리, 피해구제 등에 관한 사항을
          개인정보 보호책임자 및 담당부서로 문의하실 수 있습니다. 영어 한잔은
          정보주체의 문의에 대해 지체 없이 답변 및 처리해드릴 것입니다.
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>7. 개인정보 처리방침 변경</SectionTitle>
        <Paragraph>
          ① 이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른
          변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일
          전부터 공지사항을 통하여 고지할 것입니다.
        </Paragraph>
      </Section>
    </Content>
  );

  const termsContent = (
    <Content>
      <Section>
        <SectionTitle>제 1조 목적</SectionTitle>
        <Paragraph>
          본 약관은 '영어 한잔 서비스 안내' 및 '영어 한잔 구독 신청' 페이지에
          게시 되어있는 이용 규칙을 구체적으로 설명한 것이며, 영어 한잔(이하
          '회사')가 운영하는 영어 한잔 웹사이트와 모든 서비스를 이용하는 것과
          관련된 권리, 의무 등을 규정하는 것을 목적으로 하고 있습니다.
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>제 2조 정의</SectionTitle>
        <Paragraph>
          "회사" : 영어 한잔을 운영하는 회사를 의미합니다.
          <br />
          "방문자" : 영어 한잔 웹사이트에 방문한 모든 방문자를 의미합니다.
          <br />
          "이용자" : 영어 한잔 서비스를 이용하는 모든 이용자를 의미합니다.
          <br />
          "회원" : 영어 한잔 웹사이트에 가입한 모든 회원을 의미합니다.
          <br />
          "포인트" : 영어 한잔 서비스 과정에서 회원에게 주어지는 포인트를
          의미합니다. 영어 한잔 회원은 포인트를 사용해 구독권 구매 시 해당
          액수만큼 할인을 받을 수 있습니다.
          <br />
          "콘텐츠" : 영어 한잔 웹사이트에 업로드 되어있는 모든 자료를
          의미합니다.
          <br />
          "구독 기간" : 이용자가 서비스 요금을 지불하고 콘텐츠를 이용하는 해당
          구독 기간을 의미합니다. 예를 들어, 30일 구독권을 신청하여 이용하는
          경우 해당 30일간의 기간이 1개의 구독 기간입니다.
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>제 3조 약관의 명시와 개정</SectionTitle>
        <Paragraph>
          1. 본 약관은 회원가입 화면에 게시되며, 회사는 필요한 경우 약관을
          개정할 수 있습니다. 개정된 약관은 영어 한잔 웹사이트 "공지사항"에
          게시됩니다.
          <br />
          2. 약관 개정은 효력시행 7일 이전부터 통지되며, 약관 효력 시행일까지
          이용자가 거부 의사를 표하지 않는 경우 약관 변경에 동의하는 것으로
          간주됩니다.
          <br />
          3. 본 약관에 규정되지 않은 사항은 관계 법령 혹은 회사의 세부 운영
          규칙에 따릅니다.
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>제 4조 서비스의 제공, 변경, 중단</SectionTitle>
        <Paragraph>
          1. 회사는 이용자가 구매한 서비스를 이용하는 것에 차질이 없도록 서비스
          품질을 관리합니다.
          <br />
          2. 회사는 서비스의 품절, 법률적 문제, 국가 비상 사태 등이 발생하는
          경우 서비스 제공을 중지할 수 있으며, 서비스 제공이 완료되지 않은
          이용자에게는 구독료를 일할 계산하여 환불합니다.
          <br />
          3. 회사의 과실로 인해 서비스 제공이 되지 않은 경우에는 해당 기간만큼
          구독 기간을 연장하거나, 이용자에게 포인트 보상을 제공합니다.
          <br />
          4. 이용자는 콘텐츠 열람 및 다운로드 등의 서비스를 구독 기간 내에
          자유롭게 이용할 수 있습니다.
          <br />
          5. 회사는 필요에 의해 서비스 제공 방식, 서비스의 내용을 변경할 수
          있습니다. 서비스 변경이 예정된 경우 이용자에게 해당 변경 내용이 변경
          이전에 공지됩니다. 회사는 미리 구독권을 결제한 이용자의 구독 기간
          동안에 서비스의 내용이 변경되는 경우, 이용자와 협의를 통해 보상을
          제공할 수 있습니다.
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>제 5조 회원가입 및 구독신청</SectionTitle>
        <Paragraph>
          1. 방문자는 영어 한잔 웹사이트에 최소한의 개인정보를 기입하여
          회원가입을 할 수 있습니다. 회원가입을 진행한 회원은 구독신청을 할 수
          있는 자격을 얻습니다.
          <br />
          2. 방문자는 서비스 이용 약관과 회사의 개인정보처리 방침에 동의하는
          경우 회원가입을 진행할 수 있습니다.
          <br />
          3. 회원은 서비스 이용에 있어 필수적인 정보를 입력한 후 구독신청을
          진행할 수 있습니다.
          <br />
          4. 회원이 구독신청시 기입한 정보는 서비스 제공을 위해 회사 측에서
          확인할 수 있습니다.
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>제 6조 회원 탈퇴 및 자격의 상실</SectionTitle>
        <Paragraph>
          1. 회사는 회원이 아래 각 호중 하나에 해당하는 경우 회원자격을 상실시킬
          수 있습니다.
          <br />
          ① 적절하지 않은 방법으로 영어 한잔 웹사이트 및 서비스를 이용해 회사에
          손실을 끼친 경우.
          <br />
          ② 본인이 아닌 타인의 개인정보로 회원가입을 진행한 경우.
          <br />
          ③ 회원가입시 등록한 내용에 허위, 기재누락, 오기가 있는 경우.
          <br />
          ④ 서비스에 대한 채무를 서비스 제공일까지 지불하지 않는 경우.
          <br />
          ⑤ 서비스 이용 중 외설적인 언행, 폭언, 욕설 등을 표출하는 경우.
          <br />
          ⑥ 회사의 지식재산권을 침해하거나, 회사의 직원 및 콘텐츠 제작자의
          초상권 및 법적으로 보호되는 권리를 침해할 경우
          <br />
          2. 제 6조 1항 ①호, ⑤호, ⑥호에 근거해 회원자격이 상실 된 경우, 회사는
          당사자에게 손해배상을 청구할 수 있습니다.
          <br />
          3. 회원은 언제든지 회원 탈퇴를 신청할 수 있습니다. 회원 탈퇴 시 서비스
          제공이 완료되지 않은 경우에도 서비스 제공은 중단되며, 적립된 포인트는
          즉시 소멸됩니다. 회원은 이에 대해 보상을 요청할 수 없습니다. 회사는
          회원이 뜻하지 않게 회원 탈퇴 신청할 가능성을 고려해, 회원 탈퇴 신청이
          이뤄진 후 관리자가 2차 확인을 한 후 회원 탈퇴를 진행합니다. 이 때,
          관리자는 회원의 탈퇴 의사를 확인하기 위해 회원이 회원가입과 구독신청
          시 입력한 이메일 혹은 전화번호로 연락을 취합니다. 회사가 회원에게 회원
          탈퇴 확인 연락을 취하고 회원이 탈퇴 의사를 표현하거나, 회원의 응답
          없이 7일이 지나는 경우 회원 탈퇴가 진행됩니다. 회원이 회원 탈퇴 의사를
          철회하는 경우 회원 탈퇴는 취소됩니다.
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>제 7조 결제 및 영수증 발급</SectionTitle>
        <Paragraph>
          1. 결제는 신용카드, 계좌이체, 간편결제 등 회사가 제공하는 결제
          수단으로 이루어지며 모든 거래는 현금영수증이 발행됩니다.
          <br />
          2. 현금영수증이 필요한 경우 관리자에게 요청하면 이메일로 현금영수증을
          발송해드립니다.
          <br />
          3. 현금영수증은 영어 한잔 이용자가 '마이페이지'에 기재한 '현금영수증
          번호'로 발행되며, 이용자가 번호 정보를 입력하지 않은 경우에는 국세청
          번호로 발행합니다.
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>제 8조 포인트</SectionTitle>
        <Paragraph>
          1. 회사는 서비스에 대한 보상 및 이벤트 보상 차원에서 회원에게 포인트를
          지급할 수 있습니다.
          <br />
          2. 지급한 포인트는 지급 시점부터 1년간 사용 가능합니다. 사용기간이
          지난 포인트는 삭제될 수 있습니다.
          <br />
          3. 회원은 회사의 서비스를 구매할 때 포인트를 활용할 수 있으며, 활용한
          포인트만큼 서비스에 대해 할인을 받을 수 있습니다. 포인트 액수가
          서비스의 가액을 초과한 경우, 포인트만 활용해 서비스를 제공받을 수
          있습니다.
          <br />
          4. 포인트는 현금성 가치가 없으며, 현금으로 환급 받을 수 없습니다.
          <br />
          5. 회사 서비스 종료 시 포인트도 함께 소멸됩니다.
          <br />
          6. 회사가 서비스를 더 이상 제공할 수 없어 이용자가 포인트를 활용할 수
          없는 경우에도, 포인트에 대한 보상은 이뤄지지 않습니다.
          <br />
          7. 포인트가 회사의 착오 혹은 잘못된 정보로 인해 오지급된 경우, 회사는
          포인트를 회수할 수 있습니다.
          <br />
          8. 이용자가 적절하지 않은 방식으로 포인트를 적립한 경우, 회사는
          포인트를 회수할 수 있습니다.
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>제 9조 환불</SectionTitle>
        <Paragraph>
          1. 이용자는 서비스에 대해 환불을 요청할 수 있습니다. 환불 규정은 아래
          각 호와 같습니다.
          <br />
          ① 서비스 이용 시작 전 : 전액 환불
          <br />
          ② 총 구독 기간 1/3 경과 이전: 기 납입한 이용료의 2/3에 해당하는 금액
          환불.
          <br />
          ③ 총 구독 기간 1/2 경과 이전: 기 납입한 이용료의 1/2에 해당하는 금액
          환불.
          <br />
          ④ 총 구독 기간 1/2 경과 후: 반환하지 아니함.
          <br />
          2. 포인트는 현금성이 없으므로 어떠한 경우에도 현금으로 지급하지
          않습니다. 포인트는 적립 이후 최대한 빠른 시일 내에 사용하는 것을
          권장합니다.
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>제 10조 자동 결제 및 해지</SectionTitle>
        <Paragraph>
          1. 영어 한잔은 구독형 서비스로서 이용자가 선택한 구독 상품에 따라 자동
          결제가 이루어질 수 있습니다.
          <br />
          2. 자동 결제는 구독 기간이 만료되기 24시간 전에 다음 결제 기간에 대한
          안내 알림이 발송됩니다.
          <br />
          3. 이용자는 언제든지 마이페이지에서 자동 결제를 해지할 수 있으며, 해지
          시점 이후의 결제 예정일에는 결제가 이루어지지 않습니다.
          <br />
          4. 자동 결제 해지 후에도 현재 구독 기간이 종료될 때까지는 서비스를
          이용할 수 있습니다.
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>제 11조 이용자의 의무</SectionTitle>
        <Paragraph>
          1. 이용자는 아래 각 항의 항목의 행위를 하여서는 안 되며, 이용자가
          의무를 위반하는 경우에는 회사는 이용자의 서비스 이용 자격을 제한할 수
          있습니다.
          <br />
          ① 회사의 웹사이트에 과도한 트래픽을 발생시켜 회사에 손해를 발생시키는
          행위
          <br />
          ② 회원가입 및 구독신청 시 고의로 잘못된 정보를 기입하는 행위
          <br />
          ③ 회사의 웹 서비스 및 어플리케이션을 회사가 의도하지 않은 방식으로
          활용하는 행위
          <br />
          ④ 회사 및 타인의 지식재산권 및 초상권을 침해하는 행위
          <br />
          ⑤ 서비스를 이용하는 전반적인 과정에서 외설적인 언행, 욕설, 다른 업체에
          대한 홍보 등 사회 통념에 어긋나는 행위
          <br />
          ⑥ 콘텐츠를 무단으로 복제하거나 공유하는 행위
          <br />⑦ 기타 회사에 손해를 발생시키는 행위
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>제 12조 분쟁의 해결</SectionTitle>
        <Paragraph>
          1. 회사와 이용자 간에 발생한 분쟁에 관한 소송은 한국법을 적용합니다.
          <br />
          2. 회사와 이용자 간에 발생한 분쟁에 대한 소는 회사 소재지의 관할법원에
          제기합니다.
        </Paragraph>
      </Section>

      <Section>
        <Paragraph>본 이용 약관은 2024년 1월 1일부터 시행됩니다.</Paragraph>
      </Section>
    </Content>
  );

  let content;
  let title;

  if (type === "privacy") {
    content = privacyContent;
    title = "개인정보 처리방침";
  } else if (type === "terms") {
    content = termsContent;
    title = "이용약관";
  } else {
    console.warn(`Unknown policy type: ${type}, defaulting to privacy`);
    content = privacyContent;
    title = "개인정보 처리방침";
  }

  return (
    <PolicyContainer>
      <Title>{title}</Title>
      {content}
    </PolicyContainer>
  );
};

export default Policy;
