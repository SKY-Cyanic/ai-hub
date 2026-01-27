/**
 * Hugging Face Inference API Client
 * Supports various models and task types.
 */

export type HFTaskType = 'text-to-image' | 'text-to-speech' | 'object-detection' | 'text-generation' | 'image-to-text';

export interface HFOptions {
    model: string;
    inputs: any;
    parameters?: any;
}

export class HuggingFaceClient {
    private apiKey: string;
    private baseUrl = 'https://api-inference.huggingface.co/models';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * General request to HF Inference API
     */
    async request(modelId: string, inputs: any, parameters?: any): Promise<any> {
        const response = await fetch(`${this.baseUrl}/${modelId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ inputs, parameters }),
        });

        if (!response.ok) {
            if (response.status === 503) {
                throw new Error('모델이 로드 중입니다. 잠시 후 다시 시도해주세요.');
            }
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `HF API Error: ${response.status}`);
        }

        // Binary response (Images, Audio) or JSON
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
            return response.json();
        } else {
            const blob = await response.blob();
            return URL.createObjectURL(blob);
        }
    }

    /**
     * helper for text-to-image
     */
    async textToImage(modelId: string, prompt: string): Promise<string> {
        return this.request(modelId, prompt);
    }
}

let hfClientInstance: HuggingFaceClient | null = null;

export function getHFClient(): HuggingFaceClient {
    if (!hfClientInstance) {
        const apiKey = (import.meta as any).env?.VITE_HF_API_KEY || '';
        if (!apiKey) {
            console.warn('VITE_HF_API_KEY가 설정되지 않았습니다.');
        }
        hfClientInstance = new HuggingFaceClient(apiKey);
    }
    return hfClientInstance;
}
