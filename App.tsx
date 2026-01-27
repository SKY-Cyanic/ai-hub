import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import BoardPage from './pages/BoardPage';
import PostPage from './pages/PostPage';
import WritePage from './pages/WritePage';
import MyPage from './pages/MyPage';
import ShopPage from './pages/ShopPage';
import PricingPage from './pages/PricingPage';
import WikiPage from './pages/WikiPage';
import AdminPage from './pages/AdminPage';
import MessagesPage from './pages/MessagesPage';
import EncoderPage from './pages/EncoderPage';
import ImageStudioPage from './pages/ImageStudioPage';
import AIAnalyzerPage from './pages/tools/AIAnalyzerPage';
import MockInvestmentPage from './pages/tools/MockInvestmentPage';
import VibeCodePage from './pages/tools/VibeCodePage';
// import AiPlaygroundPage from './pages/tools/AiPlaygroundPage';
import WebDevPage from './pages/WebDevPage';
import LeaderboardPage from './pages/LeaderboardPage';
import { TermsPage, PrivacyPage, YouthPolicyPage } from './pages/PolicyPages';
import ActivityPage from './pages/ActivityPage';
import SearchPage from './pages/SearchPage';
import BookmarksPage from './pages/BookmarksPage';
import ToolsPage from './pages/ToolsPage';
import NoteViewerPage from './pages/NoteViewerPage';
import GamePage from './pages/GamePage';
import ProfilePage from './pages/ProfilePage';
import PersonaPage from './pages/PersonaPage';
import ChatBotPage from './pages/ChatBotPage';
import ResearchPage from './pages/ResearchPage';
import AICommentTest from './pages/AICommentTest';
import CuratorDashboard from './pages/CuratorDashboard';

import AgentMarketplacePage from './pages/AgentMarketplacePage';
import AgentStudioPage from './pages/AgentStudioPage';

// Lazy Load
const PredictionMarketPage = lazy(() => import('./pages/PredictionMarketPage'));
const LandConquestPage = lazy(() => import('./pages/LandConquestPage'));

const ProtectedRoute = ({ children }: { children: any }) => {
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-black text-cyan-500 font-mono">LOADING SYSTEM...</div>}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="board/:boardId" element={<BoardPage />} />
              <Route path="board/:boardId/:postId" element={<PostPage />} />
              <Route path="write" element={<ProtectedRoute><WritePage /></ProtectedRoute>} />
              <Route path="mypage" element={<MyPage />} />
              <Route path="activity" element={<ActivityPage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="bookmarks" element={<BookmarksPage />} />
              <Route path="shop" element={<ShopPage />} />
              <Route path="pricing" element={<PricingPage />} />
              <Route path="marketplace" element={<AgentMarketplacePage />} />
              <Route path="studio" element={<AgentStudioPage />} />
              <Route path="prediction" element={<PredictionMarketPage />} />
              <Route path="land" element={<LandConquestPage />} />
              <Route path="wiki" element={<WikiPage />} />
              <Route path="wiki/:slug" element={<WikiPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="game" element={<GamePage />} />
              <Route path="profile/:username" element={<ProfilePage />} />
              <Route path="chat" element={<ChatBotPage />} />
              <Route path="ai-friend" element={<PersonaPage />} />
              <Route path="persona" element={<PersonaPage />} />
              <Route path="research" element={<ResearchPage />} />
              <Route path="curator" element={<CuratorDashboard />} />
              <Route path="webdev" element={<WebDevPage />} />
              <Route path="leaderboard" element={<LeaderboardPage />} />
              <Route path="tools" element={<ToolsPage />} />
              <Route path="tools/note/:noteId" element={<NoteViewerPage />} />
              <Route path="tools/encoder" element={<EncoderPage />} />
              <Route path="tools/image-studio" element={<ImageStudioPage />} />
              <Route path="tools/ai-analysis" element={<AIAnalyzerPage />} />
              <Route path="tools/mock-invest" element={<MockInvestmentPage />} />
              <Route path="tools/vibe-code" element={<VibeCodePage />} />
              {/* <Route path="/tools/ai-playground" element={<AiPlaygroundPage />} /> */}
              <Route path="admin" element={<AdminPage />} />
              <Route path="terms" element={<TermsPage />} />
              <Route path="privacy" element={<PrivacyPage />} />
              <Route path="youth-policy" element={<YouthPolicyPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
