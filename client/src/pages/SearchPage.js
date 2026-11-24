import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/SearchPage.css";

// אפשרויות סינון לפי רמת דתיות.
const RELIGIONS = ["מסורתי", "דתי לאומי תורני", "דתי לאומי", "דתי", "דתי לייט", "חרדי", "חרדי מודרני", "חוזר בתשובה", 'דתל"ש', "חרדי לשעבר", 'חב"ד', "ברסלב", "חסידי", "יהודי", "חילוני"];
// אפשרויות סינון לפי השכלה.
const EDUCATION = ["תיכון", "תעודה", "תואר ראשון", "תואר שני", "דוקטורט ומעלה", "ישיבה", "מכינה", "סמינר", "ישיבת הסדר חרדי", "ישיבת הסדר דתי", "תואר שלישי", "אחר"];
// אפשרויות סינון לפי שירות צבאי או לאומי.
const SERVICE = ["קרבי", "ישיבת הסדר", "עתודאי", "יחידה מיוחדת", "שירות לאומי", "שירות סדיר", "לא שירתתי", "שירות צבאי מלא", "לא שירת", "אחר"];
// אפשרויות סינון לפי הרגלי עישון.
const SMOKING = ["מעשן", "לא מעשן", "מעשן לעיתים"];
// אפשרויות סינון לפי מוצא.
const ORIGINS = ["ספרדי", "אשכנזי", "אתיופי", "תימני", "מעורב"];
// אפשרויות סינון לפי אזור מגורים.
const REGIONS = ["דרום", "מרכז", "ירושלים", "צפון"];
// אפשרויות סינון לפי מזל.
const ZODIACS = ["טלה", "שור", "תאומים", "סרטן", "אריה", "בתולה", "מאזניים", "עקרב", "קשת", "גדי", "דלי", "דגים"];

// ערכי ברירת המחדל כשלא נבחרו סינונים.
const emptyFilters = {
    city: "", ageFrom: "", ageTo: "", region: [], religion: [], education: [], militaryService: [], smoking: [], origin: [], zodiac: []
};

// תפריט סינון עם סימון כמה אפשרויות.
function FilterGroup({ name, title, allText, options, selected, changeCheckbox }) {
    // הכיתוב של הסינון, כולל מספר האפשרויות שסומנו.
    let text = selected.length ? title + ": " + selected.length + " נבחרו" : allText;

    // תפריט שנפתח בלחיצה לבחירת כמה אפשרויות.
    return (
        <details className="multi-filter">
            {/* כותרת הסינון והמספר של הפריטים שסומנו. */}
            <summary>{text}</summary>
            <div className="checkbox-list">
                {/* בחירה ב"הכל" מנקה את הסינון הזה. */}
                <label><input type="checkbox" checked={!selected.length} onChange={() => changeCheckbox(name, "")} /> הכל</label>
                {/* יוצר תיבת סימון לכל אפשרות בסינון. */}
                {options.map(option => (
                    <label key={option}><input type="checkbox" checked={selected.includes(option)} onChange={() => changeCheckbox(name, option)} /> {option}</label>
                ))}
            </div>
        </details>
    );
}

