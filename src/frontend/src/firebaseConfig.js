import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBOrrhO7taIipiK6D5YlJsrM9esJ4lO6aI",
    authDomain: "revoducate-finalproject.firebaseapp.com",
    projectId: "revoducate-finalproject",
    storageBucket: "revoducate-finalproject.firebasestorage.app",
    messagingSenderId: "597051274661",
    appId: "1:597051274661:web:7a4fa4761010156677644c",
    measurementId: "G-W8TG10PNB9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
