
import { Post, Board, Comment, User, WikiPage } from '../types';
import { storage } from './storage';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  getBoards: async (): Promise<Board[]> => {
    return storage.getBoards();
  },

  getPosts: async (boardSlug?: string, page: number = 1): Promise<Post[]> => {
    let posts = storage.getPosts();

    // Calculate Hot Status (Real-time)
    posts = posts.map(p => {
      const score = (p.view_count || 0) + ((p.upvotes || 0) * 2) + ((p.comment_count || 0) * 3);
      // score > 20 is HOT
      return { ...p, is_hot: score >= 20 };
    });

    if (boardSlug && boardSlug !== 'all' && boardSlug !== 'best') {
      posts = posts.filter(p => p.board_id === boardSlug);
    }
    posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return posts;
  },

  getPost: async (postId: string): Promise<Post | null> => {
    const posts = storage.getPosts();
    const post = posts.find(p => p.id === postId);
    if (post) {
      const updated = { ...post, view_count: post.view_count + 1 };
      storage.updatePost(updated);
      return updated;
    }
    return null;
  },

  createPost: async (postData: Partial<Post>, user: User): Promise<Post> => {
    await delay(300);
    const newPost: Post = {
      id: `post-${Date.now()}`,
      board_id: postData.board_id || 'free',
      author_id: user.id,
      title: postData.title || '무제',
      content: postData.content || '',
      view_count: 0,
      upvotes: 0,
      downvotes: 0,
      liked_users: [],
      disliked_users: [],
      created_at: new Date().toISOString(),
      author: {
        id: user.id,
        username: user.username,
        created_at: new Date().toISOString(),
        level: user.level,
        active_items: user.active_items,
        is_admin: user.is_admin
      },
      comment_count: 0,
      is_hot: false,
      has_image: (postData.images && postData.images.length > 0) || false,
      images: postData.images || [],
      poll: postData.poll
    };
    storage.savePost(newPost);

    // AI Agent Activity (Fact Check)
    setTimeout(async () => {
      try {
        // Lazy load aiService to avoid circular dependency if any (though ai.ts imports storage, api imports ai... might be circular)
        // Ideally refactor, but for now simple call if not circular loop issue.
        // Actually api.ts doesn't import aiService yet.
        const { aiService } = await import('./ai');
        const check = await aiService.factCheck(newPost.content + " " + newPost.title);
        if (check.hasFact) {
          const botUser: User = {
            id: 'ai-agent-nexus',
            username: 'Nexus Bot',
            is_admin: true,
            level: 99,
            exp: 0, points: 0, inventory: [], active_items: { badge: '🤖' },
            blocked_users: [], scrapped_posts: [], achievements: [], attendance_streak: 0,
            last_attendance_date: '', quests: { last_updated: '', daily_login: false, post_count: 0, comment_count: 0, balance_voted: false },
            referral_code: '', invite_count: 0, transactions: []
          };
          await api.createComment(newPost.id, check.message, botUser, null, newPost.author_id);
        }
      } catch (e) {
        console.error("AI Agent Error:", e);
      }
    }, 1000);

    return newPost;
  },

  deletePost: async (postId: string): Promise<void> => {
    storage.deletePost(postId);
  },

  getComments: async (postId: string): Promise<Comment[]> => {
    const comments = storage.getComments();
    return comments.filter(c => c.post_id === postId);
  },

  // Modified to accept postAuthorId for notifications
  createComment: async (postId: string, content: string, user: User, parentId: string | null = null, postAuthorId: string): Promise<Comment> => {
    const newComment: Comment = {
      id: `cmt-${Date.now()}`,
      post_id: postId,
      author_id: user.id,
      parent_id: parentId,
      content: content,
      created_at: new Date().toISOString(),
      author: {
        id: user.id,
        username: user.username,
        created_at: new Date().toISOString(),
        level: user.level,
        active_items: user.active_items,
        is_admin: user.is_admin
      },
      depth: 0
    };
    await storage.saveComment(newComment, postAuthorId);
    return newComment;
  },

  votePost: async (postId: string, type: 'up' | 'down', userId: string): Promise<boolean> => {
    if (type === 'up') {
      return await storage.toggleLike(postId, userId);
    } else {
      return await storage.toggleDownvote(postId, userId);
    }
  },

  register: async (user: User): Promise<User> => {
    storage.saveUser(user);
    return user;
  },

  deleteUser: async (userId: string): Promise<void> => {
    await storage.deleteUser(userId);
  },

  getWikiPage: async (slug: string): Promise<WikiPage | undefined> => {
    return storage.getWikiPage(slug);
  },

  saveWikiPage: async (page: WikiPage): Promise<void> => {
    storage.saveWikiPage(page);
  }
};
