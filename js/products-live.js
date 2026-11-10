/* =========================================
   SAN PHAM TU FIRESTORE (trang san pham)
   - Co san pham dang hien thi trong Firestore: dung chung de thay danh sach tinh.
   - Chua cau hinh Firebase, chua nap san pham hoac loi mang: giu nguyen danh sach
     san pham viet san trong products.html.
   Viec them vao gio hang, tim kiem, loc danh muc do script.js dam nhiem.
========================================= */

import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const list = document.getElementById("productList");

function formatMoney(amount) {
    return Number(amount).toLocaleString("vi-VN") + "đ";
}

// Chi nhan anh trong thu muc image/ hoac duong dan https
function safeImage(source) {
    const value = String(source || "").trim();
    return /^(image\/|https:\/\/)/i.test(value) ? value : "";
}

function createCard(product) {
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.id = product.id;
    card.dataset.category = product.category || "";
    card.dataset.name = product.name || "";
    card.dataset.price = String(product.price || 0);

    const media = document.createElement("div");
    media.className = "product-media";

    const imageSource = safeImage(product.image);

    if (imageSource) {
        card.dataset.image = imageSource;

        const image = document.createElement("img");
        image.src = imageSource;
        image.alt = product.name || "";
        image.loading = "lazy";
        media.appendChild(image);
    }

    const info = document.createElement("div");
    info.className = "product-info";

    const name = document.createElement("h2");
    name.className = "product-name";
    name.textContent = product.name || "";

    const price = document.createElement("p");
    price.className = "price";
    price.textContent = formatMoney(product.price || 0);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-block";

    if (product.inStock === false) {
        // Het hang: khong co class add-cart nen script.js bo qua
        button.textContent = "Hết hàng";
        button.disabled = true;
    } else {
        button.classList.add("add-cart");
        button.textContent = "Thêm vào giỏ";
    }

    info.append(name, price, button);
    card.append(media, info);

    return card;
}

async function renderLiveProducts() {
    if (!db || !list) return;

    let snapshot;

    try {
        snapshot = await getDocs(
            query(collection(db, "products"), where("active", "==", true))
        );
    } catch (error) {
        console.error("Không tải được sản phẩm từ Firestore:", error);
        return;
    }

    // Chua nap san pham: giu danh sach tinh
    if (snapshot.empty) return;

    const products = snapshot.docs
        .map(function (item) {
            return Object.assign({ id: item.id }, item.data());
        })
        .sort(function (a, b) {
            return (Number(a.order) || 0) - (Number(b.order) || 0);
        });

    list.replaceChildren(...products.map(createCard));

    // Doi script.js gan xong su kien (DOMContentLoaded) roi moi bao loc lai
    if (document.readyState === "loading") {
        await new Promise(function (resolve) {
            document.addEventListener("DOMContentLoaded", resolve, { once: true });
        });
    }

    document.dispatchEvent(new CustomEvent("products:rendered"));
}

renderLiveProducts();
