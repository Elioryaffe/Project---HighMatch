import { BrowserRouter, Routes, Route } from 'react-router-dom';

import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import ChatPage from './pages/ChatPage';
import AboutPage from './pages/AboutPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import AiMatchPage from './pages/AiMatchPage';

// ניווט בין המסכים - כל כתובת באתר פותחת את הדף המתאים.
function App() {
    return (
        <BrowserRouter>
            {/* מפת הכתובות באתר: כל כתובת פותחת מסך אחר. */}
            <Routes>
                {/* כתובת הבית, המסך הראשי. */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                {/* ניווט לחיפוש פרופילים וסינון. */}
                <Route path="/search" element={<SearchPage />} />
                {/* ניווט לשיחות בין משתמשים. */}
                <Route path="/chats" element={<ChatPage />} />
                <Route path="/about" element={<AboutPage />} />
                {/* ניווט למסך הפרופיל האישי. */}
                <Route path="/profile" element={<ProfilePage />} />
                {/* ניווט למסך הניהול. */}
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                {/* ניווט לשאלון ולהתאמות AI. */}
                <Route path="/ai-match" element={<AiMatchPage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
