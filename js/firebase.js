
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

// Cấu hình Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAW11OUdR0CWoNFKGQytnow6tjoM8rKQ",
    authDomain: "wangfashion-128f9.firebaseapp.com",
    projectId: "wangfashion-128f9",
    storageBucket: "wangfashion-128f9.firebasestorage.app",
    messagingSenderId: "171318707360",
    appId: "1:171318707360:web:3bea177315667966b435c5",
    measurementId: "G-57D4K0RDWT"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);

// Khởi tạo Authentication
export const auth = getAuth(app);
