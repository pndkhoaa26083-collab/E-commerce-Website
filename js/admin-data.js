/* =========================================
   DOC DU LIEU TU FIRESTORE CHO TRANG QUAN TRI
   (Quy tac bao mat chi cho admin doc: xem firestore.rules)
========================================= */

import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    query,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

// So don hang toi da tai ve mot lan
export const ORDER_LIMIT = 500;

function withId(snapshot) {
    return snapshot.docs.map(function (item) {
        return Object.assign({ id: item.id }, item.data());
    });
}

export async function fetchUsers() {
    const accounts = withId(await getDocs(collection(db, "users")));

    // Tai khoan moi nhat o tren cung
    return accounts.sort(function (a, b) {
        const timeA = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
    });
}

export async function fetchProducts() {
    const products = withId(await getDocs(collection(db, "products")));

    return products.sort(function (a, b) {
        return (Number(a.order) || 0) - (Number(b.order) || 0);
    });
}

export async function fetchOrders() {
    return withId(
        await getDocs(
            query(
                collection(db, "orders"),
                orderBy("createdAt", "desc"),
                limit(ORDER_LIMIT)
            )
        )
    );
}
