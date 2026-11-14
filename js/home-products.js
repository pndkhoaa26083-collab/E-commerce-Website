/* =========================================
   SAN PHAM NOI BAT (trang chu)
   Lay toi da 4 san pham dau tien tu Firestore.
   Khong co san pham (hoac loi) thi giu an ca muc, khong hien o trong.
========================================= */

import {
    fetchActiveProducts,
    formatMoney,
    safeImage
} from "./products-data.js";

const section = document.getElementById("featuredSection");
const shelf = document.getElementById("featuredList");

const MAX_ITEMS = 4;

function createItem(product) {
    const item = document.createElement("article");
    item.className = "item";

    const detailUrl = "product.html?id=" + encodeURIComponent(product.id);

    // Anh dan toi trang chi tiet (nut "Xem san pham" ben duoi da co lien ket
    // nen bo qua lien ket anh doi voi ban phim va trinh doc man hinh)
    const media = document.createElement("a");
    media.className = "item-media";
    media.href = detailUrl;
    media.tabIndex = -1;
    media.setAttribute("aria-hidden", "true");

    const imageSource = safeImage(product.image);

    if (imageSource) {
        const image = document.createElement("img");
        image.src = imageSource;
        image.alt = product.name || "";
        image.loading = "lazy";
        media.appendChild(image);
    }

    const name = document.createElement("h3");
    name.textContent = product.name || "";

    const price = document.createElement("p");
    price.className = "item-price";
    price.textContent = formatMoney(product.price || 0);

    const link = document.createElement("a");
    link.className = "item-btn";
    link.href = detailUrl;
    link.textContent = "Xem sản phẩm";

    item.append(media, name, price, link);

    return item;
}

async function renderFeatured() {
    if (!section || !shelf) return;

    let products;

    try {
        products = await fetchActiveProducts();
    } catch (error) {
        console.error("Không tải được sản phẩm nổi bật:", error);
        return;
    }

    if (!products || products.length === 0) return;

    shelf.replaceChildren(...products.slice(0, MAX_ITEMS).map(createItem));
    section.hidden = false;
}

renderFeatured();
