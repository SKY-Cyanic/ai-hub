import { CreateMLCEngine, MLCEngine, InitProgressCallback } from "@mlc-ai/web-llm";

// Qwen2.5-1.5B is a lightweight model suitable for mobile/browser inference
const SELECTED_MODEL = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";

export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

class WebLLMService {
    private engine: MLCEngine | null = null;
    private _isReady: boolean = false;
    private initPromise: Promise<void> | null = null;

    /**
     * Initialize the WebLLM engine with the selected model.
     * Downloads the model if not cached.
     */
    async initialize(onProgress: InitProgressCallback): Promise<void> {
        if (this._isReady) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                this.engine = await CreateMLCEngine(SELECTED_MODEL, {
                    initProgressCallback: onProgress,
                    logLevel: "INFO",
                });
                this._isReady = true;
            } catch (error) {
                console.error("WebLLM Init Error:", error);
                this.initPromise = null; // Allow retry
                throw error;
            }
        })();

        return this.initPromise;
    }

    /**
     * Stream a chat completion.
     */
    async streamChat(
        messages: ChatMessage[],
        onUpdate: (currentFullText: string, delta: string) => void
    ): Promise<string> {
        if (!this.engine || !this._isReady) {
            throw new Error("Model is not ready.");
        }

        const completion = await this.engine.chat.completions.create({
            messages,
            stream: true,
            temperature: 0.7,
            max_tokens: 256, // Keep responses concise for real-time feel
        });

        let fullText = "";
        for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta?.content || "";
            if (delta) {
                fullText += delta;
                onUpdate(fullText, delta);
            }
        }
        return fullText;
    }

    /**
     * Check if WebGPU is available in this environment.
     */
    async checkWebGPUSupport(): Promise<boolean> {
        if (!navigator.gpu) return false;
        try {
            const adapter = await navigator.gpu.requestAdapter();
            return !!adapter;
        } catch (e) {
            return false;
        }
    }

    isReady(): boolean {
        return this._isReady;
    }
}

export const webLLMService = new WebLLMService();
