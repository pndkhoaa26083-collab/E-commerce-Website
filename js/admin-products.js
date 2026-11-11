/* =========================================
   TAB SAN PHAM
   Danh sach, them, sua, xoa, an/hien, het hang.
   San pham cua cua hang chi gom nhung san pham duoc them o day.
========================================= */

import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

import { fetchProducts } from "./admin-data.js";
import { guessCategory } from "./product-category.js";

import {
    CATEGORIES,
    categoryLabel,
    formatMoney,
    el,
    cell,
    normalizeText,
    errorReason,
    setMessage
} from "./admin-common.js";

const productRows = document.getElementById("productRows");
const productCount = document.getElementById("productCount");
const productSearch = document.getElementById("productSearch");
const categoryFilter = document.getElementById("productCategoryFilter");
const addButton = document.getElementById("productAddButton");

const dialog = document.getElementById("productDialog");
const form = document.getElementById("productForm");
const dialogTitle = document.getElementById("productDialogTitle");
const nameInput = document.getElementById("productName");
const categoryHint = document.getElementById("productCategoryHint");
const priceInput = document.getElementById("productPrice");
const imageInput = document.getElementById("productImage");
const preview = document.getElementById("productPreview");
const activeInput = document.getElementById("productActive");
const inStockInput = document.getElementById("productInStock");
const formError = document.getElementById("productFormError");
const cancelButton = document.getElementById("productCancel");
const saveButton = document.getElementById("productSave");

let products = [];
let editingId = null;
let bound = false;

// Chi nhan anh trong thu muc image/ hoac duong dan https
function isValidImage(value) {
    return /^(image\/|https:\/\/)/i.test(value);
}

// =====================================
// 1. DANH SACH
// =====================================

function matches(product) {
    const keyword = normalizeText(productSearch.value.trim());

    const categoryMatches =
        !categoryFilter.value || product.category === categoryFilter.value;

    return categoryMatches && normalizeText(product.name).includes(keyword);
}

function createToggle(product, field, label, okText) {
    const input = document.createElement("input");

    input.type = "checkbox";
    input.checked = product[field] !== false;
    input.setAttribute("aria-label", label + ": " + product.name);

    input.addEventListener("change", async function () {
        input.disabled = true;

        try {
            const changes = {};
            changes[field] = input.checked;
            changes.updatedAt = serverTimestamp();

            await updateDoc(doc(db, "products", product.id), changes);

            product[field] = input.checked;
            setMessage(okText(input.checked) + ": " + product.name, true);
        } catch (error) {
            console.error(error);

            input.checked = !input.checked;
            setMessage("Không cập nhật được. " + errorReason(error), false);
        } finally {
            input.disabled = false;
        }
    });

    return input;
}

function createThumb(product) {
    const wrapper = document.createElement("td");
    wrapper.className = "cell-thumb";

    if (product.image && isValidImage(product.image)) {
        const image = el("img", "admin-thumb");
        image.src = product.image;
        image.alt = "";
        image.loading = "lazy";
        wrapper.appendChild(image);
    } else {
        wrapper.appendChild(el("div", "admin-thumb"));
    }

    return wrapper;
}

function createRow(product) {
    const row = document.createElement("tr");

    // Cac o co data-label de bang doi thanh the tren man hinh nho (xem shop.css)
    function labelled(td, className, label) {
        td.className = className;
        td.dataset.label = label;
        return td;
    }

    row.appendChild(createThumb(product));
    row.append(
        labelled(cell(product.name || "—"), "cell-name", "Tên"),
        labelled(cell(categoryLabel(product.category)), "cell-meta", "Danh mục"),
        labelled(cell(formatMoney(product.price)), "cell-meta", "Giá")
    );

    const activeCell = labelled(
        document.createElement("td"), "cell-toggle", "Hiển thị trên cửa hàng"
    );
    activeCell.appendChild(
        createToggle(product, "active", "Hiển thị", function (on) {
            return on ? "Đã hiển thị" : "Đã ẩn";
        })
    );

    const stockCell = labelled(
        document.createElement("td"), "cell-toggle", "Còn hàng"
    );
    stockCell.appendChild(
        createToggle(product, "inStock", "Còn hàng", function (on) {
            return on ? "Đã đặt còn hàng" : "Đã đặt hết hàng";
        })
    );

    const actionCell = document.createElement("td");
    actionCell.className = "admin-actions";

    const editButton = el("button", "btn btn-sm", "Sửa");
    editButton.type = "button";
    editButton.addEventListener("click", function () {
        openForm(product);
    });

    const deleteButton = el("button", "btn btn-sm btn-danger", "Xóa");
    deleteButton.type = "button";
    deleteButton.addEventListener("click", function () {
        removeProduct(product);
    });

    actionCell.append(editButton, deleteButton);

    row.append(activeCell, stockCell, actionCell);

    return row;
}

function renderProducts() {
    const shown = products.filter(matches);

    productRows.replaceChildren(...shown.map(createRow));

    productCount.textContent =
        shown.length + " / " + products.length + " sản phẩm";

    if (shown.length === 0) {
        const empty = cell(
            products.length === 0
                ? "Chưa có sản phẩm nào. Bấm “Thêm sản phẩm” để tạo sản phẩm đầu tiên."
                : "Không có sản phẩm phù hợp với bộ lọc."
        );

        empty.colSpan = 7;

        const row = el("tr");
        row.appendChild(empty);
        productRows.appendChild(row);
    }
}

