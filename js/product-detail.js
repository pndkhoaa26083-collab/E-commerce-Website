/* =========================================
   TRANG CHI TIET SAN PHAM (product.html?id=<ma san pham>)
   Doc 1 san pham tu Firestore va hien: anh, gia, tinh trang, chat lieu,
   chon size / mau / so luong, mo ta, them vao gio hang.
   Viec luu gio hang do script.js (window.WangCart) dam nhiem.
========================================= */

import { db } from "./firebase.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

import { formatMoney, safeImage } from "./products-data.js";

const CATEGORY_LABELS = {
    ao: "Áo",
    quan: "Quần",
    giay: "Giày",
    phukien: "Phụ kiện"
};

const MAX_QUANTITY = 99;

const statusBox = document.getElementById("detailStatus");
const detail = document.getElementById("detail");
const crumbName = document.getElementById("crumbName");
const mainBox = document.getElementById("detailMain");
const thumbsBox = document.getElementById("detailThumbs");
const categoryLine = document.getElementById("detailCategory");
const nameHeading = document.getElementById("detailName");
const priceLine = document.getElementById("detailPrice");
const stockLine = document.getElementById("detailStock");
const hiddenNote = document.getElementById("detailHiddenNote");
const specs = document.getElementById("detailSpecs");
const buyForm = document.getElementById("buyForm");
const sizeGroup = document.getElementById("sizeGroup");
const sizeList = document.getElementById("sizeList");
const colorGroup = document.getElementById("colorGroup");
const colorList = document.getElementById("colorList");
const qtyInput = document.getElementById("detailQty");
const qtyMinus = document.getElementById("qtyMinus");
const qtyPlus = document.getElementById("qtyPlus");
const errorLine = document.getElementById("detailError");
const addButton = document.getElementById("addButton");
const addedLine = document.getElementById("detailAdded");
const descSection = document.getElementById("detailDescSection");
const descText = document.getElementById("detailDesc");

let product = null;
let sizes = [];
let colors = [];
let addTimer = 0;

// =====================================
// 1. TRANG THAI (dang tai / khong thay / loi)
// =====================================

function showStatus(message, withBackLink) {
    statusBox.textContent = message;

    if (withBackLink) {
        const link = document.createElement("a");
        link.href = "products.html";
        link.textContent = "Quay lại danh sách sản phẩm";

        statusBox.append(" ", link);
    }

    statusBox.hidden = false;
    detail.hidden = true;
}

// =====================================
// 2. DOC SAN PHAM
// =====================================

// Doc du lieu tu Firestore: dua ve chuoi / danh sach an toan de hien thi
function cleanText(value, max) {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanList(value, maxItems, maxLength) {
    if (!Array.isArray(value)) return [];

    const seen = new Set();

    return value
        .filter(function (item) { return typeof item === "string"; })
        .map(function (item) { return item.trim().slice(0, maxLength); })
        .filter(function (item) {
            const key = item.toLowerCase();

            if (!item || seen.has(key)) return false;

            seen.add(key);
            return true;
        })
        .slice(0, maxItems);
}

// Tra ve { state: "ok", product } | { state: "missing" } | { state: "unavailable" }
// Nem loi khi khong doc duoc Firestore (mang, ...).
async function loadProduct(id) {
    if (!db) {
        return { state: "unavailable" };
    }

    let snapshot;

    try {
        snapshot = await getDoc(doc(db, "products", id));
    } catch (error) {
        // Quy tac bao mat tu choi doc san pham khong ton tai hoac dang an
        if (error && error.code === "permission-denied") {
            return { state: "missing" };
        }

        throw error;
    }

    if (!snapshot.exists()) {
        return { state: "missing" };
    }

    return {
        state: "ok",
        product: Object.assign({ id: snapshot.id }, snapshot.data())
    };
}

// =====================================
// 3. HIEN THI
// =====================================

function renderGallery(images, name) {
    let current = 0;

    function show(index) {
        current = index;

        const image = document.createElement("img");
        image.src = images[index];
        image.alt = name;

        mainBox.replaceChildren(image);

        thumbsBox.querySelectorAll("button").forEach(function (button, position) {
            button.setAttribute("aria-pressed", String(position === current));
        });
    }

    if (images.length === 0) {
        const empty = document.createElement("p");
        empty.className = "pd-noimage";
        empty.textContent = "Chưa có ảnh sản phẩm";

        mainBox.replaceChildren(empty);
        thumbsBox.hidden = true;
        return;
    }

    thumbsBox.replaceChildren();
    thumbsBox.hidden = images.length < 2;

    if (images.length > 1) {
        images.forEach(function (source, index) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "pd-thumb";
            button.setAttribute("aria-label", "Xem ảnh " + (index + 1));

            const thumb = document.createElement("img");
            thumb.src = source;
            thumb.alt = "";
            thumb.loading = "lazy";

            button.appendChild(thumb);
            button.addEventListener("click", function () {
                show(index);
            });

            thumbsBox.appendChild(button);
        });
    }

    show(0);
}

// Nhom chon size / mau: cac o radio trinh bay nhu nut bam
function renderOptions(group, list, values, fieldName) {
    group.hidden = values.length === 0;
    list.replaceChildren();

    values.forEach(function (value) {
        const label = document.createElement("label");
        label.className = "pd-option";

        const input = document.createElement("input");
        input.type = "radio";
        input.name = fieldName;
        input.value = value;

        input.addEventListener("change", function () {
            errorLine.textContent = "";
        });

        const text = document.createElement("span");
        text.textContent = value;

        label.append(input, text);
        list.appendChild(label);
    });
}

