
import React from 'react';

export const TermsPage: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm shadow-sm p-6 md:p-10">
    <h1 className="text-2xl font-black mb-6 border-b pb-2 dark:border-gray-700 dark:text-white">이용약관</h1>
    <div className="prose dark:prose-invert text-sm max-w-none">
      <p>제 1 조 (목적)</p>
      <p>본 약관은 K-Community Hub(이하 "회사")가 제공하는 커뮤니티 서비스의 이용조건 및 절차, 이용자와 회사의 권리, 의무, 책임사항을 규정함을 목적으로 합니다.</p>
      <br/>
      <p>제 2 조 (용어의 정의)</p>
      <p>1. "회원"이란 회사에 개인정보를 제공하여 회원등록을 한 자로서, 회사의 정보를 지속적으로 제공받으며 서비스를 이용할 수 있는 자를 말합니다.</p>
      <p>2. "게시물"이란 회원이 서비스를 이용함에 있어 게시한 글, 사진, 동영상 등 모든 형태의 글과 자료를 의미합니다.</p>
      <br/>
      <p>제 3 조 (이용자의 의무)</p>
      <p>회원은 타인의 명예를 훼손하거나, 공공질서 및 미풍양속을 해치는 행위를 하여서는 안 됩니다.</p>
    </div>
  </div>
);

export const PrivacyPage: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm shadow-sm p-6 md:p-10">
    <h1 className="text-2xl font-black mb-6 border-b pb-2 dark:border-gray-700 dark:text-white">개인정보처리방침</h1>
    <div className="prose dark:prose-invert text-sm max-w-none">
      <p>K-Community Hub는 이용자의 개인정보를 소중히 다루며, '개인정보 보호법' 등 관련 법령을 준수합니다.</p>
      <br/>
      <h3 className="font-bold text-lg">1. 수집하는 개인정보 항목</h3>
      <p>회사는 회원가입, 상담, 서비스 신청 등을 위해 아래와 같은 개인정보를 수집하고 있습니다.</p>
      <ul className="list-disc pl-5">
          <li>수집항목: 아이디, 비밀번호, 닉네임, 이메일, 접속 로그, 쿠키, 접속 IP 정보</li>
      </ul>
      <br/>
      <h3 className="font-bold text-lg">2. 개인정보의 수집 및 이용목적</h3>
      <p>회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다.</p>
      <ul className="list-disc pl-5">
          <li>서비스 제공에 관한 계약 이행 및 서비스 제공에 따른 요금정산</li>
          <li>회원 관리 (불량회원의 부정 이용 방지 등)</li>
      </ul>
    </div>
  </div>
);

export const YouthPolicyPage: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm shadow-sm p-6 md:p-10">
    <h1 className="text-2xl font-black mb-6 border-b pb-2 dark:border-gray-700 dark:text-white">청소년보호정책</h1>
    <div className="prose dark:prose-invert text-sm max-w-none">
      <p>K-Community Hub는 청소년 유해매체물로부터 청소년을 보호하기 위해 관련 법률에 따라 청소년 보호정책을 시행하고 있습니다.</p>
      <br/>
      <h3 className="font-bold text-lg">1. 유해정보로부터의 청소년보호계획 수립 및 시행</h3>
      <p>회사는 청소년이 아무런 제한장치 없이 유해정보에 노출되지 않도록 청소년유해매체물에 대해서는 별도의 인증장치를 마련, 적용하며 유해정보가 노출되지 않도록 예방차원의 조치를 강구하고 있습니다.</p>
      <br/>
      <h3 className="font-bold text-lg">2. 유해정보에 대한 청소년접근제한 및 관리조치</h3>
      <p>회사는 불법적이거나 청소년에 유해한 키워드에 대한 금칙어를 적용하고 있으며, 유해정보를 발견하는 즉시 삭제 조치를 취하고 있습니다.</p>
    </div>
  </div>
);
