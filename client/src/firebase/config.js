import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// פרטי החיבור של Firebase לאפשרות התחברות עם גוגל.
const firebaseConfig = {
    apiKey: 'AIzaSyBAul_-vtQuR654BVbfHAWx6ceufq-RkUA',
    authDomain: 'highmatch-chat.firebaseapp.com',
    projectId: 'highmatch-chat',
    storageBucket: 'highmatch-chat.firebasestorage.app',
    messagingSenderId: '427011361585',
    appId: '1:427011361585:web:9460fdf123b3cc21083e10'
};

// מאתחל את Firebase.
const app = initializeApp(firebaseConfig);
// שירות אימות המשתמשים של Firebase.
export const auth = getAuth(app);
// הגדרת ספק התחברות עם חשבון גוגל.
export const googleProvider = new GoogleAuthProvider();
