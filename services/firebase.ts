
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

/**
 * [배포 필독] Firestore 권한 오류(Missing or insufficient permissions) 해결 방법:
 * 1. Firebase Console (https://console.firebase.google.com/) 접속
 * 2. Build -> Firestore Database 선택
 * 3. 'Rules' 탭 클릭
 * 4. 아래 코드를 복사해서 붙여넣고 'Publish' 버튼 클릭:
 * 
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     match /{document=**} {
 *       allow read, write: if true;
 *     }
 *   }
 * }
 */

const firebaseConfig = {
  apiKey: "AIzaSyCTwla1unjp7k73HGmPChWtQVlyya3RxV0",
  authDomain: "commu-hub-a55ae.firebaseapp.com",
  projectId: "commu-hub-a55ae",
  storageBucket: "commu-hub-a55ae.firebasestorage.app",
  messagingSenderId: "448045121716",
  appId: "1:448045121716:web:b943e0cf9b86e400aed7e1",
  measurementId: "G-BS76QRNT6J"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
