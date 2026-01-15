import React from 'react';
import { Shield, FileText, Users, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TermsPage: React.FC = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
    <div className="max-w-3xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-6">
        <ArrowLeft size={18} /> 홈으로
      </Link>

      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="text-blue-500" size={32} />
          <h1 className="text-2xl font-black dark:text-white">이용약관</h1>
        </div>

        <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed space-y-4">
          <p className="text-gray-500">최종 수정일: 2026년 1월 15일</p>

          <h2 className="text-lg font-bold mt-6">제1조 (목적)</h2>
          <p>이 약관은 AI Hub(이하 "서비스")가 제공하는 모든 서비스의 이용 조건 및 절차, 이용자와 서비스 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>

          <h2 className="text-lg font-bold mt-6">제2조 (용어의 정의)</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>"서비스"란 AI Hub가 제공하는 AI 대화, 게시판, 커뮤니티 등 모든 기능을 의미합니다.</li>
            <li>"이용자"란 이 약관에 동의하고 서비스를 이용하는 모든 사람을 의미합니다.</li>
            <li>"회원"이란 서비스에 가입하여 계정을 보유한 이용자를 의미합니다.</li>
          </ul>

          <h2 className="text-lg font-bold mt-6">제3조 (약관의 효력 및 변경)</h2>
          <p>이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다. 서비스는 필요시 약관을 변경할 수 있으며, 변경된 약관은 공지 후 적용됩니다.</p>

          <h2 className="text-lg font-bold mt-6">제4조 (서비스의 제공)</h2>
          <p>서비스는 다음과 같은 기능을 제공합니다:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>AI 캐릭터와의 대화 서비스</li>
            <li>커뮤니티 게시판 및 글 작성</li>
            <li>가상 화폐(크레딧) 시스템</li>
            <li>기타 서비스가 추가로 개발하는 서비스</li>
          </ul>

          <h2 className="text-lg font-bold mt-6">제5조 (이용자의 의무)</h2>
          <p>이용자는 다음 행위를 하여서는 안 됩니다:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>다른 이용자의 개인정보를 수집, 저장, 공개하는 행위</li>
            <li>서비스의 운영을 방해하는 행위</li>
            <li>타인을 사칭하거나 허위 정보를 등록하는 행위</li>
            <li>음란물, 욕설, 혐오 발언 등 부적절한 콘텐츠를 게시하는 행위</li>
            <li>서비스를 이용하여 법령에 위반되는 행위</li>
          </ul>

          <h2 className="text-lg font-bold mt-6">제6조 (서비스 이용 제한)</h2>
          <p>서비스는 이용자가 본 약관의 의무를 위반하거나 서비스의 정상적인 운영을 방해한 경우, 경고, 일시정지, 영구이용정지 등의 조치를 취할 수 있습니다.</p>

          <h2 className="text-lg font-bold mt-6">제7조 (콘텐츠의 권리와 책임)</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>이용자가 작성한 콘텐츠에 대한 저작권은 해당 이용자에게 귀속됩니다.</li>
            <li>이용자가 게시한 콘텐츠로 인해 발생하는 모든 책임은 해당 이용자에게 있습니다.</li>
            <li>서비스는 이용자가 게시한 콘텐츠를 서비스 운영 및 홍보 목적으로 사용할 수 있습니다.</li>
          </ul>

          <h2 className="text-lg font-bold mt-6">제8조 (면책조항)</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>서비스는 천재지변, 서버 장애 등 불가항력으로 인한 서비스 중단에 대해 책임을 지지 않습니다.</li>
            <li>AI가 생성한 콘텐츠의 정확성이나 신뢰성에 대해 보장하지 않습니다.</li>
            <li>이용자 간의 분쟁에 대해 서비스는 개입하지 않으며 책임을 지지 않습니다.</li>
          </ul>

          <h2 className="text-lg font-bold mt-6">제9조 (준거법 및 관할)</h2>
          <p>이 약관의 해석 및 서비스 이용에 관한 분쟁에 대해서는 대한민국 법률을 적용하며, 분쟁 발생 시 서울중앙지방법원을 관할 법원으로 합니다.</p>

          <h2 className="text-lg font-bold mt-6">부칙</h2>
          <p>이 약관은 2026년 1월 15일부터 시행됩니다.</p>
        </div>
      </div>
    </div>
  </div>
);

