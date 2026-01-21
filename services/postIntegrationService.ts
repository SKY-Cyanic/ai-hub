import { ResearchReport } from './researchService';
import { getGroqClient } from './groqClient';
import { storage } from './storage';
import type { Post } from '../types';

export interface PostDraft {
    title: string;
    content: string;
    boardId: string;
    tags: string[];
    category: string;
    reportId?: string;
}

export const PostIntegrationService = {
    /**
     * 리포트를 게시물로 변환
     */
    async convertReportToPost(report: ResearchReport, userId: string): Promise<PostDraft> {
        // AI로 카테고리 자동 분류
        const category = await this.suggestCategory(report.query);

        // AI로 태그 자동 생성
        const tags = await this.generateTags(report);

        // 게시물 제목
        const title = `[AI 리서치] ${report.query}`;

        // 게시물 본문 생성
        const content = this.formatReportAsPost(report);

        return {
            title,
            content,
            boardId: category,
            tags,
            category,
            reportId: report.id
        };
    },

    /**
     * AI로 카테고리 추천
     */
    async suggestCategory(query: string): Promise<string> {
        const groqClient = getGroqClient();

        const prompt = `다음 주제가 어떤 게시판에 가장 적합한지 선택해주세요: "${query}"

게시판 목록:
- free: 자유게시판 (일반적인 주제, 잡담)
- tech: 기술/IT (프로그래밍, 컴퓨터, 인터넷)
- science: 과학 (물리, 화학, 생물, 우주)
- news: 뉴스/시사 (정치, 경제, 사회)
- culture: 문화/예술 (영화, 음악, 미술)
- sports: 스포츠 (운동, 게임)
- life: 생활/정보 (요리, 건강, 여행)

하나만 선택해서 ID만 응답하세요 (예: tech)`;

        let response = '';
        await groqClient.streamChat(
            {
                model: 'openai/gpt-oss-120b',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 20
            },
            (chunk, full) => {
                response = full;
            }
        );

        const category = response.trim().toLowerCase();
        const validCategories = ['free', 'tech', 'science', 'news', 'culture', 'sports', 'life'];

        return validCategories.includes(category) ? category : 'free';
    },

    /**
     * AI로 태그 생성
     */
    async generateTags(report: ResearchReport): Promise<string[]> {
        const groqClient = getGroqClient();

        const prompt = `다음 리서치 주제에 적합한 태그 3-5개를 생성해주세요: "${report.query}"

요약: ${report.summary.substring(0, 200)}

태그는 한 단어 또는 짧은 구문으로, 쉼표로 구분해주세요.
예: 양자컴퓨터, 기술혁신, 미래기술, IBM`;

        let response = '';
        await groqClient.streamChat(
            {
                model: 'openai/gpt-oss-120b',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.5,
                max_tokens: 100
            },
            (chunk, full) => {
                response = full;
            }
        );

        // 태그 파싱
        const tags = response
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0 && tag.length < 20)
            .slice(0, 5);

        return tags.length > 0 ? tags : ['AI리서치'];
    },

    /**
     * 리포트를 게시물 형식으로 포맷
     */
    formatReportAsPost(report: ResearchReport): string {
        let content = `> 🤖 이 게시물은 AI Research Agent가 자동으로 조사하고 작성한 리포트입니다.\n\n`;

        // detailedAnalysis가 이미 참고자료를 포함하는지 확인
        const hasReferencesInAnalysis = report.detailedAnalysis?.includes('📚 참고자료') ||
            report.detailedAnalysis?.includes('참고자료');

        if (hasReferencesInAnalysis) {
            // 이미 포맷된 리포트면 그대로 사용
            content += report.detailedAnalysis;
        } else {
            // 레거시 포맷: 개별 섹션으로 구성
            content += `# 📝 요약\n\n${report.summary}\n\n`;
            content += `# 🔍 상세 분석\n\n${report.detailedAnalysis}\n\n`;

            if (report.prosAndCons.pros.length > 0) {
                content += `## ✅ 장점\n\n`;
                report.prosAndCons.pros.forEach(pro => {
                    content += `- ${pro}\n`;
                });
                content += `\n`;
            }

            if (report.prosAndCons.cons.length > 0) {
                content += `## ⚠️ 단점/우려사항\n\n`;
                report.prosAndCons.cons.forEach(con => {
                    content += `- ${con}\n`;
                });
                content += `\n`;
            }

            // 참고자료 추가 (레거시용)
            content += `# 📚 참고 자료\n\n`;
            report.sources.forEach((source, i) => {
                content += `${i + 1}. [${source.title}](${source.url}) - ${source.domain} (신뢰도: ${source.trustScore})\n`;
            });
        }

        if (report.relatedTopics.length > 0) {
            content += `\n# 🔗 관련 주제\n\n`;
            report.relatedTopics.forEach(topic => {
                const cleanTopic = topic.replace(/\*\*/g, '');
                content += `- ${cleanTopic}\n`;
            });
        }

        content += `\n---\n\n`;
        content += `*🕐 조사 일시: ${new Date(report.createdAt).toLocaleString('ko-KR')}*\n`;
        content += `*🤖 AI 모델: Groq GPT-oss-120B*`;

        return content;
    },

    /**
     * 게시물 발행 (Firestore 직접 저장)
     */
    async publishPost(draft: PostDraft, userId: string): Promise<string> {
        try {
            const { collection, addDoc } = await import('firebase/firestore');
            const firebase = await import('./firebase');

            const postData = {
                board_id: draft.boardId,
                title: draft.title,
                content: draft.content,
                author_id: userId,
                tags: draft.tags || [],
                created_at: new Date().toISOString(),
                views: 0,
                likes: [],
                comments_count: 0,
                is_pinned: false,
                is_ai_generated: true, // AI가 생성한 게시물 표시
                research_id: draft.reportId || null
            };

            const docRef = await addDoc(collection(firebase.db, 'posts'), postData);
            return docRef.id;
        } catch (error) {
            console.error('Post publish error:', error);
            throw new Error('게시물 발행 중 오류가 발생했습니다.');
        }
    }
};
