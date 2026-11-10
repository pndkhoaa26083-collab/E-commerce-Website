/* =========================================
   TRANG QUAN TRI - KHUNG CHINH
   Chi tai khoan co vai tro "admin" moi xem duoc.
   Luu y: viec chan truy cap that su do quy tac bao mat
   Firestore dam nhiem (xem firestore.rules); doan kiem tra
   o day chi de hien thi giao dien.

   Cac tab: Tong quan, Don hang, San pham, Tai khoan
   (moi tab nam trong mot file admin-*.js rieng)
========================================= */

import { auth, db } from "./firebase.js";

import { ensureUserProfile, ROLE_ADMIN } from "./auth-service.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

import { setMessage } from "./admin-common.js";
import { loadOverview } from "./admin-overview.js";
import { loadOrders } from "./admin-orders.js";
import { loadProducts } from "./admin-products.js";
import { loadUsers } from "./admin-users.js";

const statusElement = document.getElementById("adminStatus");
const panel = document.getElementById("adminPanel");
const tabButtons = document.querySelectorAll("[data-tab]");
const sections = document.querySelectorAll(".admin-section");

const loaders = {
    overview: loadOverview,
    orders: loadOrders,
    products: loadProducts,
    users: loadUsers
};

let currentUser = null;
let tabsBound = false;

// =====================================
// 1. HIEN THI TRANG THAI
// =====================================

function showStatus(text, linkHref, linkText) {
    statusElement.hidden = false;
    statusElement.textContent = text;

    if (linkHref) {
        const link = document.createElement("a");
        link.href = linkHref;
        link.textContent = linkText;
        statusElement.appendChild(link);
    }
}

// =====================================
// 2. CHUYEN TAB
// =====================================

function showTab(name) {
    if (!loaders[name]) {
        name = "overview";
    }

    tabButtons.forEach(function (button) {
        const isActive = button.dataset.tab === name;

        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    });

    sections.forEach(function (section) {
        section.hidden = section.id !== "tab-" + name;
    });

    setMessage("");

    history.replaceState(null, "", "#" + name);

    // Moi lan mo tab deu tai lai du lieu moi nhat
    loaders[name]({ user: currentUser });
}

function bindTabs() {
    if (tabsBound) return;

    tabsBound = true;

    tabButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            showTab(button.dataset.tab);
        });
    });
}

// =====================================
// 3. KIEM TRA QUYEN TRUY CAP
// =====================================

async function handleAuth(user) {
    panel.hidden = true;
    currentUser = null;

    if (!user) {
        showStatus(
            "Bạn cần đăng nhập để vào trang quản trị.",
            "login.html",
            "Đăng nhập"
        );
        return;
    }

    showStatus("Đang kiểm tra quyền truy cập...");

    let role;

    try {
        role = await ensureUserProfile(user);
    } catch (error) {
        console.error(error);
        showStatus(
            "Không đọc được quyền của tài khoản. Hãy kiểm tra Firestore và quy tắc bảo mật."
        );
        return;
    }

    if (role !== ROLE_ADMIN) {
        showStatus(
            "Tài khoản này không có quyền quản trị.",
            "index.html",
            "Về trang chủ"
        );
        return;
    }

    currentUser = user;

    statusElement.hidden = true;
    panel.hidden = false;

    bindTabs();

    // Mo tab theo dia chi (vi du admin.html#orders), mac dinh la Tong quan
    showTab(window.location.hash.slice(1) || "overview");
}

if (!auth || !db) {
    showStatus("Chưa cấu hình Firebase. Hãy dán cấu hình vào js/firebase.js.");
} else {
    onAuthStateChanged(auth, handleAuth);
}
