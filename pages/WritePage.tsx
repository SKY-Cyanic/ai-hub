
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { storage, NODE_GAS_FEE } from '../services/storage';
import { Post } from '../types';
import { Image as ImageIcon, Bold, Italic, AlertCircle, BarChart2, Youtube, X, Zap } from 'lucide-react';

const WritePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Mode Logic
  const editPost = location.state?.editPost as Post | undefined;
  const isEditMode = !!editPost;
  const prefill = location.state?.prefill;

  const [title, setTitle] = useState(editPost?.title || prefill?.title || '');
  const [content, setContent] = useState(editPost?.content?.replace(/<br\/>/g, '\n') || prefill?.content || '');
  const [boardId, setBoardId] = useState(editPost?.board_id || 'free');
  const [category, setCategory] = useState(editPost?.category || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>(editPost?.images || prefill?.images || []);
  const [isSpoiler, setIsSpoiler] = useState(editPost?.is_spoiler || false); // New state

  const [showPoll, setShowPoll] = useState(!!editPost?.poll);
  const [pollQuestion, setPollQuestion] = useState(editPost?.poll?.question || '');
  const [pollOptions, setPollOptions] = useState(editPost?.poll?.options.map(o => o.text) || ['', '']);
  const [tags, setTags] = useState<string[]>(editPost?.tags || []);
  const [tagsInput, setTagsInput] = useState('');

  const DRAFT_KEY = 'ai-hub-draft';

  const boards = storage.getBoards();
  const currentBoard = boards.find(b => b.slug === boardId);

  // 버그 신고 모드 감지
  const searchParams = new URLSearchParams(location.search);
  const isBugReportMode = searchParams.get('type') === 'bug_report';

  useEffect(() => {
    if (!user) {
      alert('로그인이 필요한 서비스입니다.');
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    // Only set default category if not in edit mode or if category is empty
    if (!isEditMode && currentBoard?.categories && currentBoard.categories.length > 0 && !category) {
      setCategory(currentBoard.categories[0]);
    } else if (!currentBoard?.categories?.includes(category)) {
      setCategory('');
    }
  }, [boardId, currentBoard, isEditMode]);

  // 버그 신고 모드 초기화
  useEffect(() => {
    if (isBugReportMode && !isEditMode) {
      setTitle('[버그/오류 신고]');
      setBoardId('free');  // 자유 게시판에 작성
      setTags(['버그신고', '오류']);
      setShowPoll(false);  // 투표 비활성화
    }
  }, [isBugReportMode, isEditMode]);

  // Auto-save Draft
  useEffect(() => {
    if (isEditMode) return; // Don't save drafts when editing
    const draft = { title, content, boardId, tags, savedAt: new Date().toISOString() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [title, content, boardId, tags, isEditMode]);

  // Restore Draft on Mount
  useEffect(() => {
    if (isEditMode) return;
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft.title || draft.content) {
          const restore = window.confirm(`임시저장된 글이 있습니다. 불러올까요?\n(${new Date(draft.savedAt).toLocaleString()})`);
          if (restore) {
            setTitle(draft.title || '');
            setContent(draft.content || '');
            setBoardId(draft.boardId || 'free');
            setTags(draft.tags || []);
          } else {
            localStorage.removeItem(DRAFT_KEY);
          }
        }
      } catch (e) {
        localStorage.removeItem(DRAFT_KEY);
      }
    }
  }, [isEditMode]);

  const handleAddTag = () => {
    const newTag = tagsInput.trim().replace(/^#/, '');
    if (newTag && !tags.includes(newTag) && tags.length < 5) {
      setTags([...tags, newTag]);
      setTagsInput('');
    }
  };

  // 이미지 압축 함수
  const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // 최대 너비 제한
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;

    try {
      // 이미지 압축 (최대 800px, 70% 품질)
      const compressedBase64 = await compressImage(file, 800, 0.7);

      // 압축 후에도 너무 크면 더 압축
      if (compressedBase64.length > 200000) { // 200KB 이상이면 더 압축
        const smallerBase64 = await compressImage(file, 600, 0.5);
        setImages(prev => [...prev, smallerBase64]);
      } else {
        setImages(prev => [...prev, compressedBase64]);
      }
    } catch (error) {
      console.error('Image compression error:', error);
      alert('이미지 처리 중 오류가 발생했습니다.');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          processFile(file);
          e.preventDefault(); // Prevent pasting image as data URI text
        }
      }
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
    // Check gas fee only for new posts (버그 신고는 무료)
    if (!isEditMode && !isBugReportMode && user.points < NODE_GAS_FEE) {
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
      // Preserve existing votes if editing (simplification: reset votes on edit for now to avoid complexity or keep structure)
      if (isEditMode && editPost?.poll) {
        // If question/options changed significantly, might need reset. 
        // For now, let's strictly overwrite.
      }
    }

    setIsSubmitting(true);
    try {
      const postData: Partial<Post> = {
        title,
        content: content.replace(/\n/g, '<br/>'),
        board_id: boardId,
        author_id: user.id,
        category: category || undefined,
        images,
        poll: pollData,
        is_spoiler: isSpoiler,
        tags: tags.length > 0 ? tags : undefined, // Save tags
        author: {
          id: user.id,
          username: user.username,
          created_at: user.created_at || new Date().toISOString(),
          level: user.level,
          active_items: user.active_items,
          is_admin: user.is_admin
        }
      };

      let success = false;
      if (isEditMode && editPost) {
        await storage.updatePost({ ...editPost, ...postData, content: postData.content! }); // Force content string
        success = true;
      } else {
        success = await storage.savePost({
          ...postData,
          view_count: 0, upvotes: 0, downvotes: 0, liked_users: [], comment_count: 0
        } as any);
      }

      if (success) {
        // 활동 기록 (Phase 8.2)
        if (!isEditMode) {
          storage.logActivity({
            type: 'post',
            user_id: user.id,
            user_name: user.nickname,
            content: `새 게시글 [${title}]을(를) 작성했습니다.`,
            link: `/board/${boardId}`
          });
        }

        localStorage.removeItem(DRAFT_KEY); // Clear draft
        if (!isEditMode) refreshUser();
        navigate(`/board/${boardId}`);
      } else {
        alert('글 저장에 실패했습니다.');
      }
    } catch (error: any) {
      alert(error.message || '오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm shadow-sm p-6 transition-colors">
      <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-3">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">{isEditMode ? '글 수정' : '글쓰기'}</h2>
        {!isEditMode && !isBugReportMode && (
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-full">
            <Zap size={12} /> NODE GAS FEE: {NODE_GAS_FEE}P
          </div>
        )}
        {isBugReportMode && (
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-green-600 bg-green-50 dark:bg-green-900/30 px-3 py-1.5 rounded-full">
            💎 CR 소모 없음
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ... (Board/Category Selectors - same as before) ... */}
        <div className="flex gap-2">
          <div className="w-1/2 md:w-1/3">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">게시판</label>
            <select
              value={boardId}
              onChange={(e) => setBoardId(e.target.value)}
              disabled={isEditMode} // Disable board change on edit
              className={`w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white rounded p-2 text-sm focus:outline-none focus:border-indigo-500 ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
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
            disabled={isBugReportMode}
            className={`w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white rounded p-3 focus:outline-none focus:border-indigo-500 font-medium ${isBugReportMode ? 'bg-gray-100 dark:bg-gray-600' : ''}`}
          />
        </div>

        {/* Tags Input */}
        <div className="flex flex-wrap items-center gap-2 bg-gray-50 dark:bg-gray-700/50 p-2 rounded border border-gray-200 dark:border-gray-600">
          <span className="text-xs font-bold text-gray-400">#태그</span>
          {tags.map((tag, idx) => (
            <span key={idx} className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 text-xs font-bold rounded-full flex items-center gap-1">
              #{tag}
              <button type="button" onClick={() => setTags(tags.filter((_, i) => i !== idx))} className="hover:text-red-500 ml-0.5">×</button>
            </span>
          ))}
          {tags.length < 5 && (
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAddTag(); } }}
              placeholder="태그 입력 (Enter)"
              className="flex-1 min-w-[100px] bg-transparent text-sm focus:outline-none dark:text-white placeholder-gray-400"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border border-b-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2 rounded-t">
          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300 flex items-center gap-1 text-sm font-bold transition-colors">
            <ImageIcon size={18} /> <span className="hidden md:inline">사진</span>
          </button>
          <button type="button" onClick={() => setShowPoll(!showPoll)} disabled={isBugReportMode} className={`p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded flex items-center gap-1 text-sm font-bold transition-colors ${showPoll ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'text-gray-600 dark:text-gray-300'} ${isBugReportMode ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <BarChart2 size={18} /> <span className="hidden md:inline">투표</span>
          </button>

          {/* Spoiler Toggle */}
          <button
            type="button"
            onClick={() => setIsSpoiler(!isSpoiler)}
            className={`p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded flex items-center gap-1 text-sm font-bold transition-colors ${isSpoiler ? 'text-red-500 bg-red-50 dark:bg-red-900/30' : 'text-gray-600 dark:text-gray-300'}`}
            title="미리보기 방지 (스포일러)"
          >
            <AlertCircle size={18} /> <span className="hidden md:inline">스포일러 방지</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleImageUpload}
          />
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-500 mx-2"></div>
          <button type="button" className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300 font-bold"><Bold size={18} /></button>
          <button type="button" className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300 font-bold"><Italic size={18} /></button>
        </div>

        {/* ... (Poll UI - same as before) ... */}
        {showPoll && (
          <div className="bg-indigo-50 dark:bg-gray-700 p-4 border-l-4 border-indigo-500 dark:border-indigo-400 mb-2">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-sm text-indigo-800 dark:text-indigo-300">투표 생성</h4>
              <button type="button" onClick={() => setShowPoll(false)}><X size={16} className="text-gray-500" /></button>
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

        {/* Image Preview Gallery */}
        {images.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-900/50 p-3 border border-gray-200 dark:border-gray-700 rounded-lg mb-2">
            <p className="text-xs text-gray-500 mb-2 font-bold">첨부된 이미지 ({images.length})</p>
            <div className="flex flex-wrap gap-2">
              {images.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img src={img} alt={`preview ${idx}`} className="w-20 h-20 object-cover rounded border border-gray-300 dark:border-gray-600" />
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((_, i) => i !== idx))}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onPaste={handlePaste}
          placeholder="내용을 입력하세요. (Ctrl+V로 이미지를 바로 붙여넣을 수 있습니다)"
          className={`w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white p-4 h-80 focus:outline-none focus:border-indigo-500 rounded resize-none font-mono text-sm leading-relaxed ${isSpoiler ? 'border-red-300 dark:border-red-800' : ''}`}
        />

        {isSpoiler && <p className="text-xs text-red-500 font-bold mt-1">* 스포일러 방지가 설정되었습니다. 목록에서 내용이 가려집니다.</p>}

        {!isEditMode && !isBugReportMode && (
          <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs p-3 rounded flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold">이용 안내</p>
              <p className="mt-1">글 작성 시 2CR이 소모됩니다. 스팸 방지를 위한 정책입니다.</p>
            </div>
          </div>
        )}

        {isBugReportMode && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-xs p-3 rounded flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold">🐛 버그/오류 신고</p>
              <p className="mt-1">발생한 문제를 상세히 설명해주세요. 스크린샷을 첨부하면 더욱 도움이 됩니다!</p>
              <p className="mt-1 text-green-600 dark:text-green-400 font-bold">💎 크레딧(CR)이 소모되지 않습니다.</p>
            </div>
          </div>
        )}

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
            {isSubmitting ? '저장 중...' : (isEditMode ? '수정 완료' : '등록 완료')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default WritePage;
