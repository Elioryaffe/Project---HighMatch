import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/HomePage.css';

// דף הבית - מציג תפריט שונה לאורח, משתמש ומנהל.
function HomePage() {
    // פרטי המשתמש שנשמרו בדפדפן אחרי ההתחברות.
    const savedUser = JSON.parse(localStorage.getItem('user') || 'null');
    // המשתמש שמחובר כרגע.
    const [user, setUser] = useState(savedUser);
    // מעבר בין דפי האתר.
    const navigate = useNavigate();

    // בודק אם המשתמש המחובר הוא מנהל.
    const isAdmin = user && (
        user.fullName === 'מנהל מערכת (Admin)' ||
        user.email === 'highmatch.support@gmail.com'
    );

    // התנתקות - מוחק את המשתמש השמור וחוזר לדף הבית.
    const handleLogout = () => {
        localStorage.removeItem('user');
        setUser(null);
        navigate('/');
    };

    return (
        <div dir="rtl">
            {/* סרגל הניווט הראשי באתר. */}
            <nav className="navbar">
                <div className="nav-brand">HighMatch</div>
                <div className="nav-links">
                    <Link to="/">דף הבית</Link>
                    {/* קישורים לחיפוש, צ׳אט והתאמות מוצגים למשתמש רגיל בלבד. */}
                    {!isAdmin && (
                        <>
                            <Link to="/search">חיפוש</Link>
                            <Link to="/chats">צ'אטים</Link>
                            <Link to="/ai-match">התאמת AI</Link>
                            <Link to="/about">אודות</Link>
                        </>
                    )}
                </div>

                {/* אם המשתמש מחובר מציגים שם והתנתקות; אחרת כניסה והרשמה. */}
                {user ? (
                    <div className="nav-user-logged">
                        <span>שלום, <strong>{user.fullName || 'משתמש'}</strong></span>
                        {!isAdmin && <Link to="/profile">הפרופיל שלי</Link>}
                        {/* כפתור התנתקות: מוחק את ההתחברות השמורה. */}
                        <button onClick={handleLogout}>התנתק</button>
                    </div>
                ) : (
                    <div className="nav-guest-links">
                        <Link to="/login">התחבר</Link>
                        <Link to="/register" className="nav-register-btn">הירשם</Link>
                    </div>
                )}
            </nav>

            <div>
                {/* תוכן דף הבית: לוח אישי למשתמש מחובר או דף פתיחה לאורח. */}
                {user ? (
                    <div className="dashboard-container">
                        {/* כותרת שמשתנה בין מנהל למשתמש רגיל. */}
                        <div className="dashboard-hero">
                            <h2>{isAdmin ? 'מערכת ניהול - HighMatch' : 'ברוך הבא ל-HighMatch'}</h2>
                            <p>{isAdmin ? 'סקירה וניהול של נתוני המערכת.' : 'הצעד הראשון שלך למציאת התאמה אמיתית מתחיל כאן.'}</p>
                        </div>

                        <div className="dashboard-cards-grid">
                            {/* למנהל מוצג קישור לניהול, ולמשתמש רגיל שאר הפעולות. */}
                            {/* כרטיס מעבר לניהול משתמשים ודיווחים. */}
                            {isAdmin ? (
                                <Link to="/admin" className="dash-card">
                                    <h3>ניהול מערכת</h3>
                                    <p>צפייה במשתמשים, טיפול בדיווחים ומחיקת חשבונות.</p>
                                </Link>
                            ) : (
                                <>
                                    {/* כרטיס מעבר לחיפוש וסינון פרופילים. */}
                                    <Link to="/search" className="dash-card">
                                        <h3>חיפוש חכם</h3>
                                        <p>סינון פרופילים לפי הנתונים החשובים לך.</p>
                                    </Link>
                                    {/* כרטיס מעבר להודעות וצ׳אטים. */}
                                    <Link to="/chats" className="dash-card">
                                        <h3>צ'אטים והודעות</h3>
                                        <p>שיחות עם המשתמשים שיש לך איתם התאמה.</p>
                                    </Link>
                                    {/* כרטיס מעבר לשאלון התאמות AI. */}
                                    <Link to="/ai-match" className="dash-card">
                                        <h3>התאמת AI</h3>
                                        <p>המלצות התאמה לפי שאלון וניתוח AI.</p>
                                    </Link>
                                    <Link to="/about" className="dash-card">
                                        <h3>אודות ותקנון</h3>
                                        <p>מידע על המערכת, כללי שימוש ובטיחות.</p>
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="landing-container">
                        <div className="landing-hero">
                            <h1>HighMatch</h1>
                            <p>מערכת פשוטה וחכמה למציאת התאמות.</p>
                            <div className="landing-actions">
                                <Link to="/register" className="btn-primary-large">התחל עכשיו</Link>
                                <Link to="/login" className="btn-secondary-large">כניסה לחשבון</Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default HomePage;
