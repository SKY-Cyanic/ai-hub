
export interface Transaction {
  id: string;
  type: 'earn' | 'spend' | 'charge' | 'refund';
  amount: number;
  description: string;
  created_at: string;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  second_password?: string;
  is_admin?: boolean;
  is_bot?: boolean;
  avatar_url?: string;
  email?: string;
  level: number;
  exp: number;
  points: number;
  inventory: string[];
  active_items: {
    name_color?: string;
    name_style?: 'normal' | 'bold';
    badge?: string;
    theme?: string; // 'standard' | 'cyberpunk' | 'retro' | 'midnight'
  };
  blocked_users: string[];
  scrapped_posts: string[];
  achievements: string[]; // 해금된 업적 ID
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
  };
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
  votes_a: number;
  votes_b: number;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'color' | 'style' | 'badge' | 'theme';
  value: string;
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