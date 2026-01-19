/**
 * AI Curator Service - Phase 4
 * 트렌딩 토픽을 자동으로 발견하고 리서치 후 게시
 * 
 * UPDATED: reddit keyword.md 기반 키워드 완전 반영
 */

import { getGroqClient } from './groqClient';
import { ResearchService } from './researchService';
import { PostIntegrationService } from './postIntegrationService';
import { storage } from './storage';

export interface TrendingTopic {
    title: string;
    source: 'reddit' | 'hackernews' | 'wikipedia';
    url: string;
    score: number;
    category: string;
    timestamp: number;
    subreddit?: string;
}

export interface CuratorConfig {
    enabled: boolean;
    intervalHours: number;
    maxPostsPerDay: number;
    targetBoards: string[];
    minScore: number;
}

export interface CuratorLog {
    id: string;
    timestamp: number;
    topic: string;
    source: string;
    status: 'success' | 'failed' | 'skipped';
    reason?: string;
    postId?: string;
}

const DEFAULT_CONFIG: CuratorConfig = {
    enabled: false,
    intervalHours: 6,
    maxPostsPerDay: 3,
    targetBoards: ['지식 허브'],
    minScore: 100
};

const TRENDING_SUBREDDITS = [
    'technology',
    'science',
    'artificial',
    'programming',
    'MachineLearning',
    'worldnews'
];

const AI_CURATOR_USER_ID = 'ai_curator_bot';

interface KeywordCategory {
    name: string;
    keywords: string[];
    weight: number;
}

// ✅ reddit keyword.md 기반 완전 업데이트 키워드
const KEYWORD_CATEGORIES: KeywordCategory[] = [
    {
        name: 'AI Model & Algorithms',
        weight: 2.5,
        keywords: [
            'llm', 'large language model', 'gpt', 'chatgpt', 'gpt-4', 'gpt-3',
            'transformer', 'attention', 'diffusion', 'stable diffusion', 'moe', 'mixture of experts',
            'agi', 'asi', 'generative ai', 'hallucination', 'context window',
            'rag', 'retrieval', 'fine-tuning', 'inference', 'zero-shot', 'few-shot',
            'chain-of-thought', 'cot', 'rlhf', 'dpo', 'prompt engineering',
            'quantization', 'pruning', 'distillation', 'synthetic data',
            'weights', 'parameters', 'embeddings', 'tokenization',
            'openai', 'anthropic', 'claude', 'gemini', 'copilot', 'llama', 'mistral',
            'qwen', 'deepseek', 'grok', 'bard'
        ]
    },
    {
        name: 'Semiconductor & Hardware',
        weight: 2.0,
        keywords: [
            'gpu', 'cpu', 'npu', 'tpu', 'fpga', 'asic',
            'nvidia', 'team green', 'amd', 'team red', 'intel', 'team blue',
            'qualcomm', 'broadcom', 'arm', 'risc-v',
            'chip', 'semiconductor', 'transistor', 'finfet', 'gaa',
            'architecture', 'core', 'cache', 'bandwidth', 'throughput',
            'flops', 'tops', 'pcie', 'nvlink', 'cxl',
            'wafer', 'chiplet', 'soc', 'die'
        ]
    },
    {
        name: 'Memory & Storage',
        weight: 1.8,
        keywords: [
            'hbm', 'hbm2', 'hbm3', 'hbm4', 'high bandwidth memory',
            'gddr6', 'gddr7', 'ddr5', 'dram', 'sram', 'vram',
            'memory wall', 'memory bandwidth',
            'nand', '3d nand', 'ssd', 'storage',
            'sk hynix', 'micron', 'samsung memory'
        ]
    },
    {
        name: 'Manufacturing & Packaging',
        weight: 1.7,
        keywords: [
            'tsmc', 'samsung foundry', 'intel foundry',
            'foundry', 'fab', 'fabless',
            'euv', 'extreme ultraviolet', 'lithography',
            '3nm', '2nm', '1.8nm', 'angstrom', 'node',
            'yield', 'packaging', 'cowos', 'foveros',
            'asml', 'applied materials', 'lam research'
        ]
    },
    {
        name: 'Frameworks & Tools',
        weight: 1.5,
        keywords: [
            'pytorch', 'tensorflow', 'jax', 'keras',
            'cuda', 'rocm', 'triton', 'tensorrt',
            'hugging face', 'langchain', 'llamaindex', 'vllm',
            'github', 'github copilot', 'docker', 'kubernetes',
            'python', 'rust', 'c++', 'compiler'
        ]
    },
    {
        name: 'Industry & Market',
        weight: 1.6,
        keywords: [
            'microsoft', 'azure', 'aws', 'google cloud', 'gcp',
            'meta', 'facebook', 'tesla', 'apple', 'amazon',
            'deepmind', 'fair', 'cerebras', 'graphcore', 'groq',
            'startup', 'unicorn', 'ipo', 'funding', 'acquisition',
            'market cap', 'earnings', 'stock', 'capex',
            'chips act', 'export control', 'geopolitics',
            'data center', 'hyperscaler', 'edge ai', 'cloud computing'
        ]
    },
    {
        name: 'Research & Community',
        weight: 1.4,
        keywords: [
            'deep learning', 'neural network', 'machine learning', 'ai',
            'cnn', 'rnn', 'gan', 'reinforcement learning',
            'computer vision', 'nlp', 'natural language',
            'arxiv', 'paper', 'research', 'benchmark', 'sota',
            'jensen huang', 'jensen', 'sam altman', 'altman',
            'lisa su', 'zuck', 'mark zuckerberg',
            'moat', 'fud', 'fomo', 'hype'
        ]
    }
];

console.log(`🎯 Curator loaded with ${KEYWORD_CATEGORIES.reduce((sum, cat) => sum + cat.keywords.length, 0)} keywords`);

export const CuratorService = {
// ... rest of the file stays the same
