
/* =========================================
   MAIN JAVASCRIPT
   Tim kiem - Loc san pham - Gio hang
   Thanh toan
========================================= */

document.addEventListener("DOMContentLoaded", function () {

    const CART_KEY = "wangFashionCart";
    const SHIPPING_FEE = 30000;

    // =====================================
    // 1. CAC HAM DUNG CHUNG
    // =====================================

    function getCart() {
        try {
            return JSON.parse(localStorage.getItem(CART_KEY)) || [];
        } catch (error) {
            return [];
        }
    }

    function saveCart(cart) {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        updateCartCount();
    }

    // Cap nhat con so tren bieu tuong gio hang o thanh menu
    function updateCartCount() {
        const count = getCart().reduce(function (total, item) {
            return total + (Number(item.quantity) || 0);
        }, 0);

        document
            .querySelectorAll("[data-cart-count]")
            .forEach(function (badge) {
                badge.textContent = count > 99 ? "99+" : String(count);
                badge.hidden = count === 0;
            });
    }

    function formatMoney(amount) {
        return Number(amount).toLocaleString("vi-VN") + "đ";
    }

    function getSubtotal(cart) {
        return cart.reduce(function (total, item) {
            return total + item.price * item.quantity;
        }, 0);
    }

    function getShipping(subtotal) {
        return subtotal > 0 ? SHIPPING_FEE : 0;
    }

    function showMessage(message) {
        alert(message);
    }


    // =====================================
    // 2. TIM KIEM VA LOC SAN PHAM
    // =====================================

    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchButton");

    const categoryButtons = document.querySelectorAll(".category-btn");
    const resultCount = document.getElementById("resultCount");
    const noResults = document.getElementById("noResults");

    let selectedCategory = "all";

    // Chuyen chu co dau thanh khong dau de tim kiem de hon
    function normalizeText(text) {
        return String(text)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d");
    }

    function filterProducts() {
        const productCards = document.querySelectorAll(
            "#productList .product-card"
        );

        const keyword = searchInput
            ? normalizeText(searchInput.value.trim())
            : "";

        let visibleCount = 0;

        productCards.forEach(function (card) {
            // Lay ten tu data-name hoac class product-name
            const productName =
                card.dataset.name ||
                card.querySelector(".product-name")?.textContent ||
                "";

            const normalizedName = normalizeText(productName);
            const category = card.dataset.category || "all";

            const matchCategory =
                selectedCategory === "all" ||
                category === selectedCategory;

            const matchSearch = normalizedName.includes(keyword);

            const isVisible = matchCategory && matchSearch;

            card.style.display = isVisible ? "" : "none";

            if (isVisible) {
                visibleCount++;
            }
        });

        // Cap nhat so luong san pham
        if (resultCount) {
            resultCount.textContent = visibleCount + " sản phẩm";
        }

        // Hien thi thong bao neu khong co ket qua
        if (noResults) {
            noResults.hidden = visibleCount !== 0;
        }
    }

    // Nut tim kiem
    if (searchButton) {
        searchButton.addEventListener("click", filterProducts);
    }

    // Tim kiem khi nhap
    if (searchInput) {
        searchInput.addEventListener("input", filterProducts);

        searchInput.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                filterProducts();
            }
        });
    }

    // =====================================
    // 3. LOC DANH MUC
    // =====================================

    categoryButtons.forEach(function (button) {
        button.addEventListener("click", function () {

            selectedCategory = button.dataset.category || "all";

            // Cap nhat nut dang duoc chon
            categoryButtons.forEach(function (item) {
                item.classList.remove("is-active");
                item.setAttribute("aria-pressed", "false");
            });

            button.classList.add("is-active");
            button.setAttribute("aria-pressed", "true");

            filterProducts();
        });
    });


    // =====================================
    // 4. THEM SAN PHAM VAO GIO HANG
    // =====================================

    const productList = document.getElementById("productList");

    if (productList) {
        productList.addEventListener("click", function (event) {
            const button = event.target.closest(".add-cart");

            if (!button) return;

            const card = button.closest(".product-card");

            if (!card) return;

            const nameElement = card.querySelector(".product-name");
            const priceElement = card.querySelector(".price");
            if (!nameElement || !priceElement) return;

            const name = nameElement.textContent.trim();

            // Dung data-id de nhan dien san pham (neu thieu thi dung ten)
            const id = card.dataset.id || name;

            const price = Number(
                priceElement.textContent.replace(/[^\d]/g, "")
            );

            if (!price || !name) {
                showMessage("Thông tin sản phẩm chưa hợp lệ.");
                return;
            }

            const cart = getCart();

            // Gio hang cu (chua co id) van duoc nhan dien qua ten
            const existingProduct = cart.find(function (item) {
                return item.id === id || (!item.id && item.name === name);
            });

            if (existingProduct) {
                existingProduct.id = id;
                existingProduct.quantity += 1;
            } else {
                cart.push({
                    id: id,
                    name: name,
                    price: price,
                    quantity: 1
                });
            }

            saveCart(cart);

            const originalText = button.textContent;

            button.textContent = "Đã thêm vào giỏ";
            button.disabled = true;

            setTimeout(function () {
                button.textContent = originalText;
                button.disabled = false;
            }, 1000);
        });
    }

    // =====================================
    // 5. HIEN THI GIO HANG
    // =====================================

    const cartItems = document.getElementById("cartItems");

    function renderCart() {
        if (!cartItems) return;

        const cart = getCart();

        if (cart.length === 0) {
            cartItems.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-cart">
                        Giỏ hàng của bạn đang trống.
                    </td>
                </tr>
            `;
        } else {
            cartItems.innerHTML = cart.map(function (item, index) {
                return `
                    <tr>
                        <td>${escapeHTML(item.name)}</td>

                        <td>${formatMoney(item.price)}</td>

                        <td>
                            <div class="quantity-control">
                                <button
                                    type="button"
                                    class="quantity-btn"
                                    data-action="decrease"
                                    data-index="${index}"
                                >−</button>

                                <span>${item.quantity}</span>

                                <button
                                    type="button"
                                    class="quantity-btn"
                                    data-action="increase"
                                    data-index="${index}"
                                >+</button>
                            </div>
                        </td>

                        <td>
                            ${formatMoney(item.price * item.quantity)}
                        </td>

                        <td>
                            <button
                                type="button"
                                class="remove-item"
                                data-action="remove"
                                data-index="${index}"
                            >Xóa</button>
                        </td>
                    </tr>
                `;
            }).join("");
        }

        const subtotal = getSubtotal(cart);
        const shipping = getShipping(subtotal);
        const total = subtotal + shipping;

        const subtotalElement =
            document.getElementById("cartSubtotal");

        const shippingElement =
            document.getElementById("cartShipping");

        const totalElement =
            document.getElementById("cartTotal");

        if (subtotalElement) {
            subtotalElement.textContent = formatMoney(subtotal);
        }

        if (shippingElement) {
            shippingElement.textContent = formatMoney(shipping);
        }

        if (totalElement) {
            totalElement.textContent = formatMoney(total);
        }
    }

    // Chặn HTML không mong muốn trong tên sản phẩm
    function escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, function (char) {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return entities[char];
        });
    }

    // =====================================
    // 6. TANG - GIAM - XOA SAN PHAM
    // =====================================

    if (cartItems) {
        cartItems.addEventListener("click", function (event) {
            const button = event.target.closest("[data-action]");

            if (!button) return;

            const action = button.dataset.action;
            const index = Number(button.dataset.index);

            const cart = getCart();

            if (!Number.isInteger(index) || !cart[index]) return;

            if (action === "increase") {
                cart[index].quantity += 1;
            }

            if (action === "decrease") {
                cart[index].quantity -= 1;

                if (cart[index].quantity <= 0) {
                    cart.splice(index, 1);
                }
            }

            if (action === "remove") {
                cart.splice(index, 1);
            }

            saveCart(cart);
            renderCart();
        });
    }

    // =====================================
    // 7. HIEN THI DON HANG THANH TOAN
    // =====================================

    const checkoutItems =
        document.getElementById("checkoutItems");

    function renderCheckout() {
        if (!checkoutItems) return;

        const cart = getCart();

        if (cart.length === 0) {
            checkoutItems.innerHTML = `
                <p>Giỏ hàng đang trống. 
                Vui lòng quay lại chọn sản phẩm.</p>
            `;
        } else {
            checkoutItems.innerHTML = cart.map(function (item) {
                return `
                    <div class="checkout-product-row">
                        <span>
                            ${escapeHTML(item.name)}
                            × ${item.quantity}
                        </span>

                        <strong>
                            ${formatMoney(item.price * item.quantity)}
                        </strong>
                    </div>
                `;
            }).join("");
        }

        const subtotal = getSubtotal(cart);
        const shipping = getShipping(subtotal);
        const total = subtotal + shipping;

        const subtotalElement = document.getElementById("subtotal");
        const shippingElement = document.getElementById("shipping");
        const totalElement = document.getElementById("total");

        if (subtotalElement) {
            subtotalElement.textContent = formatMoney(subtotal);
        }

        if (shippingElement) {
            shippingElement.textContent = formatMoney(shipping);
        }

        if (totalElement) {
            totalElement.textContent = formatMoney(total);
        }

        // Nut xac nhan nam ngoai form va gan vao form bang thuoc tinh form=""
        const submitButton = document.querySelector(
            'button[form="checkoutForm"], .checkout-btn'
        );

        if (submitButton) {
            submitButton.disabled = cart.length === 0;
        }
    }

    // =====================================
    // 8. XAC NHAN DAT HANG
    // =====================================

    const checkoutForm = document.getElementById("checkoutForm");

    if (checkoutForm) {
        checkoutForm.addEventListener("submit", function (event) {
            event.preventDefault();

            const cart = getCart();

            if (cart.length === 0) {
                showMessage("Giỏ hàng đang trống!");
                return;
            }

            if (!checkoutForm.reportValidity()) {
                return;
            }

            const fullname =
                document.getElementById("fullname").value.trim();

            const phone =
                document.getElementById("phone").value.trim();

            const email =
                document.getElementById("email").value.trim();

            const address =
                document.getElementById("address").value.trim();

            const note =
                document.getElementById("note").value.trim();

            const paymentInput = checkoutForm.querySelector(
                'input[name="payment"]:checked'
            );

            const payment = paymentInput
                ? paymentInput.value
                : "cod";

            const subtotal = getSubtotal(cart);
            const shipping = getShipping(subtotal);
            const total = subtotal + shipping;

            const order = {
                customer: {
                    fullname: fullname,
                    phone: phone,
                    email: email,
                    address: address,
                    note: note
                },

                payment: payment,
                products: cart,
                subtotal: subtotal,
                shipping: shipping,
                total: total,
                createdAt: new Date().toISOString()
            };

            // Luu don hang demo tren trinh duyet
            const orders = JSON.parse(
                localStorage.getItem("wangFashionOrders") || "[]"
            );

            orders.push(order);

            localStorage.setItem(
                "wangFashionOrders",
                JSON.stringify(orders)
            );

            // Xoa gio hang sau khi dat hang
            localStorage.removeItem(CART_KEY);

            showMessage(
                "Đặt hàng thành công!\n\n" +
                "Cảm ơn " + fullname +
                " đã mua sắm tại Wang Fashion.\n" +
                "Tổng thanh toán: " + formatMoney(total)
            );

            window.location.href = "index.html";
        });
    }

    // =====================================
    // 9. KHOI TAO DU LIEU KHI MO TRANG
    // =====================================

    updateCartCount();
    filterProducts();
    renderCart();
    renderCheckout();

    console.log("Wang Fashion is running!");

});
