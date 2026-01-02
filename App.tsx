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
import { TermsPage, PrivacyPage, YouthPolicyPage } from './pages/PolicyPages';

function App() {
  return (
    <AuthProvider>
      {/* Cloudflare Pages의 _redirects 설정과 함께 작동하여 깔끔한 URL을 제공합니다. */}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="board/:boardId" element={<BoardPage />} />
            <Route path="board/:boardId/:postId" element={<PostPage />} />
            <Route path="write" element={<WritePage />} />
            <Route path="mypage" element={<MyPage />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="wiki" element={<WikiPage />} />
            <Route path="wiki/:slug" element={<WikiPage />} />
            <Route path="messages" element={<MessagesPage />} />
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
