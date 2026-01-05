# 🤖 Nexus: AI-Human Hybrid Community Platform

![Project Status](https://img.shields.io/badge/Status-Beta-blue)
![Tech Stack](https://img.shields.io/badge/Stack-Next.js%20%7C%20Firebase-black)
![License](https://img.shields.io/badge/License-MIT-green)

> **"인간과 AI가 공존하며 지식을 쌓고, 경제 활동을 하는 차세대 하이브리드 커뮤니티"**  
> 고등학생 1인 개발 프로젝트 (Architecture Designed by AI & Human)

---

## 📖 프로젝트 소개 (About)

**Nexus**는 단순한 게시판이 아닙니다. AI 에이전트가 정보를 큐레이션하고, 인간 사용자가 이를 검증하며, 그 과정에서 **'Credit(CR)'**이라는 화폐가 순환하는 **자체 경제 생태계**를 가진 플랫폼입니다.

기존의 정적인 위키/커뮤니티와 달리, 게이미피케이션(Gamification) 요소와 정교한 경제 밸런싱이 결합되어 사용자의 활동에 확실한 보상을 제공합니다.

### 🎯 핵심 목표
*   **AI Co-existence:** Gemini 2.5 Flash 기반 에이전트와의 협업 (Coming Soon).
*   **User Economy:** 활동(글쓰기, 초대) = 수익(Credit) = 가치 소비(경매, 상점).
*   **Zero-Cost Architecture:** Serverless 구조로 유지비 0원에 도전하는 고효율 시스템.

---

## ✨ 주요 기능 (Key Features)

### 1. 💰 정교한 경제 시스템 (Economy System)
*   **Credit (CR):** 플랫폼 내 기축 통화.
*   **Earning:** 매일 출석(+10 CR), 위키 기여, 커뮤니티 활동.
*   **Spending:** 닉네임 변경, 희귀 아이템 경매, 게시글 상단 고정.
*   **Market:** 유저 간 아이템 거래 및 수수료(Fee) 시스템 적용 (인플레이션 방지).

### 2. 🤝 초대 및 보상 시스템 (Referral System)
*   친구 초대 시 초대자와 가입자 모두에게 **대량의 Credit 보상**.
*   **Multi-tier Bonus:** 누적 초대 인원(3명, 10명) 달성 시 추가 보너스 지급.
*   **Anti-Abuse:** IP 및 기기 고유 ID 기반의 어뷰징 방지 로직 탑재.

### 3. 📚 하이브리드 위키 (Hybrid Wiki)
*   Markdown 문법을 완벽 지원하는 지식 저장소.
*   모바일/PC 반응형 UI (Responsive Design).
*   *Planned:* AI가 최신 뉴스를 크롤링하여 초안을 작성하는 `Content Agent`.

### 4. 🛡️ 클린 커뮤니티 (Moderation)
*   익명성을 보장하되, 악성 유저는 AI 및 신고 시스템으로 필터링.
*   *Planned:* AI가 문맥을 파악하여 욕설과 비난을 구분하는 `Contextual Moderation`.

---

## 🛠️ 기술 스택 (Tech Stack)

이 프로젝트는 **최신 웹 트렌드**와 **Serverless 아키텍처**를 기반으로 구축되었습니다.

| Category | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 14+ (App Router)** | SEO 최적화 및 서버 사이드 렌더링 (SSR) |
| **Styling** | **Tailwind CSS** | 유틸리티 퍼스트 디자인, 다크모드 지원 |
| **Backend** | **Firebase Cloud Functions** | 서버리스 비즈니스 로직 (Node.js) |
| **Database** | **Firestore (NoSQL)** | 확장성 높은 문서형 데이터베이스 |
| **Realtime** | **Firebase Realtime DB** | 고속 채팅 및 실시간 알림 |
| **Auth** | **Firebase Auth** | 이메일/소셜 로그인 및 보안 |
| **Store** | **Zustand** | 가벼운 전역 상태 관리 |

---

## 🚀 설치 및 실행 (Getting Started)

로컬 환경에서 이 프로젝트를 실행하려면 다음 단계가 필요합니다.

### 1. 레포지토리 클론
```bash
git clone https://github.com/your-username/project-nexus.git
cd project-nexus
```

### 2. 패키지 설치
```bash
npm install
# or
yarn install
```

### 3. 환경 변수 설정 (.env.local)
Firebase 프로젝트 설정 키가 필요합니다.
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. 개발 서버 실행
```bash
npm run dev
```
브라우저에서 `http://localhost:3000`으로 접속하세요.

---

## 📅 로드맵 (Roadmap)

- [x] **Phase 1: Foundation**
    - [x] Next.js 프로젝트 세팅 및 UI/UX 디자인 (반응형).
    - [x] Firebase Auth (회원가입/로그인) 연동.
    - [x] 기본적인 경제 시스템 (지갑, 트랜잭션 DB) 설계.

- [ ] **Phase 2: Growth Engine (Current)**
    - [ ] 친구 초대(Referral) 코드 생성 및 보상 지급 로직.
    - [ ] 게시판/위키 CRUD 기능 고도화.
    - [ ] 상점 및 아이템 인벤토리 구현.

- [ ] **Phase 3: AI Integration**
    - [ ] Google Gemini 2.5 Flash API 연동.
    - [ ] AI 자동 위키 작성 및 검열봇(Moderator) 투입.
    - [ ] 실시간 경매 시스템 오픈.

---

## 👨‍💻 개발자 (Developer)

*   **Lead Developer:** [본인 이름/닉네임] (High School Student)
*   **Role:** Full-Stack Development, Economy Design, System Architecture
*   **Contact:** [이메일 주소]

---

---

## 📜 Changelog & Bug Fix History

이 프로젝트의 모든 변경 사항과 버그 수정 내역은 여기에 기록됩니다. **앞으로 모든 코드 수정 및 추가 시 이 섹션이 반드시 업데이트됩니다.**

### [2026-01-05]
#### ✨ New Features
*   **🧰 도구 모음 (Tools) 고도화**
    *   도구를 4가지 카테고리로 분류: 👤 익명, 🔐 암호화, 🖼️ 이미지, 💻 개발.
    *   `ToolsPage`에서 `?cat=` 쿼리 파라미터를 통한 카테고리별 필터링 기능 구현.
    *   사이드바(Layout)에서 각 카테고리로 직접 이동하는 링크 추가.
    *   **신규 도구 추가**:
        *   `Exif 제거기`: 이미지의 메타데이터(EXIF)를 삭제하여 클린 이미지 생성.
        *   `익명 투표`: 로컬 스토리지를 활용한 투표 생성 및 관리.
        *   `스테가노그래피`: 보이지 않는 유니코드를 활용한 텍스트 내 메시지 은닉.
        *   `디지털 인장`: 텍스트 해시와 타임스탬프를 조합한 원본 증명 시스템.
    *   **랜덤 닉네임 기능 강화**: 로그인한 유저는 생성된 아바타를 즉시 프로필에 적용 가능, 비로그인 유저는 닉네임 복사 기능 제공.

#### 🐛 Bug Fixes
*   **MessagesPage TypeScript 오류 수정**: `Object.values(usersMap)`의 타입 추론 문제(`unknown`)를 `as User[]` 타입 단언을 통해 해결.
*   **WikiPage 신규 문서 404 오류**: `new-`로 시작하는 슬러그에 대해 위키백과 API 호출을 건너뛰도록 로직 수정.
*   **WikiPage 모바일 레이아웃**: 모바일에서 그래프 뷰가 먼저 나오던 순서를 본문 내용이 먼저 나오도록 수정.
*   **PostPage 스포일러 이미지 노출**: 스포일러 태그 내 이미지가 클릭 전에도 보이던 문제를 해결하고, 클릭 시 라이트박스로 열리도록 개선.
*   **이미지 중복 표시**: 첨부 이미지 레이블 하단에 이미지가 중복으로 나오던 문제를 제거하고 본문 내 통합.
*   **실시간 인기글 댓글 수 누락**: 댓글 작성 시 해당 게시글의 `comment_count`를 Firestore에서 업데이트하도록 `storage.ts` 수정.
*   **랜덤 아바타 적용 불가**: `User` 타입의 `avatar_url` 속성을 `avatar`로 잘못 참조하던 오타 수정.
*   **도구 필터링 오류**: 사이드바 카테고리가 이미 열려있던 다른 도구를 닫지 못하던 문제를 `useEffect` 기반 `activeTool` 초기화 로직으로 해결.
*   **익명 투표 참여 불가**: 투표 생성 기능만 있던 `AnonVote` 컴포넌트에 투표 ID를 통한 조회 및 참여 기능을 추가.

#### 🔧 Internal Improvements
*   **ImageLightbox 도입**: 모든 이미지가 새 탭 대신 모달(라이트박스) 형태로 부드럽게 열리도록 공통 컴포넌트 구현.
*   **DigitalStamp 로직 안정화**: `reduce` 함수 사용 시 발생하던 TypeScript 인계 오류를 `for-of` 루프로 변경하여 가독성 및 타입 안정성 확보.

---

### [이전 활동 기록 요약]
*   **Wiki 개편**: 나무위키 스타일의 레이아웃 적용, 위키백과 API 연동 (한/영 토글).
*   **게시판 기능**: 게시글 삭제 버튼 (작성자 전용) 추가, 투표 UI 개선.
*   **시스템**: `storage.ts`를 활용한 로컬 데이터 관리 체계 구축.

---

### 📢 기여 (Contributing)
버그 제보나 기능 제안은 [Issues](https://github.com/your-username/project-nexus/issues)를 이용해 주세요.  
PR(Pull Request)은 언제나 환영입니다!
