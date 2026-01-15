import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, query, where, orderBy, limit, getDocs, deleteDoc, increment } from "firebase/firestore";

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
    currentSessionId?: string;
}

export interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    imageUrl?: string; // 이미지 첨부용
}

export interface ConversationSession {
    id?: string;
    uid: string;
    personaName: string;
    messages: ConversationMessage[];
    createdAt: string;
    updatedAt: string;
}

export interface CustomPersona {
    id?: string;
    creatorId: string;
    creatorName: string;
    name: string;
    description: string;
    prompt: string;
    icon: string;
    isShared: boolean;
    downloads: number;
    likes: number;
    likedUsers: string[];
    createdAt: string;
}

const COLLECTION_PROFILES = "persona_profiles";
const COLLECTION_CONVERSATIONS = "persona_conversations";
const COLLECTION_SESSIONS = "persona_sessions";
const COLLECTION_CUSTOM_PERSONAS = "custom_personas";
const COLLECTION_SHARED_PERSONAS = "shared_personas";

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
    async saveConversation(uid: string, messages: ConversationMessage[], sessionId?: string) {
        if (messages.length === 0) return;

        const docId = sessionId || uid;
        const docRef = doc(db, COLLECTION_CONVERSATIONS, docId);
        const now = new Date().toISOString();

        const data: ConversationSession = {
            uid,
            personaName: '',
            messages: messages.slice(-30), // 최근 30개 메시지 저장
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
    async loadConversation(uid: string, sessionId?: string): Promise<ConversationMessage[]> {
        const docId = sessionId || uid;
        const docRef = doc(db, COLLECTION_CONVERSATIONS, docId);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
            const data = snap.data() as ConversationSession;
            return data.messages || [];
        }
        return [];
    },

    /**
     * Clear current conversation (새 대화)
     */
    async clearConversation(uid: string, sessionId?: string) {
        const docId = sessionId || uid;
        const docRef = doc(db, COLLECTION_CONVERSATIONS, docId);
        await deleteDoc(docRef);
    },

    /**
     * Get conversation session list
     */
    async getConversationList(uid: string): Promise<ConversationSession[]> {
        const q = query(
            collection(db, COLLECTION_SESSIONS),
            where("uid", "==", uid),
            orderBy("updatedAt", "desc"),
            limit(20)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as ConversationSession));
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
    },

    // ============ 커스텀 캐릭터 관리 ============

    /**
     * Save custom persona
     */
    async saveCustomPersona(uid: string, creatorName: string, persona: Omit<CustomPersona, 'id' | 'creatorId' | 'creatorName' | 'isShared' | 'downloads' | 'likes' | 'likedUsers' | 'createdAt'>): Promise<string> {
        const docRef = await addDoc(collection(db, COLLECTION_CUSTOM_PERSONAS), {
            ...persona,
            creatorId: uid,
            creatorName,
            isShared: false,
            downloads: 0,
            likes: 0,
            likedUsers: [],
            createdAt: new Date().toISOString()
        });
        return docRef.id;
    },

    /**
     * Get my custom personas
     */
    async getMyPersonas(uid: string): Promise<CustomPersona[]> {
        const q = query(
            collection(db, COLLECTION_CUSTOM_PERSONAS),
            where("creatorId", "==", uid),
            orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomPersona));
    },

    /**
     * Delete custom persona
     */
    async deleteCustomPersona(personaId: string) {
        await deleteDoc(doc(db, COLLECTION_CUSTOM_PERSONAS, personaId));
    },

    /**
     * Share custom persona to community
     */
    async sharePersona(personaId: string) {
        await updateDoc(doc(db, COLLECTION_CUSTOM_PERSONAS, personaId), { isShared: true });
    },

    /**
     * Get shared personas (커뮤니티 갤러리)
     */
    async getSharedPersonas(): Promise<CustomPersona[]> {
        const q = query(
            collection(db, COLLECTION_CUSTOM_PERSONAS),
            where("isShared", "==", true),
            orderBy("likes", "desc"),
            limit(50)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomPersona));
    },

    /**
     * Like a shared persona
     */
    async likePersona(personaId: string, uid: string) {
        const docRef = doc(db, COLLECTION_CUSTOM_PERSONAS, personaId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const data = snap.data();
            const likedUsers = data.likedUsers || [];
            if (!likedUsers.includes(uid)) {
                await updateDoc(docRef, {
                    likes: (data.likes || 0) + 1,
                    likedUsers: [...likedUsers, uid]
                });
            }
        }
    },

    /**
     * Download/Use a shared persona
     */
    async downloadPersona(personaId: string): Promise<CustomPersona | null> {
        const docRef = doc(db, COLLECTION_CUSTOM_PERSONAS, personaId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            await updateDoc(docRef, { downloads: (snap.data().downloads || 0) + 1 });
            return { id: snap.id, ...snap.data() } as CustomPersona;
        }
        return null;
    }
};
