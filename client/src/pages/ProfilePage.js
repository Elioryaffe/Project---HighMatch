import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ProfilePage.css';
import { getZodiacFromBirthDate } from '../utils/zodiac';

// מסך פרופיל אישי - צפייה ועריכת פרטים.
function ProfilePage() {
    // מעבר חזרה למסך ההתחברות או הבית.
    const navigate = useNavigate();
    // הפרופיל כפי שהוא שמור בשרת.
    const [profile, setProfile] = useState(null);
    // עותק של פרטי הפרופיל לצורך עריכה.
    const [form, setForm] = useState({});
    // תמונה חדשה שהמשתמש רוצה לשמור.
    const [picture, setPicture] = useState(null);
    // האם מצב עריכת הפרופיל פתוח.
    const [editing, setEditing] = useState(false);
    // האם עדיין טוענים את פרטי הפרופיל.
    const [loading, setLoading] = useState(true);

    // טעינת הפרופיל מהשרת לפי מזהה המשתמש.
    const loadProfile = async () => {
        // נתוני ההתחברות השמורים בדפדפן.
        const savedUser = JSON.parse(localStorage.getItem("user") || "null");

        if (!savedUser) {
            navigate("/login");
            return;
        }

        // מזהה המשתמש שבאמצעותו טוענים או מעדכנים פרופיל.
        const userId = savedUser._id || savedUser.id;

        try {
            // תשובת השרת לבקשה שבוצעה.
            const response = await fetch(`http://localhost:8000/api/users/${userId}`);
            // הנתונים שהתקבלו מתשובת השרת.
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "שגיאה בשליפת הפרופיל");
            }

            setProfile(data);
            setForm({
                fullName: data.fullName || "",
                email: data.email || "",
                birthDate: data.birthDate || "",
                gender: data.gender || "",
                city: data.city || "",
                region: data.region || "",
                height: data.height || "",
                religion: data.religion || "",
                education: data.education || "",
                militaryService: data.militaryService || "",
                smoking: data.smoking || "",
                origin: data.origin || "",
                zodiac: data.zodiac || "",
                familyBackground: data.familyBackground || "",
                kippah: data.kippah || "",
                headCovering: data.headCovering || "",
                country: data.country || "ישראל",
                aboutMe: data.aboutMe || "",
                lookingFor: data.lookingFor || ""
            });
        } catch (error) {
            console.error(error);
            setProfile(null);
        }

        setLoading(false);
    };

    useEffect(() => {
        loadProfile();
    }, []);

    // עדכון פרטי הטופס; שינוי תאריך לידה מחשב גם מזל.
    const change = (e) => {
        // השדה שנערך והערך החדש שלו.
        const { name, value } = e.target;
        // שינוי תאריך לידה מעדכן גם את המזל.
        setForm({ ...form, [name]: value, ...(name === "birthDate" ? { zodiac: getZodiacFromBirthDate(value) } : {}) });
    };

    // בחירת תמונה חדשה לפרופיל.
    const changePicture = (e) => {
        setPicture(e.target.files[0]);
    };

    // שמירת פרופיל - מעדכן פרטים ותמונה בשרת.
    const saveProfile = async (e) => {
        e.preventDefault();

        if (form.height && (Number(form.height) < 60 || Number(form.height) > 220)) {
            alert("הגובה צריך להיות בין 60 ל-220 ס״מ");
            return;
        }

        // נתוני ההתחברות השמורים בדפדפן.
        const savedUser = JSON.parse(localStorage.getItem("user") || "null");
        // מזהה המשתמש שבאמצעותו טוענים או מעדכנים פרופיל.
        const userId = savedUser._id || savedUser.id;
        // פרטי הטופס והתמונה שנשלחים לעדכון.
        const data = new FormData();

        for (const key in form) {
            // כתובת המייל לא נשלחת כחלק מעדכון הפרופיל.
            if (key !== "email") data.append(key, form[key]);
        }

        if (picture) {
            data.append("profilePicture", picture);
        }

        try {
            // תשובת השרת לבקשה שבוצעה.
            const response = await fetch(`http://localhost:8000/api/users/${userId}`, {
                method: "PUT",
                body: data
            });

            // התוצאה שהשרת החזיר אחרי הפעולה.
            const result = await response.json();

            if (!response.ok) {
                alert(result.error || "שגיאה בעדכון הפרופיל");
                return;
            }

            // נתונים מעודכנים שנשמרים גם בדפדפן.
            const updatedLocalUser = {
                ...savedUser,
                fullName: form.fullName,
                email: profile.email
            };
            localStorage.setItem("user", JSON.stringify(updatedLocalUser));

            alert("הפרופיל עודכן בהצלחה!");
            setEditing(false);
            setPicture(null);
            await loadProfile();
        } catch (error) {
            console.error(error);
            alert("שגיאת תקשורת מול השרת");
        }
    };

    // חישוב גיל לפי תאריך לידה, כולל בדיקה אם עבר יום ההולדת.
    const getAge = (birthDate) => {
        if (!birthDate) return "";

        // התאריך של היום לחישוב גיל.
        const today = new Date();
        // תאריך הלידה כחלק מחישוב הגיל.
        const birth = new Date(birthDate);
        // הגיל בשנים, לפני תיקון לפי חודש ויום.
        let age = today.getFullYear() - birth.getFullYear();

        if (
            today.getMonth() < birth.getMonth() ||
            (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
        ) {
            age--;
        }

        return age;
    };

    if (loading) return <div className="profile-loading">טוען את הפרופיל שלך...</div>;
    if (!profile) return <div className="profile-error">שגיאה בטעינת הפרופיל.</div>;

    return (
        <div className="profile-page-wrapper" dir="rtl">
            {/* כותרת הפרופיל האישי וכפתור חזרה לבית. */}
            <header className="profile-top-header">
                <h2>הפרופיל האישי שלי</h2>
                <button className="back-btn" onClick={() => navigate("/")}>חזור לדף הבית</button>
            </header>

            {/* תצוגת הפרופיל לפני פתיחת העריכה. */}
            <main className="profile-content">
                <div className="profile-card-main">
                    <div className="profile-cover-photo"></div>

                    {/* תמונת הפרופיל, או תמונה חלופית כשאין תמונה. */}
                    <div className="profile-avatar-container">
                        <img
                            src={profile.profilePicture ? `http://localhost:8000/uploads/${profile.profilePicture}` : '/logo192.png'}
                            alt={profile.fullName}
                            className="profile-avatar-large"
                            onError={(e) => { e.currentTarget.src = '/logo192.png'; }}
                        />
                    </div>

                    {/* שם המשתמש, העיר והגיל המחושב. */}
                    <div className="profile-details-header">
                        <h1>{profile.fullName}</h1>
                        <p className="profile-subtitle">{profile.city} • גיל {getAge(profile.birthDate)}</p>
                    </div>

                    {/* כל נתוני הפרופיל בתיבות: השכלה, דת, גובה ועוד. */}
                    <div className="profile-info-grid">
                        <div className="info-box"><label>אימייל</label><span>{profile.email}</span></div>
                        <div className="info-box"><label>מגדר</label><span>{profile.gender || "לא צוין"}</span></div>
                        <div className="info-box"><label>רמה דתית</label><span>{profile.religion || "לא צוין"}</span></div>
                        <div className="info-box"><label>השכלה</label><span>{profile.education || "לא צוין"}</span></div>
                        <div className="info-box"><label>שירות</label><span>{profile.militaryService || "לא צוין"}</span></div>
                        <div className="info-box"><label>עישון</label><span>{profile.smoking || "לא צוין"}</span></div>
                        <div className="info-box"><label>גובה</label><span>{profile.height ? `${profile.height} ס״מ` : "לא צוין"}</span></div>
                        <div className="info-box"><label>אזור</label><span>{profile.region || "לא צוין"}</span></div>
                        <div className="info-box"><label>מוצא</label><span>{profile.origin || "לא צוין"}</span></div>
                        <div className="info-box"><label>מזל</label><span>{profile.zodiac || "לא צוין"}</span></div>
                        <div className="info-box"><label>רקע משפחתי</label><span>{profile.familyBackground || "לא צוין"}</span></div>
                        <div className="info-box"><label>ארץ</label><span>{profile.country || "ישראל"}</span></div>
                        {/* שדה כיפה מופיע רק כשמין המשתמש הוא זכר. */}
                        {profile.gender === "זכר" && <div className="info-box"><label>כיפה</label><span>{profile.kippah || "לא צוין"}</span></div>}
                        {/* שדה כיסוי ראש מופיע רק כשמין המשתמש הוא נקבה. */}
                        {profile.gender === "נקבה" && <div className="info-box"><label>כיסוי ראש</label><span>{profile.headCovering || "לא צוין"}</span></div>}
                    </div>

                    {/* תיאור אישי והעדפות לגבי בן או בת זוג. */}
                    <div className="profile-text-section">
                        <h3>קצת עליי</h3>
                        <p>{profile.aboutMe || "לא צוין"}</p>
                        <h3>מי אני מחפש/ת</h3>
                        <p>{profile.lookingFor || "לא צוין"}</p>
                    </div>

                    {/* כפתור פתיחת עריכת הפרטים. */}
                    <div className="profile-actions">
                        <button onClick={() => setEditing(true)}>עריכת פרטים</button>
                    </div>
                </div>
            </main>

            {/* חלון עריכה מופיע רק אחרי לחיצה על עריכת פרטים. */}
            {editing && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>עריכת פרופיל אישי</h3>

                        {/* טופס עריכת פרופיל: שמירת השינויים מתבצעת דרך saveProfile. */}
                        <form onSubmit={saveProfile}>
                            <div className="modal-field">
                                {/* עדכון שם מלא בפרופיל. */}
                                <label>שם מלא</label>
                                <input name="fullName" value={form.fullName} onChange={change} required />
                            </div>

                            {/* אימייל מופיע בפרופיל, אבל אי אפשר לערוך אותו. */}

                            <div className="modal-field">
                                {/* תאריך לידה שמשמש גם לחישוב גיל ומזל. */}
                                <label>תאריך לידה</label>
                                <input type="date" name="birthDate" value={form.birthDate} onChange={change} required />
                            </div>

                            <div className="modal-field">
                                {/* בחירת מגדר משפיעה גם על שדות כיפה או כיסוי ראש. */}
                                <label>מגדר</label>
                                <select name="gender" value={form.gender} onChange={change} required>
                                    <option value="זכר">זכר</option>
                                    <option value="נקבה">נקבה</option>
                                </select>
                            </div>

                            <div className="modal-field">
                                {/* עדכון עיר המגורים בפרופיל. */}
                                <label>עיר מגורים</label>
                                <input name="city" value={form.city} onChange={change} required />
                            </div>

                            <div className="modal-field">
                                <label>אזור</label>
                                <select name="region" value={form.region || ""} onChange={change} required>
                                    <option value="">בחר אזור</option>
                                    <option value="דרום">דרום</option>
                                    <option value="מרכז">מרכז</option>
                                    <option value="ירושלים">ירושלים</option>
                                    <option value="צפון">צפון</option>
                                </select>
                            </div>

                            <div className="modal-field">
                                <label>גובה בס״מ</label>
                                <input type="number" min="60" max="220" name="height" value={form.height} onChange={change} required />
                            </div>

                            <div className="modal-field">
                                {/* עדכון רמת דתיות בחלון העריכה. */}
                                <label>רמה דתית</label>
                                <select name="religion" value={form.religion} onChange={change} required>
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
                                    <option value="חילוני">חילוני</option>
                                </select>
                            </div>

                            <div className="modal-field">
                                {/* עדכון השכלה מתוך רשימת אפשרויות. */}
                                <label>השכלה</label>
                                <select name="education" value={form.education} onChange={change} required>
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
                                    <option value="תואר שלישי">תואר שלישי</option>
                                    <option value="אחר">אחר</option>
                                </select>
                            </div>

                            <div className="modal-field">
                                <label>שירות</label>
                                <select name="militaryService" value={form.militaryService} onChange={change} required>
                                    <option value="קרבי">קרבי</option>
                                    <option value="ישיבת הסדר">ישיבת הסדר</option>
                                    <option value="עתודאי">עתודאי</option>
                                    <option value="יחידה מיוחדת">יחידה מיוחדת</option>
                                    <option value="שירות לאומי">שירות לאומי</option>
                                    <option value="שירות סדיר">שירות סדיר</option>
                                    <option value="לא שירתתי">לא שירתתי</option>
                                    <option value="שירות צבאי מלא">שירות צבאי מלא</option>
                                    <option value="לא שירת">לא שירת</option>
                                    <option value="אחר">אחר</option>
                                </select>
                            </div>

                            <div className="modal-field">
                                <label>הרגלי עישון</label>
                                <select name="smoking" value={form.smoking} onChange={change} required>
                                    <option value="מעשן">מעשן</option>
                                    <option value="לא מעשן">לא מעשן</option>
                                    <option value="מעשן לעיתים">מעשן לעיתים</option>
                                </select>
                            </div>

                            <div className="modal-field">
                                {/* בחירת מוצא לשמירה בפרופיל. */}
                                <label>מוצא</label>
                                <select name="origin" value={form.origin} onChange={change} required>
                                    <option value="ספרדי">ספרדי</option>
                                    <option value="אשכנזי">אשכנזי</option>
                                    <option value="אתיופי">אתיופי</option>
                                    <option value="תימני">תימני</option>
                                    <option value="מעורב">מעורב</option>
                                </select>
                            </div>

                            <div className="modal-field">
                                <label>רקע משפחתי</label>
                                <select name="familyBackground" value={form.familyBackground} onChange={change} required>
                                    <option value="משפחה מסורתית">משפחה מסורתית</option>
                                    <option value="משפחה דתית">משפחה דתית</option>
                                    <option value="משפחה חרדית פתוחה">משפחה חרדית פתוחה</option>
                                    <option value="משפחה חרדית קלאסית">משפחה חרדית קלאסית</option>
                                    <option value="משפחה חילונית">משפחה חילונית</option>
                                </select>
                            </div>

                            {/* שדה כיפה בטופס יופיע רק לזכר. */}
                            {form.gender === "זכר" && (
                                <div className="modal-field">
                                    <label>כיפה</label>
                                    <select name="kippah" value={form.kippah} onChange={change} required>
                                        <option value="כיפה סרוגה">כיפה סרוגה</option>
                                        <option value="כיפה שחורה">כיפה שחורה</option>
                                        <option value="כיפה סרוגה שחורה">כיפה סרוגה שחורה</option>
                                        <option value="כיפת עור">כיפת עור</option>
                                        <option value="ללא כיפה">ללא כיפה</option>
                                    </select>
                                </div>
                            )}

                            {/* שדה כיסוי ראש בטופס יופיע רק לנקבה. */}
                            {form.gender === "נקבה" && (
                                <div className="modal-field">
                                    <label>כיסוי ראש</label>
                                    <input name="headCovering" value={form.headCovering} onChange={change} required />
                                </div>
                            )}

                            <div className="modal-field">
                                {/* המזל מחושב מתאריך לידה ולא ניתן לערוך אותו כאן. */}
                                <label>מזל (נקבע לפי תאריך הלידה)</label>
                                <input value={form.zodiac || getZodiacFromBirthDate(form.birthDate)} readOnly />
                            </div>

                            <div className="modal-field">
                                <label>ארץ</label>
                                <input name="country" value={form.country} onChange={change} required />
                            </div>

                            <div className="modal-field">
                                {/* עדכון התיאור האישי בטקסט חופשי. */}
                                <label>קצת עליי</label>
                                <textarea name="aboutMe" value={form.aboutMe} onChange={change} rows="3" required />
                            </div>

                            <div className="modal-field">
                                {/* עדכון מה שהמשתמש מחפש בקשר. */}
                                <label>מי אני מחפש/ת</label>
                                <textarea name="lookingFor" value={form.lookingFor} onChange={change} rows="3" required />
                            </div>

                            <div className="modal-field">
                                {/* בחירת קובץ תמונה חדש להעלאה. */}
                                <label>תמונת פרופיל חדשה</label>
                                <input type="file" accept="image/*" onChange={changePicture} />
                            </div>

                            {/* שמירה או ביטול של עריכת הפרופיל. */}
                            <div className="modal-buttons">
                                <button type="submit" className="save-btn">שמור שינויים</button>
                                {/* ביטול: סגירת הטופס וטעינה מחדש של הפרטים. */}
                                <button type="button" onClick={() => { setEditing(false); setPicture(null); loadProfile(); }}>ביטול</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProfilePage;
