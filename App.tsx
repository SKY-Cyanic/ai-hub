import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom'; // HashRouter에서 BrowserRouter로 변경
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import BoardPage from './pages/BoardPage';
import PostPage from './pages/PostPage';
import WritePage from './pages/WritePage';
import MyPage from './pages/MyPage';
import ShopPage from './pages/ShopPage';
import WikiPage from './pages/WikiPage';
import AdminPage from './pages/AdminPage';
import MessagesPage from './pages/MessagesPage';
import EncoderPage from './pages/EncoderPage';
import ImageStudioPage from './pages/ImageStudioPage';
import AIAnalyzerPage from './pages/tools/AIAnalyzerPage';
import MockInvestmentPage from './pages/tools/MockInvestmentPage';
import VibeCodePage from './pages/tools/VibeCodePage';
import WebDevPage from './pages/WebDevPage';
import { TermsPage, PrivacyPage, YouthPolicyPage } from './pages/PolicyPages';
import ActivityPage from './pages/ActivityPage';
import SearchPage from './pages/SearchPage';
import BookmarksPage from './pages/BookmarksPage';
import ToolsPage from './pages/ToolsPage';
import NoteViewerPage from './pages/NoteViewerPage';
import GamePage from './pages/GamePage';
import ProfilePage from './pages/ProfilePage';
import PersonaPage from './pages/PersonaPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="board/:boardId" element={<BoardPage />} />
            <Route path="board/:boardId/:postId" element={<PostPage />} />
            <Route path="write" element={<WritePage />} />
            <Route path="mypage" element={<MyPage />} />
            <Route path="activity" element={<ActivityPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="bookmarks" element={<BookmarksPage />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="wiki" element={<WikiPage />} />
            <Route path="wiki/:slug" element={<WikiPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="game" element={<GamePage />} />
            <Route path="profile/:username" element={<ProfilePage />} />
            <Route path="persona" element={<PersonaPage />} />
            <Route path="webdev" element={<WebDevPage />} />
            <Route path="tools" element={<ToolsPage />} />
            <Route path="tools/note/:noteId" element={<NoteViewerPage />} />
            <Route path="tools/encoder" element={<EncoderPage />} />
            <Route path="tools/image-studio" element={<ImageStudioPage />} />
            <Route path="tools/ai-analysis" element={<AIAnalyzerPage />} />
            <Route path="tools/mock-invest" element={<MockInvestmentPage />} />
            <Route path="tools/vibe-code" element={<VibeCodePage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="youth-policy" element={<YouthPolicyPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
