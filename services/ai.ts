
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
    return {
      text: "Fact checking is currently disabled.",
      sources: []
    };
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
