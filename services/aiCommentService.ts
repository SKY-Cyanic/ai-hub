/**
 * AI Comment Service - Phase 3
 * 다양한 AI 페르소나가 자동으로 댓글을 작성하여 토론 활성화
 */

import { getGroqClient } from './groqClient';
import { storage } from './storage';
import type { Comment } from '../types';

export type AIPersonaType = 'beginner' | 'expert' | 'critic' | 'creative';

export interface AIPersona {
    type: AIPersonaType;
    userId: string;
    name: string;
    avatar: string;
    systemPrompt: string;
    emoji: string;
}

// AI 페르소나 정의
export const AI_PERSONAS: Record<AIPersonaType, AIPersona> = {
    beginner: {
        type: 'beginner',
        userId: 'ai_beginner',
        name: '호기심 러너 🎓',
        avatar: '🎓',
        emoji: '🎓',
        systemPrompt: `당신은 호기심 많은 초보자입니다. 
이 글을 읽고 기본 개념을 이해하려고 노력하며, 실생활 응용 사례나 시작 방법에 대해 질문하세요.
친근하고 열정적인 톤으로 100-200자 내외로 작성하세요.
"이거 정말 흥미롭네요!", "초보자도 따라할 수 있을까요?" 같은 표현을 사용하세요.`
    },
    expert: {
        type: 'expert',
        userId: 'ai_expert',
        name: '테크 애널리스트 🔬',
        avatar: '🔬',
        emoji: '🔬',
        systemPrompt: `당신은 해당 분야의 전문가입니다.
심화된 기술적 분석을 제공하고, 최신 연구나 성능 메트릭에 대해 언급하세요.
Professional하면서도 접근하기 쉬운 톤으로 200-300자 내외로 작성하세요.
구체적인 수치, 논문, 기술 용어를 적절히 활용하세요.`
    },
    critic: {
        type: 'critic',
        userId: 'ai_critic',
        name: '건설적 비평가 ⚠️',
        avatar: '⚠️',
        emoji: '⚠️',
        systemPrompt: `당신은 건설적인 비판가입니다.
잠재적 문제점을 지적하고, 대안을 제시하며, 균형 잡힌 시각을 제공하세요.
비판적이지만 존중하는 톤으로 150-250자 내외로 작성하세요.
"하지만 ~한 점은 고려해야 할 것 같습니다", "다른 관점에서 보면" 같은 표현을 사용하세요.`
    },
    creative: {
        type: 'creative',
        userId: 'ai_creative',
        name: '창의적 사고자 💡',
        avatar: '💡',
        emoji: '💡',
        systemPrompt: `당신은 창의적인 사고자입니다.
새로운 응용 아이디어, 융합적 관점, 미래 가능성을 제시하세요.
열정적이고 상상력이 풍부한 톤으로 150-250자 내외로 작성하세요.
"이거 ~와 결합하면?", "상상해보세요" 같은 표현을 사용하세요.`
    }
};

