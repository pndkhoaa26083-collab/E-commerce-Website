/* =========================================
   MENU THU GON TREN DIEN THOAI / MAY TINH BANG
   Nut ba gach (.nav-toggle) mo / dong khung menu (#siteMenu).
   Tren man hinh rong khung menu hien san, nut nay bi an (xem CSS).
   Dong menu khi: bam ra ngoai, nhan Esc, chon mot lien ket,
   hoac man hinh doi sang kich thuoc rong (xoay ngang may tinh bang).
========================================= */

(function () {
    "use strict";

    const toggle = document.querySelector(".nav-toggle");
    const menu = toggle ? document.getElementById(toggle.getAttribute("aria-controls")) : null;

    if (!toggle || !menu) return;

    // Phai trung voi diem gap trong css/header.css
    const wide = window.matchMedia("(min-width: 1281px)");

    function setOpen(open) {
        menu.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", open ? "Đóng menu" : "Mở menu");
    }

    function isOpen() {
        return menu.classList.contains("is-open");
    }

    toggle.addEventListener("click", function () {
        setOpen(!isOpen());
    });

    // Chon mot lien ket trong menu: dong menu (lien ket noi bo #about, #contact van cuon binh thuong)
    menu.addEventListener("click", function (event) {
        if (event.target.closest("a")) {
            setOpen(false);
        }
    });

    // Bam ra ngoai khung menu va nut mo
    document.addEventListener("click", function (event) {
        if (isOpen() && !menu.contains(event.target) && !toggle.contains(event.target)) {
            setOpen(false);
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && isOpen()) {
            setOpen(false);
            toggle.focus();
        }
    });

    function onResize() {
        if (wide.matches) {
            setOpen(false);
        }
    }

    if (wide.addEventListener) {
        wide.addEventListener("change", onResize);
    } else {
        // Trinh duyet cu
        wide.addListener(onResize);
    }
})();
