import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AiMatchPage.css';

// שאלות השאלון שנשלחות אחר כך לניתוח התאמה.
const questions = [
    { id:'q1', title:'איזה סוג של בן/בת זוג אתה באמת מחפש?', options:['משפחתי/ת וחם/ה','רגוע/ה ויציב/ה','חברותי/ת ואנרגטי/ת','עמוק/ה ורגיש/ה','שאפתנ/ית ומכוונ/ת מטרה','קליל/ה ובעל/ת חוש הומור','עצמאי/ת ובטוח/ה בעצמו/ה','אדם שמאוד חי את האמונה והערכים שלו'], note:'אם היית מתאר לחבר טוב את האדם שאתה מחפש – מה היית אומר?' },
    { id:'q2', title:'איך היית רוצה שהבית העתידי שלך ירגיש ביום־יום?', options:['בית חם ומשפחתי עם הרבה אנשים סביבו','בית רגוע ושקט','בית שמח, פתוח וחברותי','בית עם הרבה סדר ושגרה','בית ספונטני עם טיולים וחוויות','שילוב בין בית רגוע לבין חיי חברה','עדיין לא חשבתי על זה לעומק'], note:'תאר בקצרה איך אתה מדמיין ערב רגיל בבית שלך בעוד כמה שנים.' },
    { id:'q3', title:'איזה מקום היית רוצה שיהיה לדת, אמונה ומסורת בבית שלך?', options:['חלק מרכזי מאוד מהבית ומהחלטות החיים','משמעותי מאוד, אבל עם גמישות','מסורת ואמונה חשובות לי בלי הקפדה גבוהה','אני רוצה שכל אחד יוכל להביא את הדרך שלו','עדיין מגבש/ת את הכיוון'], note:'יש משהו באופי הדתי של הבית שחשוב לך במיוחד?' },
    { id:'q4', title:'איזה קשר היית רוצה שיהיה לבית שלך עם המשפחות משני הצדדים?', options:['קשר מאוד קרוב והרבה מפגשים','קשר חם, אבל הזוגיות קודמת','מפגשים קבועים לצד עצמאות','חשוב לי לשמור הרבה פרטיות ועצמאות','תלוי במשפחה ובנסיבות'], note:'איך היית רוצה שייראו שבתות, חגים ואירועים משפחתיים?' },
    { id:'q5', title:'איך אתה רואה את נושא הילדים והמשפחה בעתיד?', options:['ילדים ומשפחה הם מרכז החיים שאני רוצה לבנות','מאוד חשוב לי, לצד קריירה וחיים אישיים','חשוב לי אבל אני רוצה להגיע לזה בהדרגה','עדיין לא יודע/ת בדיוק'], note:'איזה סוג הורה היית רוצה להיות ואיזה בית היית רוצה לתת לילדים שלך?' },
    { id:'q6', title:'איך אתה מדמיין את חלוקת האחריות בבית?', options:['שותפות מלאה כמעט בכל דבר','כל אחד לוקח אחריות לפי החוזקות שלו','חלוקה יחסית מסורתית','הקריירה והמצב של כל אחד יקבעו','אני גמיש/ה בנושא'], note:'מה מבחינתך הופך זוג לשותפים אמיתיים בחיים?' },
    { id:'q7', title:'איזה סגנון חיים היית רוצה שיהיה לכם כזוג?', options:['ביתי ורגוע','הרבה חברים ואירוח','טיולים וחוויות','קריירה והתפתחות אישית','לימוד והתפתחות רוחנית','חיי קהילה משמעותיים','הרבה זמן זוגי','עצמאות אישית לצד הזוגיות'], note:'מה היית רוצה לעשות הרבה יחד כזוג?' },
    { id:'q8', title:'איך היית רוצה שהתקשורת ביניכם תיראה?', options:['לדבר בפתיחות כמעט על הכול','הרבה הקשבה ורגישות','ישירות וכנות גם כשלא נעים','תקשורת רגועה בלי דרמות','הרבה הומור וקלילות','לדעת לתת גם מרחב אחד לשני'], note:'מה גורם לך להרגיש שמישהו באמת מבין אותך?' },
    { id:'q9', title:'כשיש קושי או מחלוקת, איזה בן/בת זוג היית רוצה שיהיו מולך?', options:['מישהו שרוצה לדבר ולפתור מיד','מישהו שיודע לעצור, להירגע ואז לדבר','אדם ישיר אבל מכבד','אדם שמוכן להתפשר','אדם שלא מוותר עד שמבינים אחד את השני','תלוי במצב'], note:'מה הדבר שהכי חשוב לך בזמן ריב או קושי?' },
    { id:'q10', title:'איך היית רוצה לשלב עבודה, קריירה ומשפחה?', options:['המשפחה לפני הקריירה','חשוב לי מאוד ששנינו נתפתח מקצועית','אני רוצה איזון בין השניים','זה יכול להשתנות בתקופות שונות בחיים','אין לי ציפייה קבועה'], note:'איך נראים מבחינתך חיים מאוזנים?' },
    { id:'q11', title:'איפה ואיך היית רוצה לבנות את החיים שלכם?', options:['קרוב למשפחה','קהילה דתית או חברתית חזקה','עיר גדולה','מקום שקט יותר','מוכן/ה לעבור בשביל הזוגיות','המקום פחות חשוב לי מהאדם'], note:'מה חשוב לך בסביבה שבה תקים את הבית שלך?' },
    { id:'q12', title:'על אילו דברים אתה לא מוכן להתפשר בזוגיות?', options:[], note:'כתוב במילים שלך מהם הדברים שבאמת קריטיים עבורך.' },
    { id:'q13', title:'באילו דברים אתה דווקא מוכן להיות מופתע ולתת הזדמנות?', options:[], note:'איזה אדם אולי לא היית בוחר בחיפוש רגיל, אבל כן היית מוכן לתת לו הזדמנות אם ה-AI יסביר למה אתם מתאימים?' }
];

