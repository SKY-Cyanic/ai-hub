import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // 현재 작업 디렉토리의 환경 변수를 로드합니다.
    const env = loadEnv(mode, process.cwd(), '');
    
    return {
      // Cloudflare Pages 루트 배포를 위한 설정
      base: '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // 배포 환경(Cloudflare)의 환경 변수를 클라이언트 코드에서 사용할 수 있도록 주입합니다.
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          // '@'를 프로젝트 루트로 설정하여 깔끔한 임포트 경로를 지원합니다.
          '@': path.resolve(__dirname, './'),
        }
      },
      build: {
        // 빌드 결과물이 dist 폴더에 생성되도록 설정 (Cloudflare Pages의 기본값)
        outDir: 'dist',
      }
    };
});
