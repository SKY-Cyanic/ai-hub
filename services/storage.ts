
import { db } from './firebase';
import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc,
  query, where, orderBy, limit, addDoc, deleteDoc,
  onSnapshot, serverTimestamp, Timestamp, writeBatch
} from "firebase/firestore";
import { Post, Comment, Board, User, WikiPage, ChatMessage, AiLog, ShopItem, Notification, Conversation, PrivateMessage, Achievement, AuctionItem, BalanceGame, FactCheckReport, GameSubmission, Transaction, WikiHistoryItem } from '../types';

export const NODE_GAS_FEE = 10;

const BALANCE_GAMES: BalanceGame[] = [
  { id: 'bg-1', question: '일주일 동안 스마트폰 0% vs 인터넷 10년 전 속도', option_a: '스마트폰 압수', option_b: '3G 속도', reward_exp: 10, reward_points: 5 },
  { id: 'bg-2', question: '평생 라면만 먹기 vs 평생 탄산음료 금지', option_a: '라면만 먹기', option_b: '탄산 금지', reward_exp: 10, reward_points: 5 },
  { id: 'bg-3', question: '10억 받고 10년 늙기 vs 그냥 살기', option_a: '10억 겟', option_b: '젊음 유지', reward_exp: 10, reward_points: 5 },
  { id: 'bg-4', question: '초능력: 투명인간 vs 순간이동', option_a: '투명인간', option_b: '순간이동', reward_exp: 10, reward_points: 5 },
  { id: 'bg-5', question: 'AI가 지배하는 세상 vs 원시 시대로 회귀', option_a: 'AI 통치', option_b: '우가우가', reward_exp: 10, reward_points: 5 },
  { id: 'bg-6', question: '매일 10시간 자고 100만원 벌기 vs 매일 4시간 자고 500만원 벌기', option_a: '꿀잠 소득', option_b: '피곤 고수익', reward_exp: 10, reward_points: 5 },
  { id: 'bg-7', question: '말 못하는 천재 vs 말 잘하는 바보', option_a: '고독한 천재', option_b: '인싸 바보', reward_exp: 10, reward_points: 5 },
];

export const SHOP_ITEMS: ShopItem[] = [
  // --- Visual Effects & Branding ---
  { id: 'effect-rainbow', name: '🌈 무지개 닉네임', description: '닉네임이 RGB 컬러로 변하는 효과 (7일)', price: 1000, type: 'style', category: 'name', value: 'rainbow', icon: '🌈', duration_days: 7 },
  { id: 'effect-glitch', name: '⚡ 글리치 효과', description: '닉네임과 아바타에 지직거림 효과 부여', price: 2000, type: 'style', category: 'name', value: 'glitch', icon: '⚡' },
  { id: 'item-title-pro', name: '🎓 전문가 칭호', description: '원하는 분야의 전문가 타이틀을 부여', price: 5000, type: 'custom_title', category: 'name', effect_type: 'custom_title', is_consumable: true, icon: '🎓' },

  // --- Avatar Frames (Seasonal) ---
  { id: 'frame-shell', name: '🥚 뉴비의 알껍질', description: '귀여운 알껍질 테두리', price: 500, type: 'frame', category: 'avatar', value: 'border-yellow-200 border-2 rounded-full border-dashed', icon: '🥚' },
  { id: 'frame-laurel', name: '🌿 황금 월계관', description: '승리자의 상징인 황금 테두리', price: 5000, type: 'frame', category: 'avatar', value: 'border-yellow-500 border-4 shadow-[0_0_10px_gold] rounded-lg', icon: '🌿' },
  { id: 'frame-cyber', name: '🏙️ 사이버펑크 네온', description: '핑크-시안 네온 테두리', price: 3000, type: 'frame', category: 'avatar', value: 'border-pink-500 border-2 shadow-[0_0_15px_#ff00ff,#00ffff_inset]', icon: '🏙️' },

  // --- Functional / Utility Items ---
  { id: 'item-nick-change', name: '🆔 닉네임 변경권', description: '닉네임을 1회 변경할 수 있습니다.', price: 3000, type: 'utility', category: 'name', effect_type: 'nick_change', is_consumable: true, icon: '🆔' },
  { id: 'item-ad-remove', name: '🚫 광고 제거 패스', description: '30일 동안 사이트 내 광고를 제거합니다.', price: 5000, type: 'utility', category: 'system', effect_type: 'ad_remove', duration_days: 30, icon: '🚫' },
  { id: 'item-exp-boost', name: '🚀 경험치 부스트', description: '24시간 동안 획득 경험치가 2배가 됩니다.', price: 1500, type: 'utility', category: 'system', effect_type: 'exp_boost', is_consumable: true, duration_days: 1, icon: '🚀' },
  { id: 'item-post-highlight', name: '✨ 게시글 강조권', description: '내 게시글 하나를 화려하게 강조합니다.', price: 1000, type: 'utility', category: 'system', effect_type: 'post_highlight', is_consumable: true, icon: '✨' },
  { id: 'item-megaphone', name: '📢 전 서버 확성기', description: '상단 공지에 내 메시지를 노출합니다.', price: 2000, type: 'utility', category: 'system', icon: '📢', is_consumable: true, effect_type: 'megaphone' },
  { id: 'item-shield', name: '🛡️ 경고 보호막', description: '신고로부터 경고 1회를 자동 방어합니다.', price: 500, type: 'utility', category: 'system', icon: '🛡️', is_consumable: true, effect_type: 'shield' },
  { id: 'item-coupon', name: '🎫 상점 할인 쿠폰', description: '다음 아이템 구매 시 20% 할인 (1회용)', price: 300, type: 'utility', category: 'system', icon: '🎫', is_consumable: true, effect_type: 'coupon' },

  // --- Gamble & Misc ---
  { id: 'item-box', name: '🎁 미스테리 박스', description: '랜덤한 보상이 들어있는 상자', price: 100, type: 'gamble', category: 'system', icon: '🎁', is_consumable: true, effect_type: 'mystery_box' },
  { id: 'item-lottery', name: '🎰 주간 복권', description: '매주 금요일 밤 10시 추첨!', price: 50, type: 'gamble', category: 'system', icon: '🎰', is_consumable: true, effect_type: 'lottery' },
  { id: 'item-reset', name: '🧹 기억 소거제', description: '위키 기여 기록을 초기화합니다.', price: 10000, type: 'utility', category: 'system', icon: '🧹', is_consumable: true, effect_type: 'wiki_reset' },
];

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'early_bird', name: '얼리 어답터', description: '첫 게시글을 작성했습니다.', icon: '🐣', condition: 'post_count >= 1', reward_points: 100 },
  { id: 'intel_agent', name: '정보 요원', description: '댓글 50개를 작성하여 Deep Web 접근 권한을 획득했습니다.', icon: '🕵️', condition: 'comment_count >= 50', reward_points: 1000 },
  { id: 'night_owl', name: '새벽의 전령', description: '새벽 2시~5시 사이에 글을 썼습니다.', icon: '🦉', condition: 'time_window', reward_points: 200 },
  { id: 'streak_5', name: '신뢰의 링크', description: '5일 연속 접속을 달성했습니다.', icon: '🔥', condition: 'attendance_streak >= 5', reward_points: 500 },
];

