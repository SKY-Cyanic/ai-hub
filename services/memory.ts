import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, query, where, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";

export interface UserPersonaProfile {
    uid: string;
    nickname: string;
    interests: string[];
    lastConversationSummary: string;
    personaType: string;
    // 커스텀 페르소나 설정
    customPersonaName?: string;
    customPersonaDescription?: string;
    customPersonaPrompt?: string;
    interactionCount: number;
}

export interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

export interface ConversationSession {
    id?: string;
    uid: string;
    messages: ConversationMessage[];
    createdAt: string;
    updatedAt: string;
}

const COLLECTION_PROFILES = "persona_profiles";
const COLLECTION_CONVERSATIONS = "persona_conversations";

export const MemoryService = {
    /**
     * Get or Create User Persona Profile
     */
    async getUserProfile(uid: string): Promise<UserPersonaProfile> {
        const docRef = doc(db, COLLECTION_PROFILES, uid);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
            return snap.data() as UserPersonaProfile;
        } else {
            const defaultProfile: UserPersonaProfile = {
                uid,
                nickname: "",
                interests: [],
                lastConversationSummary: "",
                personaType: "trendy_yuna",
                interactionCount: 0
            };
            await setDoc(docRef, defaultProfile);
            return defaultProfile;
        }
    },

    /**
     * Update User Profile
     */
    async updateProfile(uid: string, updates: Partial<UserPersonaProfile>) {
        const docRef = doc(db, COLLECTION_PROFILES, uid);
        await updateDoc(docRef, updates);
    },

    /**
     * Save conversation messages to Firebase
     */
    async saveConversation(uid: string, messages: ConversationMessage[]) {
        if (messages.length === 0) return;

        const docRef = doc(db, COLLECTION_CONVERSATIONS, uid);
        const now = new Date().toISOString();

        const data: ConversationSession = {
            uid,
            messages: messages.slice(-20), // 최근 20개 메시지만 저장 (토큰 절약)
            createdAt: now,
            updatedAt: now
        };

        await setDoc(docRef, data, { merge: true });

        // 프로필의 interactionCount 업데이트
        const profileRef = doc(db, COLLECTION_PROFILES, uid);
        const profile = await getDoc(profileRef);
        if (profile.exists()) {
            const currentCount = profile.data().interactionCount || 0;
            await updateDoc(profileRef, { interactionCount: currentCount + 1 });
        }
    },

    /**
     * Load previous conversation from Firebase
     */
    async loadConversation(uid: string): Promise<ConversationMessage[]> {
        const docRef = doc(db, COLLECTION_CONVERSATIONS, uid);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
            const data = snap.data() as ConversationSession;
            return data.messages || [];
        }
        return [];
    },

    /**
     * Generate conversation context summary for system prompt
     */
    async getConversationContext(uid: string): Promise<string> {
        const messages = await this.loadConversation(uid);
        if (messages.length === 0) return "";

        // 최근 5개 대화만 요약용으로 사용
        const recentMessages = messages.slice(-5);
        const summary = recentMessages
            .map(m => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content.slice(0, 50)}...`)
            .join(' / ');

        return summary;
    },

    /**
     * Update last conversation summary
     */
    async updateConversationSummary(uid: string, summary: string) {
        const docRef = doc(db, COLLECTION_PROFILES, uid);
        await updateDoc(docRef, {
            lastConversationSummary: summary
        });
    }
};
