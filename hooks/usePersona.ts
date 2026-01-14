import { useState, useEffect, useCallback, useRef } from "react";
import { webLLMService, ChatMessage } from "../services/webllm";
import { MemoryService, UserPersonaProfile } from "../services/memory";
import { auth } from "../services/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

export interface PersonaState {
    isModelLoading: boolean;
    initProgress: string;
    isReady: boolean;
    messages: ChatMessage[];
    userProfile: UserPersonaProfile | null;
    error: string | null;
}

export const usePersona = () => {
    const [state, setState] = useState<PersonaState>({
        isModelLoading: false,
        initProgress: "",
        isReady: false,
        messages: [],
        userProfile: null,
        error: null,
    });

    const [user, setUser] = useState<User | null>(null);
    const audioContextReceived = useRef(false); // To ensure we don't start before interaction if needed, but here we just check readiness.

    // 1. Auth & Profile Sync
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                try {
                    const profile = await MemoryService.getUserProfile(currentUser.uid);
                    setState((prev) => ({ ...prev, userProfile: profile }));
                } catch (e) {
                    console.error("Failed to load persona profile", e);
                }
            }
        });
        return () => unsubscribe();
    }, []);

    // 2. Initialize Model (Lazy load or auto load?)
    // For better UX, we might wait for user to click "Connect", but let's provide a start function.
    const startPersona = useCallback(async () => {
        if (state.isReady || state.isModelLoading) return;

        setState((prev) => ({ ...prev, isModelLoading: true, error: null }));

        try {
            const isCompatible = await webLLMService.checkWebGPUSupport();
            if (!isCompatible) {
                throw new Error("WebGPU is not supported on this device.");
            }

            await webLLMService.initialize((progress) => {
                setState((prev) => ({
                    ...prev,
                    initProgress: progress.text,
                }));
            });

            setState((prev) => ({
                ...prev,
                isModelLoading: false,
                isReady: true,
                // Initial greeting could be injected here
            }));

            // Send initial system prompt and greeting if empty
            // We do this silently or showing a "Connected" message
        } catch (err: any) {
            setState((prev) => ({
                ...prev,
                isModelLoading: false,
                error: err.message || "Failed to load AI model.",
            }));
        }
    }, [state.isReady, state.isModelLoading]);

    // 3. Send Message
    const sendMessage = useCallback(async (text: string) => {
        if (!state.isReady || !user) return;

        // Add User Message
        const userMsg: ChatMessage = { role: "user", content: text };
        setState((prev) => ({
            ...prev,
            messages: [...prev.messages, userMsg],
        }));

        try {
            // Build System Prompt with Memory
            const systemPrompt = await MemoryService.buildSystemPrompt(user.uid);

            // Prepare messages context (System + History)
            // Note: We might want to limit history size for tokens
            const contextMessages: ChatMessage[] = [
                { role: "system", content: systemPrompt },
                ...state.messages, // Previous history
                userMsg // Current message
            ];

            // Temporary AI placeholder for streaming
            setState((prev) => ({
                ...prev,
                messages: [...prev.messages, { role: "assistant", content: "" }]
            }));

            await webLLMService.streamChat(contextMessages, (fullText, delta) => {
                setState((prev) => {
                    const newMessages = [...prev.messages];
                    // Update the last message (AI response)
                    // Note: Optimistic update assumes the last message is the one we added above
                    // Ideally we track ID, but index -1 is likely safe here for single stream
                    newMessages[newMessages.length - 1] = { role: "assistant", content: fullText };
                    return { ...prev, messages: newMessages };
                });
            });

            // Save memory logic?
            // Maybe summarize after N turns.

        } catch (err: any) {
            // Handle error (maybe remove the empty bubble or show error)
            console.error("Chat Error", err);
        }
    }, [state.isReady, state.messages, user]);

    return {
        state,
        startPersona,
        sendMessage,
        user
    };
};
