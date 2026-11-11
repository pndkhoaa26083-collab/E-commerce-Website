/* =========================================
   DU LIEU SAN PHAM CHO CUA HANG
   Dung chung cho trang chu va trang san pham.
   San pham chi lay tu Firestore (collection "products"), do quan tri them vao.
========================================= */

import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

export function formatMoney(amount) {
    return Number(amount).toLocaleString("vi-VN") + "đ";
}

// Chi nhan anh trong thu muc image/ hoac duong dan https
export function safeImage(source) {
    const value = String(source || "").trim();
    return /^(image\/|https:\/\/)/i.test(value) ? value : "";
}

// Tra ve:
//   null  : chua cau hinh Firebase
//   mang  : cac san pham dang hien thi, xep theo "order" (co the rong)
// Nem loi neu khong doc duoc Firestore.
export async function fetchActiveProducts() {
    if (!db) {
        return null;
    }

    const snapshot = await getDocs(
        query(collection(db, "products"), where("active", "==", true))
    );

    return snapshot.docs
        .map(function (item) {
            return Object.assign({ id: item.id }, item.data());
        })
        .sort(function (a, b) {
            return (Number(a.order) || 0) - (Number(b.order) || 0);
        });
}