function addSpec(label, value) {
    const term = document.createElement("dt");
    term.textContent = label;

    const description = document.createElement("dd");
    description.textContent = value;

    specs.append(term, description);
}

function render() {
    const name = cleanText(product.name, 120) || "Sản phẩm";
    const price = Number(product.price) || 0;
    const inStock = product.inStock !== false;

    const material = cleanText(product.material, 120);
    const description = cleanText(product.description, 2000);

    sizes = cleanList(product.sizes, 12, 20);
    colors = cleanList(product.colors, 12, 30);

    // Anh chinh + anh them (bo trung, chi nhan image/ hoac https://)
    const images = [product.image]
        .concat(Array.isArray(product.images) ? product.images : [])
        .map(safeImage)
        .filter(function (source, index, all) {
            return source && all.indexOf(source) === index;
        })
        .slice(0, 6);

    document.title = name + " | Wang Fashion";
    crumbName.textContent = name;

    categoryLine.textContent = CATEGORY_LABELS[product.category] || "";
    categoryLine.hidden = !categoryLine.textContent;

    nameHeading.textContent = name;
    priceLine.textContent = formatMoney(price);

    stockLine.textContent = inStock ? "Còn hàng" : "Hết hàng";
    stockLine.classList.toggle("is-out", !inStock);

    hiddenNote.hidden = product.active !== false;

    specs.replaceChildren();

    if (material) {
        addSpec("Chất liệu", material);
    }

    specs.hidden = !material;

    descText.textContent = description;
    descSection.hidden = !description;

    renderGallery(images, name);
    renderOptions(sizeGroup, sizeList, sizes, "size");
    renderOptions(colorGroup, colorList, colors, "color");

    qtyInput.value = "1";
    errorLine.textContent = "";
    addedLine.hidden = true;

    // Het hang: khong cho them vao gio
    addButton.disabled = !inStock;
    addButton.textContent = inStock ? "Thêm vào giỏ" : "Hết hàng";
    qtyInput.disabled = !inStock;
    qtyMinus.disabled = !inStock;
    qtyPlus.disabled = !inStock;

    statusBox.hidden = true;
    detail.hidden = false;
}

// =====================================
// 4. SO LUONG VA THEM VAO GIO
// =====================================

function readQuantity() {
    const value = Math.floor(Number(qtyInput.value));

    if (!Number.isFinite(value) || value < 1) return 1;

    return Math.min(value, MAX_QUANTITY);
}

function checkedValue(name) {
    const input = buyForm.querySelector('input[name="' + name + '"]:checked');

    return input ? input.value : "";
}

function addToCart(event) {
    event.preventDefault();

    errorLine.textContent = "";
    addedLine.hidden = true;

    if (!product || product.inStock === false) return;

    const size = checkedValue("size");
    const color = checkedValue("color");

    if (sizes.length > 0 && !size) {
        errorLine.textContent = "Vui lòng chọn size.";
        sizeList.querySelector("input").focus();
        return;
    }

    if (colors.length > 0 && !color) {
        errorLine.textContent = "Vui lòng chọn màu sắc.";
        colorList.querySelector("input").focus();
        return;
    }

    const quantity = readQuantity();
    qtyInput.value = String(quantity);

    // Cung san pham nhung khac size / mau la cac dong rieng trong gio
    const variant = [];
    const idParts = [product.id];

    if (size) {
        variant.push("Size " + size);
        idParts.push(size);
    }

    if (color) {
        variant.push("Màu " + color);
        idParts.push(color);
    }

    const baseName = cleanText(product.name, 120) || "Sản phẩm";

    const added = window.WangCart && window.WangCart.add({
        id: idParts.join("::"),
        name: variant.length ? baseName + " (" + variant.join(", ") + ")" : baseName,
        price: Number(product.price) || 0,
        quantity: quantity
    });

    if (!added) {
        errorLine.textContent =
            "Không thêm được vào giỏ hàng. Vui lòng tải lại trang và thử lại.";
        return;
    }

    addedLine.hidden = false;

    addButton.textContent = "Đã thêm vào giỏ";
    clearTimeout(addTimer);

    addTimer = setTimeout(function () {
        addButton.textContent = "Thêm vào giỏ";
    }, 1200);
}

function bindOnce() {
    buyForm.addEventListener("submit", addToCart);

    qtyMinus.addEventListener("click", function () {
        qtyInput.value = String(Math.max(1, readQuantity() - 1));
    });

    qtyPlus.addEventListener("click", function () {
        qtyInput.value = String(Math.min(MAX_QUANTITY, readQuantity() + 1));
    });

    qtyInput.addEventListener("change", function () {
        qtyInput.value = String(readQuantity());
    });
}

// =====================================
// 5. KHOI DONG
// =====================================

async function start() {
    const id = (new URLSearchParams(window.location.search).get("id") || "").trim();

    // Ma san pham cua Firestore chi gom chu, so, gach noi, gach duoi
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) {
        showStatus("Không tìm thấy sản phẩm.", true);
        return;
    }

    let result;

    try {
        result = await loadProduct(id);
    } catch (error) {
        console.error("Không tải được sản phẩm:", error);
        showStatus("Không tải được sản phẩm. Vui lòng tải lại trang sau ít phút.", false);
        return;
    }

    if (result.state === "unavailable") {
        showStatus("Cửa hàng đang cập nhật sản phẩm. Vui lòng quay lại sau.", true);
        return;
    }

    if (result.state === "missing") {
        showStatus("Không tìm thấy sản phẩm, hoặc sản phẩm đã ngừng bán.", true);
        return;
    }

    product = result.product;

    bindOnce();
    render();
}

start();
