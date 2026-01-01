
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { api } from '../services/api';
import { User, Post, AiLog } from '../types';
import { Trash2, Shield, Users, FileText, XCircle, Bot, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [aiLogs, setAiLogs] = useState<AiLog[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'posts' | 'ai'>('users');

  useEffect(() => {
    if (!user || !user.is_admin) {
        alert('관리자 권한이 필요합니다.');
        navigate('/');
        return;
    }
    loadData();
    
    // Subscribe to updates
    const handleSync = (event: MessageEvent) => {
        if (event.data.type === 'USER_UPDATE' || event.data.type === 'POST_UPDATE') {
            loadData();
        }
    };
    storage.channel.addEventListener('message', handleSync);
    return () => storage.channel.removeEventListener('message', handleSync);
  }, [user, navigate]);

  const loadData = () => {
      setUsers(storage.getUsers());
      setPosts(storage.getPosts());
      setAiLogs(storage.getAiLogs());
  };

  const handleDeleteUser = async (userId: string) => {
      if (confirm(`정말로 유저(ID: ${userId})를 삭제하시겠습니까?`)) {
          await api.deleteUser(userId);
          loadData();
      }
  };

  const handleDeletePost = async (postId: string) => {
      if (confirm('정말로 게시글을 강제 삭제하시겠습니까?')) {
          await api.deletePost(postId);
          loadData();
      }
  };

  if (!user || !user.is_admin) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm shadow-sm p-6 min-h-screen">
       <div className="flex items-center gap-3 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
           <Shield className="text-red-600" size={32} />
           <div>
               <h1 className="text-2xl font-black text-gray-900 dark:text-white">관리자 대시보드</h1>
               <p className="text-sm text-gray-500">사이트 운영 및 관리</p>
           </div>
       </div>

       <div className="flex space-x-2 mb-6">
           <button 
             onClick={() => setActiveTab('users')}
             className={`px-4 py-2 rounded font-bold text-sm flex items-center gap-2 ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
           >
               <Users size={16} /> 회원 관리
           </button>
           <button 
             onClick={() => setActiveTab('posts')}
             className={`px-4 py-2 rounded font-bold text-sm flex items-center gap-2 ${activeTab === 'posts' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
           >
               <FileText size={16} /> 게시물 관리
           </button>
           <button 
             onClick={() => setActiveTab('ai')}
             className={`px-4 py-2 rounded font-bold text-sm flex items-center gap-2 ${activeTab === 'ai' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
           >
               <Bot size={16} /> AI 파딱 로그
           </button>
       </div>

       {activeTab === 'users' && (
           <div className="overflow-x-auto">
               <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                   <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                       <tr>
                           <th className="px-6 py-3">ID</th>
                           <th className="px-6 py-3">Username</th>
                           <th className="px-6 py-3">Level</th>
                           <th className="px-6 py-3">Points</th>
                           <th className="px-6 py-3">Role</th>
                           <th className="px-6 py-3">Actions</th>
                       </tr>
                   </thead>
                   <tbody>
                       {users.map(u => (
                           <tr key={u.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                               <td className="px-6 py-4 font-mono text-xs">{u.id}</td>
                               <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                                   {u.username} {u.is_bot && <span className="ml-1 bg-blue-100 text-blue-600 px-1 rounded text-[10px]">BOT</span>}
                               </td>
                               <td className="px-6 py-4">{u.level}</td>
                               <td className="px-6 py-4">{u.points.toLocaleString()}</td>
                               <td className="px-6 py-4">
                                   {u.is_admin ? <span className="text-red-500 font-bold">Admin</span> : 'User'}
                               </td>
                               <td className="px-6 py-4">
                                   {!u.is_admin && !u.is_bot && (
                                       <button 
                                         onClick={() => handleDeleteUser(u.id)}
                                         className="text-red-600 hover:text-red-900 dark:hover:text-red-400"
                                       >
                                           <Trash2 size={16} />
                                       </button>
                                   )}
                               </td>
                           </tr>
                       ))}
                   </tbody>
               </table>
           </div>
       )}

       {activeTab === 'posts' && (
           <div className="overflow-x-auto">
               <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                   <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                       <tr>
                           <th className="px-4 py-3 w-20">Board</th>
                           <th className="px-4 py-3">Title</th>
                           <th className="px-4 py-3 w-32">Author</th>
                           <th className="px-4 py-3 w-32">Date</th>
                           <th className="px-4 py-3 w-20">Action</th>
                       </tr>
                   </thead>
                   <tbody>
                       {posts.map(p => (
                           <tr key={p.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                               <td className="px-4 py-3">{p.board_id}</td>
                               <td className="px-4 py-3 font-medium text-gray-900 dark:text-white truncate max-w-xs">{p.title}</td>
                               <td className="px-4 py-3">{p.author.username}</td>
                               <td className="px-4 py-3 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                               <td className="px-4 py-3">
                                   <button 
                                     onClick={() => handleDeletePost(p.id)}
                                     className="text-red-600 hover:text-red-900 dark:hover:text-red-400 flex items-center gap-1"
                                   >
                                       <XCircle size={16} /> 강제삭제
                                   </button>
                               </td>
                           </tr>
                       ))}
                   </tbody>
               </table>
           </div>
       )}

       {activeTab === 'ai' && (
           <div className="overflow-x-auto">
               <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800 text-sm">
                    <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                        <Activity size={16}/> AI 파딱 활동 현황
                    </h3>
                    <p>AI 에이전트가 수행한 요약, 팩트체크, 댓글 작성, 위키 초안 생성 등의 활동 로그입니다.</p>
               </div>
               <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                   <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                       <tr>
                           <th className="px-4 py-3 w-32">Time</th>
                           <th className="px-4 py-3 w-24">Action</th>
                           <th className="px-4 py-3 w-32">Target</th>
                           <th className="px-4 py-3">Detail</th>
                       </tr>
                   </thead>
                   <tbody>
                       {aiLogs.map(log => (
                           <tr key={log.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                               <td className="px-4 py-3 text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                               <td className="px-4 py-3 font-bold">
                                   <span className={`px-2 py-1 rounded text-xs ${
                                       log.action === 'moderation' ? 'bg-red-100 text-red-600' :
                                       log.action === 'summary' ? 'bg-green-100 text-green-600' :
                                       'bg-blue-100 text-blue-600'
                                   }`}>
                                       {log.action.toUpperCase()}
                                   </span>
                               </td>
                               <td className="px-4 py-3 font-mono text-xs">{log.target_id}</td>
                               <td className="px-4 py-3">{log.detail}</td>
                           </tr>
                       ))}
                   </tbody>
               </table>
           </div>
       )}
    </div>
  );
};

export default AdminPage;
