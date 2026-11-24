import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminPage.css';

// לוח ניהול - משתמשים, דיווחים ונתונים כלליים.
function AdminPage() {
    // חזרה לדף הבית במקרה הצורך.
    const navigate = useNavigate();
    // רשימת המשתמשים במערכת.
    const [users, setUsers] = useState([]);
    // דיווחים שהתקבלו על משתמשים.
    const [reports, setReports] = useState([]);
    // האם המידע בלוח הניהול עדיין נטען.
    const [loading, setLoading] = useState(true);
    // הטקסט שמקלידים בחיפוש משתמש לפי שם.
    const [userSearch, setUserSearch] = useState("");

    // פרטי המנהל מהדפדפן, לצורך פניות לשרת.
    const savedUser = JSON.parse(localStorage.getItem("user") || "{}");

    // טעינת משתמשים ודיווחים עבור לוח המנהל.
    async function loadData() {
        try {
            // כותרת הבקשה עם אימייל המנהל.
            const headers = { 'user-email': savedUser.email };

            // תשובת השרת לבקשת רשימת המשתמשים.
            const usersResponse = await fetch("http://localhost:8000/api/admin/users", { headers });
            if (!usersResponse.ok) throw new Error("אין הרשאות ניהול");
            setUsers(await usersResponse.json());

            // תשובת השרת לבקשת הדיווחים.
            const reportsResponse = await fetch("http://localhost:8000/api/admin/reports", { headers });
            if (reportsResponse.ok) {
                setReports(await reportsResponse.json());
            }
        } catch (error) {
            console.error(error);
            alert("אין לך הרשאות ניהול");
            navigate("/");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    // מחיקת משתמש - מבקש אישור ואז מוחק מהשרת.
    async function deleteUser(userId) {
        if (!window.confirm("האם למחוק את המשתמש וכל הנתונים שלו?")) return;

        // תשובת השרת לבקשה שבוצעה.
        const response = await fetch(`http://localhost:8000/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'user-email': savedUser.email }
        });

        if (response.ok) {
            alert("המשתמש נמחק בהצלחה");
            loadData();
        } else {
            alert("שגיאה במחיקת המשתמש");
        }
    }

    // סגירת דיווח - מסיר רק את הדיווח, לא את המשתמש.
    async function resolveReport(reportId) {
        // תשובת השרת לבקשה שבוצעה.
        const response = await fetch(`http://localhost:8000/api/admin/reports/${reportId}`, {
            method: 'DELETE',
            headers: { 'user-email': savedUser.email }
        });

        if (response.ok) {
            setReports(reports.filter((report) => report._id !== reportId));
        }
    }

    // הפיכת מזהה משתמש לשם להצגה בטבלת הדיווחים.
    function getUserName(userId) {
        // המשתמש שנמצא לפי המזהה שלו.
        const user = users.find((item) => item._id === userId);
        return user ? user.fullName : "משתמש מחוק/לא ידוע";
    }

    // משתמשים רגילים, בלי חשבונות מנהל.
    const regularUsers = users.filter((user) => !user.isAdmin && user.gender !== "מנהל" && user.email !== savedUser.email);
    // מספר הגברים הרשומים.
    const men = regularUsers.filter((user) => user.gender === "זכר").length;
    // מספר הנשים הרשומות.
    const women = regularUsers.filter((user) => user.gender === "נקבה").length;
    // משתמשים שמתאימים לשם שהוקלד בחיפוש.
    const filteredRegularUsers = regularUsers.filter((user) =>
        (user.fullName || "").toLowerCase().includes(userSearch.trim().toLowerCase())
    );

    if (loading) {
        return <div className="admin-loading">טוען את לוח הבקרה של המנהל...</div>;
    }

    return (
        <div className="admin-page-container" dir="rtl">
            {/* כותרת לוח הניהול וחזרה למסך הבית. */}
            <header className="admin-header">
                <h2>לוח בקרה ניהולי - HighMatch</h2>
                <button className="back-btn" onClick={() => navigate("/")}>חזור לדף הבית</button>
            </header>

            <main className="admin-content">
                {/* מספר המשתמשים, גברים, נשים ודיווחים שממתינים לטיפול. */}
                <div className="admin-stats-card">
                    <h3>סך הכל משתמשים: <span className="highlight-num">{regularUsers.length}</span></h3>
                    <h3>גברים: <span className="highlight-num">{men}</span></h3>
                    <h3>נשים: <span className="highlight-num">{women}</span></h3>
                    <h3>דיווחים ממתינים: <span className="highlight-num">{reports.length}</span></h3>
                </div>

                {/* טבלת דיווחים מוצגת רק כשיש דיווחים פתוחים. */}
                {reports.length > 0 && (
                    <div className="admin-table-wrapper">
                        <h3>דיווחים שממתינים לטיפול</h3>
                        <table className="admin-users-table">
                            <thead>
                                <tr>
                                    <th>מדווח</th>
                                    <th>משתמש מדווח</th>
                                    <th>סיבה</th>
                                    <th>פעולה</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* שורה בטבלה עבור כל דיווח. */}
                                {reports.map((report) => (
                                    <tr key={report._id}>
                                        {/* שם המשתמש ששלח את הדיווח. */}
                                        <td>{getUserName(report.reporterId)}</td>
                                        {/* שם המשתמש שעליו דיווחו. */}
                                        <td>{getUserName(report.reportedUserId)}</td>
                                        <td>{report.reason}</td>
                                        {/* פעולות לטיפול בדיווח. */}
                                        <td className="report-actions-cell">
                                            {/* מחיקת הדיווח בלבד בלי למחוק משתמש. */}
                                            <button
                                                className="delete-report-btn"
                                                onClick={() => resolveReport(report._id)}
                                                title="מוחק את הדיווח בלבד ומשאיר את המשתמש במערכת"
                                            >
                                                מחק דיווח בלבד
                                            </button>
                                            {/* מחיקת המשתמש שעליו התקבל הדיווח. */}
                                            <button
                                                className="delete-user-btn"
                                                onClick={() => deleteUser(report.reportedUserId)}
                                                title="מוחק את המשתמש ואת הנתונים הקשורים אליו"
                                            >
                                                מחק משתמש
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="admin-table-wrapper">
                    {/* רשימת כל המשתמשים עם אפשרות חיפוש ומחיקה. */}
                    <h3>ניהול משתמשים</h3>
                    {/* חיפוש משתמש לפי שם מלא. */}
                    <div className="admin-user-search">
                        <label htmlFor="admin-user-name-search">חיפוש משתמש לפי שם</label>
                        {/* שינוי שדה החיפוש מעדכן את userSearch. */}
                        <input
                            id="admin-user-name-search"
                            type="search"
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            placeholder="הקלד שם משתמש..."
                            autoComplete="off"
                        />
                    </div>
                    <table className="admin-users-table">
                        <thead>
                            <tr>
                                <th>תמונה</th>
                                <th>שם מלא</th>
                                <th>אימייל</th>
                                <th>עיר</th>
                                <th>מגדר</th>
                                <th>פעולות</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* הודעה אם לא נמצאו משתמשים מתאימים לחיפוש. */}
                            {filteredRegularUsers.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="admin-user-search-empty">לא נמצאו משתמשים התואמים לחיפוש</td>
                                </tr>
                            )}
                            {/* הצגת המשתמשים שעברו את הסינון בשורות בטבלה. */}
                            {filteredRegularUsers.map((user) => (
                                <tr key={user._id}>
                                    <td>
                                        {/* תמונת משתמש, עם תמונת ברירת מחדל אם יש שגיאה. */}
                                        <img
                                            src={user.profilePicture ? `http://localhost:8000/uploads/${user.profilePicture}` : '/logo192.png'}
                                            alt={user.fullName}
                                            className="admin-user-avatar"
                                            onError={(e) => { e.currentTarget.src = '/logo192.png'; }}
                                        />
                                    </td>
                                    <td className="fw-bold">{user.fullName}</td>
                                    <td>{user.email}</td>
                                    <td>{user.city || "לא צוין"}</td>
                                    <td>{user.gender || "לא צוין"}</td>
                                    <td>
                                        {/* כפתור מחיקת חשבון משתמש מתוך טבלת הניהול. */}
                                        <button
                                            className="delete-user-btn"
                                            onClick={() => deleteUser(user._id)}
                                        >
                                            מחק
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}

export default AdminPage;
