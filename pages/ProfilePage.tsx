import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { storage, ACHIEVEMENTS } from '../services/storage';
import { User, Post } from '../types';
import { UserNickname, UserAvatar } from '../components/UserEffect';
import { Award, Calendar, Flame, FileText, MessageCircle, Flag, ArrowLeft, Shield } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      if (!username) return;
      setLoading(true);
      
      // Try local first, then fetch
      let user = storage.getUser(username);
      if (!user) {
        user = await storage.fetchUserById(username);
      }
      
      if (user) {
        setProfile(user);
        const posts = storage.getPosts().filter(p => p.author_id === user!.id);
        setUserPosts(posts);
      }
      setLoading(false);
    };
    
    loadProfile();
  }, [username]);

  const handleReport = async () => {
    if (!currentUser || !profile || !reportReason.trim()) return;
    
    const res = await storage.reportUser(currentUser.id, profile.id, reportReason);
    if (res.success) {
      alert('신고가 접수되었습니다.');
      setShowReportModal(false);
      setReportReason('');
    } else {
      alert(res.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-xl font-black text-gray-800 dark:text-white mb-2">사용자를 찾을 수 없습니다</h2>
        <p className="text-gray-500 text-sm mb-6">존재하지 않는 사용자이거나 탈퇴한 사용자입니다.</p>
        <Link to="/" className="text-indigo-500 font-bold hover:underline">홈으로 돌아가기</Link>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profile.id;
  const unlockedAchievements = ACHIEVEMENTS.filter(a => profile.achievements?.includes(a.id));

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Back Button */}
      <button onClick={() => window.history.back()} className="flex items-center gap-2 text-gray-500 hover:text-indigo-500 transition-colors text-sm font-bold">
        <ArrowLeft size={16} /> 뒤로 가기
      </button>

      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
        
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <UserAvatar profile={profile as any} size="xl" linkToProfile={false} />
          
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
              <UserNickname profile={profile as any} className="text-3xl" linkToProfile={false} />
              {profile.is_admin && <Award size={24} className="text-yellow-500" />}
              {profile.shields && profile.shields > 0 && (
                <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full text-xs font-bold">
                  <Shield size={12} /> x{profile.shields}
                </div>
              )}
            </div>
            <p className="text-gray-500 text-sm mb-4">@{profile.username}</p>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 px-5 py-3 rounded-2xl text-center border border-gray-100 dark:border-gray-600">
                <div className="text-[10px] text-gray-400 uppercase font-black">Level</div>
                <div className="font-black text-indigo-600 dark:text-indigo-400 text-2xl">{profile.level}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 px-5 py-3 rounded-2xl text-center border border-gray-100 dark:border-gray-600">
                <div className="text-[10px] text-gray-400 uppercase font-black">Posts</div>
                <div className="font-black text-gray-800 dark:text-white text-2xl">{userPosts.length}</div>
              </div>
              <div className="bg-orange-500/10 px-5 py-3 rounded-2xl text-center border border-orange-500/20">
                <div className="text-[10px] text-orange-500 uppercase font-black flex items-center gap-1 justify-center"><Flame size={10} /> Streak</div>
                <div className="font-black text-orange-600 text-2xl">{profile.attendance_streak || 0}</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {!isOwnProfile && currentUser && (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition-all"
              >
                <Flag size={14} /> 신고하기
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Achievements */}
      {unlockedAchievements.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-lg">
          <h3 className="font-black text-sm text-gray-800 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
            <Award size={16} className="text-yellow-500" /> Achievements
          </h3>
          <div className="flex flex-wrap gap-3">
            {unlockedAchievements.map(ach => (
              <div key={ach.id} className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 px-4 py-2 rounded-2xl flex items-center gap-2">
                <span className="text-xl">{ach.icon}</span>
                <span className="text-xs font-bold text-gray-800 dark:text-white">{ach.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Posts */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-lg">
        <h3 className="font-black text-sm text-gray-800 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
          <FileText size={16} className="text-indigo-500" /> Recent Posts ({userPosts.length})
        </h3>
        {userPosts.length > 0 ? (
          <ul className="space-y-3">
            {userPosts.slice(0, 10).map(post => (
              <li key={post.id}>
                <Link
                  to={`/board/${post.board_id}/${post.id}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-800 dark:text-white truncate">{post.title}</div>
                    <div className="text-[10px] text-gray-400 flex items-center gap-2 mt-1">
                      <Calendar size={10} /> {new Date(post.created_at).toLocaleDateString()}
                      <MessageCircle size={10} className="ml-2" /> {post.comment_count || 0}
                    </div>
                  </div>
                  <div className="text-xs font-bold text-indigo-500">👍 {post.votes || 0}</div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-10 text-gray-400 text-xs">작성한 게시글이 없습니다.</div>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 animate-fade-in" onClick={() => setShowReportModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <Flag className="text-red-500" size={20} /> 사용자 신고
            </h3>
            <p className="text-sm text-gray-500 mb-4">@{profile.username} 님을 신고하는 이유를 입력해주세요.</p>
            <textarea
              value={reportReason}
              onChange={e => setReportReason(e.target.value)}
              placeholder="신고 사유를 입력하세요..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 resize-none h-24"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold"
              >
                취소
              </button>
              <button
                onClick={handleReport}
                disabled={!reportReason.trim()}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                신고하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
