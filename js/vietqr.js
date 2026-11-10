/* =========================================
   VIETQR
   - Tao chuoi VietQR (chuan NAPAS 247) co san so tien va noi dung
   - Ve ma QR bang SVG / PNG ngay tren trinh duyet
   Khong dung thu vien hay dich vu ben ngoai.
   Dung: window.WangQR.vietQrPayload(...), WangQR.toSvg(...), WangQR.toPngBlob(...)
========================================= */

(function () {
    "use strict";

    // =====================================
    // 1. CHUOI VIETQR (EMVCo / NAPAS 247)
    // =====================================

    // Moi truong = ma (2 so) + do dai (2 so) + gia tri
    function tlv(id, value) {
        return id + String(value.length).padStart(2, "0") + value;
    }

    // CRC-16/CCITT-FALSE (da thuc 0x1021, khoi tao 0xFFFF)
    function crc16(text) {
        let crc = 0xFFFF;

        for (let i = 0; i < text.length; i++) {
            crc ^= text.charCodeAt(i) << 8;

            for (let bit = 0; bit < 8; bit++) {
                crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
                crc &= 0xFFFF;
            }
        }

        return crc.toString(16).toUpperCase().padStart(4, "0");
    }

    // Noi dung chuyen khoan: chi chu khong dau, so va dau cach, toi da 25 ky tu
    function toAscii(text, maxLength) {
        return String(text)
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .replace(/đ/g, "d")
            .replace(/Đ/g, "D")
            .replace(/[^A-Za-z0-9 ]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, maxLength);
    }

    // options: { bin, account, amount, content }
    //   bin     : ma ngan hang 6 so (MB Bank = 970422)
    //   account : so tai khoan nhan
    //   amount  : so tien (VND), bo trong neu de khach tu nhap
    //   content : noi dung chuyen khoan
    function vietQrPayload(options) {
        const amount = Math.round(Number(options.amount) || 0);

        const bank = tlv("00", options.bin) + tlv("01", options.account);

        const merchant =
            tlv("00", "A000000727") +      // NAPAS
            tlv("01", bank) +              // ngan hang + so tai khoan
            tlv("02", "QRIBFTTA");         // chuyen nhanh den tai khoan

        let payload =
            tlv("00", "01") +
            tlv("01", amount > 0 ? "12" : "11") +   // 12 = co so tien, 11 = dung chung
            tlv("38", merchant) +
            tlv("53", "704");                       // VND

        if (amount > 0) {
            payload += tlv("54", String(amount));
        }

        payload += tlv("58", "VN");

        const info = toAscii(options.content || "", 25);

        if (info) {
            payload += tlv("62", tlv("08", info));
        }

        payload += "6304";

        return payload + crc16(payload);
    }


    // =====================================
    // 2. BO MA HOA QR
    // Che do byte, muc sua loi M, phien ban 1-10
    // =====================================

    const MAX_VERSION = 10;

    // Chi so = phien ban. Muc sua loi M.
    const ECC_PER_BLOCK = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
    const NUM_BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];

    function rawModules(version) {
        let result = (16 * version + 128) * version + 64;

        if (version >= 2) {
            const numAlign = Math.floor(version / 7) + 2;

            result -= (25 * numAlign - 10) * numAlign - 55;

            if (version >= 7) {
                result -= 36;
            }
        }

        return result;
    }

    function dataCodewords(version) {
        return Math.floor(rawModules(version) / 8) -
            ECC_PER_BLOCK[version] * NUM_BLOCKS[version];
    }

    function alignPositions(version) {
        if (version === 1) {
            return [];
        }

        const num = Math.floor(version / 7) + 2;
        const size = version * 4 + 17;
        const step = Math.ceil((version * 4 + 4) / (num * 2 - 2)) * 2;
        const result = [6];

        for (let pos = size - 7; result.length < num; pos -= step) {
            result.splice(1, 0, pos);
        }

        return result;
    }

    // ---- Reed-Solomon tren GF(256), da thuc 0x11D ----
    function gfMul(x, y) {
        let z = 0;

        for (let i = 7; i >= 0; i--) {
            z = (z << 1) ^ ((z >>> 7) * 0x11D);
            z ^= ((y >>> i) & 1) * x;
        }

        return z;
    }

    function rsDivisor(degree) {
        const result = new Array(degree).fill(0);
        result[degree - 1] = 1;

        let root = 1;

        for (let i = 0; i < degree; i++) {
            for (let j = 0; j < result.length; j++) {
                result[j] = gfMul(result[j], root);

                if (j + 1 < result.length) {
                    result[j] ^= result[j + 1];
                }
            }

            root = gfMul(root, 2);
        }

        return result;
    }

    function rsRemainder(data, divisor) {
        const result = divisor.map(function () { return 0; });

        data.forEach(function (byte) {
            const factor = byte ^ result.shift();

            result.push(0);

            divisor.forEach(function (coef, i) {
                result[i] ^= gfMul(coef, factor);
            });
        });

        return result;
    }

    function getBit(value, index) {
        return ((value >>> index) & 1) !== 0;
    }

    // ---- Phat sinh danh sach byte da xen ke (du lieu + sua loi) ----
    function buildCodewords(bytes, version) {
        const countBits = version < 10 ? 8 : 16;
        const capacityBits = dataCodewords(version) * 8;
        const bits = [];

        function push(value, length) {
            for (let i = length - 1; i >= 0; i--) {
                bits.push((value >>> i) & 1);
            }
        }

        push(4, 4);                         // che do byte
        push(bytes.length, countBits);

        bytes.forEach(function (byte) {
            push(byte, 8);
        });

        push(0, Math.min(4, capacityBits - bits.length));   // dau ket thuc
        push(0, (8 - bits.length % 8) % 8);

        for (let pad = 0xEC; bits.length < capacityBits; pad ^= 0xEC ^ 0x11) {
            push(pad, 8);
        }

        const data = [];

        for (let i = 0; i < bits.length; i += 8) {
            let value = 0;

            for (let j = 0; j < 8; j++) {
                value = (value << 1) | bits[i + j];
            }

            data.push(value);
        }

        const eccLen = ECC_PER_BLOCK[version];
        const numBlocks = NUM_BLOCKS[version];
        const rawCodewords = Math.floor(rawModules(version) / 8);
        const numShort = numBlocks - rawCodewords % numBlocks;
        const shortLen = Math.floor(rawCodewords / numBlocks);
        const divisor = rsDivisor(eccLen);
        const blocks = [];

        for (let i = 0, k = 0; i < numBlocks; i++) {
            const part = data.slice(
                k,
                k + shortLen - eccLen + (i < numShort ? 0 : 1)
            );

            k += part.length;

            const ecc = rsRemainder(part, divisor);

            if (i < numShort) {
                part.push(0);
            }

            blocks.push(part.concat(ecc));
        }

        const result = [];

        for (let i = 0; i < blocks[0].length; i++) {
            blocks.forEach(function (block, j) {
                if (i !== shortLen - eccLen || j >= numShort) {
                    result.push(block[i]);
                }
            });
        }

        return result;
    }

    // ---- Diem phat: danh gia mat na ----
    function penalty(modules, size) {
        let result = 0;

        for (let pass = 0; pass < 2; pass++) {
            for (let a = 0; a < size; a++) {
                const line = [];

                for (let b = 0; b < size; b++) {
                    line.push(pass === 0 ? modules[a][b] : modules[b][a]);
                }

                // Day lien tiep cung mau
                let run = 1;

                for (let i = 1; i <= size; i++) {
                    if (i < size && line[i] === line[i - 1]) {
                        run++;
                    } else {
                        if (run >= 5) {
                            result += run - 2;
                        }

                        run = 1;
                    }
                }

                // Mau giong o dinh vi
                for (let i = 0; i + 11 <= size; i++) {
                    const chunk = line
                        .slice(i, i + 11)
                        .map(function (v) { return v ? 1 : 0; })
                        .join("");

                    if (chunk === "10111010000" || chunk === "00001011101") {
                        result += 40;
                    }
                }
            }
        }

        // Khoi 2x2 cung mau
        for (let y = 0; y < size - 1; y++) {
            for (let x = 0; x < size - 1; x++) {
                const c = modules[y][x];

                if (c === modules[y][x + 1] &&
                    c === modules[y + 1][x] &&
                    c === modules[y + 1][x + 1]) {
                    result += 3;
                }
            }
        }

        // Can bang o den / trang
        let dark = 0;

        modules.forEach(function (row) {
            row.forEach(function (v) {
                if (v) {
                    dark++;
                }
            });
        });

        const total = size * size;
        const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;

        return result + k * 10;
    }

    // Tra ve { size, modules } (modules[y][x] = true la o den)
    function makeMatrix(text) {
        const bytes = Array.from(new TextEncoder().encode(String(text)));

        let version = 1;

        for (; version <= MAX_VERSION; version++) {
            const countBits = version < 10 ? 8 : 16;

            if (4 + countBits + bytes.length * 8 <= dataCodewords(version) * 8) {
                break;
            }
        }

        if (version > MAX_VERSION) {
            throw new Error("Noi dung ma QR qua dai");
        }

        const codewords = buildCodewords(bytes, version);
        const size = version * 4 + 17;

        const modules = [];
        const isFunction = [];

        for (let y = 0; y < size; y++) {
            modules.push(new Array(size).fill(false));
            isFunction.push(new Array(size).fill(false));
        }

        function setFunction(x, y, dark) {
            modules[y][x] = dark;
            isFunction[y][x] = true;
        }

        // ---- Hoa van chuc nang ----
        for (let i = 0; i < size; i++) {
            setFunction(6, i, i % 2 === 0);      // duong ke doc
            setFunction(i, 6, i % 2 === 0);      // duong ke ngang
        }

        function drawFinder(cx, cy) {
            for (let dy = -4; dy <= 4; dy++) {
                for (let dx = -4; dx <= 4; dx++) {
                    const dist = Math.max(Math.abs(dx), Math.abs(dy));
                    const x = cx + dx;
                    const y = cy + dy;

                    if (x >= 0 && x < size && y >= 0 && y < size) {
                        setFunction(x, y, dist !== 2 && dist !== 4);
                    }
                }
            }
        }

        drawFinder(3, 3);
        drawFinder(size - 4, 3);
        drawFinder(3, size - 4);

        const align = alignPositions(version);
        const numAlign = align.length;

        for (let i = 0; i < numAlign; i++) {
            for (let j = 0; j < numAlign; j++) {
                const onFinder =
                    (i === 0 && j === 0) ||
                    (i === 0 && j === numAlign - 1) ||
                    (i === numAlign - 1 && j === 0);

                if (onFinder) {
                    continue;
                }

                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        setFunction(
                            align[i] + dx,
                            align[j] + dy,
                            Math.max(Math.abs(dx), Math.abs(dy)) !== 1
                        );
                    }
                }
            }
        }

        // Muc sua loi M co ma 0 trong thong tin dinh dang
        function drawFormat(mask) {
            const data = (0 << 3) | mask;
            let rem = data;

            for (let i = 0; i < 10; i++) {
                rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
            }

            const bits = ((data << 10) | rem) ^ 0x5412;

            for (let i = 0; i <= 5; i++) {
                setFunction(8, i, getBit(bits, i));
            }

            setFunction(8, 7, getBit(bits, 6));
            setFunction(8, 8, getBit(bits, 7));
            setFunction(7, 8, getBit(bits, 8));

            for (let i = 9; i < 15; i++) {
                setFunction(14 - i, 8, getBit(bits, i));
            }

            for (let i = 0; i < 8; i++) {
                setFunction(size - 1 - i, 8, getBit(bits, i));
            }

            for (let i = 8; i < 15; i++) {
                setFunction(8, size - 15 + i, getBit(bits, i));
            }

            setFunction(8, size - 8, true);    // o den co dinh
        }

        function drawVersion() {
            if (version < 7) {
                return;
            }

            let rem = version;

            for (let i = 0; i < 12; i++) {
                rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
            }

            const bits = (version << 12) | rem;

            for (let i = 0; i < 18; i++) {
                const dark = getBit(bits, i);
                const a = size - 11 + i % 3;
                const b = Math.floor(i / 3);

                setFunction(a, b, dark);
                setFunction(b, a, dark);
            }
        }

        drawFormat(0);      // giu cho truoc cho o thong tin dinh dang
        drawVersion();

        // ---- Dat du lieu theo duong ngoang ngoeo ----
        let bitIndex = 0;

        for (let right = size - 1; right >= 1; right -= 2) {
            if (right === 6) {
                right = 5;
            }

            for (let vert = 0; vert < size; vert++) {
                for (let j = 0; j < 2; j++) {
                    const x = right - j;
                    const upward = ((right + 1) & 2) === 0;
                    const y = upward ? size - 1 - vert : vert;

                    if (!isFunction[y][x] && bitIndex < codewords.length * 8) {
                        modules[y][x] = getBit(
                            codewords[bitIndex >>> 3],
                            7 - (bitIndex & 7)
                        );

                        bitIndex++;
                    }
                }
            }
        }

        // ---- Chon mat na it bi phat nhat ----
        function applyMask(mask) {
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    let invert;

                    switch (mask) {
                        case 0: invert = (x + y) % 2 === 0; break;
                        case 1: invert = y % 2 === 0; break;
                        case 2: invert = x % 3 === 0; break;
                        case 3: invert = (x + y) % 3 === 0; break;
                        case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
                        case 5: invert = x * y % 2 + x * y % 3 === 0; break;
                        case 6: invert = (x * y % 2 + x * y % 3) % 2 === 0; break;
                        default: invert = ((x + y) % 2 + x * y % 3) % 2 === 0;
                    }

                    if (!isFunction[y][x] && invert) {
                        modules[y][x] = !modules[y][x];
                    }
                }
            }
        }

        let bestMask = 0;
        let bestScore = Infinity;

        for (let mask = 0; mask < 8; mask++) {
            applyMask(mask);
            drawFormat(mask);

            const score = penalty(modules, size);

            if (score < bestScore) {
                bestScore = score;
                bestMask = mask;
            }

            applyMask(mask);        // go mat na
        }

        applyMask(bestMask);
        drawFormat(bestMask);

        return { size: size, modules: modules };
    }


    // =====================================
    // 3. VE MA QR
    // =====================================

    const QUIET_ZONE = 4;    // vien trang bat buoc quanh ma
    const SVG_NS = "http://www.w3.org/2000/svg";

    // Tra ve phan tu <svg> (nen trang, o den)
    function toSvg(text, label) {
        const matrix = makeMatrix(text);
        const total = matrix.size + QUIET_ZONE * 2;

        let path = "";

        matrix.modules.forEach(function (row, y) {
            row.forEach(function (dark, x) {
                if (dark) {
                    path += "M" + (x + QUIET_ZONE) + " " + (y + QUIET_ZONE) + "h1v1h-1z";
                }
            });
        });

        const svg = document.createElementNS(SVG_NS, "svg");

        svg.setAttribute("viewBox", "0 0 " + total + " " + total);
        svg.setAttribute("shape-rendering", "crispEdges");
        svg.setAttribute("role", "img");
        svg.setAttribute("aria-label", label || "Mã QR");

        const background = document.createElementNS(SVG_NS, "rect");

        background.setAttribute("width", String(total));
        background.setAttribute("height", String(total));
        background.setAttribute("fill", "#ffffff");

        const shape = document.createElementNS(SVG_NS, "path");

        shape.setAttribute("d", path);
        shape.setAttribute("fill", "#000000");

        svg.appendChild(background);
        svg.appendChild(shape);

        return svg;
    }

    // Tra ve Promise<Blob> anh PNG de khach tai ve may
    function toPngBlob(text, pixels) {
        const matrix = makeMatrix(text);
        const total = matrix.size + QUIET_ZONE * 2;
        const scale = Math.max(1, Math.floor((pixels || 720) / total));

        const canvas = document.createElement("canvas");

        canvas.width = total * scale;
        canvas.height = total * scale;

        const context = canvas.getContext("2d");

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#000000";

        matrix.modules.forEach(function (row, y) {
            row.forEach(function (dark, x) {
                if (dark) {
                    context.fillRect(
                        (x + QUIET_ZONE) * scale,
                        (y + QUIET_ZONE) * scale,
                        scale,
                        scale
                    );
                }
            });
        });

        return new Promise(function (resolve, reject) {
            canvas.toBlob(function (blob) {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error("Không tạo được ảnh QR"));
                }
            }, "image/png");
        });
    }

    window.WangQR = {
        vietQrPayload: vietQrPayload,
        crc16: crc16,
        makeMatrix: makeMatrix,
        toSvg: toSvg,
        toPngBlob: toPngBlob
    };

})();