// חישוב גיל לפי תאריך לידה.
function getAge(birthDate) {
    if (!birthDate) return 'לא צוין';
    // תאריך לידה לצורך חישוב גיל.
    const birth = new Date(birthDate);
    // התאריך של היום.
    const today = new Date();
    // הגיל המחושב של המשתמש.
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    return age;
}

// מציג את פסקאות הסיכום כטקסט עברי קריא, לא בתיבת טקסט של טופס.
function SummaryParagraphs({ text }) {
    // סיכומים ישנים עלולים להכיל כתב זר; לא מציגים אותם עד לרענון בעברית.
    if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/u.test(String(text || ''))) {
        return <p className="ai-summary-language-warning">הסיכום הקודם אינו זמין בעברית תקינה. יש ליצור סיכום חדש.</p>;
    }
    const paragraphs = String(text || '').trim().split(/\n\s*\n/).filter(Boolean);
    return (
        <div className="ai-readable-text" lang="he" dir="rtl">
            {paragraphs.map((paragraph, index) => <p key={index}>{paragraph.replace(/\s*\n\s*/g, ' ')}</p>)}
        </div>
    );
}

// מסך התאמות AI - שאלון, סיכום והמלצות.
function AiMatchPage() {
    // מעבר לכניסה או לצ׳אטים אחרי התאמה.
    const navigate = useNavigate();
    // פרטי המשתמש המחובר מהדפדפן.
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    // מזהה המשתמש שנשלח לשרת.
    const userId = currentUser?._id || currentUser?.id;

    // מצב השאלון, סיכום ה-AI, תוצאות ההתאמה ומצב טעינה.
    const [answers, setAnswers] = useState({});
    // הסיכום האישי שנוצר על ידי ה-AI.
    const [summary, setSummary] = useState('');
    // מבחין בין טקסט שנערך במסך לבין הגרסה שכבר שמורה בשרת.
    const [savedSummary, setSavedSummary] = useState('');
    const [editingSummary, setEditingSummary] = useState(false);
    // האם להציג את השאלון או את הסיכום.
    const [showQuestions, setShowQuestions] = useState(true);
    // המלצות ההתאמה שחזרו מהשרת.
    const [results, setResults] = useState([]);
    // מצב טעינה בזמן קריאה לשרת.
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!userId) return navigate('/login');
        loadProfile();
    }, []);

    // טוען מהשרת תשובות וסיכום קיימים כדי לאפשר המשך עריכה.
    async function loadProfile() {
        try {
            // תשובת השרת לבקשה שבוצעה.
            const response = await fetch(`http://localhost:8000/api/users/${userId}`);
            // הנתונים שהתקבלו מתשובת השרת.
            const data = await response.json();

            if (data.aiAnswers) setAnswers(data.aiAnswers);
            if (data.aiSummary) {
                setSummary(data.aiSummary);
                setSavedSummary(data.aiSummary);
                setEditingSummary(false);
                setShowQuestions(false);
            }
        } catch (error) {
            console.error(error);
        }
    }

    // שמירת בחירה מתוך אפשרויות של שאלה.
    function changeChoice(id, value) {
        setAnswers({ ...answers, [id]: { ...answers[id], choice: value } });
    }

    // שמירת תשובה חופשית לשאלה.
    function changeText(id, value) {
        setAnswers({ ...answers, [id]: { ...answers[id], text: value } });
    }

    // מאפשר לסמן שאלה כדילוג; התשובות שלה נשמרות אך ה-AI מתבקש להתעלם מהן.
    function changeSkip(id, skipped) {
        setAnswers({ ...answers, [id]: { ...answers[id], skip: skipped } });
    }

    // יצירת סיכום AI לפי תשובות השאלון.
    async function createSummary(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (Object.keys(answers).length === 0) return alert('צריך לענות לפחות על שאלה אחת');
        setLoading(true);

        try {
            // תשובת השרת לבקשה שבוצעה.
            const response = await fetch('http://localhost:8000/api/ai-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, answers })
            });

            // הנתונים שהתקבלו מתשובת השרת.
            const data = await response.json();

            if (!response.ok) return alert(data.error || 'שגיאה ביצירת סיכום AI');

            setSummary(data.summary);
            setSavedSummary(data.summary);
            setEditingSummary(false);
            setResults([]);
            setShowQuestions(false);
        } catch (error) {
            alert('שגיאה בחיבור לשרת');
        } finally {
            setLoading(false);
        }
    }

    // שומר סיכום ידני, לפני חיפוש התאמה או בלחיצה על שמירה.
    async function persistSummary() {
        if (!summary.trim()) {
            alert('הסיכום לא יכול להיות ריק');
            return false;
        }
        try {
            const response = await fetch('http://localhost:8000/api/ai-summary', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, summary })
            });
            const data = await response.json();
            if (!response.ok) {
                alert(data.error || 'שגיאה בשמירת הסיכום');
                return false;
            }
            setSavedSummary(summary);
            setEditingSummary(false);
            return true;
        } catch (error) {
            alert('שגיאה בחיבור לשרת בעת שמירת הסיכום');
            return false;
        }
    }

    async function saveSummary() {
        if (await persistSummary()) alert('הסיכום נשמר בהצלחה');
    }

    // מבקש מהשרת לחשב התאמות AI לפי התשובות והסיכום ששמורים למשתמש.
    async function findMatches() {
        setLoading(true);

        try {
            // אם נערך סיכום חדש, שמור אותו לפני החיפוש כדי למנוע שימוש בגרסה ישנה.
            if (summary.trim() !== savedSummary.trim() && !(await persistSummary())) return;
            // תשובת השרת לבקשה שבוצעה.
            const response = await fetch('http://localhost:8000/api/ai-match', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });

            // הנתונים שהתקבלו מתשובת השרת.
            const data = await response.json();

            if (!response.ok) return alert(data.error || 'שגיאה בחיפוש');

            setResults(data);
            if (data.length === 0) alert('כרגע אין התאמות מספיק מתאימות');
        } catch (error) {
            alert('שגיאה בחיבור לשרת');
        } finally {
            setLoading(false);
        }
    }

    // שמירת אהבתי או פחות מתאים, ומעבר לצ׳אט אם יש התאמה.
    async function like(toUserId, value) {
        // תשובת השרת לבקשה שבוצעה.
        const response = await fetch('http://localhost:8000/api/likes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fromUserId: userId, toUserId, like: value })
        });

        // הנתונים שהתקבלו מתשובת השרת.
        const data = await response.json();

        if (!response.ok) return alert('שגיאה בשמירת הבחירה');

        setResults((previous) => previous.filter((item) => item.user._id !== toUserId));

        if (data.isMatch) {
            alert('יש לכם Match!');
            navigate('/chats');
        }
    }

    return (
        <div className="ai-page-wrapper" dir="rtl">
            <div className="ai-card-container">

                {/* כפתור חזרה וכותרת בראש מסך ה-AI. */}
                <div className="ai-top-row">
                    <button onClick={() => navigate('/')}>← חזרה לדף הבית</button>
                    <h2 className="ai-logo">HighMatch</h2>
                </div>

                <h1 className="ai-title">התאמת AI עמוקה</h1>

                {/* מציג שאלון או סיכום, לפי השלב שבו המשתמש נמצא. */}
                {/* שליחת השאלון ליצירת סיכום AI. */}
                {showQuestions ? (
                    <form onSubmit={createSummary} className="ai-form">

                        {/* יצירת כרטיס לכל שאלה בשאלון. */}
                        {questions.map((question, index) => (
                            <div className="ai-question-card" key={question.id}>
                                <div className="ai-question-number">
                                    שאלה {index + 1} מתוך 13
                                </div>

                                <h3>{question.title}</h3>

                                {/* אפשרויות בחירה לשאלות שיש להן תשובות מוכנות. */}
                                {/* בחירת תשובה שומרת את האפשרות שנבחרה בשאלה. */}
                                {question.options.length > 0 && (
                                    <select
                                        value={answers[question.id]?.choice || ''}
                                        onChange={(e) => changeChoice(question.id, e.target.value)}
                                        disabled={answers[question.id]?.skip === true}
                                    >
                                        <option value="">בחר תשובה</option>

                                        {question.options.map((option) => (
                                            <option key={option}>{option}</option>
                                        ))}
                                    </select>
                                )}

                                {/* תשובה חופשית לשאלה; נשמרת ב-answers. */}
                                <textarea
                                    rows="3"
                                    placeholder={question.note}
                                    value={answers[question.id]?.text || ''}
                                    onChange={(e) => changeText(question.id, e.target.value)}
                                    disabled={answers[question.id]?.skip === true}
                                />
                                {/* סימון דילוג: משבית את התשובה לשאלה הזו. */}
                                <label className="ai-skip-line">
                                    <input
                                        type="checkbox"
                                        checked={answers[question.id]?.skip === true}
                                        onChange={(e) => changeSkip(question.id, e.target.checked)}
                                    />
                                    דלג על השאלה
                                </label>
                            </div>
                        ))}

                        {/* כפתור יצירת סיכום; חסום כשה-AI עובד. */}
                        <button className="ai-submit-btn" disabled={loading}>
                            {loading ? 'ה-AI מסכם...' : 'צור את סיכום ה-AI שלי'}
                        </button>
                    </form>

                ) : (
                    <div className="ai-summary-section">
                        <h2>איך ה-AI הבין אותי</h2>
                        <p className="ai-summary-help">זה הסיפור האישי שהמערכת ניסחה מהתשובות שלך. אפשר לערוך אותו לפני חיפוש התאמות.</p>

                        {editingSummary ? (
                            <textarea
                                className="ai-summary-editor"
                                rows="9"
                                dir="rtl"
                                lang="he"
                                aria-label="עריכת הסיכום האישי"
                                value={summary}
                                onChange={(e) => setSummary(e.target.value)}
                            />
                        ) : (
                            <div className="ai-summary-preview">
                                <SummaryParagraphs text={summary} />
                            </div>
                        )}

                        <div className="ai-summary-actions">
                            <button type="button" onClick={() => {
                                if (editingSummary) setSummary(savedSummary);
                                setEditingSummary(!editingSummary);
                            }} disabled={loading}>
                                {editingSummary ? 'סגור עריכה' : 'ערוך סיכום'}
                            </button>
                            {editingSummary && <button type="button" onClick={saveSummary} disabled={loading}>שמור סיכום</button>}
                            <button type="button" onClick={() => { setShowQuestions(true); setResults([]); }} disabled={loading}>ערוך שאלות</button>
                            <button type="button" onClick={() => createSummary()} disabled={loading}>
                                {loading ? 'יוצר סיכום...' : 'צור סיכום מחדש'}
                            </button>
                            <button
                                type="button"
                                className="ai-submit-btn"
                                onClick={findMatches}
                                disabled={loading}
                            >
                                {loading ? 'מחפש...' : 'מצא לי התאמות AI'}
                            </button>
                        </div>
                    </div>
                )}

                {/* אזור תוצאות: מופיע רק כשיש התאמות. */}
                {results.length > 0 && (
                    <div className="ai-results-section">
                        <h2>ההתאמות שה-AI מצא עבורך</h2>

                        {/* יצירת כרטיס לכל התאמה שהתקבלה מהשרת. */}
                        {results.map((item) => (
                            <div className="ai-user-card" key={item.user._id}>
                                <img
                                    src={item.user.profilePicture
                                        ? `http://localhost:8000/uploads/${item.user.profilePicture}`
                                        : '/logo192.png'}
                                    alt={item.user.fullName}
                                    className="ai-user-avatar"
                                />

                                {/* שם, גיל, עיר, סיכום אישי והסיבה להתאמה. */}
                                <div className="ai-user-info">
                                    <h4>{item.user.fullName}</h4>
                                    <p>
                                        {item.user.city || 'לא צוין'}
                                        {' • '}
                                        {item.user.religion || 'לא צוין'}
                                        {' • גיל '}
                                        {getAge(item.user.birthDate)}
                                    </p>
                                    <section className="ai-match-text-block" aria-label="על המשתמש או המשתמשת">
                                        <h5>קצת על {item.user.fullName}</h5>
                                        <SummaryParagraphs text={item.user.aiSummary} />
                                    </section>
                                    <section className="ai-match-text-block ai-match-why" aria-label="הסבר ההתאמה">
                                        <h5>למה יש ביניכם התאמה?</h5>
                                        <SummaryParagraphs text={item.reason} />
                                    </section>
                                </div>

                                <div className="ai-result-actions">
                                {/* כפתור אהבתי על התאמה שה-AI מצא. */}
                                <button
                                    className="like-btn"
                                    onClick={() => like(item.user._id, true)}
                                >
                                    אהבתי
                                </button>

                                {/* סימון פחות מתאים מסיר את הכרטיס מרשימת התוצאות. */}
                                <button onClick={() => like(item.user._id, false)}>
                                    פחות מתאים
                                </button>
                                </div>
                            </div>
                        ))}

                    </div>
                )}

            </div>
        </div>
    );
}

export default AiMatchPage;