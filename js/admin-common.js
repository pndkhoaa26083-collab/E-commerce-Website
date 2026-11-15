/* =========================================
   TIEN ICH DUNG CHUNG CHO TRANG QUAN TRI
========================================= */

export const ORDER_STATUSES = [
    { value: "pending", label: "Chờ xác nhận" },
    { value: "confirmed", label: "Đã xác nhận" },
    { value: "shipping", label: "Đang giao" },
    { value: "done", label: "Hoàn thành" },
    { value: "cancelled", label: "Đã hủy" }
];

export const CATEGORIES = [
    { value: "ao", label: "Áo" },
    { value: "quan", label: "Quần" },
    { value: "giay", label: "Giày" },
    { value: "phukien", label: "Phụ kiện" }
];

export function statusLabel(value) {
    const item = ORDER_STATUSES.find(function (status) {
        return status.value === value;
    });

    return item ? item.label : (value || "—");
}

export function categoryLabel(value) {
    const item = CATEGORIES.find(function (category) {
        return category.value === value;
    });

    return item ? item.label : (value || "—");
}

export function formatMoney(amount) {
    return (Number(amount) || 0).toLocaleString("vi-VN") + "đ";
}

// Firestore Timestamp -> Date (hoac null)
function toDate(value) {
    return value && typeof value.toDate === "function" ? value.toDate() : null;
}

export function formatDate(value, withTime) {
    const date = toDate(value);

    if (!date) return "—";

    return withTime
        ? date.toLocaleString("vi-VN")
        : date.toLocaleDateString("vi-VN");
}

// Ghi ten cot vao tung o (data-label) de bang doi thanh the tren man hinh nho
// (xem .admin-table--cards trong css/shop.css). Goi sau moi lan ve lai bang.
export function labelCells(body) {
    const table = body.closest("table");

    if (!table) return;

    const heads = Array.from(table.querySelectorAll("thead th")).map(function (th) {
        return th.textContent.trim();
    });

    body.querySelectorAll("tr").forEach(function (row) {
        Array.from(row.children).forEach(function (item, index) {
            if (item.colSpan > 1 || !heads[index] || item.dataset.label) return;

            item.dataset.label = heads[index];
        });
    });
}

// Bo dau, viet thuong de tim kiem de hon
export function normalizeText(text) {
    return String(text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/đ/g, "d");
}

// Ma don hang ngan, lay tu id tai lieu
export function orderCode(id) {
    return String(id).slice(0, 6).toUpperCase();
}

// Tao phan tu voi noi dung la van ban thuan (an toan, khong chen HTML)
export function el(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined && text !== null) {
        element.textContent = text;
    }

    return element;
}

export function cell(text) {
    return el("td", "", text);
}

// Giai thich loi Firebase bang tieng Viet (kem ma loi de de tim nguyen nhan)
export function errorReason(error) {
    const code = error && error.code
        ? String(error.code).replace("firestore/", "")
        : "";

    const reasons = {
        "permission-denied":
            "Không có quyền ghi dữ liệu. Hãy kiểm tra tài khoản đang có vai trò admin " +
            "và quy tắc Firestore mới nhất đã được đăng (Publish).",
        "unauthenticated":
            "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.",
        "unavailable":
            "Mất kết nối mạng hoặc Firebase tạm thời không phản hồi. Hãy thử lại.",
        "not-found":
            "Không tìm thấy dữ liệu (có thể đã bị xóa).",
        "resource-exhausted":
            "Đã vượt hạn mức miễn phí của Firebase trong ngày.",
        "failed-precondition":
            "Firestore chưa sẵn sàng. Hãy kiểm tra đã tạo cơ sở dữ liệu Firestore trong Firebase Console."
    };

    const reason = reasons[code];

    if (reason) {
        return reason + " (" + code + ")";
    }

    return "Chi tiết lỗi: " +
        (code || (error && error.message) || "không rõ");
}

// Thong bao chung o dau trang quan tri
export function setMessage(text, isOk) {
    const element = document.getElementById("adminMessage");

    if (!element) return;

    element.textContent = text || "";
    element.classList.toggle("is-ok", Boolean(isOk));
}

// ---------- Xuat CSV (mo duoc bang Excel, giu tieng Viet) ----------

function csvCell(value) {
    let text = value === null || value === undefined ? "" : String(value);

    if (/^(\+|0)[\d\s.-]+$/.test(text)) {
        // So dien thoai: giu so 0 dau khi mo bang Excel
        text = '="' + text + '"';
        return '"' + text.replace(/"/g, '""') + '"';
    }

    // Chan cong thuc Excel do noi dung nguoi dung nhap
    if (/^[=+\-@\t\r]/.test(text)) {
        text = "'" + text;
    }

    return '"' + text.replace(/"/g, '""') + '"';
}

export function downloadCsv(filename, rows) {
    const content =
        "﻿" +
        rows
            .map(function (row) {
                return row.map(csvCell).join(",");
            })
            .join("\r\n");

    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(function () {
        URL.revokeObjectURL(url);
    }, 1000);
}
