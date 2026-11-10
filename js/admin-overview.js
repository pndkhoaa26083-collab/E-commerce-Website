/* =========================================
   TAB TONG QUAN
   Thong ke nhanh: don hang, doanh thu, san pham, tai khoan
========================================= */

import { fetchOrders, fetchProducts, fetchUsers, ORDER_LIMIT } from "./admin-data.js";

import {
    ORDER_STATUSES,
    el,
    cell,
    formatMoney,
    formatDate,
    statusLabel,
    orderCode,
    setMessage
} from "./admin-common.js";

import { ROLE_ADMIN } from "./auth-service.js";

const statGrid = document.getElementById("statGrid");
const statusBreakdown = document.getElementById("statusBreakdown");
const recentOrderRows = document.getElementById("recentOrderRows");
const outOfStockList = document.getElementById("outOfStockList");

function statCard(label, value, note) {
    const card = el("div", "stat-card");

    card.appendChild(el("div", "stat-label", label));
    card.appendChild(el("div", "stat-value", value));

    if (note) {
        card.appendChild(el("div", "stat-note", note));
    }

    return card;
}

function sumTotal(orders) {
    return orders.reduce(function (total, order) {
        return total + (Number(order.total) || 0);
    }, 0);
}

export async function loadOverview() {
    setMessage("Đang tải dữ liệu...", true);

    let orders;
    let products;
    let users;

    try {
        const results = await Promise.all([
            fetchOrders(),
            fetchProducts(),
            fetchUsers()
        ]);

        orders = results[0];
        products = results[1];
        users = results[2];
    } catch (error) {
        console.error(error);
        setMessage(
            "Không tải được dữ liệu tổng quan. Hãy kiểm tra quy tắc bảo mật Firestore.",
            false
        );
        return;
    }

    setMessage("");

    const done = orders.filter(function (order) {
        return order.status === "done";
    });

    const processing = orders.filter(function (order) {
        return ["pending", "confirmed", "shipping"].includes(order.status);
    });

    const pendingCount = orders.filter(function (order) {
        return order.status === "pending";
    }).length;

    const visibleProducts = products.filter(function (product) {
        return product.active !== false;
    }).length;

    const adminCount = users.filter(function (account) {
        return account.role === ROLE_ADMIN;
    }).length;

    const limitNote = orders.length >= ORDER_LIMIT
        ? "Tính trên " + ORDER_LIMIT + " đơn gần nhất"
        : "";

    statGrid.replaceChildren(
        statCard("Tổng đơn hàng", String(orders.length), limitNote),
        statCard("Chờ xác nhận", String(pendingCount), "Cần xử lý"),
        statCard(
            "Doanh thu (đơn hoàn thành)",
            formatMoney(sumTotal(done)),
            done.length + " đơn"
        ),
        statCard(
            "Đơn đang xử lý",
            formatMoney(sumTotal(processing)),
            processing.length + " đơn"
        ),
        statCard(
            "Sản phẩm",
            visibleProducts + " / " + products.length,
            "đang hiển thị / tổng"
        ),
        statCard(
            "Tài khoản",
            String(users.length),
            adminCount + " admin"
        )
    );

    // Dem theo trang thai
    statusBreakdown.replaceChildren(
        ...ORDER_STATUSES.map(function (status) {
            const count = orders.filter(function (order) {
                return order.status === status.value;
            }).length;

            return el(
                "li",
                "badge is-" + status.value,
                status.label + ": " + count
            );
        })
    );

    // 5 don gan nhat
    recentOrderRows.replaceChildren(
        ...orders.slice(0, 5).map(function (order) {
            const customer = order.customer || {};
            const row = document.createElement("tr");

            row.append(
                cell(orderCode(order.id)),
                cell(formatDate(order.createdAt, true)),
                cell(customer.fullname || "—"),
                cell(formatMoney(order.total)),
                cell(statusLabel(order.status))
            );

            return row;
        })
    );

    if (orders.length === 0) {
        const row = document.createElement("tr");
        const empty = cell("Chưa có đơn hàng nào.");
        empty.colSpan = 5;
        row.appendChild(empty);
        recentOrderRows.appendChild(row);
    }

    // San pham het hang
    const outOfStock = products.filter(function (product) {
        return product.inStock === false;
    });

    outOfStockList.replaceChildren(
        ...(outOfStock.length > 0
            ? outOfStock.map(function (product) {
                return el("li", "", product.name);
            })
            : [el("li", "muted", "Không có sản phẩm nào hết hàng.")])
    );
}
