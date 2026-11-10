/* =========================================
   GUI DON HANG LEN FIRESTORE
   Nap tren trang thanh toan. Tao ra window.saveOrderRemote(order)
   de script.js goi khi khach bam "Xac nhan dat hang".
   Chua cau hinh Firebase thi ham nay khong ton tai va
   script.js chi luu don tren trinh duyet nhu truoc.
========================================= */

import { auth, db } from "./firebase.js";

import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

if (db) {
    window.saveOrderRemote = async function (order) {
        const user = auth ? auth.currentUser : null;

        const reference = await addDoc(collection(db, "orders"), {
            // Khach chua dang nhap: uid de trong
            uid: user ? user.uid : "",

            customer: {
                fullname: String(order.customer.fullname || ""),
                phone: String(order.customer.phone || ""),
                email: String(order.customer.email || ""),
                address: String(order.customer.address || ""),
                note: String(order.customer.note || "")
            },

            payment: order.payment === "bank" ? "bank" : "cod",

            items: order.products.map(function (item) {
                return {
                    id: String(item.id || ""),
                    name: String(item.name || ""),
                    price: Number(item.price) || 0,
                    quantity: Number(item.quantity) || 0
                };
            }),

            subtotal: Number(order.subtotal) || 0,
            shipping: Number(order.shipping) || 0,
            total: Number(order.total) || 0,

            status: "pending",
            createdAt: serverTimestamp()
        });

        return reference.id;
    };
}
