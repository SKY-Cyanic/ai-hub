
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { storage, ACHIEVEMENTS, SHOP_ITEMS } from '../services/storage';
import { Calendar, Award, Edit3, Bookmark, CheckCircle, Circle, Flame, Sparkles, ShoppingBag, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ShopItem } from '../types';

const MyPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // 아이템 사용 모달 상태
  const [itemModal, setItemModal] = useState<{
    isOpen: boolean;
    item: ShopItem | null;
    inputValue: string;
    selectOptions?: { id: string; label: string }[];
  }>({ isOpen: false, item: null, inputValue: '', selectOptions: undefined });

  if (!user) return <div className="p-8 text-center">로그인이 필요합니다.</div>;

  const posts = storage.getPosts().filter(p => p.author_id === user.id);
  const scrapped = user.scrapped_posts ? storage.getPosts().filter(p => user.scrapped_posts.includes(p.id)) : [];

  const currentExp = user.exp % 100;
  const progress = Math.min(100, (currentExp / 100) * 100);

  // 아이템 사용 버튼 클릭 핸들러
  const handleItemClick = (item: ShopItem) => {
    // 입력이 필요 없는 아이템들은 바로 처리
    if (!item.effect_type || ['shield', 'coupon', 'exp_boost', 'ad_remove', 'lottery'].includes(item.effect_type)) {
      executeItem(item, {});
      return;
    }

    // 확인이 필요한 아이템
    if (item.effect_type === 'wiki_reset') {
      setItemModal({ isOpen: true, item, inputValue: '', selectOptions: undefined });
      return;
    }

    // 입력이 필요한 아이템들
    if (item.effect_type === 'nick_change') {
      setItemModal({ isOpen: true, item, inputValue: '', selectOptions: undefined });
    } else if (item.effect_type === 'megaphone') {
      setItemModal({ isOpen: true, item, inputValue: '', selectOptions: undefined });
    } else if (item.effect_type === 'post_highlight') {
      const myPosts = posts.slice(0, 10);
      if (myPosts.length === 0) {
        alert('강조할 게시글이 없습니다.');
        return;
      }
      setItemModal({
        isOpen: true,
        item,
        inputValue: myPosts[0]?.id || '',
        selectOptions: myPosts.map(p => ({ id: p.id, label: p.title }))
      });
    } else if (item.effect_type === 'mystery_box') {
      executeItem(item, {});
    } else {
      // 장착형 아이템
      executeItem(item, {});
    }
  };

  // 아이템 실행
  const executeItem = async (item: ShopItem, payload: any) => {
    const res = await storage.useItem(user.id, item.id, payload);
    if (res.success) {
      if (item.effect_type === 'mystery_box') {
        alert(`🎁 미스테리 박스 개봉 결과: ${res.message}`);
      } else {
        alert(res.message);
      }
      refreshUser();
    } else {
      alert(res.message);
    }
  };

  // 모달 확인 버튼
  const handleModalConfirm = async () => {
    if (!itemModal.item) return;

    let payload: any = {};

    if (itemModal.item.effect_type === 'nick_change') {
      if (!itemModal.inputValue.trim()) {
        alert('닉네임을 입력해주세요.');
        return;
      }
      payload = { newNickname: itemModal.inputValue.trim() };
    } else if (itemModal.item.effect_type === 'megaphone') {
      if (!itemModal.inputValue.trim()) {
        alert('메시지를 입력해주세요.');
        return;
      }
      payload = { message: itemModal.inputValue.slice(0, 50) };
    } else if (itemModal.item.effect_type === 'post_highlight') {
      if (!itemModal.inputValue) {
        alert('게시글을 선택해주세요.');
        return;
      }
      payload = { postId: itemModal.inputValue };
    }

    setItemModal({ isOpen: false, item: null, inputValue: '', selectOptions: undefined });
    await executeItem(itemModal.item, payload);
  };
  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-xl p-6 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="w-28 h-28 bg-indigo-100 dark:bg-indigo-900 rounded-3xl flex items-center justify-center text-3xl font-bold text-indigo-600 overflow-hidden border-4 border-white shadow-2xl">
          {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : user.username[0].toUpperCase()}
        </div>
        <div className="flex-1 text-center md:text-left z-10">
          <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-1 flex items-center justify-center md:justify-start gap-2">
            {user.username}
            {user.is_admin && <Award size={20} className="text-yellow-500" />}
          </h2>
          <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-2 rounded-2xl text-center border border-gray-100 dark:border-gray-600">
              <div className="text-[10px] text-gray-400 uppercase font-black">Level</div>
              <div className="font-black text-indigo-600 dark:text-indigo-400 text-lg">{user.level}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-2 rounded-2xl text-center border border-gray-100 dark:border-gray-600">
              <div className="text-[10px] text-gray-400 uppercase font-black">Points</div>
              <div className="font-black text-gray-800 dark:text-white text-lg">{user.points.toLocaleString()}</div>
            </div>
            <div className="bg-orange-500/10 px-4 py-2 rounded-2xl text-center border border-orange-500/20">
              <div className="text-[10px] text-orange-500 uppercase font-black flex items-center gap-1 justify-center"><Flame size={10} /> Streak</div>
              <div className="font-black text-orange-600 text-lg">{user.attendance_streak}</div>
            </div>
          </div>
        </div>
        <div className="w-full md:w-64 space-y-2">
          <div className="text-[10px] flex justify-between text-gray-400 uppercase font-black">
            <span>Next Level Progress</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </div>

      {/* Wallet & Invite Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-6 shadow-lg text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20"><Award size={100} /></div>
          <h3 className="text-xs font-black uppercase tracking-widest opacity-80 mb-1">My Wallet</h3>
          <div className="text-4xl font-black mb-4">{user.points.toLocaleString()} <span className="text-sm font-normal opacity-80">CR</span></div>
          <div className="flex gap-2">
            <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-xs font-bold backdrop-blur-sm transition-all md:flex-1" onClick={() => (document.getElementById('charge-btn') as HTMLElement)?.click()}>충전하기</button>
            <button onClick={() => setIsHistoryOpen(true)} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-xs font-bold backdrop-blur-sm transition-all md:flex-1">내역보기</button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-lg relative overflow-hidden">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Referral System</h3>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-bold text-gray-600 dark:text-gray-300">내 초대 코드</div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-wider">{user.referral_code || 'Error'}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-gray-600 dark:text-gray-300">초대 인원</div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{user.invite_count || 0}<span className="text-sm text-gray-400 ml-1">명</span></div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 flex items-center justify-between">
            <div className="text-xs text-gray-500">친구 초대하고 <span className="font-bold text-indigo-500">+300 CR</span> 받기</div>
            <button
              onClick={() => { navigator.clipboard.writeText(user.referral_code); alert('코드가 복사되었습니다.'); }}
              className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-200 transition-colors"
            >
              코드 복사
            </button>
          </div>
        </div>
      </div>

      {/* Achievements Section */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-lg">
        <h3 className="font-black text-sm text-gray-800 dark:text-white mb-6 flex items-center gap-2 uppercase tracking-wider">
          <Sparkles size={18} className="text-yellow-500" /> Neural Achievements
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ACHIEVEMENTS.map(ach => {
            const isUnlocked = user.achievements.includes(ach.id);
            return (
              <div key={ach.id} className={`p-4 rounded-2xl border transition-all flex items-center gap-4 ${isUnlocked ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-700 opacity-40'}`}>
                <div className="text-3xl">{ach.icon}</div>
                <div>
                  <div className="text-sm font-black text-gray-800 dark:text-white">{ach.name}</div>
                  <div className="text-[10px] text-gray-500 leading-tight">{ach.description}</div>
                  {isUnlocked && <div className="text-[9px] text-indigo-500 font-bold mt-1">UNLOCKED +{ach.reward_points}P</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Inventory Section */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-lg">
        <h3 className="font-black text-sm text-gray-800 dark:text-white mb-6 flex items-center gap-2 uppercase tracking-wider">
          <ShoppingBag size={18} className="text-indigo-500" /> Neural Inventory
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {user.inventory && user.inventory.length > 0 ? (
            // 중복 제거된 고유 아이템 목록
            [...new Set(user.inventory)].map((itemId, idx) => {
              const item = SHOP_ITEMS.find(i => i.id === itemId);
              if (!item) return null;

              // 현재 장착 여부 확인
              const isEquipped =
                (item.type === 'frame' && user.active_items?.frame === item.value) ||
                (item.type === 'color' && user.active_items?.name_color === item.value) ||
                (item.type === 'badge' && user.active_items?.badge === item.value) ||
                (item.type === 'theme' && user.active_items?.theme === item.value) ||
                (item.type === 'custom_title' && user.active_items?.custom_title === item.value) ||
                ((item.type === 'style' || item.type === 'special_effects') && user.active_items?.special_effects?.includes(item.value || ''));

              // 소모품의 경우 남은 개수 표시
              const consumableCount = item.is_consumable
                ? user.inventory.filter(id => id === itemId).length
                : null;

              return (
                <div key={`${itemId}-${idx}`} className={`p-4 rounded-2xl border flex items-center justify-between group transition-all ${isEquipped ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700' : 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-700'}`}>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{item.icon}</div>
                    <div>
                      <div className="text-xs font-black text-gray-800 dark:text-gray-100 flex items-center gap-1">
                        {item.name}
                        {consumableCount && consumableCount > 1 && <span className="text-indigo-500">x{consumableCount}</span>}
                        {isEquipped && <span className="text-[9px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full ml-1">장착중</span>}
                      </div>
                      <div className="text-[10px] text-gray-500">{item.is_consumable ? '소모성' : '영구/장착형'}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleItemClick(item)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-[10px] font-black transition-all shadow-md group-hover:scale-105 active:scale-95"
                  >
                    {item.is_consumable ? '사용하기' : '장착하기'}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-10 text-center">
              <div className="text-4xl mb-2 opacity-20">🛒</div>
              <div className="text-gray-400 text-xs font-mono">INVENTORY IS EMPTY</div>
              <Link to="/shop" className="text-indigo-500 text-[10px] font-bold mt-2 inline-block hover:underline">상점 구경 가기 →</Link>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scrapped Posts */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-lg p-5">
          <h3 className="font-black text-sm text-gray-800 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
            <Bookmark size={18} className="text-indigo-500" /> Scrapped Data
          </h3>
          <ul className="space-y-2">
            {scrapped.map(p => (
              <li key={p.id} className="text-sm hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded transition-colors flex justify-between items-center">
                <Link to={`/board/${p.board_id}/${p.id}`} className="truncate flex-1 font-medium">{p.title}</Link>
                <span className="text-[10px] text-gray-400 font-mono ml-2">{new Date(p.created_at).toLocaleDateString()}</span>
              </li>
            ))}
            {scrapped.length === 0 && <div className="text-gray-400 text-xs text-center py-8 font-mono">NO RECORDS FOUND</div>}
          </ul>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-lg p-5">
          <h3 className="font-black text-sm text-gray-800 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
            <Edit3 size={18} className="text-indigo-500" /> My Nodes
          </h3>
          <ul className="space-y-2">
            {posts.slice(0, 5).map(p => (
              <li key={p.id} className="text-sm border-b border-gray-50 dark:border-gray-700/50 pb-2 flex justify-between items-center">
                <span className="truncate flex-1 font-medium">{p.title}</span>
                <span className="text-[10px] text-gray-400 ml-2">{p.view_count} VIEW</span>
              </li>
            ))}
            {posts.length === 0 && <div className="text-gray-400 text-xs text-center py-8 font-mono">NO RECORDS FOUND</div>}
          </ul>
        </div>
      </div>

      {/* Transaction History Modal */}
      {
        isHistoryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsHistoryOpen(false)}>
            <div className="bg-white dark:bg-gray-800 w-full max-w-md max-h-[80vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-black text-lg text-gray-800 dark:text-white">Transaction History</h3>
                <button onClick={() => setIsHistoryOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {user.transactions && user.transactions.length > 0 ? (
                  [...user.transactions].reverse().map(tx => (
                    <div key={tx.id} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${tx.type === 'earn' || tx.type === 'charge' || tx.type === 'refund' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {tx.type === 'spend' ? '-' : '+'}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-800 dark:text-white">{tx.description}</div>
                          <div className="text-[10px] text-gray-400">{new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString()}</div>
                        </div>
                      </div>
                      <div className={`font-black text-sm ${tx.type === 'spend' ? 'text-gray-500' : 'text-indigo-600'}`}>
                        {tx.type === 'spend' ? '-' : '+'}{tx.amount.toLocaleString()} P
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-gray-400 text-xs">거래 내역이 없습니다.</div>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* Item Use Modal */}
      {itemModal.isOpen && itemModal.item && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 animate-fade-in" onClick={() => setItemModal({ isOpen: false, item: null, inputValue: '', selectOptions: undefined })}>
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{itemModal.item.icon}</span>
                <h3 className="font-black text-lg text-gray-800 dark:text-white">{itemModal.item.name}</h3>
              </div>
              <button onClick={() => setItemModal({ isOpen: false, item: null, inputValue: '', selectOptions: undefined })} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* 닉네임 변경 */}
              {itemModal.item.effect_type === 'nick_change' && (
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-2">새 닉네임</label>
                  <input
                    type="text"
                    value={itemModal.inputValue}
                    onChange={e => setItemModal(prev => ({ ...prev, inputValue: e.target.value }))}
                    placeholder="닉네임을 입력하세요"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                </div>
              )}

              {/* 확성기 메시지 */}
              {itemModal.item.effect_type === 'megaphone' && (
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-2">공지 메시지 (최대 50자)</label>
                  <input
                    type="text"
                    maxLength={50}
                    value={itemModal.inputValue}
                    onChange={e => setItemModal(prev => ({ ...prev, inputValue: e.target.value }))}
                    placeholder="전체 공지할 메시지를 입력하세요"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                  <div className="text-right text-[10px] text-gray-400 mt-1">{itemModal.inputValue.length}/50</div>
                </div>
              )}

              {/* 게시글 선택 */}
              {itemModal.item.effect_type === 'post_highlight' && itemModal.selectOptions && (
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-2">강조할 게시글 선택</label>
                  <select
                    value={itemModal.inputValue}
                    onChange={e => setItemModal(prev => ({ ...prev, inputValue: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {itemModal.selectOptions.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 위키 초기화 확인 */}
              {itemModal.item.effect_type === 'wiki_reset' && (
                <div className="text-center">
                  <div className="text-4xl mb-4">⚠️</div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    정말로 위키 기여 기록을 초기화하시겠습니까?<br />
                    <span className="text-red-500 font-bold">이 작업은 되돌릴 수 없습니다.</span>
                  </p>
                </div>
              )}
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setItemModal({ isOpen: false, item: null, inputValue: '', selectOptions: undefined })}
                className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                취소
              </button>
              <button
                onClick={handleModalConfirm}
                className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all active:scale-95"
              >
                {itemModal.item.effect_type === 'wiki_reset' ? '초기화' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div >
  );
};

export default MyPage;
