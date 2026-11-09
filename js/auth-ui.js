/* =========================================
   TRANG THAI DANG NHAP TREN THANH MENU
   Cac phan tu co thuoc tinh [data-auth] se hien:
   - Chua dang nhap: Dang nhap / Dang ky
   - Da dang nhap:   Xin chao, <ten> / Dang xuat
========================================= */

import { auth } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

const slots = document.querySelectorAll("[data-auth]");

function createLink(href, text) {
    const link = document.createElement("a");
    link.href = href;
    link.textContent = text;
    return link;
}

function renderLoggedOut(slot) {
    slot.replaceChildren(
        createLink("login.html", "Đăng nhập"),
        createLink("register.html", "Đăng ký")
    );
}

function renderLoggedIn(slot, user) {
    const name = user.displayName || user.email || "bạn";

    const hello = document.createElement("span");
    hello.className = "auth-user";
    hello.textContent = "Xin chào, " + name;

    const logout = createLink("#", "Đăng xuất");

    logout.addEventListener("click", async function (event) {
        event.preventDefault();

        try {
            await signOut(auth);
        } catch (error) {
            console.error(error);
            alert("Đăng xuất thất bại, vui lòng thử lại.");
        }
    });

    slot.replaceChildren(hello, logout);
}

// Chua cau hinh Firebase thi giu nguyen cac lien ket Dang nhap / Dang ky san co
if (auth && slots.length > 0) {
    onAuthStateChanged(auth, function (user) {
        slots.forEach(function (slot) {
            if (user) {
                renderLoggedIn(slot, user);
            } else {
                renderLoggedOut(slot);
            }
        });
    });
}
