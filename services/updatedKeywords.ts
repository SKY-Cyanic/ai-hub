// curatorService.ts에서 사용할 키워드 업데이트 (reddit keyword.md 기반)
// 이 파일을 curatorService.ts의 KEYWORD_CATEGORIES에 복사하세요

export const UPDATED_KEYWORDS = [
    {
        name: 'AI Model & Algorithms',
        weight: 2.5,
        keywords: [
            // Core Models & Concepts
            'llm', 'large language model', 'gpt', 'transformer', 'attention mechanism',
            'diffusion model', 'moe', 'mixture of experts', 'slm', 'small language model',
            'multimodal', 'agi', 'artificial general intelligence', 'asi',
            'generative ai', 'hallucination', 'context window',
            // Techniques
            'rag', 'retrieval-augmented generation', 'fine-tuning', 'pre-training',
            'inference', 'zero-shot', 'few-shot', 'chain-of-thought', 'cot',
            'rlhf', 'reinforcement learning from human feedback', 'dpo',
            'direct preference optimization', 'prompt engineering',
            'quantization', 'pruning', 'distillation', 'model collapse', 'synthetic data',
            // Technical Terms
            'weights', 'parameters', 'hyperparameters', 'loss function',
            'gradient descent', 'backpropagation', 'overfitting', 'underfitting',
            'bias', 'tokenization', 'embeddings', 'vector database', 'knowledge graph',
            // AI Systems
            'agents', 'autonomous', 'reasoning', 'alignment', 'safety',
            // Companies & Models
            'openai', 'anthropic', 'claude', 'gemini', 'copilot', 'chatgpt',
            'llama', 'mistral', 'qwen', 'deepseek', 'grok', 'deepmind'
        ]
    },
    {
        name: 'Semiconductor & Hardware',
        weight: 2.0,
        keywords: [
            // Processors
            'gpu', 'cpu', 'npu', 'neural processing unit', 'tpu', 'tensor processing unit',
            'fpga', 'asic', 'x86', 'arm', 'risc-v', 'isa',
            // Architecture
            'architecture', 'microarchitecture', 'core', 'thread', 'clock speed',
            'ipc', 'cache', 'l1', 'l2', 'l3', 'latency', 'bandwidth', 'throughput',
            'flops', 'floating point operations', 'tops', 'tera operations',
            // Interconnect
            'pcie', 'nvlink', 'cxl', 'compute express link', 'infinity fabric',
            'serdes', 'bus width',
            // Components
            'die', 'wafer', 'chiplet', 'soc', 'system on chip',
            'heterogeneous computing', 'logic gate', 'transistor',
            'finfet', 'gaa', 'gate-all-around', 'mbcfet',
            'backside power', 'bspdn', 'dark silicon',
            // Companies
            'nvidia', 'team green', 'amd', 'team red', 'intel', 'team blue',
            'arm', 'qualcomm', 'broadcom', 'marvell'
        ]
    },
    {
        name: 'Memory & Storage',
        weight: 1.8,
        keywords: [
            // High Performance Memory
            'hbm', 'high bandwidth memory', 'hbm2e', 'hbm3', 'hbm3e', 'hbm4',
            'gddr6', 'gddr6x', 'gddr7', 'lpddr5x', 'ddr5',
            // Memory Types
            'dram', 'sram', 'vram', 'memory wall', 'memory bandwidth',
            'capacity', 'ecc', 'error correction code',
            // Storage
            'nand flash', 'ssd', 'storage class memory', '3d nand',
            // Technology
            'stacking', 'tsv', 'through-silicon via', 'hybrid bonding',
            'pim', 'processing-in-memory', 'caching', 'buffer', 'prefetching',
            // Companies
            'sk hynix', 'micron', 'samsung electronics'
        ]
    },
    {
        name: 'Manufacturing & Packaging',
        weight: 1.7,
        keywords: [
            // Business Models
            'foundry', 'fab', 'fabless', 'idm', 'integrated device manufacturer',
            // Lithography
            'lithography', 'euv', 'extreme ultraviolet', 'high-na euv', 'duv',
            // Process Nodes
            'node', 'process node', '3nm', '2nm', '1.8nm', '18a', 'angstrom',
            // Manufacturing
            'yield', 'defect density', 'binning', 'silicon lottery',
            'wafer start', 'tape-out', 'mask', 'photoresist',
            'etching', 'deposition', 'annealing',
            // Advanced Packaging
            'packaging', 'advanced packaging', 'cowos', 'chip-on-wafer',
            'info', 'integrated fan-out', 'emib', 'foveros', 'interposer',
            'substrate', 'bump', 'solder ball', 'heat spreader',
            'tim', 'thermal interface material',
            // Cooling
            'liquid cooling', 'immersion cooling', 'tco', 'total cost of ownership',
            // Companies
            'tsmc', 'samsung foundry', 'intel foundry',
            'asml', 'applied materials', 'lam research', 'kla'
        ]
    },
    {
        name: 'Frameworks & Tools',
        weight: 1.5,
        keywords: [
            // ML Frameworks
            'pytorch', 'tensorflow', 'jax', 'keras', 'onnx',
            // GPU/AI APIs
            'cuda', 'rocm', 'oneapi', 'tensorrt', 'triton', 'vllm',
            // AI Libraries
            'langchain', 'llamaindex', 'hugging face', 'huggingface',
            // Dev Tools
            'github', 'copilot', 'docker', 'kubernetes', 'slurm',
            'mpi', 'message passing interface', 'nccl',
            // Languages
            'python', 'c++', 'mojo', 'rust', 'julia', 'compiler',
            'kernel', 'drivers', 'bios', 'firmware',
            // General
            'api', 'sdk', 'framework', 'library', 'open source',
            'proprietary', 'licensing',
            // EDA Tools
            'synopsys', 'cadence'
        ]
    },
    {
        name: 'Industry & Market',
        weight: 1.6,
        keywords: [
            // Tech Giants
            'microsoft', 'azure', 'aws', 'amazon web services',
            'google', 'deepmind', 'meta', 'fair', 'tesla', 'dojo',
            'apple', 'silicon',
            // AI Startups
            'cerebras', 'graphcore', 'groq', 'smic',
            // Business Terms
            'startup', 'startups', 'unicorn', 'ipo', 'market cap',
            'earnings', 'guidance', 'capex', 'capital expenditure',
            'supply chain', 'shortage', 'inventory', 'glut',
            'funding', 'acquisition', 'venture capital', 'stock',
            // Policy & Geopolitics
            'geopolitics', 'chips act', 'export controls', 'trade war',
            'sanctions', 'sovereign ai',
            // Infrastructure
            'hyperscaler', 'data center', 'edge ai', 'on-device ai',
            'cloud computing', 'saas', 'paas', 'iaas',
            'edge computing', 'silicon valley', 'tech news'
        ]
    },
    {
        name: 'Research & Community',
        weight: 1.4,
        keywords: [
            // ML Methods
            'deep learning', 'neural network', 'cnn', 'rnn', 'lstm',
            'gan', 'generative adversarial network', 'vae',
            'reinforcement learning', 'supervised', 'unsupervised',
            'self-supervised', 'transfer learning', 'meta-learning',
            // Domains
            'computer vision', 'nlp', 'natural language processing',
            'speech', 'robotics',
            // Research
            'arxiv', 'paper', 'research', 'benchmark', 'dataset',
            'model', 'training',
            // Community Slang
            'moat', 'fud', 'fear uncertainty doubt', 'fomo',
            'fear of missing out', 'hype', 'vaporware', 'paper launch',
            'bottleneck', 'scalping', 'scalability', 'robustness',
            'sota', 'state of the art', 'deprecated', 'legacy',
            'vanilla', 'glitch', 'artifacts', 'uncanny valley',
            'doomer', 'accelerationist', 'e/acc',
            // Figures
            'jensen huang', 'jensen', 'lisa su', 'sam altman', 'altman',
            'mark zuckerberg', 'zuck', 'bagholder', 'dd', 'due diligence'
        ]
    }
];
