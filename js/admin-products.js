/* =========================================
   TAB SAN PHAM
   Danh sach, them, sua, xoa, an/hien, het hang,
   va nap 8 san pham mau (lay tu danh sach san pham hien co).
========================================= */

import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    writeBatch,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

import { fetchProducts } from "./admin-data.js";

import {
    CATEGORIES,
    categoryLabel,
    formatMoney,
    el,
    cell,
    normalizeText,
    setMessage
} from "./admin-common.js";

// San pham mau: giong 8 san pham viet san trong products.html
const SAMPLE_PRODUCTS = [
    { id: "ao-thun-basic", name: "Áo thun basic", category: "ao", price: 150000, image: "image/Ao.jpg" },
    { id: "ao-so-mi", name: "Áo sơ mi", category: "ao", price: 200000, image: "image/Aosomi.jpg" },
    { id: "ao-hoodie", name: "Áo hoodie", category: "ao", price: 320000, image: "image/aohoodie.jpg" },
    { id: "quan-jeans", name: "Quần jeans", category: "quan", price: 250000, image: "image/Quanjean.jpg" },
    { id: "quan-au", name: "Quần âu", category: "quan", price: 220000, image: "image/Quanau.jpg" },
    { id: "quan-short", name: "Quần short", category: "quan", price: 180000, image: "image/quanshort.jpg" },
    { id: "giay-sneaker", name: "Giày sneaker", category: "giay", price: 450000, image: "image/giaysneaker.webp" },
    { id: "phukien-tui-deo-cheo", name: "Túi đeo chéo", category: "phukien", price: 220000, image: "image/tuideocheo.webp" }
];

const productRows = document.getElementById("productRows");
const productCount = document.getElementById("productCount");
const productSearch = document.getElementById("productSearch");
const categoryFilter = document.getElementById("productCategoryFilter");
const addButton = document.getElementById("productAddButton");
const seedButton = document.getElementById("productSeedButton");

const dialog = document.getElementById("productDialog");
const form = document.getElementById("productForm");
const dialogTitle = document.getElementById("productDialogTitle");
const nameInput = document.getElementById("productName");
const categorySelect = document.getElementById("productCategory");
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
            setMessage(
                "Không cập nhật được. Kiểm tra quy tắc bảo mật Firestore.",
                false
            );
        } finally {
            input.disabled = false;
        }
    });

    return input;
}

function createThumb(product) {
    const wrapper = document.createElement("td");

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

    row.appendChild(createThumb(product));
    row.append(
        cell(product.name || "—"),
        cell(categoryLabel(product.category)),
        cell(formatMoney(product.price))
    );

    const activeCell = document.createElement("td");
    activeCell.appendChild(
        createToggle(product, "active", "Hiển thị", function (on) {
            return on ? "Đã hiển thị" : "Đã ẩn";
        })
    );

    const stockCell = document.createElement("td");
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

    // Chua co san pham nao: cho phep nap san pham mau
    seedButton.hidden = products.length > 0;
}

export async function loadProducts() {
    bindOnce();

    setMessage("");

    try {
        products = await fetchProducts();
    } catch (error) {
        console.error(error);
        setMessage("Không tải được danh sách sản phẩm.", false);
        return;
    }

    renderProducts();
}

// =====================================
// 2. THEM / SUA
// =====================================

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
    categorySelect.value = product ? product.category : CATEGORIES[0].value;
    priceInput.value = product ? String(product.price || 0) : "";
    imageInput.value = product ? product.image || "" : "";
    activeInput.checked = product ? product.active !== false : true;
    inStockInput.checked = product ? product.inStock !== false : true;

    formError.textContent = "";
    updatePreview();

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
        category: categorySelect.value,
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
        formError.textContent =
            "Không lưu được. Hãy kiểm tra quy tắc bảo mật Firestore.";
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
        setMessage("Không tải lại được danh sách sản phẩm.", false);
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
        setMessage("Không xóa được sản phẩm.", false);
        return;
    }

    await refresh();
}

async function seedProducts() {
    const confirmed = window.confirm(
        "Nạp " + SAMPLE_PRODUCTS.length + " sản phẩm mẫu vào Firestore?\n" +
        "Sau đó trang Sản phẩm của cửa hàng sẽ đọc dữ liệu từ đây."
    );

    if (!confirmed) return;

    seedButton.disabled = true;

    try {
        const batch = writeBatch(db);

        SAMPLE_PRODUCTS.forEach(function (sample, index) {
            batch.set(doc(db, "products", sample.id), {
                name: sample.name,
                category: sample.category,
                price: sample.price,
                image: sample.image,
                active: true,
                inStock: true,
                order: index + 1,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        });

        await batch.commit();

        setMessage("Đã nạp " + SAMPLE_PRODUCTS.length + " sản phẩm mẫu.", true);
    } catch (error) {
        console.error(error);
        setMessage(
            "Không nạp được sản phẩm mẫu. Hãy kiểm tra quy tắc bảo mật Firestore.",
            false
        );
        return;
    } finally {
        seedButton.disabled = false;
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
        categorySelect.appendChild(
            el("option", "", category.label)
        ).value = category.value;

        categoryFilter.appendChild(
            el("option", "", category.label)
        ).value = category.value;
    });

    productSearch.addEventListener("input", renderProducts);
    categoryFilter.addEventListener("change", renderProducts);

    addButton.addEventListener("click", function () {
        openForm(null);
    });

    seedButton.addEventListener("click", seedProducts);

    imageInput.addEventListener("input", updatePreview);
    form.addEventListener("submit", saveProduct);

    cancelButton.addEventListener("click", function () {
        dialog.close();
    });
}