export const PrivacyPage: React.FC = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
    <div className="max-w-3xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-6">
        <ArrowLeft size={18} /> 홈으로
      </Link>

      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="text-purple-500" size={32} />
          <h1 className="text-2xl font-black dark:text-white">개인정보처리방침</h1>
        </div>

        <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed space-y-4">
          <p className="text-gray-500">최종 수정일: 2026년 1월 15일</p>

          <h2 className="text-lg font-bold mt-6">1. 개인정보의 수집 및 이용 목적</h2>
          <p>AI Hub(이하 "서비스")는 다음의 목적을 위해 개인정보를 수집하고 있습니다:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>회원 가입 및 관리: 회원제 서비스 이용에 따른 본인 확인</li>
            <li>서비스 제공: AI 대화, 게시글 작성, 커뮤니티 활동</li>
            <li>서비스 개선: 서비스 이용 통계 및 분석</li>
          </ul>

          <h2 className="text-lg font-bold mt-6">2. 수집하는 개인정보 항목</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>필수 항목: 이메일 주소, 닉네임</li>
            <li>자동 수집 항목: 접속 IP 정보, 쿠키, 서비스 이용 기록</li>
          </ul>

          <h2 className="text-lg font-bold mt-6">3. 개인정보의 보유 및 이용 기간</h2>
          <p>회원 탈퇴 시 또는 수집 목적이 달성된 경우 지체 없이 파기합니다. 단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>

          <h2 className="text-lg font-bold mt-6">4. 개인정보의 제3자 제공</h2>
          <p>서비스는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>이용자가 사전에 동의한 경우</li>
            <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
          </ul>

          <h2 className="text-lg font-bold mt-6">5. 쿠키 및 광고</h2>
          <p>서비스는 Google AdSense를 통해 광고를 제공합니다. Google은 쿠키를 사용하여 이용자의 관심사에 기반한 광고를 표시할 수 있습니다.</p>
          <p className="mt-2">쿠키 설정은 브라우저 설정에서 변경할 수 있습니다. 자세한 내용은 <a href="https://policies.google.com/technologies/ads" className="text-purple-600 hover:underline" target="_blank" rel="noopener noreferrer">Google 광고 정책</a>을 참조하세요.</p>

          <h2 className="text-lg font-bold mt-6">6. 이용자의 권리</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>개인정보 열람, 정정, 삭제 요청</li>
            <li>개인정보 처리 정지 요청</li>
            <li>회원 탈퇴</li>
          </ul>

          <h2 className="text-lg font-bold mt-6">7. 개인정보 보호책임자</h2>
          <p>개인정보 처리에 관한 문의사항은 아래 연락처로 문의해 주세요.</p>
          <p className="mt-2">이메일: support@ai-hub.app</p>

          <h2 className="text-lg font-bold mt-6">8. 개인정보처리방침 변경</h2>
          <p>이 개인정보처리방침은 법률이나 서비스의 변경사항을 반영하기 위해 수정될 수 있습니다. 변경 시 서비스 내 공지사항을 통해 알려드립니다.</p>
        </div>
      </div>
    </div>
  </div>
);

export const YouthPolicyPage: React.FC = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
    <div className="max-w-3xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-6">
        <ArrowLeft size={18} /> 홈으로
      </Link>

      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <Users className="text-green-500" size={32} />
          <h1 className="text-2xl font-black dark:text-white">청소년보호정책</h1>
        </div>

        <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed space-y-4">
          <p className="text-gray-500">최종 수정일: 2026년 1월 15일</p>

          <p>AI Hub(이하 "서비스")는 청소년 유해매체물로부터 청소년을 보호하기 위해 관련 법률에 따라 청소년 보호정책을 시행하고 있습니다.</p>

          <h2 className="text-lg font-bold mt-6">1. 유해정보로부터의 청소년보호계획</h2>
          <p>서비스는 청소년이 유해정보에 노출되지 않도록 다음과 같은 조치를 취하고 있습니다:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>유해 콘텐츠 필터링 시스템 운영</li>
            <li>부적절한 게시물 신고 기능 제공</li>
            <li>AI 응답에 대한 안전 필터 적용</li>
          </ul>

          <h2 className="text-lg font-bold mt-6">2. 유해정보에 대한 관리조치</h2>
          <p>서비스는 불법적이거나 청소년에 유해한 콘텐츠에 대해 다음과 같이 관리합니다:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>금칙어 필터링 시스템 적용</li>
            <li>유해정보 발견 시 즉시 삭제 조치</li>
            <li>반복 위반자에 대한 이용 제한</li>
          </ul>

          <h2 className="text-lg font-bold mt-6">3. 청소년보호책임자</h2>
          <p>청소년 보호에 관한 문의사항은 서비스 운영팀으로 연락해 주세요.</p>
          <p className="mt-2">이메일: support@ai-hub.app</p>
        </div>
      </div>
    </div>
  </div>
);
