/* =========================================
   TRANG THAI DANG NHAP TREN THANH MENU
   Cac phan tu co thuoc tinh [data-auth] se hien:
   - Chua dang nhap: Dang nhap / Dang ky
   - Da dang nhap:   Xin chao, <ten> / Dang xuat
   - Admin:          them "(Admin)" va lien ket Quan tri
========================================= */

import { auth } from "./firebase.js";

import { loadRole, ROLE_ADMIN, ROLE_USER } from "./auth-service.js";

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

function renderLoggedIn(slot, user, role) {
    const name = user.displayName || user.email || "bạn";
    const isAdmin = role === ROLE_ADMIN;

    const hello = document.createElement("span");
    hello.className = "auth-user";
    hello.textContent = "Xin chào, " + name + (isAdmin ? " (Admin)" : "");

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

    const items = [hello];

    if (isAdmin) {
        const adminLink = createLink("admin.html", "Quản trị");
        adminLink.className = "admin-link";
        items.push(adminLink);
    }

    items.push(logout);

    slot.replaceChildren(...items);
}

// Chua cau hinh Firebase thi giu nguyen cac lien ket Dang nhap / Dang ky san co
if (auth && slots.length > 0) {
    onAuthStateChanged(auth, async function (user) {
        if (!user) {
            slots.forEach(renderLoggedOut);
            return;
        }

        // Hien loi chao ngay, sau do cap nhat khi da biet vai tro
        slots.forEach(function (slot) {
            renderLoggedIn(slot, user, ROLE_USER);
        });

        const role = await loadRole(user);

        // Bo qua neu nguoi dung da dang xuat hoac doi tai khoan trong luc cho
        if (role === ROLE_ADMIN && auth.currentUser === user) {
            slots.forEach(function (slot) {
                renderLoggedIn(slot, user, role);
            });
        }
    });
}
