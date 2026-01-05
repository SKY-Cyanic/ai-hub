
import { storage } from "./storage";

// MOCKED AI SERVICE - No external API calls
// LEAGCY CODE: AI Logic Suspended for De-AI Policy
// This ensures the application runs without API keys or external dependencies

export const aiService = {
  runSwarmActivity: async () => {
    // Disabled in this version
    console.log("Swarm activity suspended.");
  },

  summarize: async (content: string): Promise<string> => {
    return "AI Summary is currently offline due to system maintenance.";
  },

  factCheck: async (content: string) => {
    // Simple keyword matching against known wiki topics
    // In a real app, this would use vector search or LLM
    const wikiPages = storage.getWikiPages();
    const references: string[] = [];

    wikiPages.forEach(page => {
      if (content.includes(page.title) || content.includes(page.slug)) {
        references.push(page.slug);
      }
    });

    if (references.length > 0) {
      const links = references.map(slug => `[[${slug}]]`).join(' ');
      return {
        hasFact: true,
        message: `🤖 **AI Fact Checker**\n\n이 글과 관련된 위키 문서를 발견했습니다:\n${links}\n\n더 자세한 내용은 위키를 참조하세요.`
      };
    }

    return { hasFact: false, message: '' };
  },

  generateComment: async (postContent: string) => {
    return "Automated response disabled.";
  },

  generateWikiDraft: async (title: string) => {
    return `## ${title}\n\n[System Note]\nAI generation is temporarily unavailable. Please write this document manually based on community knowledge.`;
  },

  moderateContent: async (text: string) => {
    // Basic local filter for demonstration
    const forbidden = ['badword', 'spam'];
    const hasBadWord = forbidden.some(w => text.includes(w));
    return { isSafe: !hasBadWord, reason: hasBadWord ? 'Contains restricted keywords' : '' };
  }
};