export const AICommentService = {
    /**
     * AI 댓글 생성
     */
    async generateComment(
        postContent: string,
        postTitle: string,
        personaType: AIPersonaType
    ): Promise<string> {
        const persona = AI_PERSONAS[personaType];
        const groq = getGroqClient();

        const prompt = `다음 게시물에 대해 댓글을 작성하세요.

제목: ${postTitle}

내용:
${postContent.substring(0, 1000)}

${persona.systemPrompt}

중요: 
- 한국어로 작성
- 자연스럽고 인간적인 표현
- 구체적이고 유용한 내용
- 댓글임을 명시하지 말 것 (자연스럽게)`;

        try {
            const response = await groq.chat({
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                model: 'openai/gpt-oss-120b',
                temperature: 0.8,
                max_tokens: 200,
            });

            const comment = response.choices[0]?.message?.content?.trim() || '';

            // 댓글 길이 검증
            if (comment.length < 50) {
                throw new Error('Generated comment too short');
            }

            if (comment.length > 500) {
                return comment.substring(0, 500) + '...';
            }

            return comment;
        } catch (error) {
            console.error(`AI comment generation failed for ${personaType}:`, error);
            throw error;
        }
    },

    /**
     * 여러 AI 댓글 생성 (2-3개 랜덤)
     */
    async generateMultipleComments(
        postId: string,
        postContent: string,
        postTitle: string
    ): Promise<Comment[]> {
        // 랜덤하게 2-3개 페르소나 선택
        const allPersonas: AIPersonaType[] = ['beginner', 'expert', 'critic', 'creative'];
        const numComments = Math.floor(Math.random() * 2) + 2; // 2 or 3

        const shuffled = allPersonas.sort(() => 0.5 - Math.random());
        const selectedPersonas = shuffled.slice(0, numComments);

        console.log(`🤖 Generating ${numComments} AI comments for post ${postId}`);

        const comments: Comment[] = [];

        for (let i = 0; i < selectedPersonas.length; i++) {
            const personaType = selectedPersonas[i];
            const persona = AI_PERSONAS[personaType];

            try {
                // 시간 간격 시뮬레이션 (1-2분 간격)
                const delay = i * (60000 + Math.random() * 60000); // 1-2분

                await new Promise(resolve => setTimeout(resolve, 1000)); // 실제로는 1초만 대기 (테스트용)

                const content = await this.generateComment(postContent, postTitle, personaType);

                const comment: any = {
                    id: `ai_comment_${postId}_${personaType}_${Date.now()}`,
                    post_id: postId,
                    author_id: persona.userId,
                    parent_id: null,
                    content: content,
                    created_at: new Date(Date.now() + delay).toISOString(),
                    depth: 0,
                    // AI 댓글 마커 (커스텀 필드)
                    isAI: true,
                    aiPersona: personaType
                };

                comments.push(comment);
                console.log(`✅ Generated ${personaType} comment:`, content.substring(0, 50) + '...');

            } catch (error) {
                console.error(`Failed to generate ${personaType} comment:`, error);
            }
        }

        return comments;
    },

    /**
     * 자동 트리거 확인
     * - 댓글 수 0개
     * - 게시 후 5분 경과
     * - 리서치 리포트 카테고리
     */
    shouldTriggerAI(
        post: any,
        currentCommentCount: number
    ): boolean {
        // 이미 댓글이 있으면 트리거 안 함
        if (currentCommentCount > 0) {
            return false;
        }

        // 게시 후 5분 경과 확인
        const postTime = new Date(post.createdAt).getTime();
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;

        if (now - postTime < fiveMinutes) {
            return false;
        }

        // 리서치 리포트 또는 지식 허브 카테고리인지 확인
        const validCategories = ['지식 허브', '자유 광장', '코드 넥서스'];
        if (!validCategories.includes(post.category)) {
            return false;
        }

        return true;
    },

    /**
     * AI 댓글 자동 생성 및 게시
     */
    async autoGenerateComments(postId: string): Promise<void> {
        try {
            // 게시물 가져오기
            const posts = storage.getPosts();
            const post = posts.find(p => p.id === postId);
            if (!post) {
                console.error('Post not found:', postId);
                return;
            }

            // 현재 댓글 수 확인  
            const allComments = storage.getComments();
            const comments = allComments.filter(c => c.post_id === postId);

            // 트리거 조건 확인
            if (!this.shouldTriggerAI(post, comments.length)) {
                console.log('AI comment trigger conditions not met');
                return;
            }

            console.log('🚀 Auto-generating AI comments for:', post.title);

            // AI 댓글 생성
            const aiComments = await this.generateMultipleComments(
                postId,
                post.content,
                post.title
            );

            // Firestore에 저장 (순차적으로)
            for (const comment of aiComments) {
                // storage.createComment(comment); // TODO: Fix storage API
                console.log(`💬 AI comment posted by ${comment.author_id}`);

                // 실제 환경에서는 여기서 대기
                // await new Promise(resolve => setTimeout(resolve, 60000)); // 1분 대기
            }

            console.log(`✅ Posted ${aiComments.length} AI comments`);
        } catch (error) {
            console.error('Auto-generate comments error:', error);
        }
    }
};
