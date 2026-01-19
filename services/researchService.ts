import { SearchAPI, SearchResult } from './searchAPI';
import { getGroqClient } from './groqClient';

export interface ResearchSource {
    title: string;
    url: string;
    snippet: string;
    domain: string;
    trustScore: number; // 0-100
}

export interface ResearchReport {
    id: string;
    query: string;
    summary: string;
    detailedAnalysis: string;
    sources: ResearchSource[];
    prosAndCons: {
        pros: string[];
        cons: string[];
    };
    relatedTopics: string[];
    createdAt: string;
    searchProgress: SearchProgress[];
}

export interface SearchProgress {
    step: string;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    timestamp: Date;
    details?: string;
}

export const ResearchService = {
    /**
     * 리서치 수행 (검색 → 분석 → 리포트 생성)
     */
    async performResearch(
        query: string,
        onProgress?: (progress: SearchProgress) => void
    ): Promise<ResearchReport> {
        const progress: SearchProgress[] = [];
        const reportId = `research_${Date.now()}`;

        // 1. 검색 쿼리 최적화
        const updateProgress = (step: string, status: SearchProgress['status'], details?: string) => {
            const newProgress: SearchProgress = { step, status, timestamp: new Date(), details };
            progress.push(newProgress);
            if (onProgress) onProgress(newProgress);
        };

        updateProgress('검색 쿼리 최적화', 'in-progress');
        const optimizedQueries = await this.optimizeQuery(query);
        updateProgress('검색 쿼리 최적화', 'completed', `${optimizedQueries.length}개 쿼리 생성`);

        // 2. 웹 검색
        updateProgress('웹 검색 수행', 'in-progress');
        let searchResults: SearchResult[] = [];
        try {
            searchResults = await SearchAPI.multiSearch(optimizedQueries);
            updateProgress('웹 검색 수행', 'completed', `${searchResults.length}개 결과 발견`);
        } catch (error: any) {
            updateProgress('웹 검색 수행', 'failed', error.message);
            throw error;
        }

        // 3. 소스 분석 및 신뢰도 평가
        updateProgress('정보 분석', 'in-progress');
        const allSources: ResearchSource[] = searchResults.map(result => ({
            title: result.title,
            url: result.link,
            snippet: result.snippet,
            domain: result.displayLink,
            trustScore: this.calculateTrustScore(result.displayLink)
        }));

        // 🔴 신뢰할 수 있는 출처만 필터링 (trustScore >= 70)
        const sources = allSources
            .filter(s => s.trustScore >= 70)
            .sort((a, b) => b.trustScore - a.trustScore)
            .slice(0, 10); // 상위 10개

        if (sources.length === 0) {
            console.warn('⚠️ No reliable sources found!');
            updateProgress('정보 분석', 'failed', '신뢰할 수 있는 출처를 찾을 수 없음');
            throw new Error('신뢰할 수 있는 출처를 찾을 수 없습니다.');
        }

        console.log(`✅ Found ${sources.length} reliable sources (filtered from ${allSources.length})`);
        updateProgress('정보 분석', 'completed', `${sources.length}개 신뢰 출처`);

        // 4. AI 분석 및 리포트 생성 (교차 검증 강조)
        updateProgress('AI 리포트 생성', 'in-progress');
        const groqClient = getGroqClient();

        const analysisPrompt = `다음 **신뢰할 수 있는 출처**의 검색 결과를 바탕으로 "${query}"에 대한 객관적이고 균형잡힌 리포트를 작성해주세요.

🔍 검색 결과 (신뢰도 순):
${sources.map((s, i) => `${i + 1}. [${s.domain}] ${s.title}
   신뢰도: ${s.trustScore}점
   내용: ${s.snippet}
   URL: ${s.url}`).join('\n\n')}

📋 작성 지침:
- 여러 출처의 정보를 **교차 검증**하여 팩트만 작성
- 출처마다 다른 내용이 있으면 명시
- 편향된 표현 금지, 객관적 사실만
- 참고자료 링크를 **정확하게** 포함

다음 형식으로 작성해주세요:

# 요약
(핵심 내용을 3-4문장으로 요약)

# 상세 분석
(검색 결과를 종합하여 깊이 있는 분석 제공. 출처별 정보를 명시)

# 장점
- (첫 번째 장점)
- (두 번째 장점)

# 단점/우려사항
- (첫 번째 단점)
- (두 번째 단점)

# 참고자료
${sources.map((s, i) => `${i + 1}. [${s.title}](${s.url}) - ${s.domain}`).join('\n')}

# 관련 주제
- (관련 주제 1)
- (관련 주제 2)`;

        let reportContent = '';
        await groqClient.streamChat(
            {
                model: 'openai/gpt-oss-120b',
                messages: [{ role: 'user', content: analysisPrompt }],
                temperature: 0.7,
                max_tokens: 2048
            },
            (chunk, full) => {
                reportContent = full;
            }
        );

        // 리포트 파싱
        console.log('📄 Raw report content length:', reportContent.length);
        console.log('📄 Report preview:', reportContent.substring(0, 200));

        const parsed = this.parseReport(reportContent);

        // 파싱된 내용 검증
        if (!parsed.summary || parsed.summary.trim().length === 0) {
            console.warn('⚠️ Empty summary detected, using fallback');
            parsed.summary = '검색 결과를 바탕으로 한 분석이 생성되지 않았습니다.';
        }

        if (!parsed.analysis || parsed.analysis.trim().length === 0) {
            console.warn('⚠️ Empty analysis detected, using source snippets');
            parsed.analysis = sources.map((s, i) => `${i + 1}. **${s.title}**: ${s.snippet}`).join('\n\n');
        }

        updateProgress('AI 리포트 생성', 'completed');

        const report: ResearchReport = {
            id: reportId,
            query,
            summary: parsed.summary.trim(),
            detailedAnalysis: parsed.analysis.trim(),
            sources,
            prosAndCons: {
                pros: parsed.pros.length > 0 ? parsed.pros : ['정보를 수집했습니다'],
                cons: parsed.cons.length > 0 ? parsed.cons : ['추가 분석이 필요합니다']
            },
            relatedTopics: parsed.relatedTopics.length > 0 ? parsed.relatedTopics : [],
            createdAt: new Date().toISOString(),
            searchProgress: progress
        };

        // 로컬 스토리지에 저장
        this.saveReport(report);

        return report;
    },

    /**
     * 검색 쿼리 최적화 (교차 검증용)
     */
    async optimizeQuery(query: string): Promise<string[]> {
        const groqClient = getGroqClient();

        const prompt = `"${query}"에 대한 정보를 **신뢰할 수 있는 출처**에서 찾기 위한 3개의 검색 쿼리를 생성해주세요.
        
요구사항:
1. 각 쿼리는 다른 관점을 다뤄야 함 (편향 방지)
2. 학술 논문, 정부 자료, 뉴스 기사에서 검색 가능해야 함
3. 구체적이고 팩트 중심이어야 함

응답 형식:
1. (첫 번째 쿼리)
2. (두 번째 쿼리)
3. (세 번째 쿼리)`;

        let response = '';
        await groqClient.streamChat(
            {
                model: 'openai/gpt-oss-120b',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.5,
                max_tokens: 200
            },
            (chunk, full) => {
                response = full;
            }
        );

        // 쿼리 추출
        const queries = [query]; // 원본 쿼리 포함
        const lines = response.split('\n').filter(line => line.trim());

        lines.forEach(line => {
            const match = line.match(/^\d+\.\s*(.+)$/);
            if (match && match[1]) {
                queries.push(match[1].trim());
            }
        });

        return queries.slice(0, 4); // 최대 4개
    },

    /**
     * 도메인 신뢰도 점수 계산 (신뢰할 수 있는 출처만!)
     * 나무위키, 개인 블로그 등은 낮은 점수
     */
    calculateTrustScore(domain: string): number {
        const lowerDomain = domain.toLowerCase();

        // 🔴 차단 목록 (신뢰 불가)
        const blockedSources = [
            'namu.wiki', 'namuwiki', '나무위키',
            'tistory.com', 'blog.naver', 'brunch.co.kr',
            'medium.com', 'velog.io', 'tstory.com'
        ];

        if (blockedSources.some(blocked => lowerDomain.includes(blocked))) {
            return 0; // 차단!
        }

        // ✅ 최고 신뢰도 (95-100점) - 정부/공공/학술
        const highestTrust = [
            // 정부 기관
            '.gov', '.go.kr', 'whitehouse.gov', 'europa.eu',
            // 학술 기관
            '.edu', '.ac.kr', 'scholar.google',
            // 학술 출판
            'arxiv.org', 'nature.com', 'science.org', 'ieee.org',
            'acm.org', 'springer.com', 'sciencedirect.com',
            'pubmed.ncbi.nlm.nih.gov', 'doi.org'
        ];

        for (const trusted of highestTrust) {
            if (lowerDomain.includes(trusted)) return 100;
        }

        // ✅ 고 신뢰도 (85-94점) - 주요 뉴스/경제 기관
        const highTrust = [
            // 국내 주요 언론
            'chosun.com', 'joongang.co.kr', 'donga.com',
            'hani.co.kr', 'yonhapnews.co.kr', 'yna.co.kr',
            // 경제 언론
            'mk.co.kr', 'hankyung.com', 'edaily.co.kr',
            'bloter.net', 'zdnet.co.kr', 'etnews.com',
            // 해외 주요 언론
            'reuters.com', 'bloomberg.com', 'wsj.com',
            'ft.com', 'economist.com', 'forbes.com',
            'nytimes.com', 'theguardian.com', 'bbc.com',
            // 기술 언론
            'techcrunch.com', 'theverge.com', 'wired.com',
            'arstechnica.com', 'engadget.com'
        ];

        for (const trusted of highTrust) {
            if (lowerDomain.includes(trusted)) return 90;
        }

        // ✅ 중 신뢰도 (70-84점) - 기업 공식 사이트
        const mediumTrust = [
            // 빅테크 공식
            'nvidia.com', 'amd.com', 'intel.com',
            'openai.com', 'anthropic.com', 'google.com',
            'microsoft.com', 'apple.com', 'meta.com',
            // 연구소
            'deepmind.com', 'research.ibm.com'
        ];

        for (const trusted of mediumTrust) {
            if (lowerDomain.includes(trusted)) return 80;
        }

        // ⚠️ 낮은 신뢰도 (40-69점) - 일반 사이트
        if (lowerDomain.endsWith('.org')) return 60;
        if (lowerDomain.endsWith('.com')) return 50;

        // ❌ 기타 (40점 이하)
        return 40;
    },

    /**
     * AI 리포트 파싱
     */
    parseReport(content: string): {
        summary: string;
        analysis: string;
        pros: string[];
        cons: string[];
        relatedTopics: string[];
    } {
        const sections = {
            summary: '',
            analysis: '',
            pros: [] as string[],
            cons: [] as string[],
            relatedTopics: [] as string[]
        };

        const lines = content.split('\n');
        let currentSection = '';

        console.log('🔍 Parsing report, total lines:', lines.length);

        for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.startsWith('# 요약')) {
                currentSection = 'summary';
                console.log('📝 Found summary section');
            } else if (trimmed.startsWith('# 상세 분석') || trimmed.startsWith('# 분석') || trimmed.startsWith('# 상세')) {
                currentSection = 'analysis';
                console.log('🔍 Found analysis section');
            } else if (trimmed.startsWith('# 장점')) {
                currentSection = 'pros';
                console.log('✅ Found pros section');
            } else if (trimmed.startsWith('# 단점') || trimmed.startsWith('# 우려')) {
                currentSection = 'cons';
                console.log('⚠️ Found cons section');
            } else if (trimmed.startsWith('# 관련')) {
                currentSection = 'related';
                console.log('🔗 Found related topics section');
            } else if (trimmed && !trimmed.startsWith('#')) {
                if (currentSection === 'summary' || currentSection === 'analysis') {
                    sections[currentSection] += line + '\n';
                } else if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•')) {
                    const item = trimmed.replace(/^[-*•]\s*/, '').trim();
                    if (item) {
                        if (currentSection === 'pros') sections.pros.push(item);
                        else if (currentSection === 'cons') sections.cons.push(item);
                        else if (currentSection === 'related') sections.relatedTopics.push(item);
                    }
                }
            }
        }

        console.log('📊 Parsed sections:', {
            summary: sections.summary.length,
            analysis: sections.analysis.length,
            pros: sections.pros.length,
            cons: sections.cons.length,
            related: sections.relatedTopics.length
        });

        return sections;
    },

    /**
     * 리포트 저장
     */
    saveReport(report: ResearchReport): void {
        const reports = this.getReports();
        reports.unshift(report); // 최신순
        localStorage.setItem('research_reports', JSON.stringify(reports.slice(0, 20))); // 최근 20개만
    },

    /**
     * 저장된 리포트 가져오기
     */
    getReports(): ResearchReport[] {
        const stored = localStorage.getItem('research_reports');
        return stored ? JSON.parse(stored) : [];
    },

    /**
     * 리포트 조회
     */
    getReport(id: string): ResearchReport | null {
        const reports = this.getReports();
        return reports.find(r => r.id === id) || null;
    }
};
