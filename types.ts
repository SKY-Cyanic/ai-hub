
export interface Transaction {
  id: string;
  type: 'earn' | 'spend' | 'charge' | 'refund';
  amount: number;
  description: string;
  created_at: string;
}

export interface User {
  id: string;
  username: string;       // 로그인용 ID
  nickname: string;       // 표시용 닉네임
  password?: string;
  second_password?: string;
  is_admin?: boolean;
  is_bot?: boolean;
  is_guest?: boolean;
  guest_expires_at?: number;
  google_uid?: string;    // Google 계정 연동 시 UID
  avatar_url?: string;
  email?: string;
  level: number;
  exp: number;
  points: number;
  credits: number;        // 크레딧 (실제 화폐 연동)
  inventory: string[];
  active_items: {
    name_color?: string;
    name_style?: 'normal' | 'bold';
    badge?: string;
    theme?: string; // 'standard' | 'cyberpunk' | 'retro' | 'midnight'
    frame?: string; // Avatar frame
    special_effects?: string[]; // 'rainbow', 'glitch'
    custom_title?: string; // Custom prefix/suffix
  };
  expires_at?: { [itemId: string]: string }; // For temporary items
  shields?: number; // Protection count
  blocked_users: string[];
  scrapped_posts: string[];
  scrap_folders?: { id: string; name: string; post_ids: string[] }[]; // Scrap folders
  achievements: string[]; // 해금된 업적 ID
  drafts?: { id: string; title: string; content: string; board_id: string; updated_at: string }[]; // Drafts
  attendance_streak: number;
  last_attendance_date: string;
  quests: {
    last_updated: string;
    daily_login: boolean;
    post_count: number;
    comment_count: number;
    balance_voted: boolean;
  };
  referral_code: string;
  invited_by?: string;
  invite_count: number;
  transactions: Transaction[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: string;
  reward_points: number;
}

export interface FactCheckReport {
  id: string;
  post_id: string;
  reporter_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface Board {
  id: string;
  slug: string;
  name: string;
  description?: string;
  categories?: string[];
  required_achievement?: string; // 접근 제한 조건
}

export interface Post {
  id: string;
  board_id: string;
  author_id: string;
  category?: string;
  title: string;
  content: string;
  view_count: number;
  is_spoiler?: boolean; // New field
  upvotes: number;
  downvotes: number;
  liked_users: string[];
  disliked_users: string[];
  created_at: string;
  author: Profile;
  comment_count: number;
  is_hot?: boolean;
  has_image?: boolean;
  images?: string[];
  ip_addr?: string;
  poll?: Poll;
  tags?: string[]; // Hashtags
  is_pinned?: boolean; // Admin can pin posts
  ai_agent_type?: 'news' | 'reddit' | 'wiki';
}

export interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  created_at: string;
  level: number;
  exp?: number;
  active_items?: {
    name_color?: string;
    name_style?: 'normal' | 'bold';
    badge?: string;
    theme?: string;
    frame?: string;
    special_effects?: string[];
    custom_title?: string;
  };
  expires_at?: { [itemId: string]: string };
  shields?: number;
  is_admin?: boolean;
  is_bot?: boolean;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  question: string;
  options: PollOption[];
  voted_users: string[];
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  author: Profile;
  depth: number;
  children?: Comment[];
  ip_addr?: string;
  is_blinded?: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'comment' | 'reply' | 'level_up' | 'system' | 'message' | 'achievement' | 'bounty';
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

export interface AuctionItem {
  id: string;
  item_name: string;
  description: string;
  start_price: number;
  current_price: number;
  highest_bidder_id?: string;
  highest_bidder_name?: string;
  end_time: string;
  is_finished: boolean;
}

export interface BalanceGame {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  votes_a?: number;
  votes_b?: number;
  reward_exp?: number;
  reward_points?: number;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'color' | 'style' | 'badge' | 'theme' | 'frame' | 'special_effects' | 'custom_title' | 'utility' | 'gamble';
  category: 'avatar' | 'name' | 'system';
  value?: string;
  icon: string;
}

export interface WikiPage {
  slug: string;
  title: string;
  content: string;
  last_updated: string;
  last_editor: string;
  external_url?: string;
  is_external?: boolean;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  text: string;
  timestamp: string;
  user_level: number;
}

export interface AiLog {
  id: string;
  action: 'summary' | 'fact_check' | 'moderation' | 'comment' | 'wiki' | 'swarm_activity';
  target_id: string;
  detail: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  type: 'private' | 'group' | 'open';
  name?: string;
  cover_url?: string;
  participants: string[];
  admin_ids?: string[];
  last_message: string;
  last_message_at: string;
  updated_at: string;
  unread_counts: { [userId: string]: number };
  is_official?: boolean;
}

export interface PrivateMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}