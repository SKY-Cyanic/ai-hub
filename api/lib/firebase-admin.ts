/**
 * Firebase Admin SDK 초기화 (서버 사이드)
 */
import * as admin from 'firebase-admin';

let app: admin.app.App | null = null;

export function getFirebaseAdmin(): admin.app.App {
    if (app) return app;

    // 환경변수에서 서비스 계정 정보 가져오기
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (!serviceAccountJson) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set');
    }

    try {
        const serviceAccount = JSON.parse(serviceAccountJson);

        app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
        });

        console.log('✅ Firebase Admin initialized');
        return app;
    } catch (error) {
        console.error('❌ Failed to initialize Firebase Admin:', error);
        throw error;
    }
}

export function getFirestore(): admin.firestore.Firestore {
    return getFirebaseAdmin().firestore();
}
