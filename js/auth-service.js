/* =========================================
   DICH VU TAI KHOAN DUNG CHUNG
   - Ho so nguoi dung + vai tro (admin / user) luu o Firestore: users/{uid}
   - Dang nhap bang Google
========================================= */

import { auth, db, isFirebaseConfigured } from "./firebase.js";

import {
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

export const ROLE_ADMIN = "admin";
export const ROLE_USER = "user";

// Admin vao trang quan tri, nguoi dung thuong ve trang chu
export function homeFor(role) {
    return role === ROLE_ADMIN ? "admin.html" : "index.html";
}

// Lay vai tro cua tai khoan; neu chua co ho so thi tao moi voi vai tro "user".
// Vai tro "admin" chi duoc gan thu cong trong Firebase Console (hoac boi admin khac).
// Nem loi neu doc/ghi Firestore that bai.
export async function ensureUserProfile(user) {
    if (!db) {
        throw new Error("Firebase chưa được cấu hình");
    }

    const ref = doc(db, "users", user.uid);
    const snapshot = await getDoc(ref);

    if (snapshot.exists()) {
        return snapshot.data().role === ROLE_ADMIN ? ROLE_ADMIN : ROLE_USER;
    }

    const provider = user.providerData[0]
        ? user.providerData[0].providerId
        : "password";

    await setDoc(ref, {
        email: user.email || "",
        displayName: user.displayName || "",
        photoURL: user.photoURL || "",
        provider: provider,
        role: ROLE_USER,
        createdAt: serverTimestamp()
    });

    return ROLE_USER;
}

// Nhu ensureUserProfile nhung khong nem loi: neu Firestore chua san sang
// thi coi la "user" de viec dang nhap van tiep tuc.
export async function loadRole(user) {
    try {
        return await ensureUserProfile(user);
    } catch (error) {
        console.error(
            "Không đọc được hồ sơ người dùng (kiểm tra Firestore và quy tắc bảo mật):",
            error
        );
        return ROLE_USER;
    }
}

// Mo cua so dang nhap Google, tra ve { user, role }
export async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    const result = await signInWithPopup(auth, provider);
    const role = await loadRole(result.user);

    return { user: result.user, role: role };
}

export function googleErrorMessage(error) {
    switch (error.code) {
        case "auth/popup-closed-by-user":
        case "auth/cancelled-popup-request":
            return "Bạn đã đóng cửa sổ đăng nhập Google.";

        case "auth/popup-blocked":
            return "Trình duyệt đang chặn cửa sổ đăng nhập. Hãy cho phép cửa sổ bật lên rồi thử lại.";

        case "auth/unauthorized-domain":
            return "Tên miền này chưa được thêm vào Authorized domains trong Firebase Console.";

        case "auth/operation-not-allowed":
            return "Chưa bật đăng nhập Google trong Firebase Console.";

        case "auth/network-request-failed":
            return "Lỗi mạng, vui lòng kiểm tra kết nối!";

        case "auth/account-exists-with-different-credential":
            return "Email này đã đăng ký bằng phương thức khác. Hãy đăng nhập bằng email và mật khẩu.";

        default:
            console.error(error);
            return "Đăng nhập Google thất bại!";
    }
}

// Gan hanh vi cho nut "Tiep tuc voi Google" (dung cho login va register)
export function bindGoogleButton(button, messageElement) {
    if (!button) return;

    button.addEventListener("click", async function () {
        messageElement.textContent = "";

        if (!isFirebaseConfigured) {
            messageElement.textContent =
                "Chưa cấu hình Firebase. Hãy dán cấu hình vào js/firebase.js.";
            return;
        }

        button.disabled = true;

        try {
            const result = await signInWithGoogle();

            alert("Đăng nhập thành công!");

            window.location.href = homeFor(result.role);
        } catch (error) {
            messageElement.textContent = googleErrorMessage(error);
        } finally {
            button.disabled = false;
        }
    });
}