export async function loadProducts() {
    bindOnce();

    setMessage("");

    try {
        products = await fetchProducts();
    } catch (error) {
        console.error(error);
        setMessage("Không tải được danh sách sản phẩm. " + errorReason(error), false);
        return;
    }

    renderProducts();
}

// =====================================
// 2. THEM / SUA
// =====================================

// Danh muc cua san pham dang nhap: tu nhan theo ten.
// Dang sua ma ten khong co tu khoa nao thi giu danh muc cu.
function categoryFor(name) {
    const current = editingId
        ? (products.find(function (item) { return item.id === editingId; }) || {}).category
        : "";

    return guessCategory(name, current);
}

function updateCategoryHint() {
    if (!nameInput.value.trim()) {
        categoryHint.textContent = "Danh mục sẽ được tự nhận theo tên sản phẩm.";
        return;
    }

    categoryHint.textContent =
        "Danh mục (tự nhận theo tên): " + categoryLabel(categoryFor(nameInput.value));
}

function updatePreview() {
    const value = imageInput.value.trim();

    if (value && isValidImage(value)) {
        preview.src = value;
        preview.hidden = false;
    } else {
        preview.removeAttribute("src");
        preview.hidden = true;
    }
}

function openForm(product) {
    editingId = product ? product.id : null;

    dialogTitle.textContent = product ? "Sửa sản phẩm" : "Thêm sản phẩm";

    nameInput.value = product ? product.name || "" : "";
    priceInput.value = product ? String(product.price || 0) : "";
    imageInput.value = product ? product.image || "" : "";
    activeInput.checked = product ? product.active !== false : true;
    inStockInput.checked = product ? product.inStock !== false : true;

    formError.textContent = "";
    updatePreview();
    updateCategoryHint();

    dialog.showModal();
    nameInput.focus();
}

function nextOrder() {
    return products.reduce(function (max, product) {
        return Math.max(max, Number(product.order) || 0);
    }, 0) + 1;
}

async function saveProduct(event) {
    event.preventDefault();

    formError.textContent = "";

    const name = nameInput.value.trim();
    const price = Math.round(Number(priceInput.value));
    const image = imageInput.value.trim();

    if (!name) {
        formError.textContent = "Vui lòng nhập tên sản phẩm.";
        nameInput.focus();
        return;
    }

    if (priceInput.value === "" || !Number.isFinite(price) || price < 0) {
        formError.textContent = "Giá phải là số không âm.";
        priceInput.focus();
        return;
    }

    if (image && !isValidImage(image)) {
        formError.textContent =
            "Ảnh phải bắt đầu bằng image/ (ảnh trong dự án) hoặc https://.";
        imageInput.focus();
        return;
    }

    const data = {
        name: name,
        category: categoryFor(name),
        price: price,
        image: image,
        active: activeInput.checked,
        inStock: inStockInput.checked,
        updatedAt: serverTimestamp()
    };

    saveButton.disabled = true;

    try {
        if (editingId) {
            await updateDoc(doc(db, "products", editingId), data);
        } else {
            data.order = nextOrder();
            data.createdAt = serverTimestamp();

            await addDoc(collection(db, "products"), data);
        }
    } catch (error) {
        console.error(error);
        formError.textContent = "Không lưu được. " + errorReason(error);
        return;
    } finally {
        saveButton.disabled = false;
    }

    dialog.close();
    setMessage("Đã lưu sản phẩm: " + name, true);

    await refresh();
}

// =====================================
// 3. XOA VA NAP SAN PHAM MAU
// =====================================

async function refresh() {
    try {
        products = await fetchProducts();
        renderProducts();
    } catch (error) {
        console.error(error);
        setMessage("Không tải lại được danh sách sản phẩm. " + errorReason(error), false);
    }
}

async function removeProduct(product) {
    const confirmed = window.confirm(
        "Xóa sản phẩm \"" + product.name + "\"?\n" +
        "Các đơn hàng cũ vẫn giữ nguyên thông tin sản phẩm đã đặt."
    );

    if (!confirmed) return;

    try {
        await deleteDoc(doc(db, "products", product.id));
        setMessage("Đã xóa sản phẩm: " + product.name, true);
    } catch (error) {
        console.error(error);
        setMessage("Không xóa được sản phẩm. " + errorReason(error), false);
        return;
    }

    await refresh();
}

// =====================================
// 4. GAN SU KIEN (chi mot lan)
// =====================================

function bindOnce() {
    if (bound) return;

    bound = true;

    CATEGORIES.forEach(function (category) {
        categoryFilter.appendChild(
            el("option", "", category.label)
        ).value = category.value;
    });

    nameInput.addEventListener("input", updateCategoryHint);

    productSearch.addEventListener("input", renderProducts);
    categoryFilter.addEventListener("change", renderProducts);

    addButton.addEventListener("click", function () {
        openForm(null);
    });

    imageInput.addEventListener("input", updatePreview);
    form.addEventListener("submit", saveProduct);

    cancelButton.addEventListener("click", function () {
        dialog.close();
    });
}
