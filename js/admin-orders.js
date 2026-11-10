/* =========================================
   TAB DON HANG
   Danh sach, tim kiem, loc theo trang thai, xem chi tiet,
   doi trang thai, xoa va xuat CSV.
========================================= */

import { db } from "./firebase.js";

import {
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

import { fetchOrders } from "./admin-data.js";

import {
    ORDER_STATUSES,
    el,
    cell,
    formatMoney,
    formatDate,
    statusLabel,
    orderCode,
    normalizeText,
    setMessage,
    downloadCsv
} from "./admin-common.js";

const orderRows = document.getElementById("orderRows");
const orderCount = document.getElementById("orderCount");
const orderSearch = document.getElementById("orderSearch");
const statusFilter = document.getElementById("orderStatusFilter");
const exportButton = document.getElementById("orderExportButton");

const dialog = document.getElementById("orderDialog");
const detail = document.getElementById("orderDetail");
const closeButton = document.getElementById("orderDialogClose");

let orders = [];
let bound = false;

function paymentLabel(value) {
    return value === "bank"
        ? "Chuyển khoản ngân hàng"
        : "Thanh toán khi nhận hàng (COD)";
}

function customerOf(order) {
    return order.customer || {};
}

// =====================================
// 1. LOC VA DANH SACH
// =====================================

function filteredOrders() {
    const keyword = normalizeText(orderSearch.value.trim());

    return orders.filter(function (order) {
        const customer = customerOf(order);

        const statusMatches =
            !statusFilter.value || order.status === statusFilter.value;

        const text = normalizeText(
            orderCode(order.id) + " " +
            (customer.fullname || "") + " " +
            (customer.phone || "") + " " +
            (customer.email || "")
        );

        return statusMatches && text.includes(keyword);
    });
}

function createStatusSelect(order) {
    const select = document.createElement("select");

    select.setAttribute("aria-label", "Trạng thái đơn " + orderCode(order.id));

    ORDER_STATUSES.forEach(function (status) {
        const option = el("option", "", status.label);
        option.value = status.value;
        select.appendChild(option);
    });

    select.value = order.status;

    select.addEventListener("change", async function () {
        const newStatus = select.value;
        const previousStatus = order.status;

        if (
            newStatus === "cancelled" &&
            !window.confirm("Hủy đơn " + orderCode(order.id) + "?")
        ) {
            select.value = previousStatus;
            return;
        }

        select.disabled = true;

        try {
            await updateDoc(doc(db, "orders", order.id), {
                status: newStatus,
                updatedAt: serverTimestamp()
            });

            order.status = newStatus;

            setMessage(
                "Đơn " + orderCode(order.id) + ": " + statusLabel(newStatus),
                true
            );
        } catch (error) {
            console.error(error);

            select.value = previousStatus;
            setMessage(
                "Không đổi được trạng thái. Kiểm tra quy tắc bảo mật Firestore.",
                false
            );
        } finally {
            select.disabled = false;
        }
    });

    return select;
}

function createRow(order) {
    const customer = customerOf(order);
    const row = document.createElement("tr");

    const customerCell = document.createElement("td");
    customerCell.appendChild(el("div", "", customer.fullname || "—"));
    customerCell.appendChild(el("div", "muted", customer.phone || ""));

    const statusCell = document.createElement("td");
    statusCell.appendChild(createStatusSelect(order));

    const actionCell = document.createElement("td");
    actionCell.className = "admin-actions";

    const viewButton = el("button", "btn btn-sm", "Chi tiết");
    viewButton.type = "button";
    viewButton.addEventListener("click", function () {
        openDetail(order);
    });

    const deleteButton = el("button", "btn btn-sm btn-danger", "Xóa");
    deleteButton.type = "button";
    deleteButton.addEventListener("click", function () {
        removeOrder(order);
    });

    actionCell.append(viewButton, deleteButton);

    row.append(
        cell(orderCode(order.id)),
        cell(formatDate(order.createdAt, true)),
        customerCell,
        cell(formatMoney(order.total)),
        cell(order.payment === "bank" ? "Chuyển khoản" : "COD"),
        statusCell,
        actionCell
    );

    return row;
}

function renderOrders() {
    const shown = filteredOrders();

    orderRows.replaceChildren(...shown.map(createRow));

    orderCount.textContent =
        shown.length + " / " + orders.length + " đơn hàng";
}

export async function loadOrders() {
    bindOnce();

    setMessage("");

    try {
        orders = await fetchOrders();
    } catch (error) {
        console.error(error);
        setMessage("Không tải được danh sách đơn hàng.", false);
        return;
    }

    renderOrders();
}

// =====================================
// 2. CHI TIET DON HANG
// =====================================

function detailRow(list, label, value) {
    list.appendChild(el("dt", "", label));
    list.appendChild(el("dd", "", value || "—"));
}

function openDetail(order) {
    const customer = customerOf(order);
    const items = Array.isArray(order.items) ? order.items : [];

    const list = el("dl", "detail-grid");

    detailRow(list, "Mã đơn", orderCode(order.id));
    detailRow(list, "Thời gian", formatDate(order.createdAt, true));
    detailRow(list, "Trạng thái", statusLabel(order.status));
    detailRow(list, "Khách hàng", customer.fullname);
    detailRow(list, "Điện thoại", customer.phone);
    detailRow(list, "Email", customer.email);
    detailRow(list, "Địa chỉ", customer.address);
    detailRow(list, "Ghi chú", customer.note);
    detailRow(list, "Thanh toán", paymentLabel(order.payment));
    detailRow(
        list,
        "Tài khoản",
        order.uid ? "Đã đăng nhập khi đặt" : "Khách vãng lai"
    );

    // Bang san pham
    const table = el("table", "detail-items");
    const head = document.createElement("tr");

    ["Sản phẩm", "Đơn giá", "SL", "Thành tiền"].forEach(function (label) {
        const th = el("th", "", label);
        th.scope = "col";
        head.appendChild(th);
    });

    const thead = document.createElement("thead");
    thead.appendChild(head);

    const tbody = document.createElement("tbody");

    items.forEach(function (item) {
        const row = document.createElement("tr");

        row.append(
            cell(item.name),
            cell(formatMoney(item.price)),
            cell(String(item.quantity)),
            cell(formatMoney((Number(item.price) || 0) * (Number(item.quantity) || 0)))
        );

        tbody.appendChild(row);
    });

    table.append(thead, tbody);

    // Tong tien
    const totals = el("dl", "detail-grid");

    detailRow(totals, "Tạm tính", formatMoney(order.subtotal));
    detailRow(totals, "Phí vận chuyển", formatMoney(order.shipping));
    detailRow(totals, "Tổng cộng", formatMoney(order.total));

    detail.replaceChildren(
        list,
        el("h3", "admin-block-title", "Sản phẩm"),
        table,
        el("div", "detail-spacer"),
        totals
    );

    dialog.showModal();
}

// =====================================
// 3. XOA VA XUAT CSV
// =====================================

async function removeOrder(order) {
    const confirmed = window.confirm(
        "Xóa đơn " + orderCode(order.id) + "? Không thể hoàn tác."
    );

    if (!confirmed) return;

    try {
        await deleteDoc(doc(db, "orders", order.id));

        orders = orders.filter(function (item) {
            return item.id !== order.id;
        });

        renderOrders();
        setMessage("Đã xóa đơn " + orderCode(order.id) + ".", true);
    } catch (error) {
        console.error(error);
        setMessage("Không xóa được đơn hàng.", false);
    }
}

function exportCsv() {
    const shown = filteredOrders();

    if (shown.length === 0) {
        setMessage("Không có đơn hàng nào để xuất.", false);
        return;
    }

    const rows = [[
        "Mã đơn", "Thời gian", "Họ tên", "Điện thoại", "Email", "Địa chỉ",
        "Ghi chú", "Thanh toán", "Sản phẩm", "Tạm tính", "Phí vận chuyển",
        "Tổng cộng", "Trạng thái"
    ]];

    shown.forEach(function (order) {
        const customer = customerOf(order);
        const items = Array.isArray(order.items) ? order.items : [];

        rows.push([
            orderCode(order.id),
            formatDate(order.createdAt, true),
            customer.fullname,
            customer.phone,
            customer.email,
            customer.address,
            customer.note,
            paymentLabel(order.payment),
            items.map(function (item) {
                return item.name + " x" + item.quantity;
            }).join("; "),
            order.subtotal,
            order.shipping,
            order.total,
            statusLabel(order.status)
        ]);
    });

    downloadCsv("don-hang-wang-fashion.csv", rows);
    setMessage("Đã xuất " + shown.length + " đơn hàng.", true);
}

// =====================================
// 4. GAN SU KIEN (chi mot lan)
// =====================================

function bindOnce() {
    if (bound) return;

    bound = true;

    ORDER_STATUSES.forEach(function (status) {
        const option = el("option", "", status.label);
        option.value = status.value;
        statusFilter.appendChild(option);
    });

    orderSearch.addEventListener("input", renderOrders);
    statusFilter.addEventListener("change", renderOrders);
    exportButton.addEventListener("click", exportCsv);

    closeButton.addEventListener("click", function () {
        dialog.close();
    });
}
