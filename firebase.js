// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAV7gAvy2gYMl-TAu_7WtLgl899V-QzI-A",
    authDomain: "city-blender-8f2cc.firebaseapp.com",
    projectId: "city-blender-8f2cc",
    storageBucket: "city-blender-8f2cc.firebasestorage.app",
    messagingSenderId: "1037424996798",
    appId: "1:1037424996798:web:1a8464ea30514d22c689ef",
    measurementId: "G-2NYCBWMV8P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);