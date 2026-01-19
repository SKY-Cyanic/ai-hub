/**
 * 지능형 키워드 매칭 헬퍼 - Phase 4 Enhancement
 * CuratorService에서 사용하는 키워드 매칭 로직
 */

import { KEYWORD_CATEGORIES } from './curatorService';

export interface KeywordCategory {
    name: string;
    keywords: string[];
    weight: number;
}

/**
 * 제목이 관련성 있는 토픽인지 확인 (필터링)
 */
export function isRelevantTopic(title: string): boolean {
    const lowerTitle = title.toLowerCase();

    // 키워드 카테고리에 하나라도 매칭되면 관련성 있음
    const KEYWORD_CATEGORIES: KeywordCategory[] = [
        {
            name: 'AI Model & Algorithms',
            weight: 2.5,
            keywords: [
                'llm', 'gpt', 'transformer', 'attention', 'diffusion', 'moe', 'slm', 'multimodal',
                'agi', 'asi', 'generative ai', 'hallucination', 'rag', 'fine-tuning', 'inference',
                'zero-shot', 'few-shot', 'chain-of-thought', 'cot', 'rlhf', 'dpo', 'prompt engineering',
                'quantization', 'pruning', 'distillation', 'synthetic data', 'openai', 'anthropic',
                'claude', 'gemini', 'copilot', 'chatgpt', 'llama', 'mistral', 'qwen', 'deepseek'
            ]
        },
        {
            name: 'Semiconductor & Hardware',
            weight: 2.0,
            keywords: [
                'gpu', 'cpu', 'npu', 'tpu', 'fpga', 'asic', 'nvidia', 'amd', 'intel',
                'tsmc', 'samsung', 'hbm', 'gddr', 'chip', 'semiconductor', 'foundry',
                'euv', '3nm', '2nm', 'wafer', 'chiplet', 'soc', 'transistor', 'finfet',
                'memory', 'bandwidth', 'flops', 'tops', 'cuda', 'rocm', 'tensor core'
            ]
        }
    ];

    for (const category of KEYWORD_CATEGORIES) {
        for (const keyword of category.keywords) {
            if (lowerTitle.includes(keyword)) {
                return true;
            }
        }
    }

    // 제외할 토픽 (노이즈 필터링)
    const excludeKeywords = [
        'nsfw', 'porn', 'xxx', 'dating', 'casino', 'gambling',
        'meme', 'joke', 'funny', 'cute', 'aww', 'wholesome',
        'recipe', 'cooking', 'food', 'sports', 'gaming', 'game',
        'music', 'movie', 'tv show', 'celebrity', 'fashion'
    ];

    for (const exclude of excludeKeywords) {
        if (lowerTitle.includes(exclude)) {
            return false;
        }
    }

    return false;
}

/**
 * 관련성 가중치 계산
 */
export function getRelevanceWeight(title: string): number {
    const lowerTitle = title.toLowerCase();
    let maxWeight = 1.0;
    let matchCount = 0;

    const KEYWORD_CATEGORIES: KeywordCategory[] = [
        {
            name: 'AI Model & Algorithms',
            weight: 2.5,
            keywords: [
                'llm', 'gpt', 'transformer', 'diffusion', 'rag', 'openai', 'anthropic',
                'claude', 'gemini', 'chatgpt', 'llama', 'mistral'
            ]
        },
        {
            name: 'Semiconductor',
            weight: 2.0,
            keywords: ['gpu', 'cpu', 'nvidia', 'amd', 'intel', 'tsmc', 'chip']
        }
    ];

    for (const category of KEYWORD_CATEGORIES) {
        for (const keyword of category.keywords) {
            if (lowerTitle.includes(keyword)) {
                if (category.weight > maxWeight) {
                    maxWeight = category.weight;
                }
                matchCount++;

                if (matchCount > 1) {
                    maxWeight = Math.min(maxWeight * 1.2, category.weight * 1.5);
                }
                break;
            }
        }
    }

    return maxWeight;
}
