/* =========================================
   TU DONG PHAN LOAI SAN PHAM THEO TEN
   Tra ve mot trong 4 danh muc cua cua hang: ao, quan, giay, phukien.
   Cach lam: tim cac tu khoa (khong dau) trong ten san pham,
   tu khoa nam o vi tri som nhat se quyet dinh
   (vd. "Ao khoac jeans" -> ao, "Quan jeans" -> quan).
========================================= */

const KEYWORDS = {
    ao: [
        "ao", "so mi", "hoodie", "sweater", "polo", "jacket", "blazer", "vest",
        "cardigan", "croptop", "crop top", "tank top", "t shirt", "tshirt",
        "dam", "jumpsuit", "yem", "bo do", "set do"
    ],
    quan: [
        "quan", "jeans", "jean", "kaki", "short", "shorts", "jogger", "legging",
        "culottes", "chan vay", "vay"
    ],
    giay: [
        "giay", "dep", "sandal", "sneaker", "sneakers", "boot", "boots",
        "loafer", "guoc", "cao got"
    ],
    phukien: [
        "phu kien", "tui", "balo", "ba lo", "cap", "non", "mu", "tat", "vo",
        "khan", "gang tay", "that lung", "day nit", "kinh", "dong ho", "vi",
        "nhan", "vong", "day chuyen", "bong tai", "trang suc", "ca vat"
    ]
};

// Bo dau, chu thuong, chi con chu / so cach nhau mot dau cach
function normalize(text) {
    return " " + String(text)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9]+/g, " ")
        .trim() + " ";
}

// fallback: danh muc dung khi ten khong co tu khoa nao
// (khi sua san pham thi truyen danh muc cu vao de giu nguyen)
export function guessCategory(name, fallback) {
    const text = normalize(name);

    let best = null;

    Object.keys(KEYWORDS).forEach(function (category) {
        KEYWORDS[category].forEach(function (word) {
            const position = text.indexOf(" " + word + " ");

            if (position === -1) {
                return;
            }

            // Som hon thang; cung vi tri thi tu khoa dai hon thang
            if (
                best === null ||
                position < best.position ||
                (position === best.position && word.length > best.length)
            ) {
                best = {
                    category: category,
                    position: position,
                    length: word.length
                };
            }
        });
    });

    if (best) {
        return best.category;
    }

    return fallback || "phukien";
}
