import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

// =====================================================
// CẤU HÌNH FIREBASE (dự án wang-fashion)
// =====================================================
const firebaseConfig = {
    apiKey: "AIzaSyBTZUcfc9CkrMlABkDigaqOvkIKGi_Mygs",
    authDomain: "wang-fashion.firebaseapp.com",
    projectId: "wang-fashion",
    storageBucket: "wang-fashion.firebasestorage.app",
    messagingSenderId: "533010805019",
    appId: "1:533010805019:web:75736b3ef1a61e7e74e3be",
    measurementId: "G-8L1RJR2DJC"
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
