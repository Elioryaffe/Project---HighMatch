import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from '../firebase/config';
import '../styles/RegisterPage.css';
import { getZodiacFromBirthDate } from '../utils/zodiac';

// טופס הרשמה - איסוף הפרטים ופתיחת חשבון.
function RegisterPage() {
    // מעבר לדף הבית לאחר הרשמה.
    const navigate = useNavigate();
    // הודעת שגיאה בטופס ההרשמה.
    const [errorMsg, setErrorMsg] = useState("");
    // האם הסיסמה גלויה בזמן ההרשמה.
    const [showPassword, setShowPassword] = useState(false);

    // כל נתוני הטופס: שם, גיל, עיר, דת, העדפות ועוד.
    const [form, setForm] = useState({
        fullName: "",
        email: "",
        password: "",
        birthDate: "",
        gender: "",
        city: "",
        region: "",
        height: "",
        religion: "",
        education: "",
        militaryService: "",
        smoking: "",
        origin: "",
        zodiac: "",
        familyBackground: "",
        kippah: "",
        headCovering: "",
        country: "ישראל",
        aboutMe: "",
        lookingFor: ""
    });

    // קובץ תמונת הפרופיל שנבחר להעלאה.
    const [picture, setPicture] = useState(null);

    // עדכון שדה בטופס; בתאריך לידה מעדכן אוטומטית גם מזל.
    const change = (e) => {
        // שם השדה שהשתנה והערך החדש שלו.
        const { name, value } = e.target;
        // אם תאריך הלידה השתנה, מעדכנים גם את המזל.
        setForm({ ...form, [name]: value, ...(name === "birthDate" ? { zodiac: getZodiacFromBirthDate(value) } : {}) });
    };

    // בחירת תמונת פרופיל מהמחשב.
    const changePicture = (e) => {
        setPicture(e.target.files[0]);
    };

    // כפתור הרשמה - בודק גובה ושולח את כל הנתונים לשרת.
    const register = async (e) => {
        e.preventDefault();
        setErrorMsg("");

        if (form.height && (Number(form.height) < 60 || Number(form.height) > 220)) {
            setErrorMsg("הגובה צריך להיות בין 60 ל-220 ס״מ");
            return;
        }

        try {
            // חבילה של פרטי הטופס ותמונת הפרופיל לשליחה.
            const data = new FormData();

            for (const key in form) {
                data.append(key, form[key]);
            }

            if (picture) {
                data.append("profilePicture", picture);
            }

            // תשובת השרת לבקשה שבוצעה.
            const response = await fetch("http://localhost:8000/register", {
                method: "POST",
                body: data
            });

            // התוצאה שהשרת החזיר אחרי הפעולה.
            const result = await response.json();

            if (response.ok) {
                localStorage.setItem("user", JSON.stringify(result.user));
                alert("הרשמה בוצעה בהצלחה! ברוך הבא ל-HighMatch.");
                navigate("/");
            } else {
                setErrorMsg(result.error || "שגיאה בהרשמה");
            }
        } catch (error) {
            console.error(error);
            setErrorMsg("שגיאת תקשורת מול השרת");
        }
    };

    // הרשמה או כניסה עם גוגל לפי מצב החשבון.
    const googleLogin = async () => {
        try {
            // תוצאת הזיהוי בחלון ההתחברות של גוגל.
            const result = await signInWithPopup(auth, googleProvider);
            // הפרטים שהתקבלו מהחשבון בגוגל.
            const googleUser = result.user;

            // תשובת השרת לבקשה שבוצעה.
            const response = await fetch("http://localhost:8000/api/google-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: googleUser.email,
                    fullName: googleUser.displayName,
                    profilePicture: googleUser.photoURL
                })
            });

            // הנתונים שהתקבלו מתשובת השרת.
            const data = await response.json();

            if (!response.ok) {
                setErrorMsg(data.error || "שגיאה בחיבור לשרת");
                return;
            }

            if (data.isNewUser) {
                setForm({
                    ...form,
                    fullName: data.prefillData.fullName || "",
                    email: data.prefillData.email || ""
                });
            } else {
                localStorage.setItem("user", JSON.stringify(data.user));
                navigate("/");
            }
        } catch (error) {
            console.error(error);
            setErrorMsg("ההתחברות עם גוגל נכשלה.");
        }
    };

    return (
        <div className="register-page-wrapper" dir="rtl">
            <div className="register-form-container">
                    <h2 className="register-logo">HighMatch</h2>
                    <h1>צור חשבון חדש</h1>
                    <p className="register-subtitle">מלא את הפרטים ובנה את הפרופיל שלך.</p>

                    {/* הודעת שגיאה בהרשמה תופיע רק אם קיימת הודעה. */}
                    {errorMsg && <div className="error-message">{errorMsg}</div>}

                    {/* הרשמה או התחברות עם חשבון Google. */}
                    <button type="button" className="social-btn" onClick={googleLogin}>המשך עם Google</button>

                    <div className="divider">או הרשם עם אימייל</div>

                    {/* טופס הרשמה: שליחה מפעילה את register. */}
                    <form onSubmit={register}>
                        <div className="form-grid">
                            <div className="input-group">
                                {/* שדה שם מלא, נשמר בתוך form.fullName. */}
                                <label>שם מלא *</label>
                                <input name="fullName" value={form.fullName} onChange={change} required />
                            </div>

                            <div className="input-group">
                                {/* אימייל המשתמש לצורך התחברות. */}
                                <label>אימייל *</label>
                                <input type="email" name="email" value={form.email} onChange={change} required />
                            </div>

                            <div className="input-group">
                                {/* סיסמה חדשה; מינימום 8 תווים. */}
                                <label>סיסמה *</label>
                                <div className="password-field-wrapper">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        minLength="8"
                                        name="password"
                                        value={form.password}
                                        onChange={change}
                                        required
                                    />
                                    {/* עין להצגת הסיסמה או להסתרתה. */}
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

                            <div className="input-group">
                                {/* תאריך לידה שמשמש לבדיקת גיל ולחישוב מזל. */}
                                <label>תאריך לידה *</label>
                                <input type="date" name="birthDate" value={form.birthDate} onChange={change} required />
                            </div>

                            <div className="input-group">
                                {/* מגדר המשתמש משפיע גם על שדות שמופיעים בהמשך. */}
                                <label>מגדר *</label>
                                <select name="gender" value={form.gender} onChange={change} required>
                                    <option value="">בחר מגדר</option>
                                    <option value="זכר">זכר</option>
                                    <option value="נקבה">נקבה</option>
                                </select>
                            </div>

                            <div className="input-group">
                                {/* עיר המגורים של הפרופיל. */}
                                <label>עיר מגורים *</label>
                                <input name="city" value={form.city} onChange={change} required />
                            </div>

                            <div className="input-group">
                                {/* בחירת אזור מגורים מתוך הרשימה. */}
                                <label>אזור *</label>
                                <select name="region" value={form.region} onChange={change} required>
                                    <option value="">בחר אזור</option>
                                    <option value="דרום">דרום</option>
                                    <option value="מרכז">מרכז</option>
                                    <option value="ירושלים">ירושלים</option>
                                    <option value="צפון">צפון</option>
                                </select>
                            </div>

                            <div className="input-group">
                                {/* גובה בסנטימטרים, נשמר בפרטי המשתמש. */}
                                <label>גובה בס״מ *</label>
                                <input type="number" min="60" max="220" name="height" value={form.height} onChange={change} required />
                            </div>

                            <div className="input-group">
                                {/* בחירת רמת דתיות לפרופיל ולסינון. */}
                                <label>רמה דתית *</label>
                                <select name="religion" value={form.religion} onChange={change} required>
                                    <option value="">בחר</option>
                                    <option value="מסורתי">מסורתי</option>
                                    <option value="דתי לאומי תורני">דתי לאומי תורני</option>
                                    <option value="דתי לאומי">דתי לאומי</option>
                                    <option value="דתי">דתי</option>
                                    <option value="דתי לייט">דתי לייט</option>
                                    <option value="חרדי">חרדי</option>
                                    <option value="חרדי מודרני">חרדי מודרני</option>
                                    <option value="חוזר בתשובה">חוזר בתשובה</option>
                                    <option value={'דתל"ש'}>דתל"ש</option>
                                    <option value="חרדי לשעבר">חרדי לשעבר</option>
                                    <option value={'חב"ד'}>חב"ד</option>
                                    <option value="ברסלב">ברסלב</option>
                                    <option value="חסידי">חסידי</option>
                                    <option value="יהודי">יהודי</option>
                                </select>
                            </div>

                            <div className="input-group">
                                {/* בחירת מסלול השכלה. */}
                                <label>השכלה *</label>
                                <select name="education" value={form.education} onChange={change} required>
                                    <option value="">בחר</option>
                                    <option value="תיכון">תיכון</option>
                                    <option value="תעודה">תעודה</option>
                                    <option value="תואר ראשון">תואר ראשון</option>
                                    <option value="תואר שני">תואר שני</option>
                                    <option value="דוקטורט ומעלה">דוקטורט ומעלה</option>
                                    <option value="ישיבה">ישיבה</option>
                                    <option value="מכינה">מכינה</option>
                                    <option value="סמינר">סמינר</option>
                                    <option value="ישיבת הסדר חרדי">ישיבת הסדר חרדי</option>
                                    <option value="ישיבת הסדר דתי">ישיבת הסדר דתי</option>
                                </select>
                            </div>

                            <div className="input-group">
                                {/* פרטי שירות צבאי או לאומי. */}
                                <label>שירות *</label>
                                <select name="militaryService" value={form.militaryService} onChange={change} required>
                                    <option value="">בחר</option>
                                    <option value="קרבי">קרבי</option>
                                    <option value="ישיבת הסדר">ישיבת הסדר</option>
                                    <option value="עתודאי">עתודאי</option>
                                    <option value="יחידה מיוחדת">יחידה מיוחדת</option>
                                    <option value="שירות לאומי">שירות לאומי</option>
                                    <option value="שירות סדיר">שירות סדיר</option>
                                    <option value="לא שירתתי">לא שירתתי</option>
                                </select>
                            </div>

                            <div className="input-group">
                                {/* בחירת הרגלי עישון. */}
                                <label>הרגלי עישון *</label>
                                <select name="smoking" value={form.smoking} onChange={change} required>
                                    <option value="">בחר</option>
                                    <option value="מעשן">מעשן</option>
                                    <option value="לא מעשן">לא מעשן</option>
                                    <option value="מעשן לעיתים">מעשן לעיתים</option>
                                </select>
                            </div>

                            <div className="input-group">
                                {/* בחירת מוצא המשתמש. */}
                                <label>מוצא *</label>
                                <select name="origin" value={form.origin} onChange={change} required>
                                    <option value="">בחר</option>
                                    <option value="ספרדי">ספרדי</option>
                                    <option value="אשכנזי">אשכנזי</option>
                                    <option value="אתיופי">אתיופי</option>
                                    <option value="תימני">תימני</option>
                                    <option value="מעורב">מעורב</option>
                                </select>
                            </div>

                            <div className="input-group">
                                {/* בחירת רקע משפחתי. */}
                                <label>רקע משפחתי *</label>
                                <select name="familyBackground" value={form.familyBackground} onChange={change} required>
                                    <option value="">בחר</option>
                                    <option value="משפחה מסורתית">משפחה מסורתית</option>
                                    <option value="משפחה דתית">משפחה דתית</option>
                                    <option value="משפחה חרדית פתוחה">משפחה חרדית פתוחה</option>
                                    <option value="משפחה חרדית קלאסית">משפחה חרדית קלאסית</option>
                                    <option value="משפחה חילונית">משפחה חילונית</option>
                                </select>
                            </div>

                            {/* בחירת כיפה מופיעה רק לנרשם זכר. */}
                            {form.gender === "זכר" && (
                                <div className="input-group">
                                    <label>כיפה *</label>
                                    <select name="kippah" value={form.kippah} onChange={change} required>
                                        <option value="">בחר</option>
                                        <option value="כיפה סרוגה">כיפה סרוגה</option>
                                        <option value="כיפה שחורה">כיפה שחורה</option>
                                        <option value="כיפה סרוגה שחורה">כיפה סרוגה שחורה</option>
                                        <option value="כיפת עור">כיפת עור</option>
                                        <option value="ללא כיפה">ללא כיפה</option>
                                    </select>
                                </div>
                            )}

                            {/* שדה כיסוי ראש מופיע רק לנרשמת נקבה. */}
                            {form.gender === "נקבה" && (
                                <div className="input-group">
                                    <label>כיסוי ראש *</label>
                                    <input name="headCovering" value={form.headCovering} onChange={change} placeholder="לדוגמה: מטפחת / פאה / ללא" required />
                                </div>
                            )}

                            <div className="input-group">
                                {/* הצגת המזל שחושב מתאריך הלידה, בלי אפשרות להקליד. */}
                                <label>מזל (נקבע לפי תאריך הלידה)</label>
                                <input value={form.zodiac || getZodiacFromBirthDate(form.birthDate)} readOnly />
                            </div>

                            <div className="input-group">
                                {/* ארץ המגורים בפרופיל. */}
                                <label>ארץ *</label>
                                <input name="country" value={form.country} onChange={change} required />
                            </div>

                            <div className="input-group full-width">
                                {/* תיאור חופשי קצר על המשתמש. */}
                                <label>קצת עליי *</label>
                                <textarea name="aboutMe" value={form.aboutMe} onChange={change} rows="3" required />
                            </div>

                            <div className="input-group full-width">
                                {/* תיאור של בן או בת הזוג שמחפשים. */}
                                <label>קצת על מי שאני מחפש/ת *</label>
                                <textarea name="lookingFor" value={form.lookingFor} onChange={change} rows="3" required />
                            </div>
                        </div>

                        <div className="input-group full-width">
                            {/* העלאת תמונת פרופיל מקובץ במחשב. */}
                            <label>תמונת פרופיל *</label>
                            <input type="file" accept="image/*" onChange={changePicture} required />
                        </div>

                        {/* שליחת כל פרטי ההרשמה לשרת. */}
                        <button type="submit" className="register-submit-btn">צור חשבון עכשיו</button>
                    </form>

                    {/* קישור למי שכבר רשום ורוצה להתחבר. */}
                    <p className="login-prompt">
                        כבר יש לך חשבון? <Link to="/login">התחבר כאן</Link>
                    </p>
                </div>
        </div>
    );
}

export default RegisterPage;
