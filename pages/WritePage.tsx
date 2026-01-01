
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { storage, NODE_GAS_FEE } from '../services/storage';
import { Image as ImageIcon, Bold, Italic, AlertCircle, BarChart2, Youtube, X, Zap } from 'lucide-react';

const WritePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [boardId, setBoardId] = useState('free');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  const boards = storage.getBoards();
  const currentBoard = boards.find(b => b.slug === boardId);

  useEffect(() => {
    if (!user) {
      alert('로그인이 필요한 서비스입니다.');
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (currentBoard?.categories && currentBoard.categories.length > 0) {
      setCategory(currentBoard.categories[0]);
    } else {
      setCategory('');
    }
  }, [boardId, currentBoard]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImages(prev => [...prev, base64String]);
        const imgTag = `<img src="${base64String}" alt="uploaded image" class="max-w-full h-auto my-4 rounded shadow-sm" />`;
        setContent(prev => prev + '\n' + imgTag + '\n');
      };
      reader.readAsDataURL(file);
    }
  };

  const addPollOption = () => {
    if (pollOptions.length < 5) setPollOptions([...pollOptions, '']);
  };

  const handlePollOptionChange = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    if (!user) return;
    if (user.points < NODE_GAS_FEE) {
        alert('포인트(가스비)가 부족합니다. 최소 10P가 필요합니다.');
        return;
    }

    let pollData = undefined;
    if (showPoll) {
      const validOptions = pollOptions.filter(o => o.trim() !== '');
      if (!pollQuestion.trim() || validOptions.length < 2) {
         alert('투표 질문과 최소 2개의 옵션을 입력해주세요.');
         return;
      }
      pollData = {
        question: pollQuestion,
        options: validOptions.map((text, idx) => ({ id: `opt-${idx}`, text, votes: 0 })),
        voted_users: []
      };
    }

    setIsSubmitting(true);
    try {
      const success = await storage.savePost({
        title,
        content: content.replace(/\n/g, '<br/>'),
        board_id: boardId,
        author_id: user.id,
        category: category || undefined,
        images,
        poll: pollData,
        view_count: 0,
        upvotes: 0,
        downvotes: 0,
        liked_users: [],
        author: {
          id: user.id,
          username: user.username,
          created_at: new Date().toISOString(),
          level: user.level,
          active_items: user.active_items,
          is_admin: user.is_admin
        },
        comment_count: 0
      });
      
      if (success) {
          refreshUser();
          navigate(`/board/${boardId}`);
      } else {
          alert('글 작성에 실패했습니다.');
      }
    } catch (error: any) {
      alert(error.message || '글 작성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm shadow-sm p-6 transition-colors">
      <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-3">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">글쓰기</h2>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-full">
             <Zap size={12}/> NODE GAS FEE: {NODE_GAS_FEE}P
          </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
           <div className="w-1/2 md:w-1/3">
             <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">게시판</label>
             <select 
               value={boardId} 
               onChange={(e) => setBoardId(e.target.value)}
               className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white rounded p-2 text-sm focus:outline-none focus:border-indigo-500"
             >
               {boards.map(b => (
                 <option key={b.id} value={b.slug}>{b.name}</option>
               ))}
             </select>
           </div>
           
           {currentBoard?.categories && currentBoard.categories.length > 0 && (
             <div className="w-1/2 md:w-1/3">
               <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">말머리</label>
               <select 
                 value={category} 
                 onChange={(e) => setCategory(e.target.value)}
                 className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white rounded p-2 text-sm focus:outline-none focus:border-indigo-500"
               >
                 {currentBoard.categories.map(c => (
                   <option key={c} value={c}>{c}</option>
                 ))}
               </select>
             </div>
           )}
        </div>

        <div>
           <input 
             type="text" 
             value={title}
             onChange={(e) => setTitle(e.target.value)}
             placeholder="제목을 입력해 주세요."
             className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white rounded p-3 focus:outline-none focus:border-indigo-500 font-medium"
           />
        </div>

        <div className="flex flex-wrap items-center gap-2 border border-b-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2 rounded-t">
           <button type="button" onClick={() => fileInputRef.current?.click()} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300 flex items-center gap-1 text-sm font-bold transition-colors">
             <ImageIcon size={18} /> <span className="hidden md:inline">사진</span>
           </button>
           <button type="button" onClick={() => setShowPoll(!showPoll)} className={`p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded flex items-center gap-1 text-sm font-bold transition-colors ${showPoll ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'text-gray-600 dark:text-gray-300'}`}>
             <BarChart2 size={18} /> <span className="hidden md:inline">투표</span>
           </button>
           <input 
             type="file" 
             ref={fileInputRef} 
             className="hidden" 
             accept="image/*"
             onChange={handleImageUpload}
           />
           <div className="w-px h-4 bg-gray-300 dark:bg-gray-500 mx-2"></div>
           <button type="button" className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300 font-bold"><Bold size={18}/></button>
           <button type="button" className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300 font-bold"><Italic size={18}/></button>
           <div className="text-xs text-gray-400 ml-auto flex items-center gap-1">
             <Youtube size={14}/> 유튜브 링크 붙여넣기 시 자동 재생
           </div>
        </div>

        {showPoll && (
          <div className="bg-indigo-50 dark:bg-gray-700 p-4 border-l-4 border-indigo-500 dark:border-indigo-400 mb-2">
            <div className="flex justify-between items-center mb-2">
               <h4 className="font-bold text-sm text-indigo-800 dark:text-indigo-300">투표 생성</h4>
               <button type="button" onClick={() => setShowPoll(false)}><X size={16} className="text-gray-500"/></button>
            </div>
            <input 
              type="text" 
              placeholder="투표 주제를 입력하세요" 
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              className="w-full mb-2 p-2 text-sm border border-indigo-200 dark:border-gray-500 rounded dark:bg-gray-600 dark:text-white"
            />
            {pollOptions.map((opt, idx) => (
              <input 
                key={idx}
                type="text"
                placeholder={`옵션 ${idx + 1}`}
                value={opt}
                onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                className="w-full mb-1 p-2 text-sm border border-gray-300 dark:border-gray-500 rounded dark:bg-gray-600 dark:text-white"
              />
            ))}
            {pollOptions.length < 5 && (
              <button type="button" onClick={addPollOption} className="text-xs text-indigo-600 dark:text-indigo-300 underline mt-1">
                + 옵션 추가
              </button>
            )}
          </div>
        )}

        <textarea 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용을 입력하세요."
          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white p-4 h-96 focus:outline-none focus:border-indigo-500 rounded-b resize-none font-mono text-sm leading-relaxed"
        />

        <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs p-3 rounded flex items-start gap-2">
           <AlertCircle size={16} className="mt-0.5 flex-shrink-0"/>
           <div>
             <p className="font-bold">이용 안내</p>
             <p className="mt-1">글 작성 시 10P가 소모됩니다. 스팸 방지를 위한 정책입니다.</p>
           </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
           <button 
             type="button" 
             onClick={() => navigate(-1)} 
             className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
           >
             취소
           </button>
           <button 
             type="submit" 
             disabled={isSubmitting}
             className="px-8 py-2.5 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
           >
             {isSubmitting ? '등록 중...' : '등록완료'}
           </button>
        </div>
      </form>
    </div>
  );
};

export default WritePage;
