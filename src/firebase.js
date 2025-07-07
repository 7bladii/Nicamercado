// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyADhAWNHZ9qM9HhV-CrMFXXO5eeGw8pGqM",
  authDomain: "mercadonicaapp.firebaseapp.com",
  projectId: "mercadonicaapp",
  storageBucket: "mercadonicaapp.appspot.com",
  messagingSenderId: "119751803166",
  appId: "1:119751803166:web:3855a8b6ee3fe07fc4890f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
