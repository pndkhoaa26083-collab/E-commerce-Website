/* =========================================
   SAN PHAM TU FIRESTORE (trang san pham)
   Danh sach san pham chi gom san pham do quan tri them tren Firestore.
   Chua co san pham, chua cau hinh Firebase hoac loi mang thi hien thong bao.
   Viec them vao gio hang, tim kiem, loc danh muc do script.js dam nhiem.
========================================= */

import {
    fetchActiveProducts,
    formatMoney,
    safeImage
} from "./products-data.js";

const list = document.getElementById("productList");
const statusBox = document.getElementById("productStatus");
const resultCount = document.getElementById("resultCount");

// San pham co size hoac mau thi phai chon o trang chi tiet truoc khi mua
function hasVariants(product) {
    return ["sizes", "colors"].some(function (field) {
        return Array.isArray(product[field]) && product[field].length > 0;
    });
}

function createCard(product) {
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.id = product.id;
    card.dataset.category = product.category || "";
    card.dataset.name = product.name || "";
    card.dataset.price = String(product.price || 0);

    const detailUrl = "product.html?id=" + encodeURIComponent(product.id);

    // Anh dan toi trang chi tiet (ten san pham ben duoi da co lien ket nen
    // bo qua lien ket anh doi voi ban phim va trinh doc man hinh)
    const media = document.createElement("a");
    media.className = "product-media";
    media.href = detailUrl;
    media.tabIndex = -1;
    media.setAttribute("aria-hidden", "true");

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

    const nameLink = document.createElement("a");
    nameLink.href = detailUrl;
    nameLink.textContent = product.name || "";
    name.appendChild(nameLink);

    const price = document.createElement("p");
    price.className = "price";
    price.textContent = formatMoney(product.price || 0);

    let button;

    if (product.inStock === false) {
        // Het hang: khong co class add-cart nen script.js bo qua
        button = document.createElement("button");
        button.type = "button";
        button.className = "btn btn-block";
        button.textContent = "Hết hàng";
        button.disabled = true;
    } else if (hasVariants(product)) {
        // Can chon size / mau: chuyen sang trang chi tiet
        button = document.createElement("a");
        button.className = "btn btn-block";
        button.href = detailUrl;
        button.textContent = "Chọn size / màu";
    } else {
        button = document.createElement("button");
        button.type = "button";
        button.className = "btn btn-block add-cart";
        button.textContent = "Thêm vào giỏ";
    }

    info.append(name, price, button);
    card.append(media, info);

    return card;
}

// Hien mot dong thong bao thay cho danh sach (dang tai / trong / loi)
function showStatus(text) {
    if (statusBox) {
        statusBox.textContent = text;
        statusBox.hidden = !text;
    }

    if (resultCount) {
        resultCount.textContent = "";
    }
}

async function renderLiveProducts() {
    if (!list) return;

    showStatus("Đang tải sản phẩm…");

    let products;

    try {
        products = await fetchActiveProducts();
    } catch (error) {
        console.error("Không tải được sản phẩm từ Firestore:", error);
        showStatus("Không tải được sản phẩm. Vui lòng tải lại trang sau ít phút.");
        return;
    }

    if (products === null) {
        showStatus("Cửa hàng đang cập nhật sản phẩm. Vui lòng quay lại sau.");
        return;
    }

    if (products.length === 0) {
        showStatus("Chưa có sản phẩm nào. Vui lòng quay lại sau.");
        return;
    }

    showStatus("");
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
