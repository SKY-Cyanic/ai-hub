/**
 * Groq API 클라이언트
 * Qwen3-32B (AI 친구), GPT-OSS-120B (바이브 코딩) 모델 지원
 */

export type GroqModel = 'qwen/qwen3-32b' | 'llama-3.3-70b-versatile' | 'openai/gpt-oss-120b';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface GroqChatOptions {
    model: GroqModel;
    messages: ChatMessage[];
    max_tokens?: number;
    temperature?: number;
    stream?: boolean;
}

export interface GroqResponse {
    id: string;
    choices: {
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }[];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

// Groq API 무료 플랜 제한 관리
const RATE_LIMIT_STORAGE_KEY = 'groq_rate_limit';

interface RateLimitInfo {
    count: number;
    resetTime: number;
}

function getRateLimitInfo(): RateLimitInfo {
    try {
        const stored = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
        if (stored) {
            const info = JSON.parse(stored);
            if (Date.now() > info.resetTime) {
                // 리셋 시간 지남 - 초기화
                return { count: 0, resetTime: Date.now() + 60000 }; // 1분 후 리셋
            }
            return info;
        }
    } catch (e) {
        console.error('Rate limit info parse error:', e);
    }
    return { count: 0, resetTime: Date.now() + 60000 };
}

function incrementRateLimit(): void {
    const info = getRateLimitInfo();
    info.count++;
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(info));
}

export class GroqClient {
    private apiKey: string;
    private baseUrl = 'https://api.groq.com/openai/v1';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * 일반 채팅 완성 (비스트리밍)
     */
    async chat(options: GroqChatOptions): Promise<GroqResponse> {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: options.model,
                messages: options.messages,
                max_tokens: options.max_tokens || 1024,
                temperature: options.temperature ?? 0.7,
                stream: false,
            }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            if (response.status === 429) {
                throw new Error('API 요청 한도 초과! 잠시 후 다시 시도해주세요.');
            }
            throw new Error(error.error?.message || `API 오류: ${response.status}`);
        }

        incrementRateLimit();
        return response.json();
    }

    /**
     * 스트리밍 채팅 완성
     */
    async streamChat(
        options: GroqChatOptions,
        onChunk: (text: string, fullText: string) => void
    ): Promise<string> {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: options.model,
                messages: options.messages,
                max_tokens: options.max_tokens || 1024,
                temperature: options.temperature ?? 0.7,
                stream: true,
            }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            if (response.status === 429) {
                throw new Error('API 요청 한도 초과! 잠시 후 다시 시도해주세요.');
            }
            throw new Error(error.error?.message || `API 오류: ${response.status}`);
        }

        incrementRateLimit();

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        if (!reader) throw new Error('스트림을 읽을 수 없습니다.');

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(data);
                        const delta = parsed.choices?.[0]?.delta?.content || '';
                        if (delta) {
                            fullText += delta;
                            onChunk(delta, fullText);
                        }
                    } catch (e) {
                        // JSON 파싱 실패 무시
                    }
                }
            }
        }

        return fullText;
    }

    /**
     * 현재 rate limit 상태 확인
     */
    checkQuota(): { remaining: number; resetIn: number } {
        const info = getRateLimitInfo();
        const resetIn = Math.max(0, Math.floor((info.resetTime - Date.now()) / 1000));
        // 무료 플랜 기준 분당 약 30개 요청 가정
        const remaining = Math.max(0, 30 - info.count);
        return { remaining, resetIn };
    }
}

// 싱글톤 인스턴스 (환경 변수에서 키 로드)
let groqClientInstance: GroqClient | null = null;

export function getGroqClient(): GroqClient {
    if (!groqClientInstance) {
        // Vite 환경변수 또는 process.env에서 로드
        const apiKey = (import.meta as any).env?.VITE_GROQ_API_KEY
            || (typeof process !== 'undefined' && process.env?.GROQ_API_KEY)
            || '';

        if (!apiKey) {
            console.warn('GROQ_API_KEY가 설정되지 않았습니다. .env.local 파일을 확인하세요.');
        }

        groqClientInstance = new GroqClient(apiKey);
    }
    return groqClientInstance;
}

// 직접 API 키로 클라이언트 생성 (서버사이드 등에서 사용)
export function createGroqClient(apiKey: string): GroqClient {
    return new GroqClient(apiKey);
}
