
/* =========================================
   MAIN JAVASCRIPT
   Tim kiem - Loc san pham - Gio hang
   Thanh toan
========================================= */

document.addEventListener("DOMContentLoaded", function () {

    const CART_KEY = "wangFashionCart";
    const SHIPPING_FEE = 30000;

    // Tai khoan nhan tien khi khach chon "Chuyen khoan ngan hang"
    const BANK_INFO = {
        bank: "MB Bank",
        bin: "970422",              // ma ngan hang dung cho VietQR (MB Bank)
        holder: "CAO NGOC TRI",
        number: "0337675709"
    };

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

    // Trang san pham dung the tu Firestore xong thi loc lai (cap nhat so luong)
    document.addEventListener("products:rendered", filterProducts);

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
    // 7B. THONG TIN CHUYEN KHOAN
    // Hien khung thong tin khi khach chon "Chuyen khoan ngan hang"
    // =====================================

    const bankInfoBox = document.getElementById("bankInfo");

    if (bankInfoBox) {
        document.getElementById("bankName").textContent = BANK_INFO.bank;
        document.getElementById("bankHolder").textContent = BANK_INFO.holder;
        document.getElementById("bankNumber").textContent = BANK_INFO.number;

        const paymentInputs = document.querySelectorAll(
            'input[name="payment"]'
        );

        function updateBankInfo() {
            const selected = document.querySelector(
                'input[name="payment"]:checked'
            );

            bankInfoBox.hidden = !selected || selected.value !== "bank";
        }

        paymentInputs.forEach(function (input) {
            input.addEventListener("change", updateBankInfo);
        });

        updateBankInfo();

        // Nut sao chep so tai khoan
        const copyButton = document.getElementById("bankCopy");

        if (copyButton) {
            copyButton.addEventListener("click", function () {
                copyText(BANK_INFO.number, copyButton);
            });
        }
    }

    // Chep chu vao bo nho tam; nut doi chu de bao ket qua
    async function copyText(text, button) {
        try {
            await navigator.clipboard.writeText(text);
            button.textContent = "Đã sao chép";
        } catch (error) {
            // Trinh duyet khong cho phep: de khach tu chep
            button.textContent = "Hãy chép thủ công";
        }

        setTimeout(function () {
            button.textContent = "Sao chép";
        }, 1500);
    }

    // =====================================
    // 7C. MA QR THANH TOAN (sau khi dat hang)
    // Hien QR VietQR co san so tien va noi dung chuyen khoan.
    // Tra ve false neu khong ve duoc (khi do dung thong bao thuong).
    // =====================================

    function showBankPayment(orderCode, phone, total) {
        const panel = document.getElementById("bankPay");
        const body = document.getElementById("checkoutBody");
        const qrBox = document.getElementById("bankQr");

        if (!panel || !body || !qrBox || !window.WangQR) {
            return false;
        }

        const content = "WANG " + (orderCode || phone);

        let svg;
        let payload;

        try {
            payload = window.WangQR.vietQrPayload({
                bin: BANK_INFO.bin,
                account: BANK_INFO.number,
                amount: total,
                content: content
            });

            svg = window.WangQR.toSvg(
                payload,
                "Mã QR chuyển khoản " + formatMoney(total)
            );
        } catch (error) {
            console.error(error);
            return false;
        }

        qrBox.textContent = "";
        qrBox.appendChild(svg);

        document.getElementById("payOrderCode").textContent =
            orderCode || "(chưa có)";
        document.getElementById("payBank").textContent = BANK_INFO.bank;
        document.getElementById("payHolder").textContent = BANK_INFO.holder;
        document.getElementById("payNumber").textContent = BANK_INFO.number;
        document.getElementById("payAmount").textContent = formatMoney(total);
        document.getElementById("payContent").textContent = content;

        // Nut sao chep: so tien chi chep chu so de dan vao app ngan hang
        panel.querySelectorAll("[data-copy-from]").forEach(function (button) {
            button.addEventListener("click", function () {
                const source = document.getElementById(
                    button.getAttribute("data-copy-from")
                );

                let text = source.textContent;

                if (button.hasAttribute("data-copy-digits")) {
                    text = String(Math.round(total));
                }

                copyText(text, button);
            });
        });

        // Khach dung dien thoai khong quet duoc man hinh cua chinh minh,
        // nen cho tai anh ve de chon trong app ngan hang
        const downloadButton = document.getElementById("bankQrDownload");

        if (downloadButton) {
            downloadButton.addEventListener("click", async function () {
                try {
                    const blob = await window.WangQR.toPngBlob(payload, 720);
                    const link = document.createElement("a");

                    link.href = URL.createObjectURL(blob);
                    link.download = "wang-fashion-qr-" + (orderCode || "thanh-toan") + ".png";
                    document.body.appendChild(link);
                    link.click();
                    link.remove();

                    setTimeout(function () {
                        URL.revokeObjectURL(link.href);
                    }, 1000);
                } catch (error) {
                    console.error(error);
                    showMessage("Không tải được ảnh. Bạn hãy chụp màn hình mã QR.");
                }
            });
        }

        // Doi tieu de, buoc 3 "Hoan tat" va an form
        document.getElementById("checkoutTitle").textContent =
            "Đặt hàng thành công";
        document.getElementById("checkoutLead").textContent =
            "Quét mã QR bên dưới để thanh toán " + formatMoney(total) + ".";

        const steps = document.querySelectorAll("#checkoutSteps li");

        steps.forEach(function (step, index) {
            if (index === steps.length - 1) {
                step.setAttribute("aria-current", "step");
            } else {
                step.removeAttribute("aria-current");
            }
        });

        body.hidden = true;
        panel.hidden = false;
        window.scrollTo(0, 0);

        return true;
    }

    // =====================================
    // 8. XAC NHAN DAT HANG
    // =====================================

    const checkoutForm = document.getElementById("checkoutForm");

    if (checkoutForm) {
        checkoutForm.addEventListener("submit", async function (event) {
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

            // Neu da cau hinh Firebase: gui don len Firestore de admin nhin thay.
            // Gui loi thi giu nguyen gio hang va cho khach thu lai.
            let orderCode = "";

            if (typeof window.saveOrderRemote === "function") {
                const submitButton = document.querySelector(
                    'button[form="checkoutForm"], .checkout-btn'
                );

                if (submitButton) {
                    submitButton.disabled = true;
                }

                try {
                    const orderId = await window.saveOrderRemote(order);
                    orderCode = String(orderId).slice(0, 6).toUpperCase();
                } catch (error) {
                    console.error(error);

                    showMessage(
                        "Không gửi được đơn hàng. " +
                        "Vui lòng kiểm tra kết nối và thử lại."
                    );

                    if (submitButton) {
                        submitButton.disabled = false;
                    }

                    return;
                }
            }

            // Luu ban sao don hang tren trinh duyet
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

            updateCartCount();

            // Chuyen khoan: hien ma QR co san so tien + noi dung ngay tren trang.
            // Noi dung = ma don (hoac SDT neu chua co ma).
            if (payment === "bank" && showBankPayment(orderCode, phone, total)) {
                return;
            }

            // Neu khong ve duoc QR thi nhac thong tin chuyen khoan bang thong bao
            let bankText = "";

            if (payment === "bank") {
                bankText =
                    "\n\nVui lòng chuyển khoản:\n" +
                    "Ngân hàng: " + BANK_INFO.bank + "\n" +
                    "Chủ tài khoản: " + BANK_INFO.holder + "\n" +
                    "Số tài khoản: " + BANK_INFO.number + "\n" +
                    "Số tiền: " + formatMoney(total) + "\n" +
                    "Nội dung: WANG " + (orderCode || phone);
            }

            showMessage(
                "Đặt hàng thành công!\n\n" +
                (orderCode ? "Mã đơn hàng: " + orderCode + "\n" : "") +
                "Cảm ơn " + fullname +
                " đã mua sắm tại Wang Fashion.\n" +
                "Tổng thanh toán: " + formatMoney(total) +
                bankText
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
