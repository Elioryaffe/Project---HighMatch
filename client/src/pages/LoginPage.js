import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';
import '../styles/LoginPage.css';

// מסך התחברות עם אימייל וסיסמה או עם גוגל.
function LoginPage() {
    // האימייל שהוקלד בטופס ההתחברות.
    const [email, setEmail] = useState('');
    // הסיסמה שהוקלדה בטופס.
    const [password, setPassword] = useState('');
    // האם הסיסמה גלויה כרגע.
    const [showPassword, setShowPassword] = useState(false);
    // הודעת שגיאה שמופיעה אם ההתחברות נכשלת.
    const [errorMsg, setErrorMsg] = useState('');
    // מציין אם מתבצעת כרגע בקשת התחברות.
    const [isLoading, setIsLoading] = useState(false);
    // מעבר למסך הבא אחרי התחברות.
    const navigate = useNavigate();

    // התחברות רגילה - שולח אימייל וסיסמה לשרת.
    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setIsLoading(true);

        try {
            // תשובת השרת לבקשה שבוצעה.
            const response = await fetch('http://localhost:8000/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            // הנתונים שהתקבלו מתשובת השרת.
            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('user', JSON.stringify(data.user));
                navigate('/');
            } else {
                setErrorMsg(data.error || 'שגיאה בהתחברות');
            }
        } catch (error) {
            setErrorMsg('שגיאת תקשורת מול השרת');
        } finally {
            setIsLoading(false);
        }
    };

    // התחברות עם גוגל - פותח חלון אימות ובודק משתמש בשרת.
    const handleGoogleLogin = async () => {
        try {
            // תוצאת הזיהוי בחלון ההתחברות של גוגל.
            const result = await signInWithPopup(auth, googleProvider);
            // הפרטים שחזרו מחשבון גוגל.
            const googleUser = result.user;

            // תשובת השרת לבקשה שבוצעה.
            const response = await fetch('http://localhost:8000/api/google-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: googleUser.email,
                    fullName: googleUser.displayName,
                    profilePicture: googleUser.photoURL
                })
            });
            // הנתונים שהתקבלו מתשובת השרת.
            const data = await response.json();

            if (!response.ok) {
                setErrorMsg(data.error || 'שגיאה בחיבור לשרת');
                return;
            }

            if (data.isNewUser) {
                navigate('/register');
            } else {
                localStorage.setItem('user', JSON.stringify(data.user));
                navigate('/');
            }
        } catch (error) {
            setErrorMsg('ההתחברות עם גוגל נכשלה');
        }
    };

    return (
        <div className="login-page-wrapper" dir="rtl">
            <div className="login-form-container">
                <h2 className="login-logo">HighMatch</h2>
                <h1>ברוך שובך</h1>
                <p className="login-subtitle">התחבר לחשבון שלך כדי להמשיך.</p>

                {/* הצגת הודעת שגיאה אם ניסיון הכניסה נכשל. */}
                {errorMsg && <div className="error-message">{errorMsg}</div>}

                {/* טופס התחברות רגילה עם אימייל וסיסמה. */}
                <form onSubmit={handleLogin}>
                    <div className="input-group">
                        <label>אימייל</label>
                        {/* שדה האימייל, מעדכן את המשתנה email. */}
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>

                    <div className="input-group">
                        <label>סיסמה</label>
                        {/* שדה הסיסמה עם עין להצגה ולהסתרה. */}
                        <div className="password-field-wrapper">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            {/* לחיצה על העין משנה את תצוגת הסיסמה. */}
                            <button
                                    type="button"
                                    className="password-toggle-btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                                    aria-pressed={showPassword}
                                >
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12" />
                                        <circle cx="12" cy="12" r="3" />
                                        {/* פס על העין כשהסיסמה גלויה. */}
                                        {showPassword && <line x1="3" y1="3" x2="21" y2="21" />}
                                    </svg>
                                </button>
                        </div>
                    </div>

                    {/* קישור לתהליך שחזור סיסמה. */}
                    <div className="forgot-password">
                        <Link to="/forgot-password">שכחת סיסמה?</Link>
                    </div>

                    {/* כפתור התחברות; נעול כשהמערכת ממתינה לתשובה. */}
                    <button type="submit" className="login-submit-btn" disabled={isLoading}>
                        {isLoading ? 'מתחבר...' : 'התחברות'}
                    </button>
                </form>

                <div className="divider">או התחבר עם</div>

                {/* כניסה עם Google. */}
                <button type="button" className="social-btn" onClick={handleGoogleLogin}>Google</button>
                {/* כפתור Apple: כרגע רק מציג הודעה, אין התחברות פעילה. */}
                <button type="button" className="social-btn" onClick={() => alert('התחברות עם Apple תתווסף בקרוב')}>Apple</button>

                {/* קישור להרשמת משתמש חדש. */}
                <p className="register-prompt">
                    עדיין אין לך חשבון? <Link to="/register">הירשם עכשיו</Link>
                </p>
            </div>
        </div>
    );
}

export default LoginPage;
