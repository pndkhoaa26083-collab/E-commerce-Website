import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

// =====================================================
// CẤU HÌNH FIREBASE
// Dán cấu hình của dự án Firebase MỚI vào bên dưới
// (Firebase Console > Project settings > Your apps > SDK setup and configuration)
// =====================================================
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "G-XXXXXXXXXX"
};

// Cấu hình đã được thay chưa? (các trang dùng biến này để báo lỗi dễ hiểu)
export const isFirebaseConfigured =
    !String(firebaseConfig.apiKey).startsWith("YOUR_");

// Khởi tạo Firebase (null nếu chưa cấu hình)
const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;

// Authentication: đăng nhập, đăng ký, đăng nhập Google
export const auth = app ? getAuth(app) : null;

// Firestore: lưu hồ sơ và vai trò (admin / user) của từng tài khoản
export const db = app ? getFirestore(app) : null;