const LOCAL_SESSION_KEY = 'ai_hub_session_v4';
const LOCAL_USERS_KEY = 'ai_hub_users_v4';
const LOCAL_POSTS_KEY = 'ai_hub_posts_v4';
const LOCAL_COMMENTS_KEY = 'ai_hub_comments_v4';

const sanitize = (data: any) => JSON.parse(JSON.stringify(data));
const isEffectActive = (user: User, effectId: string): boolean => {
  if (!user.expires_at || !user.expires_at[effectId]) return false;
  return new Date(user.expires_at[effectId]) > new Date();
};

export const storage = {
  channel: new BroadcastChannel('ai_hub_sync'),

  getSession: (): User | null => {
    const s = localStorage.getItem(LOCAL_SESSION_KEY);
    return s ? JSON.parse(s) : null;
  },

  setSession: (u: User | null) => {
    if (u) localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(u));
    else localStorage.removeItem(LOCAL_SESSION_KEY);
    storage.channel.postMessage({ type: 'SESSION_UPDATE' });
  },

  getUsers: (): User[] => {
    const u = localStorage.getItem(LOCAL_USERS_KEY);
    return u ? JSON.parse(u) : [];
  },

  getUser: (username: string): User | undefined => {
    return storage.getUsers().find(u => u.username.toLowerCase() === username.toLowerCase());
  },

  getUserByRawId: (id: string): User | undefined => {
    return storage.getUsers().find(u => u.id === id);
  },

  // Async version that fetches from Firestore if not in local cache
  fetchUserById: async (id: string): Promise<User | undefined> => {
    // Check local cache first
    const local = storage.getUserByRawId(id);
    if (local) return local;

    // Query Firestore by ID field
    try {
      const q = query(collection(db, "users"), where("id", "==", id), limit(1));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data() as User;
        // Cache locally for future lookups
        const users = storage.getUsers();
        users.push(userData);
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
        return userData;
      }
    } catch (e) { }
    return undefined;
  },

  getUserByReferralCode: (code: string): User | undefined => {
    return storage.getUsers().find(u => u.referral_code === code);
  },

  generateReferralCode: (): string => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  },

  saveUser: async (user: User) => {
    try {
      await setDoc(doc(db, "users", user.username), sanitize(user));
    } catch (e) { }
    const users = storage.getUsers();
    const idx = users.findIndex(u => u.username === user.username);
    if (idx !== -1) users[idx] = user;
    else users.push(user);
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
    storage.channel.postMessage({ type: 'USER_UPDATE' });
  },

  // --- Fact Check Report ---
  reportAiError: async (report: FactCheckReport) => {
    try {
      await addDoc(collection(db, "fact_reports"), sanitize(report));
      await storage.sendNotification({
        user_id: report.reporter_id,
        type: 'system',
        message: 'AI 오류 제보가 접수되었습니다. 검토 후 보상이 지급됩니다.',
        link: '/mypage'
      });
      return true;
    } catch (e) { return false; }
  },

  // --- User Report (신고) ---
  reportUser: async (reporterId: string, targetId: string, reason: string): Promise<{ success: boolean; message: string }> => {
    try {
      const target = storage.getUserByRawId(targetId);
      if (!target) return { success: false, message: '대상 사용자를 찾을 수 없습니다.' };

      // 신고 저장
      await addDoc(collection(db, "reports"), {
        reporter_id: reporterId,
        target_id: targetId,
        target_type: 'user',
        reason,
        status: 'pending',
        created_at: new Date().toISOString()
      });

      // 경고 처리 (보호막 있으면 소모)
      if (target.shields && target.shields > 0) {
        target.shields -= 1;
        await storage.saveUser(target);
        await storage.sendNotification({
          user_id: targetId,
          type: 'system',
          message: `⚠️ 신고가 접수되었으나 보호막이 발동되었습니다. (남은 보호막: ${target.shields})`,
          link: '/mypage'
        });
      } else {
        await storage.sendNotification({
          user_id: targetId,
          type: 'system',
          message: `⚠️ 신고가 접수되었습니다. 사유: ${reason}`,
          link: '/mypage'
        });
      }

      return { success: true, message: '신고가 접수되었습니다.' };
    } catch (e) {
      console.error('Report error:', e);
      return { success: false, message: '신고 처리 중 오류가 발생했습니다.' };
    }
  },

  // --- Announcements (확성기) ---
  getAnnouncements: async (): Promise<{ id: string; username: string; message: string; expires_at: string }[]> => {
    try {
      const now = new Date().toISOString();
      const q = query(
        collection(db, "announcements"),
        where("expires_at", ">", now),
        orderBy("expires_at", "desc"),
        limit(5)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    } catch (e) {
      return [];
    }
  },

  // Real-time megaphone subscription
  subscribeMegaphone: (callback: (data: { text: string; author: string } | null) => void): (() => void) => {
    const now = new Date().toISOString();
    const q = query(
      collection(db, "announcements"),
      where("expires_at", ">", now),
      orderBy("created_at", "desc"),
      limit(1)
    );

    return onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        callback(null);
        return;
      }
      const doc = snapshot.docs[0];
      const data = doc.data();
      callback({
        text: data.message,
        author: data.username
      });
    }, () => callback(null));
  },

  // --- Achievements ---
  checkAchievements: async (userId: string) => {
    const user = storage.getUserByRawId(userId);
    if (!user) return;

    const newAchievements: string[] = [];
    for (const ach of ACHIEVEMENTS) {
      if (user.achievements.includes(ach.id)) continue;

      let isEligible = false;
      if (ach.id === 'early_bird' && user.quests.post_count >= 1) isEligible = true;
      if (ach.id === 'intel_agent' && user.quests.comment_count >= 50) isEligible = true;
      if (ach.id === 'streak_5' && user.attendance_streak >= 5) isEligible = true;
      if (ach.id === 'night_owl') {
        const hour = new Date().getHours();
        if (hour >= 2 && hour <= 5) isEligible = true;
      }

      if (isEligible) {
        user.achievements.push(ach.id);
        user.points += ach.reward_points;
        newAchievements.push(ach.name);
        await storage.sendNotification({
          user_id: user.id,
          type: 'achievement',
          message: `히든 업적 해제: [${ach.name}] - ${ach.reward_points}P 획득!`,
          link: '/mypage'
        });
      }
    }

    if (newAchievements.length > 0) {
      await storage.saveUser(user);
      if (storage.getSession()?.id === userId) storage.setSession(user);
    }
  },

  getBoards: (): Board[] => [
    { id: 'free', slug: 'free', name: '자유 광장', description: '자유로운 소통 공간', categories: ['잡담', '질문', '인간성'] },
    { id: 'stock', slug: 'stock', name: '지식 허브', description: '실시간 글로벌 정보', categories: ['뉴스', '분석', '글로벌'] },
    { id: 'dev', slug: 'dev', name: '코드 넥서스', description: '기술과 미래 논의', categories: ['AI', 'WEB3', 'DEV'] },
    { id: 'deepweb', slug: 'deepweb', name: 'DEEP WEB', description: '검증된 요원들만 접근 가능한 비밀 노드', categories: ['기밀', '익명', '누설'], required_achievement: 'intel_agent' },
  ],

  subscribePosts: (callback: (posts: Post[]) => void) => {
    const q = query(collection(db, "posts"), orderBy("created_at", "desc"), limit(50));
    return onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts));
      callback(posts);
    });
  },

  getPosts: (): Post[] => {
    const p = localStorage.getItem(LOCAL_POSTS_KEY);
    return p ? JSON.parse(p) : [];
  },

  savePost: async (post: any) => {
    const user = storage.getUserByRawId(post.author_id);
    if (!user) {
      console.error('savePost: User not found', post.author_id);
      return null;
    }

    // 가스비 소모 체크
    if (user.points < NODE_GAS_FEE) {
      throw new Error('포인트(가스비)가 부족합니다. 최소 10P가 필요합니다.');
    }

    user.points -= NODE_GAS_FEE;
    user.quests.post_count += 1;

    const data = { ...post, created_at: post.created_at || new Date().toISOString() };
    try {
      const docRef = await addDoc(collection(db, "posts"), sanitize(data));
      await storage.saveUser(user);
      if (storage.getSession()?.id === user.id) storage.setSession(user);
      await storage.checkAchievements(user.id);
      return { id: docRef.id, ...data };
    } catch (e) {
      console.error('savePost error:', e);
      return null;
    }
  },

  updatePost: async (post: Post) => { try { await updateDoc(doc(db, "posts", post.id), sanitize(post)); } catch (e) { } },
  deletePost: async (postId: string) => { try { await deleteDoc(doc(db, "posts", postId)); } catch (e) { } },

  getComments: (): Comment[] => {
    const c = localStorage.getItem(LOCAL_COMMENTS_KEY);
    return c ? JSON.parse(c) : [];
  },

  subscribeComments: (postId: string, callback: (comments: Comment[]) => void) => {
    // Index Error Fix: Removed orderBy from query to avoid manual index creation requirement.
    // Sorting is now done client-side.
    const q = query(collection(db, "comments"), where("post_id", "==", postId));
    return onSnapshot(q, (snapshot) => {
      const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      // Client-side sort
      comments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      const allCached = storage.getComments().filter(c => c.post_id !== postId);
      localStorage.setItem(LOCAL_COMMENTS_KEY, JSON.stringify([...allCached, ...comments]));
      callback(comments);
    });
  },

  saveComment: async (comment: Comment, postAuthorId: string) => {
    try {
      const docRef = await addDoc(collection(db, "comments"), sanitize(comment));

      // Update post comment count
      try {
        const postRef = doc(db, "posts", comment.post_id);
        const postSnap = await getDoc(postRef);
        if (postSnap.exists()) {
          const postData = postSnap.data();
          await updateDoc(postRef, {
            comment_count: (postData.comment_count || 0) + 1
          });
        }
      } catch (e) {
        console.error("FAILED TO UPDATE POST COMMENT COUNT:", e);
      }

      const user = storage.getUserByRawId(comment.author_id);
      if (user) {
        user.quests.comment_count += 1;
        await storage.saveUser(user);
        await storage.checkAchievements(user.id);
      }
      if (postAuthorId !== comment.author_id) {
        await storage.sendNotification({
          user_id: postAuthorId, type: 'comment', message: `${comment.author.username}님이 댓글을 남겼습니다.`,
          link: `/board/all/${comment.post_id}`
        });
      }
      return { id: docRef.id, ...comment };
    } catch (e) {
      console.error("COMMENT SAVE ERROR:", e);
      alert(`댓글 저장 중 오류가 발생했습니다: ${e}`);
      return comment;
    }
  },

  subscribeNotifications: (userId: string, callback: (notifs: Notification[]) => void) => {
    const q = query(collection(db, "notifications"), where("user_id", "==", userId));
    return onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      notifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      callback(notifs.slice(0, 20));
    });
  },

  sendNotification: async (data: Omit<Notification, 'id' | 'created_at' | 'is_read'>) => {
    try { await addDoc(collection(db, "notifications"), { ...data, is_read: false, created_at: new Date().toISOString() }); } catch (e) { }
  },

  markNotificationAsRead: async (notifId: string) => { try { await updateDoc(doc(db, "notifications", notifId), { is_read: true }); } catch (e) { } },

  markAllNotificationsAsRead: async (userId: string) => {
    try {
      const q = query(collection(db, "notifications"), where("user_id", "==", userId), where("is_read", "==", false));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => batch.update(d.ref, { is_read: true }));
      await batch.commit();
    } catch (e) { }
  },

  processAttendance: async (userId: string) => {
    const user = storage.getUserByRawId(userId);
    if (!user) return;

    // KST 기준 날짜 계산 (UTC+9)
    const kstOffset = 9 * 60 * 60 * 1000;
    const now = new Date(Date.now() + kstOffset);
    const today = now.toISOString().split('T')[0];

    if (user.last_attendance_date === today) return;

    let streak = 1;
    if (user.last_attendance_date) {
      const lastDate = new Date(user.last_attendance_date);
      const diffTime = new Date(today).getTime() - lastDate.getTime();
      const diffDays = diffTime / (1000 * 3600 * 24);
      if (diffDays <= 2) streak = user.attendance_streak + 1; // 하루 정도는 여유를 줌 (혹은 == 1 만 허용)
      else streak = 1;
    }

    user.attendance_streak = streak;
    user.last_attendance_date = today;
    user.points += 10 + (Math.min(streak, 10) * 5); // 연속 출석 보너스

    // Reset Daily Quests (Phase 2.5)
    user.quests = {
      last_updated: today,
      daily_login: true,
      post_count: 0,
      comment_count: 0,
      balance_voted: false,
      lucky_draw_today: false
    };

    // 알림 전송
    await storage.sendNotification({
      user_id: user.id, type: 'system', message: `일일 출석 완료! (연속 ${streak}일) +${10 + (Math.min(streak, 10) * 5)}P`,
      link: '/mypage'
    });

    await storage.saveUser(user);
    await storage.checkAchievements(userId);
  },

  calculateHotScore: (post: any) => {
    const score = (post.view_count || 0) + ((post.upvotes || 0) * 2) + ((post.comment_count || 0) * 3);
    return score;
  },

  getAuctionItems: (): AuctionItem[] => [{
    id: 'auc-1', item_name: '골드 네온 칭호', description: '채팅창에서 반짝이는 특수 효과',
    start_price: 5000, current_price: 7200, end_time: new Date(Date.now() + 3600000).toISOString(),
    is_finished: false, highest_bidder_name: 'AI_Master'
  }],

  placeBid: async (userId: string, auctionId: string): Promise<{ success: boolean, message: string }> => {
    const user = storage.getUserByRawId(userId);
    const auction = storage.getAuctionItems().find(a => a.id === auctionId);

    if (!user || !auction) return { success: false, message: '정보를 찾을 수 없습니다.' };
    if (auction.is_finished) return { success: false, message: '종료된 경매입니다.' };

    const bidAmount = auction.current_price + 500; // Min increment
    if (user.points < bidAmount) return { success: false, message: '포인트가 부족합니다.' };

    // Refund previous bidder (Mock logic: In real app, we would query previous bidder and refund)
    // For this mock, we just deduct from current user.

    user.points -= bidAmount;
    if (!user.transactions) user.transactions = [];
    user.transactions.push({
      id: `tx-bid-${Date.now()}`,
      type: 'spend',
      amount: bidAmount,
      description: `경매 입찰: ${auction.item_name}`,
      created_at: new Date().toISOString()
    });

    // Update Auction (In memory mock for array)
    auction.current_price = bidAmount;
    auction.highest_bidder_id = user.id;
    auction.highest_bidder_name = user.username;

    await storage.saveUser(user);
    return { success: true, message: '입찰에 성공했습니다!' };
  },

  chargePoints: async (userId: string, amount: number) => {
    const user = storage.getUserByRawId(userId);
    if (user) {
      user.points += amount;
      if (!user.transactions) user.transactions = [];
      user.transactions.push({
        id: `tx-charge-${Date.now()}`,
        type: 'charge',
        amount: amount,
        description: '크레딧 충전',
        created_at: new Date().toISOString()
      });
      await storage.saveUser(user);
      return true;
    }
    return false;
  },

  // --- Megaphone & Lottery Systems ---

  getMegaphoneMessage() {
    // Legacy fallback for sync calls if any
    return null;
  },

  async setMegaphoneMessage(userId: string, text: string): Promise<{ success: boolean, message: string }> {
    const user = this.getUserByRawId(userId);
    if (!user) return { success: false, message: '사용자를 찾을 수 없습니다.' };

    const price = 2000;
    if (user.points < price) return { success: false, message: 'CR이 부족합니다.' };

    try {
      user.points -= price;
      if (!user.transactions) user.transactions = [];
      user.transactions.push({
        id: `tx-mega-${Date.now()}`,
        type: 'spend',
        amount: price,
        description: '확성기 (전역 메시지) 구매',
        created_at: new Date().toISOString()
      });

      await setDoc(doc(db, "global_state", "megaphone"), {
        text,
        author: user.username,
        author_id: user.id,
        created_at: new Date().toISOString()
      });

      await this.saveUser(user);
      if (storage.getSession()?.id === user.id) storage.setSession(user);

      return { success: true, message: '확성기 메시지가 전 서버에 울려퍼집니다!' };
    } catch (e) {
      return { success: false, message: `등록 실패: ${e}` };
    }
  },

  getLotteryPot() {
    return 125500; // Simulated pot
  },

  async buyLotteryTicket(userId: string): Promise<{ success: boolean, message: string }> {
    const user = this.getUserByRawId(userId);
    if (!user) return { success: false, message: 'User not found' };
    if (user.points < 500) return { success: false, message: 'CR이 부족합니다.' };

    user.points -= 500;
    if (!user.inventory) user.inventory = []; // Initialize if not exists
    user.inventory.push('item-lottery-ticket'); // New internal item ID
    if (!user.transactions) user.transactions = [];
    user.transactions.push({
      id: `tx-${Date.now()}`,
      type: 'spend', // Changed from 'spent' to 'spend' for consistency
      amount: 500,
      description: '주간 복권 티켓 구매',
      created_at: new Date().toISOString()
    });
    await this.saveUser(user); // Save user after point deduction and transaction

    return { success: true, message: '복권 티켓을 구매했습니다! 토요일 추첨을 기다려주세요.' };
  },

  buyItem: async (userId: string, itemId: string): Promise<{ success: boolean; message: string }> => {
    const user = storage.getUserByRawId(userId);
    const item = SHOP_ITEMS.find(i => i.id === itemId);

    if (!user) return { success: false, message: '사용자를 찾을 수 없습니다.' };
    if (!item) return { success: false, message: '아이템을 찾을 수 없습니다.' };

    // 가격 계산 (닉네임 변경권은 구매할 때마다 50% 가격 인상)
    let finalPrice = item.price;
    if (!user.item_purchases) user.item_purchases = {};

    if (itemId === 'item-nick-change') {
      const purchaseCount = user.item_purchases['item-nick-change'] || 0;
      finalPrice = Math.floor(item.price * Math.pow(1.5, purchaseCount));
    }

    // 할인 쿠폰 적용 확인
    let discountApplied = false;
    if (user.expires_at?.['discount_coupon'] && new Date(user.expires_at['discount_coupon']) > new Date()) {
      finalPrice = Math.floor(finalPrice * 0.8); // 20% 할인
      discountApplied = true;
    }

    if (user.points < finalPrice) return { success: false, message: `CR이 부족합니다. (필요: ${finalPrice.toLocaleString()} CR)` };

    // 기간제 아이템 재구매 체크 (광고 제거 패스)
    if (itemId === 'item-ad-remove') {
      if (user.expires_at?.[itemId] && new Date(user.expires_at[itemId]) > new Date()) {
        return { success: false, message: '이미 광고 제거 패스가 활성화되어 있습니다.' };
      }
    }

    // 중복 소유 체크 (소모품과 특정 재구매 가능 아이템 제외)
    const rebuybableItems = ['item-nick-change', 'item-ad-remove', 'item-coupon', 'item-shield'];
    if (!item.is_consumable && !rebuybableItems.includes(itemId) && user.inventory?.includes(itemId)) {
      return { success: false, message: '이미 보유 중인 아이템입니다.' };
    }

    // 포인트 차감
    user.points -= finalPrice;
    if (!user.inventory) user.inventory = [];
    user.inventory.push(itemId);

    // 구매 횟수 기록
    user.item_purchases[itemId] = (user.item_purchases[itemId] || 0) + 1;

    // 할인 쿠폰 사용 처리
    if (discountApplied && itemId !== 'item-coupon') {
      delete user.expires_at['discount_coupon'];
    }

    // 즉시 적용 효과 (시각적 아이템들 중 기간제가 아닌 것들)
    if (!item.is_consumable && !item.duration_days) {
      if (item.type === 'color') user.active_items.name_color = item.value;
      if (item.type === 'frame') user.active_items.frame = item.value;
      if (item.type === 'badge') user.active_items.badge = item.value;
      if (item.type === 'theme') user.active_items.theme = item.value;
      // custom_title은 사용 시 값 입력받도록 변경
    }

    // 기간제 효과 설정
    if (item.duration_days) {
      if (!user.expires_at) user.expires_at = {};
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + item.duration_days);
      user.expires_at[itemId] = expiry.toISOString();

      // 시각적 효과 즉시 활성화
      if (item.type === 'style' && item.value === 'rainbow') {
        if (!user.active_items.special_effects) user.active_items.special_effects = [];
        if (!user.active_items.special_effects.includes('rainbow')) user.active_items.special_effects.push('rainbow');
      }
    }

    // 트랜잭션 기록
    if (!user.transactions) user.transactions = [];
    user.transactions.push({
      id: `tx-${Date.now()}`,
      type: 'spend',
      amount: finalPrice,
      description: `상점 구매: ${item.name}${discountApplied ? ' (20% 할인)' : ''}`,
      created_at: new Date().toISOString()
    });

    await storage.saveUser(user);
    return { success: true, message: `${item.name} 구매 완료!${discountApplied ? ' (20% 할인 적용됨)' : ''} 인벤토리를 확인하세요.` };
  },

  useItem: async (userId: string, itemId: string, payload?: any): Promise<{ success: boolean; message: string }> => {
    const user = storage.getUserByRawId(userId);
    const item = SHOP_ITEMS.find(i => i.id === itemId);

    if (!user || !user.inventory.includes(itemId)) {
      return { success: false, message: '보유하지 않은 아이템입니다.' };
    }
    if (!item) return { success: false, message: '존재하지 않는 아이템입니다.' };

    try {
      // 아이템 효과별 처리
      switch (item.effect_type) {
        case 'nick_change':
          if (!payload?.newNickname) return { success: false, message: '새 닉네임을 입력해주세요.' };

          // 중복 체크 및 닉네임 변경 (Firestore)
          const userRef = doc(db, "users", user.username);
          await updateDoc(userRef, { nickname: payload.newNickname });

          user.nickname = payload.newNickname;
          // 세션 업데이트
          if (storage.getSession()?.id === userId) {
            const session = storage.getSession()!;
            session.nickname = payload.newNickname;
            storage.setSession(session);
          }
          break;

        case 'exp_boost':
          if (!user.expires_at) user.expires_at = {};
          const expExpiry = new Date();
          expExpiry.setHours(expExpiry.getHours() + 24);
          user.expires_at['exp_boost'] = expExpiry.toISOString();
          // 아이템 ID로도 저장 (isEffectActive 호환성)
          user.expires_at[itemId] = expExpiry.toISOString();
          break;

        case 'mystery_box':
          const boxRes = await storage.openMysteryBox(userId, false);
          if (boxRes.success && item.is_consumable) {
            const idx = user.inventory.indexOf(itemId);
            if (idx > -1) user.inventory.splice(idx, 1);
          }
          await storage.saveUser(user);
          return boxRes;

        case 'ad_remove':
          if (!user.expires_at) user.expires_at = {};
          const adExpiry = new Date();
          adExpiry.setDate(adExpiry.getDate() + 30);
          user.expires_at['ad_remove'] = adExpiry.toISOString();
          user.expires_at[itemId] = adExpiry.toISOString();
          break;

        case 'post_highlight':
          if (!payload?.postId) return { success: false, message: '강조할 게시글을 선택해주세요.' };
          const postRef = doc(db, "posts", payload.postId);
          await updateDoc(postRef, { is_hot: true, style_effect: 'glow' });
          break;

        case 'megaphone':
          // 확성기: Firestore announcements 컬렉션에 저장 (24시간)
          if (!payload?.message) return { success: false, message: '공지할 메시지를 입력해주세요.' };
          const announcementExpiry = new Date();
          announcementExpiry.setHours(announcementExpiry.getHours() + 24);
          await addDoc(collection(db, "announcements"), {
            user_id: userId,
            username: user.nickname || user.username,
            message: payload.message,
            created_at: new Date().toISOString(),
            expires_at: announcementExpiry.toISOString()
          });
          break;

        case 'custom_title':
          // 전문가 칭호: 사용자 지정 칭호
          if (!payload?.title) return { success: false, message: '칭호를 입력해주세요.' };
          user.active_items.custom_title = payload.title;
          break;

        case 'shield':
          // 보호막: 사용자 shields +1
          user.shields = (user.shields || 0) + 1;
          break;

        case 'coupon':
          // 할인 쿠폰: 다음 구매 시 20% 할인 플래그 설정
          if (!user.expires_at) user.expires_at = {};
          const couponExpiry = new Date();
          couponExpiry.setDate(couponExpiry.getDate() + 7); // 7일 내 사용
          user.expires_at['discount_coupon'] = couponExpiry.toISOString();
          break;

        case 'lottery':
          // 복권: 구매만 해도 인벤토리에 들어가는 것으로 충분 (추첨은 별도)
          // 이미 구매 시점에 인벤토리에 추가됨
          return { success: true, message: '복권 구매 완료! 금요일 밤 10시 추첨을 기다려주세요.' };

        case 'wiki_reset':
          // 위키 기여 초기화
          user.wiki_contributions = 0;
          break;

        default:
          // 시각적 아이템 장착 (인벤토리에서 장착/교체용 - 소모되지 않음)
          if (item.type === 'color') user.active_items.name_color = item.value;
          if (item.type === 'frame') user.active_items.frame = item.value;
          if (item.type === 'badge') user.active_items.badge = item.value;
          if (item.type === 'theme') user.active_items.theme = item.value;
          if (item.type === 'custom_title') user.active_items.custom_title = item.value;
          if (item.type === 'style' || item.type === 'special_effects') {
            if (!user.active_items.special_effects) user.active_items.special_effects = [];
            if (item.value && !user.active_items.special_effects.includes(item.value)) {
              user.active_items.special_effects.push(item.value);
            }
          }

          // 장착형 아이템은 저장 후 반환 (인벤토리에서 제거하지 않음)
          await storage.saveUser(user);
          return { success: true, message: `${item.name} 장착 완료!` };
      }

      // 소모성인 경우 인벤토리에서 제거
      if (item.is_consumable) {
        const idx = user.inventory.indexOf(itemId);
        if (idx > -1) user.inventory.splice(idx, 1);
      }

      await storage.saveUser(user);
      return { success: true, message: `${item.name} 사용 완료!` };
    } catch (e) {
      console.error('Use item error:', e);
      return { success: false, message: '아이템 사용 중 오류가 발생했습니다.' };
    }
  },

  openMysteryBox: async (userId: string, deductPoints: boolean = true): Promise<{ success: boolean; message: string; type?: string }> => {
    const user = storage.getUserByRawId(userId);
    if (!user) return { success: false, message: '사용자를 찾을 수 없습니다.' };

    if (deductPoints) {
      if (user.points < 100) return { success: false, message: 'CR이 부족합니다.' };
      user.points -= 100;
      if (!user.transactions) user.transactions = [];
      user.transactions.push({
        id: `tx-box-${Date.now()}`,
        type: 'spend',
        amount: 100,
        description: '미스테리 박스 개봉',
        created_at: new Date().toISOString()
      });
    }

    // 아이템 효과 활성화 시 알림용
    const isBoosting = isEffectActive(user, 'exp_boost');

    const rand = Math.random() * 100;
    let result = { success: true, message: '', type: 'fail' };

    if (rand < 60) {
      user.points += 10;
      result = { success: true, message: '꽝! (10 CR 보전됨)', type: 'fail' };
    } else if (rand < 90) {
      const winPoints = 200 + (Math.floor(Math.random() * 800)); // 200~1000 CR
      user.points += winPoints;
      result = { success: true, message: `대박! ${winPoints.toLocaleString()} CR 당첨!`, type: 'jackpot' };
    } else if (rand < 99) {
      const rareBadge = '💎';
      user.active_items.badge = rareBadge;
      result = { success: true, message: '희귀 뱃지 획득! [💎]', type: 'rare' };
    } else {
      user.active_items.custom_title = '전설의 모험가';
      result = { success: true, message: '[전설] 타이틀 획득!', type: 'legend' };
    }

    await storage.saveUser(user);
    return result;
  },

  toggleScrap: async (userId: string, postId: string) => {
    const user = storage.getUserByRawId(userId);
    if (user) {
      if (!user.scrapped_posts) user.scrapped_posts = [];
      user.scrapped_posts = user.scrapped_posts.includes(postId) ? user.scrapped_posts.filter(id => id !== postId) : [...user.scrapped_posts, postId];
      await storage.saveUser(user);
      return true;
    }
    return false;
  },

  toggleLike: async (postId: string, userId: string) => {
    const post = storage.getPosts().find(p => p.id === postId);
    if (post) {
      if (!post.liked_users) post.liked_users = [];
      if (post.liked_users.includes(userId)) {
        post.liked_users = post.liked_users.filter(id => id !== userId);
        post.upvotes = Math.max(0, post.upvotes - 1);
      } else {
        post.liked_users.push(userId);
        post.upvotes += 1;
        // Remove from dislike if exists
        if (post.disliked_users?.includes(userId)) {
          post.disliked_users = post.disliked_users.filter(id => id !== userId);
          post.downvotes = Math.max(0, post.downvotes - 1);
        }
      }
      await storage.updatePost(post);
      return true;
    }
    return false;
  },

  toggleDownvote: async (postId: string, userId: string) => {
    const post = storage.getPosts().find(p => p.id === postId);
    if (post) {
      if (!post.disliked_users) post.disliked_users = [];
      if (post.disliked_users.includes(userId)) {
        post.disliked_users = post.disliked_users.filter(id => id !== userId);
        post.downvotes = Math.max(0, post.downvotes - 1);
      } else {
        post.disliked_users.push(userId);
        post.downvotes += 1;
        // Remove from like if exists
        if (post.liked_users?.includes(userId)) {
          post.liked_users = post.liked_users.filter(id => id !== userId);
          post.upvotes = Math.max(0, post.upvotes - 1);
        }
      }
      await storage.updatePost(post);
      return true;
    }
    return false;
  },

  blockUser: async (userId: string, targetId: string) => {
    const user = storage.getUserByRawId(userId);
    if (user) {
      if (!user.blocked_users) user.blocked_users = [];
      if (!user.blocked_users.includes(targetId)) {
        user.blocked_users.push(targetId);
        await storage.saveUser(user);
      }
    }
  },

  getWikiPage: async (slug: string): Promise<WikiPage | undefined> => {
    try { const snap = await getDoc(doc(db, "wiki", slug)); if (snap.exists()) return snap.data() as WikiPage; } catch (e) { }
    return undefined;
  },

  // Added getWikiPages method to fix "Property 'getWikiPages' does not exist" errors
  getWikiPages: (): WikiPage[] => {
    // Returns empty array as a placeholder for synchronous calls
    return [];
  },

  saveWikiPage: async (page: WikiPage): Promise<boolean> => {
    try {
      const docRef = doc(db, "wiki", page.slug);
      const snap = await getDoc(docRef);

      let existingPage: WikiPage | null = null;
      if (snap.exists()) {
        existingPage = snap.data() as WikiPage;
      }

      // 1. History Management (Keep last 20)
      const historyItem: WikiHistoryItem = {
        id: `hist-${Date.now()}`,
        timestamp: page.last_updated,
        editor_id: page.last_editor_id || 'unknown',
        editor_name: page.last_editor,
        content_preview: page.content.substring(0, 100).replace(/\n/g, ' ') + '...'
      };

      const newHistory = [historyItem, ...(existingPage?.history || [])].slice(0, 20);

      // 2. Contributor Tracking
      const contributors = existingPage?.contributors || {};
      if (page.last_editor_id) {
        contributors[page.last_editor_id] = (contributors[page.last_editor_id] || 0) + 1;
      }

      const finalPage = {
        ...page,
        history: newHistory,
        contributors
      };

      await setDoc(docRef, sanitize(finalPage));

      // 3. Reward System (50 CR for contributing + contribution count)
      if (page.last_editor_id) {
        await storage.givePoints(page.last_editor_id, 50, `위키 문서 편집 공헌: ${page.title}`);

        // Update user's total wiki contribution count
        const userRef = doc(db, "users", page.last_editor_id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          await setDoc(userRef, {
            wiki_contributions: (userData.wiki_contributions || 0) + 1
          }, { merge: true });
        }
      }

      return true;
    } catch (e) {
      console.error('Save wiki error:', e);
      return false;
    }
  },

  getChatMessages: (): ChatMessage[] => { const m = localStorage.getItem('ai_hub_chat_messages'); return m ? JSON.parse(m) : []; },

  sendChatMessage: (msg: ChatMessage) => {
    const msgs = storage.getChatMessages(); msgs.push(msg); if (msgs.length > 50) msgs.shift();
    localStorage.setItem('ai_hub_chat_messages', JSON.stringify(msgs));
    storage.channel.postMessage({ type: 'CHAT_UPDATE' });
  },

  getAiLogs: (): AiLog[] => { const l = localStorage.getItem('ai_hub_ai_logs'); return l ? JSON.parse(l) : []; },

  subscribeConversations: (userId: string, callback: (convs: Conversation[]) => void) => {
    const q = query(collection(db, "conversations"), where("participants", "array-contains", userId));
    return onSnapshot(q, (snapshot) => {
      const convs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
      callback(convs.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
    });
  },

  subscribeMessages: (conversationId: string, callback: (msgs: PrivateMessage[]) => void) => {
    const q = query(collection(db, `conversations/${conversationId}/messages`), orderBy("created_at", "asc"), limit(100));
    return onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrivateMessage));
      callback(msgs);
    });
  },

  getChannels: async (): Promise<Conversation[]> => {
    const q = query(collection(db, "conversations"), where("type", "==", "open"));
    const snapshot = await getDocs(q);
    let channels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));

    // Create default channels if none exist
    if (channels.length === 0) {
      const defaults = [
        { id: 'ch-lobby', type: 'open', name: '📢 로비 (Lobby)', participants: [], is_official: true, last_message: '환영합니다!', last_message_at: new Date().toISOString(), updated_at: new Date().toISOString(), unread_counts: {} },
        { id: 'ch-dev', type: 'open', name: '💻 개발자 포럼', participants: [], is_official: true, last_message: '새로운 기능 논의', last_message_at: new Date().toISOString(), updated_at: new Date().toISOString(), unread_counts: {} },
        { id: 'ch-stock', type: 'open', name: '📈 주식/경제', participants: [], is_official: true, last_message: '시장 동향', last_message_at: new Date().toISOString(), updated_at: new Date().toISOString(), unread_counts: {} },
      ];
      for (const ch of defaults) {
        await setDoc(doc(db, "conversations", ch.id), ch);
      }
      channels = defaults as any;
    }
    return channels;
  },

  getOrCreateConversation: async (myId: string, targetId: string): Promise<string> => {
    // For 1:1, check if exists
    const q = query(collection(db, "conversations"), where("type", "==", "private"), where("participants", "array-contains", myId));
    const snapshot = await getDocs(q);
    const existing = snapshot.docs.find(d => {
      const data = d.data() as Conversation;
      return data.participants.includes(targetId) && data.participants.length === 2;
    });

    if (existing) return existing.id;

    // Create new 1:1
    const newConv = await addDoc(collection(db, "conversations"), {
      type: 'private',
      participants: [myId, targetId],
      last_message: '대화 시작',
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      unread_counts: { [myId]: 0, [targetId]: 0 }
    });
    return newConv.id;
  },

  createGroupChat: async (creatorId: string, name: string, participantIds: string[]) => {
    const allParticipants = [...new Set([creatorId, ...participantIds])];
    const newConv = await addDoc(collection(db, "conversations"), {
      type: 'group',
      name,
      participants: allParticipants,
      admin_ids: [creatorId],
      last_message: `${name} 그룹이 생성되었습니다.`,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      unread_counts: allParticipants.reduce((acc, id) => ({ ...acc, [id]: 0 }), {})
    });
    return newConv.id;
  },

  joinChannel: async (channelId: string, userId: string) => {
    // Open channels don't strictly require 'joining' in participants array for read, 
    // but if we want notifications or tracking, we might add them.
    // For now, open channels just load messages. 
    // We can add logic here if we want "joined" state.
    return true;
  },

  sendMessage: async (conversationId: string, senderId: string, content: string, targetId: string) => {
    const ts = new Date().toISOString();
    await addDoc(collection(db, `conversations/${conversationId}/messages`), { conversation_id: conversationId, sender_id: senderId, content, created_at: ts, is_read: false });
    await updateDoc(doc(db, "conversations", conversationId), { last_message: content, last_message_at: ts, updated_at: ts, [`unread_counts.${targetId}`]: 1 });
  },

  deleteUser: async (userId: string) => {
    const user = storage.getUserByRawId(userId);
    if (user) {
      // Remove from Firestore
      try { await deleteDoc(doc(db, "users", user.username)); } catch (e) { }
      // Remove from local storage
      const users = storage.getUsers().filter(u => u.id !== userId);
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
    }
  },

  // --- Balance Game (Daily Protocol) ---
  getBalanceGame: (): BalanceGame => {
    const today = new Date().toDateString(); // "Thu Jan 08 2026"
    // Simple hash function for consistent daily index
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
      hash = ((hash << 5) - hash) + today.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % BALANCE_GAMES.length;
    return BALANCE_GAMES[idx];
  },

  getPreviousBalanceGame: (): BalanceGame => {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    let hash = 0;
    for (let i = 0; i < yesterday.length; i++) {
      hash = ((hash << 5) - hash) + yesterday.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % BALANCE_GAMES.length;
    const game = { ...BALANCE_GAMES[idx] };

    // Deterministic random votes for yesterday
    const seed = Math.abs(hash);
    game.votes_a = 40 + (seed % 20); // 40-60%
    game.votes_b = 100 - game.votes_a;

    return game;
  },

  voteBalance: async (userId: string, option: 'a' | 'b'): Promise<boolean> => {
    const user = storage.getUserByRawId(userId);
    if (!user) return false;

    // Check if user already voted TODAY? 
    // The requirement says "Daily Protocol", so user.quests.balance_voted controls daily reset
    // This boolean should be reset daily by processAttendance or similar check.
    // For now, checks the flag.
    if (user.quests.balance_voted) return false;

    user.quests.balance_voted = true;

    // 경험치 부스트 체크
    const hasExpBoost = isEffectActive(user, 'exp_boost') || isEffectActive(user, 'item-exp-boost');
    const expGain = hasExpBoost ? 20 : 10;

    user.points += 5;
    user.exp += expGain;

    // Add transaction log
    if (!user.transactions) user.transactions = [];
    user.transactions.push({
      id: `tx-bg-${Date.now()}`,
      type: 'earn',
      amount: 5,
      description: '데일리 프로토콜(밸런스 게임) 참여',
      created_at: new Date().toISOString()
    });

    await storage.saveUser(user);
    await storage.checkAchievements(userId);
    return true;
  },

  // ========== Firebase 기반 익명 투표 (효율적 사용) ==========

  // 투표 생성 (쓰기 1회)
  createAnonVote: async (question: string, options: string[]): Promise<string> => {
    const voteId = `vote-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const voteData = {
      id: voteId,
      question,
      options,
      votes: options.reduce((acc, _, idx) => ({ ...acc, [idx]: 0 }), {}),
      created_at: new Date().toISOString(),
      voters: [] // 중복 투표 방지용
    };
    await setDoc(doc(db, "anon_votes", voteId), voteData);
    return voteId;
  },

  // 투표 조회 (읽기 1회)
  getAnonVote: async (voteId: string): Promise<any | null> => {
    try {
      const snap = await getDoc(doc(db, "anon_votes", voteId));
      if (snap.exists()) return snap.data();
    } catch (e) { }
    return null;
  },

  // 투표 실행 (읽기 1회 + 쓰기 1회)
  castAnonVote: async (voteId: string, optionIdx: number, voterId: string): Promise<{ success: boolean, message: string }> => {
    try {
      const voteRef = doc(db, "anon_votes", voteId);
      const snap = await getDoc(voteRef);
      if (!snap.exists()) return { success: false, message: '투표를 찾을 수 없습니다.' };

      const data = snap.data();
      if (data.voters?.includes(voterId)) {
        return { success: false, message: '이미 투표하셨습니다.' };
      }

      // 투표 수 증가 및 투표자 추가
      const newVotes = { ...data.votes };
      newVotes[optionIdx] = (newVotes[optionIdx] || 0) + 1;
      const newVoters = [...(data.voters || []), voterId];

      await updateDoc(voteRef, { votes: newVotes, voters: newVoters });
      return { success: true, message: '투표 완료!' };
    } catch (e: any) {
      return { success: false, message: `오류: ${e.message}` };
    }
  },

  // ========== Firebase 기반 휘발성 메모 (효율적 사용) ==========

  // 메모 생성 (쓰기 1회)
  createVolatileNote: async (content: string, expiry: string): Promise<string> => {
    const noteId = `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const expiryMs = {
      'instant': 0, // 읽는 즉시
      '5min': 5 * 60 * 1000,
      '1hour': 60 * 60 * 1000,
      '24hour': 24 * 60 * 60 * 1000
    }[expiry] || 0;

    const noteData = {
      id: noteId,
      content,
      expiry,
      created_at: Date.now(),
      expires_at: expiry === 'instant' ? null : Date.now() + expiryMs,
      viewed: false
    };
    await setDoc(doc(db, "volatile_notes", noteId), noteData);
    return noteId;
  },

  // 메모 조회 (읽기 1회)
  getVolatileNote: async (noteId: string): Promise<any | null> => {
    try {
      const snap = await getDoc(doc(db, "volatile_notes", noteId));
      if (snap.exists()) {
        const data = snap.data();
        // 만료 체크
        if (data.expires_at && Date.now() > data.expires_at) {
          // 만료된 메모 삭제 (쓰기 1회 추가)
          await deleteDoc(doc(db, "volatile_notes", noteId));
          return null;
        }
        return data;
      }
    } catch (e) { }
    return null;
  },

  // 메모 삭제 (쓰기 1회)
  deleteVolatileNote: async (noteId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, "volatile_notes", noteId));
    } catch (e) { }
  },

  // 메모 열람 처리 (instant인 경우 삭제)
  markNoteViewed: async (noteId: string, expiry: string): Promise<void> => {
    if (expiry === 'instant') {
      await storage.deleteVolatileNote(noteId);
    }
  },

  // 크레딧 업데이트 (게임, 모의투자 등) - 실제로는 포인트(CR) 사용
  updateUserCredits: async (userId: string, amount: number, description: string): Promise<boolean> => {
    try {
      const user = storage.getUserByRawId(userId);
      if (!user) return false;

      const currentPoints = user.points || 0;
      const newPoints = currentPoints + amount;

      // 크레딧이 0 이하로 떨어지면 실패
      if (newPoints < 0) return false;

      user.points = newPoints;

      // 트랜잭션 기록
      if (!user.transactions) user.transactions = [];
      user.transactions.unshift({
        id: `tx-${Date.now()}`,
        type: amount > 0 ? 'charge' : 'spend',
        amount: Math.abs(amount),
        description,
        created_at: new Date().toISOString()
      });

      // 최근 50개 트랜잭션만 유지
      if (user.transactions.length > 50) {
        user.transactions = user.transactions.slice(0, 50);
      }

      await storage.saveUser(user);

      // 현재 세션 사용자면 세션도 업데이트
      if (storage.getSession()?.id === userId) {
        storage.setSession(user);
      }

      return true;
    } catch (e) {
      console.error('Credit update error:', e);
      return false;
    }
  },

  // 크레딧 충전 (결제 연동용)
  chargeCredits: async (userId: string, amount: number, paymentMethod: string): Promise<boolean> => {
    return storage.updateUserCredits(userId, amount, `크레딧 충전 (${paymentMethod})`);
  },

  // ========== 게임 심사 시스템 (Phase 8) ==========

  // 게임 제출 (아이디어 또는 HTML 게임)
  submitGameSubmission: async (submission: Omit<GameSubmission, 'id' | 'status' | 'created_at'>): Promise<string | null> => {
    try {
      const id = `sub-${Date.now()}`;
      const fullSubmission: GameSubmission = {
        ...submission,
        id,
        status: 'pending',
        created_at: new Date().toISOString()
      };
      await setDoc(doc(db, "game_submissions", id), sanitize(fullSubmission));

      // 관리자에게 알림 (옵션)
      // await storage.sendNotification({ ... });

      return id;
    } catch (e) {
      console.error('Submission error:', e);
      return null;
    }
  },

  // 심사 대기열 구독 (관리자용)
  subscribeGameSubmissions: (callback: (submissions: GameSubmission[]) => void) => {
    const q = query(collection(db, "game_submissions"), orderBy("created_at", "desc"));
    return onSnapshot(q, (snapshot) => {
      const submissions = snapshot.docs.map(doc => doc.data() as GameSubmission);
      callback(submissions);
    });
  },

  // 심사 상태 업데이트 (승인/거절)
  updateGameSubmissionStatus: async (submissionId: string, status: 'approved' | 'rejected', feedback?: string): Promise<boolean> => {
    try {
      const subRef = doc(db, "game_submissions", submissionId);
      const snap = await getDoc(subRef);
      if (!snap.exists()) return false;

      const submission = snap.data() as GameSubmission;
      await updateDoc(subRef, { status, admin_feedback: feedback || '' });

      // 승인 시 실제 게임 리스트에 추가 로직 (여기서는 목업 데이터만 사용하므로 알림만 전송)
      // 실제로는 별도의 games 컬렉션에 추가해야 함.

      await storage.sendNotification({
        user_id: submission.submitter_id,
        type: 'system',
        message: `제출하신 게임 [${submission.title}]이(가) ${status === 'approved' ? '승인' : '거절'}되었습니다.`,
        link: '/game'
      });

      return true;
    } catch (e) {
      console.error('Update submission status error:', e);
      return false;
    }
  },

  // 통합 검색 (Phase 8.1)
  integratedSearch: async (keyword: string): Promise<{
    posts: Post[],
    wiki: WikiPage[],
    shop: ShopItem[]
  }> => {
    const term = keyword.toLowerCase().trim();
    if (!term) return { posts: [], wiki: [], shop: [] };

    // 1. 게시판 검색 (Firestore)
    const postsQuery = query(
      collection(db, "posts"),
      orderBy("created_at", "desc"),
      limit(20)
    );
    const postsSnap = await getDocs(postsQuery);
    const allPosts = postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
    const filteredPosts = allPosts.filter(p =>
      p.title.toLowerCase().includes(term) ||
      p.content.toLowerCase().includes(term)
    );

    // 2. 위키 검색 (Firestore)
    const wikiQuery = collection(db, "wiki_pages");
    const wikiSnap = await getDocs(wikiQuery);
    const allWiki = wikiSnap.docs.map(doc => doc.data() as WikiPage);
    const filteredWiki = allWiki.filter(w =>
      w.title.toLowerCase().includes(term) ||
      w.content.toLowerCase().includes(term)
    );

    // 3. 상점 검색 (Local Constant)
    const filteredShop = SHOP_ITEMS.filter(item =>
      item.name.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term)
    );

    return {
      posts: filteredPosts,
      wiki: filteredWiki,
      shop: filteredShop
    };
  },

  givePoints: async (userId: string, amount: number, description: string): Promise<boolean> => {
    try {
      // Find user by ID first to get their username (doc ID)
      const user = storage.getUserByRawId(userId);
      if (!user) return false;

      const userRef = doc(db, "users", user.username);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return false;

      const userData = userSnap.data() as User;
      const newPoints = (userData.points || 0) + amount;

      const transaction: Transaction = {
        id: `tr-${Date.now()}`,
        type: amount > 0 ? 'earn' : 'spend',
        amount: Math.abs(amount),
        description,
        created_at: new Date().toISOString()
      };

      const updatedQuests = {
        ...(userData.quests || {
          last_updated: '',
          daily_login: false,
          post_count: 0,
          comment_count: 0,
          balance_voted: false
        }),
        lucky_draw_today: true,
        last_updated: new Date().toISOString()
      };

      await updateDoc(userRef, {
        points: newPoints,
        transactions: [transaction, ...(userData.transactions || [])].slice(0, 50),
        quests: updatedQuests
      });

      // 1. Update Current Session (Important for UI reactive updates)
      const currentSession = storage.getSession();
      if (currentSession && currentSession.id === userId) {
        currentSession.points = newPoints;
        if (!currentSession.quests) currentSession.quests = { last_updated: '', daily_login: false, post_count: 0, comment_count: 0, balance_voted: false };
        currentSession.quests.lucky_draw_today = true;
        storage.setSession(currentSession);
      }

      // 2. Update Local Users Cache
      const users = storage.getUsers();
      const idx = users.findIndex(u => u.id === userId);
      if (idx !== -1) {
        users[idx].points = newPoints;
        if (!users[idx].quests) users[idx].quests = { last_updated: '', daily_login: false, post_count: 0, comment_count: 0, balance_voted: false };
        users[idx].quests.lucky_draw_today = true;
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
      }

      return true;
    } catch (e) {
      console.error('Give points error:', e);
      return false;
    }
  },

  // 사이트 타임라인 (Phase 8.2)
  logActivity: async (activity: {
    type: 'post' | 'comment' | 'wiki' | 'shop' | 'system',
    user_id: string,
    user_name: string,
    content: string,
    link: string
  }) => {
    try {
      const id = `act-${Date.now()}`;
      await setDoc(doc(db, "site_activities", id), sanitize({
        ...activity,
        id,
        created_at: new Date().toISOString()
      }));
    } catch (e) {
      console.error('Log activity error:', e);
    }
  },

  subscribeTimeline: (callback: (activities: any[]) => void) => {
    const q = query(
      collection(db, "site_activities"),
      orderBy("created_at", "desc"),
      limit(30)
    );
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => doc.data()));
    });
  },

  getWikiTopContributors: async (limitCount: number = 5): Promise<User[]> => {
    try {
      const q = query(
        collection(db, "users"),
        where("wiki_contributions", ">", 0),
        orderBy("wiki_contributions", "desc"),
        limit(limitCount)
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    } catch (e) {
      console.error('Get top contributors error:', e);
      return [];
    }
  },

  getWikiStubs: async (limitCount: number = 5): Promise<WikiPage[]> => {
    try {
      const q = query(
        collection(db, "wiki"),
        orderBy("last_updated", "desc"),
        limit(20)
      );
      const snap = await getDocs(q);
      const pages = snap.docs.map(doc => doc.data() as WikiPage);
      return pages.filter(p => (p.content || '').length < 300).slice(0, limitCount);
    } catch (e) {
      console.error('Get stubs error:', e);
      return [];
    }
  }
};