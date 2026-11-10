// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBTZUcfc9CkrMlABkDigaqOvkIKGi_Mygs",
  authDomain: "wang-fashion.firebaseapp.com",
  projectId: "wang-fashion",
  storageBucket: "wang-fashion.firebasestorage.app",
  messagingSenderId: "533010805019",
  appId: "1:533010805019:web:75736b3ef1a61e7e74e3be",
  measurementId: "G-8L1RJR2DJC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
