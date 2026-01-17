import { GoogleSearchAPI, SearchResult } from './searchAPI';
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
            searchResults = await GoogleSearchAPI.multiSearch(optimizedQueries);
            updateProgress('웹 검색 수행', 'completed', `${searchResults.length}개 결과 발견`);
        } catch (error: any) {
            updateProgress('웹 검색 수행', 'failed', error.message);
            throw error;
        }

        // 3. 소스 분석 및 신뢰도 평가
        updateProgress('정보 분석', 'in-progress');
        const sources: ResearchSource[] = searchResults.map(result => ({
            title: result.title,
            url: result.link,
            snippet: result.snippet,
            domain: result.displayLink,
            trustScore: this.calculateTrustScore(result.displayLink)
        }));
        updateProgress('정보 분석', 'completed');

        // 4. AI 분석 및 리포트 생성
        updateProgress('AI 리포트 생성', 'in-progress');
        const groqClient = getGroqClient();

        const analysisPrompt = `다음 검색 결과를 바탕으로 "${query}"에 대한 포괄적인 리포트를 작성해주세요.

검색 결과:
${sources.map((s, i) => `${i + 1}. ${s.title}\n   출처: ${s.domain}\n   내용: ${s.snippet}`).join('\n\n')}

다음 형식으로 작성해주세요:

# 요약
(핵심 내용을 3-4문장으로 요약)

# 상세 분석
(검색 결과를 종합하여 깊이 있는 분석 제공)

# 장점
- (첫 번째 장점)
- (두 번째 장점)
- (세 번째 장점)

# 단점/우려사항
- (첫 번째 단점)
- (두 번째 단점)

# 관련 주제
- (관련 주제 1)
- (관련 주제 2)
- (관련 주제 3)`;

        let reportContent = '';
        await groqClient.streamChat(
            {
                model: 'qwen/qwen3-32b',
                messages: [{ role: 'user', content: analysisPrompt }],
                temperature: 0.7,
                max_tokens: 2048
            },
            (chunk, full) => {
                reportContent = full;
            }
        );

        // 리포트 파싱
        const parsed = this.parseReport(reportContent);
        updateProgress('AI 리포트 생성', 'completed');

        const report: ResearchReport = {
            id: reportId,
            query,
            summary: parsed.summary,
            detailedAnalysis: parsed.analysis,
            sources,
            prosAndCons: {
                pros: parsed.pros,
                cons: parsed.cons
            },
            relatedTopics: parsed.relatedTopics,
            createdAt: new Date().toISOString(),
            searchProgress: progress
        };

        // 로컬 스토리지에 저장
        this.saveReport(report);

        return report;
    },

    /**
     * 검색 쿼리 최적화 (AI로 관련 쿼리 생성)
     */
    async optimizeQuery(query: string): Promise<string[]> {
        const groqClient = getGroqClient();

        const prompt = `"${query}"에 대해 포괄적인 정보를 얻기 위한 3개의 검색 쿼리를 생성해주세요. 각 쿼리는 다른 측면을 다뤄야 합니다.

응답 형식:
1. (첫 번째 쿼리)
2. (두 번째 쿼리)
3. (세 번째 쿼리)`;

        let response = '';
        await groqClient.streamChat(
            {
                model: 'qwen/qwen3-32b',
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
     * 도메인 신뢰도 점수 계산
     */
    calculateTrustScore(domain: string): number {
        // 신뢰도 높은 도메인
        const highTrust = ['wikipedia.org', 'gov', 'edu', 'nature.com', 'science.org', 'ieee.org'];
        // 중간 신뢰도
        const mediumTrust = ['com', 'org', 'net'];

        if (highTrust.some(d => domain.includes(d))) return 90;
        if (domain.includes('.gov') || domain.includes('.edu')) return 85;
        if (mediumTrust.some(d => domain.endsWith('.' + d))) return 70;

        return 60;
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

        for (const line of lines) {
            if (line.startsWith('# 요약')) {
                currentSection = 'summary';
            } else if (line.startsWith('# 상세 분석') || line.startsWith('# 분석')) {
                currentSection = 'analysis';
            } else if (line.startsWith('# 장점')) {
                currentSection = 'pros';
            } else if (line.startsWith('# 단점') || line.startsWith('# 우려')) {
                currentSection = 'cons';
            } else if (line.startsWith('# 관련')) {
                currentSection = 'related';
            } else if (line.trim() && !line.startsWith('#')) {
                if (currentSection === 'summary' || currentSection === 'analysis') {
                    sections[currentSection] += line + '\n';
                } else if (line.startsWith('-') || line.startsWith('*')) {
                    const item = line.replace(/^[-*]\s*/, '').trim();
                    if (currentSection === 'pros') sections.pros.push(item);
                    else if (currentSection === 'cons') sections.cons.push(item);
                    else if (currentSection === 'related') sections.relatedTopics.push(item);
                }
            }
        }

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
