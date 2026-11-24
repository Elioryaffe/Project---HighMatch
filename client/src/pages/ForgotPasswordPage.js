import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/ForgotPasswordPage.css';

// מסך שכחתי סיסמה - בדיקת אימייל והגדרת סיסמה חדשה.
function ForgotPasswordPage() {
    // האימייל של החשבון שרוצים לשחזר.
    const [email, setEmail] = useState('');
    // הסיסמה החדשה שהמשתמש בחר.
    const [newPassword, setNewPassword] = useState('');
    // האם הסיסמה החדשה גלויה כרגע.
    const [showPassword, setShowPassword] = useState(false);
    // שלב בטופס: בדיקת אימייל או שינוי סיסמה.
    const [step, setStep] = useState(1);
    // הודעת שגיאה או מידע למשתמש.
    const [msg, setMsg] = useState('');
    // האם הבקשה לשרת עדיין מתבצעת.
    const [isLoading, setIsLoading] = useState(false);
    // מעבר חזרה למסך ההתחברות.
    const navigate = useNavigate();

    // בדיקת אימייל - מוודא שהכתובת קיימת במערכת.
    const handleCheckEmail = async (e) => {
        e.preventDefault();
        setMsg('');
        setIsLoading(true);

        try {
            // תשובת השרת לבקשה שבוצעה.
            const response = await fetch('http://localhost:8000/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            // הנתונים שהתקבלו מתשובת השרת.
            const data = await response.json();

            if (response.ok) {
                setStep(2);
            } else {
                setMsg(data.error || 'האימייל לא נמצא במערכת');
            }
        } catch (error) {
            setMsg('שגיאת תקשורת עם השרת');
        } finally {
            setIsLoading(false);
        }
    };

    // איפוס סיסמה - שולח את הסיסמה החדשה לשרת.
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setMsg('');
        if (newPassword.length < 8) return setMsg('הסיסמה חייבת להכיל לפחות 8 תווים');
        setIsLoading(true);

        try {
            // תשובת השרת לבקשה שבוצעה.
            const response = await fetch('http://localhost:8000/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, newPassword })
            });
            // הנתונים שהתקבלו מתשובת השרת.
            const data = await response.json();

            if (response.ok) {
                alert('הסיסמה עודכנה בהצלחה');
                navigate('/login');
            } else {
                setMsg(data.error || 'שגיאה בעדכון הסיסמה');
            }
        } catch (error) {
            setMsg('שגיאת תקשורת עם השרת');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="forgot-page" dir="rtl">
            <div className="login-form-container">
                <h2 className="login-logo">HighMatch</h2>
                <h1>איפוס סיסמה</h1>

                {/* שלב ראשון: בדיקת האימייל בשרת. */}
                {step === 1 ? (
                    <form onSubmit={handleCheckEmail}>
                        <p>הזן את האימייל שלך לאימות החשבון</p>
                        <div className="input-group">
                            <label>אימייל</label>
                            {/* האימייל שהמשתמש מבקש לאפס עבורו סיסמה. */}
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        {/* מעבר לשלב הבא אחרי בדיקת האימייל. */}
                        <button type="submit" className="login-submit-btn" disabled={isLoading}>
                            {isLoading ? 'בודק...' : 'המשך'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword}>
                        <p>הזן סיסמה חדשה עבור {email}</p>
                        <div className="input-group">
                            <label>סיסמה חדשה</label>
                            {/* הסיסמה החדשה; חייבת להכיל לפחות 8 תווים. */}
                            <div className="password-field-wrapper">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    minLength="8"
                                    required
                                />
                                {/* עין להצגת הסיסמה החדשה או להסתרתה. */}
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
                        {/* כפתור שמירת הסיסמה החדשה. */}
                        <button type="submit" className="login-submit-btn" disabled={isLoading}>
                            {isLoading ? 'מעדכן...' : 'שמור סיסמה חדשה'}
                        </button>
                    </form>
                )}

                {/* הצגת הודעת שגיאה או מצב לפי התוצאה. */}
                {msg && <div className="error-message">{msg}</div>}
                {/* קישור חזרה למסך ההתחברות. */}
                <p><Link to="/login">חזור להתחברות</Link></p>
            </div>
        </div>
    );
}

export default ForgotPasswordPage;
