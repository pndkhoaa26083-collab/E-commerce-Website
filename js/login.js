
import { auth, isFirebaseConfigured } from "./firebase.js";

import {
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

const form = document.getElementById("loginForm");
const message = document.getElementById("message");
const button = document.getElementById("loginButton");

form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    message.textContent = "";

    if (!isFirebaseConfigured) {
        message.textContent =
            "Chưa cấu hình Firebase. Hãy dán cấu hình vào js/firebase.js.";
        return;
    }

    button.disabled = true;
    button.textContent = "ĐANG ĐĂNG NHẬP...";

    try {
        await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        alert("Đăng nhập thành công!");

        window.location.href = "index.html";

    } catch (error) {

        switch (error.code) {

            case "auth/invalid-email":
                message.textContent = "Email không hợp lệ!";
                break;

            case "auth/invalid-credential":
                message.textContent = "Email hoặc mật khẩu không chính xác!";
                break;

            case "auth/user-not-found":
                message.textContent = "Tài khoản không tồn tại!";
                break;

            case "auth/wrong-password":
                message.textContent = "Mật khẩu không chính xác!";
                break;

            case "auth/too-many-requests":
                message.textContent = "Bạn thử đăng nhập lại sau nhé!";
                break;

            case "auth/network-request-failed":
                message.textContent = "Lỗi mạng, vui lòng kiểm tra kết nối!";
                break;

            case "auth/invalid-api-key":
                message.textContent = "API key Firebase không hợp lệ. Kiểm tra lại js/firebase.js!";
                break;

            case "auth/operation-not-allowed":
                message.textContent = "Chưa bật đăng nhập Email/Mật khẩu trong Firebase Console!";
                break;

            default:
                message.textContent = "Đăng nhập thất bại!";
                console.error(error);
        }

    } finally {
        button.disabled = false;
        button.textContent = "ĐĂNG NHẬP";
    }
});
