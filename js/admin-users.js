/* =========================================
   TAB TAI KHOAN
   Danh sach tai khoan, tim kiem, loc theo vai tro, doi vai tro
========================================= */

import { db } from "./firebase.js";

import {
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

import { ROLE_ADMIN, ROLE_USER } from "./auth-service.js";

import { fetchUsers } from "./admin-data.js";

import {
    cell,
    formatDate,
    normalizeText,
    setMessage
} from "./admin-common.js";

const userRows = document.getElementById("userRows");
const userCount = document.getElementById("userCount");
const userSearch = document.getElementById("userSearch");
const userRoleFilter = document.getElementById("userRoleFilter");

let accounts = [];
let currentUser = null;
let bound = false;

function providerLabel(provider) {
    if (provider === "google.com") return "Google";
    if (provider === "password") return "Email";
    return provider || "—";
}

function roleOf(account) {
    return account.role === ROLE_ADMIN ? ROLE_ADMIN : ROLE_USER;
}

function createRoleSelect(account) {
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

    select.value = roleOf(account);

    // Khong cho admin tu doi vai tro cua chinh minh (tranh mat quyen quan tri)
    if (account.id === currentUser.uid) {
        select.disabled = true;
        select.title = "Bạn không thể tự đổi vai trò của mình";
        return select;
    }

    select.addEventListener("change", async function () {
        const newRole = select.value;
        const previousRole = roleOf(account);
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

            account.role = newRole;
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

function createRow(account) {
    const row = document.createElement("tr");

    row.append(
        cell(account.displayName || "—"),
        cell(account.email || "—"),
        cell(providerLabel(account.provider)),
        cell(formatDate(account.createdAt))
    );

    const roleCell = document.createElement("td");
    roleCell.appendChild(createRoleSelect(account));
    row.appendChild(roleCell);

    return row;
}

function matches(account) {
    const keyword = normalizeText(userSearch.value.trim());

    const text = normalizeText(
        (account.displayName || "") + " " + (account.email || "")
    );

    const roleMatches =
        !userRoleFilter.value || roleOf(account) === userRoleFilter.value;

    return roleMatches && text.includes(keyword);
}

function renderUsers() {
    const shown = accounts.filter(matches);

    userRows.replaceChildren(...shown.map(createRow));

    userCount.textContent =
        shown.length + " / " + accounts.length + " tài khoản";
}

export async function loadUsers(context) {
    currentUser = context.user;

    if (!bound) {
        bound = true;
        userSearch.addEventListener("input", renderUsers);
        userRoleFilter.addEventListener("change", renderUsers);
    }

    setMessage("");

    try {
        accounts = await fetchUsers();
    } catch (error) {
        console.error(error);
        setMessage("Không tải được danh sách tài khoản.", false);
        return;
    }

    renderUsers();
}
