/* =========================================
   TRANG QUAN TRI
   Chi tai khoan co vai tro "admin" moi xem duoc.
   Luu y: viec chan truy cap that su do quy tac bao mat
   Firestore dam nhiem (xem firestore.rules); doan kiem tra
   o day chi de hien thi giao dien.
========================================= */

import { auth, db } from "./firebase.js";

import {
    ensureUserProfile,
    ROLE_ADMIN,
    ROLE_USER
} from "./auth-service.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

import {
    collection,
    getDocs,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const statusElement = document.getElementById("adminStatus");
const panel = document.getElementById("adminPanel");
const userRows = document.getElementById("userRows");
const userCount = document.getElementById("userCount");
const messageElement = document.getElementById("adminMessage");

// =====================================
// 1. HIEN THI TRANG THAI / THONG BAO
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

function setMessage(text, isOk) {
    messageElement.textContent = text;
    messageElement.classList.toggle("is-ok", Boolean(isOk));
}

// =====================================
// 2. BANG DANH SACH TAI KHOAN
// =====================================

function providerLabel(provider) {
    if (provider === "google.com") return "Google";
    if (provider === "password") return "Email";
    return provider || "—";
}

function formatDate(value) {
    const date = value && typeof value.toDate === "function"
        ? value.toDate()
        : null;

    return date ? date.toLocaleDateString("vi-VN") : "—";
}

function createCell(text) {
    const cell = document.createElement("td");
    cell.textContent = text;
    return cell;
}

function createRoleSelect(account, currentUser) {
    const select = document.createElement("select");

    select.setAttribute(
        "aria-label",
        "Vai trò của " + (account.email || account.id)
    );

    [
        { value: ROLE_USER, label: "Người dùng (user)" },
        { value: ROLE_ADMIN, label: "Quản trị (admin)" }
    ].forEach(function (item) {
        const option = document.createElement("option");
        option.value = item.value;
        option.textContent = item.label;
        select.appendChild(option);
    });

    const role = account.role === ROLE_ADMIN ? ROLE_ADMIN : ROLE_USER;

    select.value = role;
    select.dataset.role = role;

    // Khong cho admin tu doi vai tro cua chinh minh (tranh mat quyen quan tri)
    if (account.id === currentUser.uid) {
        select.disabled = true;
        select.title = "Bạn không thể tự đổi vai trò của mình";
        return select;
    }

    select.addEventListener("change", async function () {
        const newRole = select.value;
        const previousRole = select.dataset.role;
        const label = account.displayName || account.email || account.id;

        const confirmed = window.confirm(
            "Đổi vai trò của " + label + " thành \"" + newRole + "\"?"
        );

        if (!confirmed) {
            select.value = previousRole;
            return;
        }

        select.disabled = true;

        try {
            await updateDoc(doc(db, "users", account.id), { role: newRole });

            select.dataset.role = newRole;
            setMessage("Đã cập nhật vai trò của " + label + ".", true);
        } catch (error) {
            console.error(error);

            select.value = previousRole;
            setMessage(
                "Không đổi được vai trò. Kiểm tra quy tắc bảo mật Firestore.",
                false
            );
        } finally {
            select.disabled = false;
        }
    });

    return select;
}

function createRow(account, currentUser) {
    const row = document.createElement("tr");

    row.appendChild(createCell(account.displayName || "—"));
    row.appendChild(createCell(account.email || "—"));
    row.appendChild(createCell(providerLabel(account.provider)));
    row.appendChild(createCell(formatDate(account.createdAt)));

    const roleCell = document.createElement("td");
    roleCell.appendChild(createRoleSelect(account, currentUser));
    row.appendChild(roleCell);

    return row;
}

async function loadUsers(currentUser) {
    setMessage("", false);
    userRows.replaceChildren();

    let snapshot;

    try {
        snapshot = await getDocs(collection(db, "users"));
    } catch (error) {
        console.error(error);
        setMessage("Không tải được danh sách tài khoản.", false);
        return;
    }

    const accounts = snapshot.docs.map(function (item) {
        return Object.assign({ id: item.id }, item.data());
    });

    // Tai khoan moi nhat o tren cung
    accounts.sort(function (a, b) {
        const timeA = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
    });

    userCount.textContent = accounts.length + " tài khoản";

    accounts.forEach(function (account) {
        userRows.appendChild(createRow(account, currentUser));
    });
}

// =====================================
// 3. KIEM TRA QUYEN TRUY CAP
// =====================================

async function handleAuth(user) {
    panel.hidden = true;

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

    statusElement.hidden = true;
    panel.hidden = false;

    await loadUsers(user);
}

if (!auth || !db) {
    showStatus("Chưa cấu hình Firebase. Hãy dán cấu hình vào js/firebase.js.");
} else {
    onAuthStateChanged(auth, handleAuth);
}
