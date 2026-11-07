
import { auth } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

const form = document.getElementById("registerForm");
const message = document.getElementById("message");
const button = document.getElementById("registerButton");

form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const fullname = document.getElementById("fullname").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    message.textContent = "";

    if (password !== confirmPassword) {
        message.textContent = "Mật khẩu xác nhận không khớp!";
        return;
    }

    button.disabled = true;
    button.textContent = "Đang tạo tài khoản...";

    try {
        const result = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );

        await updateProfile(result.user, {
            displayName: fullname
        });

        alert("Đăng ký tài khoản thành công!");

        window.location.href = "index.html";

    } catch (error) {
        switch (error.code) {
            case "auth/email-already-in-use":
                message.textContent = "Email này đã được đăng ký!";
                break;

            case "auth/invalid-email":
                message.textContent = "Email không hợp lệ!";
                break;

            case "auth/weak-password":
                message.textContent = "Mật khẩu quá yếu!";
                break;

            default:
                message.textContent = "Đăng ký thất bại: " + error.message;
        }
    } finally {
        button.disabled = false;
        button.textContent = "ĐĂNG KÝ";
    }
});
