// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; // 引入身份验证
import { getFirestore } from "firebase/firestore";           // 引入云数据库

// 你的配置信息
const firebaseConfig = {
    apiKey: "AIzaSyBWOIBLxpdhXm_Qm9GhtlgbFOJbqeMODU8",
    authDomain: "flight-f3624.firebaseapp.com",
    projectId: "flight-f3624",
    storageBucket: "flight-f3624.firebasestorage.app",
    messagingSenderId: "935461969074",
    appId: "1:935461969074:web:0ab8ec5b0177953bcabdab",
    measurementId: "G-63MNF7YXVK"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);

// 导出这些工具供其他页面使用
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
