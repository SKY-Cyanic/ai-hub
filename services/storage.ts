
import { db } from './firebase';
import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc,
  query, where, orderBy, limit, addDoc, deleteDoc,
  onSnapshot, serverTimestamp, Timestamp, writeBatch
} from "firebase/firestore";
import { Post, Comment, Board, User, WikiPage, ChatMessage, AiLog, ShopItem, Notification, Conversation, PrivateMessage, Achievement, AuctionItem, BalanceGame, FactCheckReport } from '../types';

export const NODE_GAS_FEE = 10;

export const SHOP_ITEMS: ShopItem[] = [
  // --- Visual Effects (Phase 7.1) ---
  { id: 'effect-rainbow', name: '🌈 무지개 닉네임', description: '닉네임이 RGB 컬러로 부드럽게 변하는 효과 (30일)', price: 1000, type: 'style', category: 'name', value: 'rainbow', icon: '🌈' },
  { id: 'effect-glitch', name: '⚡ 글리치 효과', description: '닉네임과 아바타에 해커 감성 지직거림 부여', price: 2000, type: 'style', category: 'name', value: 'glitch', icon: '⚡' },

  // --- Avatar Frames (Seasonal) ---
  { id: 'frame-shell', name: '[시즌] 뉴비의 알껍질', description: '뉴비들을 위한 귀여운 알껍질 테두리', price: 500, type: 'frame', category: 'avatar', value: 'border-yellow-200 border-2 rounded-full border-dashed', icon: '🥚' },
  { id: 'frame-laurel', name: '[시즌] 황금 월계관', description: '승리자의 상징인 황금 월계관 테두리', price: 5000, type: 'frame', category: 'avatar', value: 'border-yellow-500 border-4 shadow-[0_0_10px_gold] rounded-lg', icon: '🌿' },
  { id: 'frame-cyber', name: '[시즌] 사이버펑크 네온', description: '강렬한 핑크-시안 네온 테두리', price: 3000, type: 'frame', category: 'avatar', value: 'border-pink-500 border-2 shadow-[0_0_15px_#ff00ff,#00ffff_inset]', icon: '🏙️' },

  // --- Utility Items ---
  { id: 'item-megaphone', name: '📌 확성기', description: '채팅방 상단에 내 메시지를 1시간 동안 고정', price: 500, type: 'badge', category: 'system', value: 'megaphone', icon: '📢' },
  { id: 'item-shield', name: '🛡️ 1일 방어권', description: '신고로부터 경고 카운트를 1회 방어합니다.', price: 300, type: 'badge', category: 'system', value: 'shield', icon: '🛡️' },
  { id: 'item-title', name: '📝 내 맘대로 타이틀', description: '닉네임 옆에 원하는 칭호를 직접 설정', price: 5000, type: 'badge', category: 'system', value: 'custom_title', icon: '🏷️' },

  // --- Mystery Box / Lottery (Phase 7.2) ---
  { id: 'item-box', name: '📦 미스테리 박스', description: '랜덤한 보상이 들어있는 상자 (꽝도 있음!)', price: 100, type: 'badge', category: 'system', value: 'mystery_box', icon: '🎁' },
  { id: 'item-lottery', name: '🎟️ 주간 복권', description: '매주 금요일 밤 10시 추첨! 팟 시스템 상금 독식', price: 50, type: 'badge', category: 'system', value: 'lottery_ticket', icon: '🎰' },
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
    if (!user) return null;

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
    } catch (e) { return null; }
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
    user.quests.daily_login = true;

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

  getBalanceGame: (): BalanceGame => ({
    id: 'daily-bal', question: '평생 하나만 먹는다면?', option_a: '치킨 (평생 무료)', option_b: '피자 (평생 무료)',
    votes_a: 124, votes_b: 98
  }),

  voteBalance: async (userId: string, option: 'a' | 'b') => {
    const user = storage.getUserByRawId(userId);
    if (user && !user.quests.balance_voted) {
      user.quests.balance_voted = true;
      user.points += 5;
      user.exp += 10;
      await storage.saveUser(user);
      return true;
    }
    return false;
  },

  // --- Megaphone & Lottery Systems ---
  getMegaphoneMessage() {
    return {
      text: "현재 상점에서 🌈 무지개 닉네임을 1,000 CR에 판매 중입니다!",
      author: "System"
    };
  },

  async setMegaphoneMessage(userId: string, text: string): Promise<{ success: boolean, message: string }> {
    const user = this.getUserByRawId(userId);
    if (!user) return { success: false, message: 'User not found' };
    if (user.points < 2000) return { success: false, message: 'CR이 부족합니다.' };

    user.points -= 2000;
    if (!user.transactions) user.transactions = [];
    user.transactions.push({
      id: `tx-${Date.now()}`,
      type: 'spend', // Changed from 'spent' to 'spend' for consistency
      amount: 2000,
      description: '확성기 (전역 메시지) 구매',
      created_at: new Date().toISOString()
    });
    await this.saveUser(user); // Save user after point deduction and transaction
    // In a real app, this would update a global state or Firestore collection
    console.log(`MEGAPHONE BY ${user.username}: ${text}`);
    return { success: true, message: '확성기 메시지가 등록되었습니다!' };
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

    if (user.points < item.price) return { success: false, message: 'CR이 부족합니다.' };
    if (user.inventory?.includes(itemId)) return { success: false, message: '이미 보유 중인 아이템입니다.' };

    // Special logic for functional items
    if (itemId === 'item-megaphone') {
      const text = prompt('전 서버에 전달할 메시지를 입력하세요 (2,000 CR 차감):');
      if (!text) return { success: false, message: '전송이 취소되었습니다.' };
      return await storage.setMegaphoneMessage(userId, text);
    }

    if (itemId === 'item-lottery') {
      return await storage.buyLotteryTicket(userId);
    }

    if (itemId === 'item-title') {
      const title = prompt('사용할 닉네임 칭호를 입력하세요:');
      if (!title) return { success: false, message: '칭호를 입력해야 합니다.' };
      user.active_items.custom_title = title;
    }

    // Deduct points and add to inventory
    user.points -= item.price;
    if (!user.inventory) user.inventory = [];
    user.inventory.push(itemId);

    // Apply immediate effects for visual items
    if (item.type === 'color') user.active_items.name_color = item.value;
    if (item.type === 'frame') user.active_items.frame = item.value;
    if (item.type === 'badge') user.active_items.badge = item.value;
    if (item.type === 'theme') user.active_items.theme = item.value;

    if (item.category === 'name' && (item.id.includes('effect'))) {
      if (!user.active_items.special_effects) user.active_items.special_effects = [];
      if (!user.active_items.special_effects.includes(item.value!)) {
        user.active_items.special_effects.push(item.value!);
      }

      // Handle Expiration
      if (itemId === 'effect-rainbow') {
        if (!user.expires_at) user.expires_at = {};
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 7); // 7 day trial
        user.expires_at[itemId] = expiry.toISOString();
      }
    }

    if (itemId === 'item-shield') {
      user.shields = (user.shields || 0) + 1;
    }

    // Record Transaction
    if (!user.transactions) user.transactions = [];
    user.transactions.push({
      id: `tx-${Date.now()}`,
      type: 'spend',
      amount: item.price,
      description: `상점 구매: ${item.name}`,
      created_at: new Date().toISOString()
    });

    await storage.saveUser(user);
    return { success: true, message: '구매가 완료되었습니다.' };
  },

  openMysteryBox: async (userId: string): Promise<{ success: boolean; message: string; type?: string }> => {
    const user = storage.getUserByRawId(userId);
    if (!user || user.points < 100) return { success: false, message: 'CR이 부족합니다.' };

    user.points -= 100;
    if (!user.transactions) user.transactions = [];
    user.transactions.push({
      id: `tx-box-${Date.now()}`,
      type: 'spend',
      amount: 100,
      description: '미스테리 박스 개봉',
      created_at: new Date().toISOString()
    });

    const rand = Math.random() * 100;
    let result = { success: true, message: '', type: 'fail' };

    if (rand < 60) {
      user.points += 10;
      result = { success: true, message: '꽝! (10 CR 보전됨)', type: 'fail' };
    } else if (rand < 90) {
      user.points += 200;
      result = { success: true, message: '대박! 200 CR 당첨!', type: 'jackpot' };
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

  saveWikiPage: async (page: WikiPage) => { try { await setDoc(doc(db, "wiki", page.slug), sanitize(page)); } catch (e) { } },

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
      try { await deleteDoc(doc(db, "users", user.username)); } catch (e) { }
    }
  },
};