// מסך חיפוש משתמשים לפי פרטים וסינונים.
function SearchPage() {
    // מעבר לדף הכניסה אם אין משתמש מחובר.
    const navigate = useNavigate();
    // הפרופיל של המשתמש המחפש.
    const [user, setUser] = useState(null);
    // כל הפרופילים שהשרת מחזיר לחיפוש.
    const [users, setUsers] = useState([]);
    // מזהי פרופילים שכבר סומנו או הותאמו, ולא יוצגו שוב.
    const [hiddenIds, setHiddenIds] = useState([]);
    // הפרופיל שפתוח בחלון הפרטים.
    const [selectedProfile, setSelectedProfile] = useState(null);
    // הסינונים שבחר המשתמש.
    const [filters, setFilters] = useState(emptyFilters);

    // טעינת הפרופילים והבחירות הקודמות מהשרת.
    const loadPage = async () => {
        // המשתמש המחובר השמור בדפדפן.
        const savedUser = JSON.parse(localStorage.getItem("user") || "null");
        if (!savedUser) {
            navigate("/login");
            return;
        }

        try {
            // מזהה המשתמש שמבצע את החיפוש.
            const userId = savedUser._id || savedUser.id;
            // תשובת השרת לפרופיל האישי.
            const profileResponse = await fetch(`http://localhost:8000/api/users/${userId}`);
            // פרטי המחפש שעל פיהם מגדירים חיפוש התחלתי.
            const profile = await profileResponse.json();
            // תשובת השרת לרשימת כל הפרופילים.
            const usersResponse = await fetch("http://localhost:8000/api/users");
            // רשימת המשתמשים שנקראה מהשרת.
            const allUsers = await usersResponse.json();
            // תשובת השרת לרשימת פרופילים מוסתרים.
            const hiddenResponse = await fetch(`http://localhost:8000/api/search/hidden/${userId}`);
            // מזהי הפרופילים שלא צריך להציג שוב.
            const hidden = await hiddenResponse.json();

            setUser(profile);
            setUsers(allUsers);
            setHiddenIds(Array.isArray(hidden) ? hidden : []);
            setFilters({ ...emptyFilters, religion: profile.religion ? [profile.religion] : [] });
        } catch (error) {
            console.error("שגיאה בטעינת דף החיפוש:", error);
        }
    };

    useEffect(() => { loadPage(); }, []);

    // עדכון סינון רגיל כמו עיר או טווח גילאים.
    const change = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    // סימון או ביטול אפשרות בתפריט סינון מרובה.
    const changeCheckbox = (name, value) => {
        // האפשרויות שסומנו בסינון הנוכחי.
        const selected = filters[name];
        // רשימת האפשרויות המעודכנת אחרי הלחיצה.
        let newList;

        if (value === "") newList = [];
        else if (selected.includes(value)) newList = selected.filter(item => item !== value);
        else newList = [...selected, value];

        setFilters({ ...filters, [name]: newList });
    };

    // חישוב גיל לצורך סינון לפי גיל.
    const getAge = (birthDate) => {
        if (!birthDate) return 0;
        // התאריך הנוכחי לחישוב גיל.
        const today = new Date();
        // תאריך הלידה לחישוב גיל.
        const birth = new Date(birthDate);
        // הגיל המחושב לפני בדיקת יום ההולדת.
        let age = today.getFullYear() - birth.getFullYear();
        if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
        return age;
    };

    // בדיקה אם ערך מתאים לסינון, או שהסינון לא מוגדר.
    const matches = (selected, value) => selected.length === 0 || selected.includes(value);

    // איחוד שמות שונים של אותו מוצא לפני סינון.
    const normalizeOrigin = (origin) => {
        if (["ספרדי", "מזרחי", "מזרחי / ספרדי", "מרוקאי"].includes(origin)) return "ספרדי";
        if (["מוצא מעורב", "מעורב"].includes(origin)) return "מעורב";
        return origin;
    };

    // בודק אם פרופיל עומד בכל תנאי החיפוש.
    const showUser = (person) => {
        if (!user || person.isAdmin) return false;
        if (person._id === user._id || person.gender === user.gender) return false;
        if (hiddenIds.includes(person._id)) return false;
        // שם העיר שהוקלד בחיפוש.
        const citySearch = filters.city.trim().toLowerCase();
        // העיר של הפרופיל הנבדק.
        const personCity = (person.city || "").trim().toLowerCase();
        if (citySearch && !personCity.startsWith(citySearch)) return false;
        if (!matches(filters.region, person.region)) return false;
        if (!matches(filters.religion, person.religion)) return false;
        if (!matches(filters.education, person.education)) return false;
        if (!matches(filters.militaryService, person.militaryService)) return false;
        if (!matches(filters.smoking, person.smoking)) return false;
        if (!matches(filters.origin, normalizeOrigin(person.origin))) return false;
        if (!matches(filters.zodiac, person.zodiac)) return false;
        // הגיל של הפרופיל לצורך בדיקת הטווח.
        const age = getAge(person.birthDate);
        if (filters.ageFrom && age < Number(filters.ageFrom)) return false;
        if (filters.ageTo && age > Number(filters.ageTo)) return false;
        return true;
    };

    // כפתורי אהבתי או פחות מתאים - שולחים בחירה ומסתירים פרופיל.
    const like = async (toUserId, value) => {
        try {
            // תשובת השרת לבקשה שבוצעה.
            const response = await fetch("http://localhost:8000/api/likes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fromUserId: user._id, toUserId, like: value })
            });
            // הנתונים שהתקבלו מתשובת השרת.
            const data = await response.json();
            if (!response.ok) return alert(data.error || "שגיאה בשמירת הבחירה");

            setSelectedProfile(null);
            setHiddenIds((previous) => [...previous, toUserId]);
            if (data.isMatch) {
                alert("יש לכם Match!");
                return navigate("/chats");
            }
            alert(value ? "הלייק נשמר בהצלחה!" : "הפרופיל הוסר מהחיפוש.");
        } catch {
            alert("שגיאה בחיבור לשרת");
        }
    };

    // תוצאות החיפוש אחרי סינון, מסודרות לפי גיל.
    const filteredUsers = users.filter(showUser).sort((a, b) => getAge(b.birthDate) - getAge(a.birthDate));

    return (
        <div className="search-page" dir="rtl">
            {/* כותרת החיפוש וכפתור חזרה לבית. */}
            <header>
                <h2>חיפוש וסינון פרופילים</h2>
                <button onClick={() => navigate("/")}>חזור לדף הבית</button>
            </header>

            <main>
                {/* כל שדות הסינון: שינוי כאן מעדכן את filters. */}
                <div className="filters">
                    {/* סינון לפי עיר: אפשר להקליד גם תחילת שם העיר. */}
                    <input name="city" placeholder="עיר מגורים" value={filters.city} onChange={change} />
                    {/* סינון לפי אזור מגורים, עם כמה בחירות. */}
                    <FilterGroup name="region" title="אזור" allText="כל האזורים" options={REGIONS} selected={filters.region} changeCheckbox={changeCheckbox} />
                    {/* גיל מינימום בחיפוש. */}
                    <input type="number" min="18" max="99" name="ageFrom" placeholder="מגיל" value={filters.ageFrom} onChange={change} />
                    {/* גיל מקסימום בחיפוש. */}
                    <input type="number" min="18" max="99" name="ageTo" placeholder="עד גיל" value={filters.ageTo} onChange={change} />
                    {/* סינון לפי רמה דתית. */}
                    <FilterGroup name="religion" title="דת" allText="כל הרמות הדתיות" options={RELIGIONS} selected={filters.religion} changeCheckbox={changeCheckbox} />
                    {/* סינון לפי השכלה. */}
                    <FilterGroup name="education" title="השכלה" allText="כל ההשכלות" options={EDUCATION} selected={filters.education} changeCheckbox={changeCheckbox} />
                    {/* סינון לפי שירות צבאי או לאומי. */}
                    <FilterGroup name="militaryService" title="שירות" allText="כל סוגי השירות" options={SERVICE} selected={filters.militaryService} changeCheckbox={changeCheckbox} />
                    {/* סינון לפי עישון. */}
                    <FilterGroup name="smoking" title="עישון" allText="הכל - עישון" options={SMOKING} selected={filters.smoking} changeCheckbox={changeCheckbox} />
                    {/* סינון לפי מוצא. */}
                    <FilterGroup name="origin" title="מוצא" allText="כל המוצאים" options={ORIGINS} selected={filters.origin} changeCheckbox={changeCheckbox} />
                    {/* סינון לפי מזל. */}
                    <FilterGroup name="zodiac" title="מזל" allText="כל המזלות" options={ZODIACS} selected={filters.zodiac} changeCheckbox={changeCheckbox} />
                    {/* כפתור ניקוי כל הסינונים והחזרה לברירת מחדל. */}
                    <button type="button" onClick={() => setFilters(emptyFilters)}>נקה סינון</button>
                </div>

                {/* הרשימה של המשתמשים שנשארו אחרי הסינון. */}
                <div className="profiles-grid">
                    {/* אם אין תוצאות מציגים הודעה, אחרת יוצרים כרטיס לכל פרופיל. */}
                    {filteredUsers.length === 0 ? <p className="no-results">לא נמצאו פרופילים מתאימים.</p> : filteredUsers.map(person => (
                        <div key={person._id} className="profile-card">
                            {/* לחיצה על כרטיס פותחת חלון פרטים של אותו משתמש. */}
                            <div className="profile-card-clickable" onClick={() => setSelectedProfile(person)}>
                                {/* תמונת המשתמש, או תמונת ברירת מחדל אם חסרה. */}
                                <img src={person.profilePicture ? `http://localhost:8000/uploads/${person.profilePicture}` : "/logo192.png"} alt={person.fullName} className="profile-image" onError={(e) => { e.currentTarget.src = "/logo192.png"; }} />
                                <h3>{person.fullName}</h3>
                                <p>עיר: {person.city}</p>
                                <p>גיל: {getAge(person.birthDate)}</p>
                                <p>דת: {person.religion}</p>
                                <p className="profile-details-hint">לחץ לפרטים נוספים</p>
                            </div>
                            {/* כפתורי בחירה: אהבתי או פחות מתאים. */}
                            <div className="card-actions">
                                <button className="like-btn" onClick={() => like(person._id, true)}>אהבתי</button>
                                <button onClick={() => like(person._id, false)}>פחות מתאים</button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* חלון פרופיל מורחב, מופיע רק כשנבחר משתמש. */}
            {/* לחיצה על הרקע סוגרת את חלון הפרטים. */}
            {selectedProfile && (
                <div className="modal-overlay" onClick={() => setSelectedProfile(null)}>
                    {/* לחיצה בתוך החלון לא תסגור אותו. */}
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <img src={selectedProfile.profilePicture ? `http://localhost:8000/uploads/${selectedProfile.profilePicture}` : "/logo192.png"} alt={selectedProfile.fullName} className="profile-modal-image" onError={(e) => { e.currentTarget.src = "/logo192.png"; }} />
                        <h2>{selectedProfile.fullName}</h2>
                        {/* כל הפרטים של הפרופיל הנבחר. */}
                        <div className="profile-full-details">
                            <p><strong>עיר:</strong> {selectedProfile.city || "לא צוין"}</p>
                            <p><strong>אזור:</strong> {selectedProfile.region || "לא צוין"}</p>
                            <p><strong>גיל:</strong> {getAge(selectedProfile.birthDate)}</p>
                            <p><strong>דת:</strong> {selectedProfile.religion || "לא צוין"}</p>
                            <p><strong>השכלה:</strong> {selectedProfile.education || "לא צוין"}</p>
                            <p><strong>שירות:</strong> {selectedProfile.militaryService || "לא צוין"}</p>
                            <p><strong>עישון:</strong> {selectedProfile.smoking || "לא צוין"}</p>
                            <p><strong>מוצא:</strong> {selectedProfile.origin || "לא צוין"}</p>
                            <p><strong>מזל:</strong> {selectedProfile.zodiac || "לא צוין"}</p>
                            <p><strong>רקע משפחתי:</strong> {selectedProfile.familyBackground || "לא צוין"}</p>
                            <p><strong>ארץ:</strong> {selectedProfile.country || "ישראל"}</p>
                            {selectedProfile.gender === "זכר" && <p><strong>כיפה:</strong> {selectedProfile.kippah || "לא צוין"}</p>}
                            {selectedProfile.gender === "נקבה" && <p><strong>כיסוי ראש:</strong> {selectedProfile.headCovering || "לא צוין"}</p>}
                            <p><strong>קצת עליי:</strong> {selectedProfile.aboutMe || "לא צוין"}</p>
                            <p><strong>מחפש/ת:</strong> {selectedProfile.lookingFor || "לא צוין"}</p>
                        </div>
    
                        {/* כפתורי אהבתי ופחות מתאים מתוך חלון הפרופיל. */}
                        <div className="modal-buttons">
                            <button className="like-btn" onClick={() => like(selectedProfile._id, true)}>אהבתי</button>
                            <button onClick={() => like(selectedProfile._id, false)}>פחות מתאים</button>
                        </div>
                        {/* סגירת חלון הפרטים ללא בחירה. */}
                        <button onClick={() => setSelectedProfile(null)}>סגור</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SearchPage;
