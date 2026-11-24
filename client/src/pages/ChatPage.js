import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ChatPage.css';
// כתובת בסיס של בקשות הצ׳אט בשרת.
const API = 'http://localhost:8000/api';
// יצירת מזהה חדר קבוע משני משתמשים, בלי תלות בסדר שלהם.
function createRoomId(firstId, secondId) {
    if (firstId < secondId) return firstId + '_' + secondId;
    return secondId + '_' + firstId;
}
// מסך צ׳אט - רשימת התאמות, הודעות ודיווח על משתמש.
function ChatPage() {
    // מעבר בין מסכי האתר.
    const navigate = useNavigate();
    // המשתמש המחובר כפי שנשמר בדפדפן.
    const currentUser = JSON.parse(localStorage.getItem('user'));
    // המזהה של המשתמש המחובר.
    const currentUserId = currentUser ? (currentUser._id || currentUser.id) : null;
    // אנשים שיש איתם התאמה הדדית.
    const [matches, setMatches] = useState([]);
    // האדם שהשיחה איתו פתוחה כעת.
    const [selectedMatch, setSelectedMatch] = useState(null);
    // ההודעות בשיחה הפתוחה.
    const [messages, setMessages] = useState([]);
    // ההודעה שמקלידים לפני שליחה.
    const [newMessage, setNewMessage] = useState('');
    // מונע שליחה כפולה בזמן שההודעה נשלחת.
    const [sending, setSending] = useState(false);
    // האם חלון הדיווח על משתמש פתוח.
    const [showReport, setShowReport] = useState(false);
    // הסיבה שהמשתמש כותב בדיווח.
    const [reportReason, setReportReason] = useState('');
    // טעינת רשימת ההתאמות של המשתמש.
    async function loadMatches() {
        try {
            // תשובת השרת לבקשה שבוצעה.
            const response = await fetch(`${API}/matches/${currentUserId}`);
            if (response.ok) setMatches(await response.json());
        } catch (error) {
            console.error('Error loading matches:', error);
        }
    }
    useEffect(() => {
        if (!currentUserId) return navigate('/login');
        loadMatches();
    }, [currentUserId, navigate]);
    useEffect(() => {
        if (!selectedMatch) return;
        setMessages([]);
        setNewMessage('');
        // מסמן אם חלון השיחה עדיין פעיל לפני עדכון הודעות.
        let active = true;
        // משיכת הודעות מהשרת לשיחה שנבחרה.
        const loadMessages = async () => {
            try {
                // מזהה חדר השיחה עבור שני המשתמשים.
                const roomId = createRoomId(currentUserId, selectedMatch._id);
                // תשובת השרת לבקשה שבוצעה.
                const response = await fetch(`${API}/messages/${roomId}`);
                if (response.ok && active) setMessages(await response.json());
            } catch (error) {
                console.error('Error loading messages:', error);
            }
        };
        loadMessages();
        // בדיקת הודעות חדשות כל שנייה וחצי.
        const timer = setInterval(loadMessages, 1500);
        return () => { active = false; clearInterval(timer); };
    }, [selectedMatch]);
    // שליחת הודעה - שומר בשרת ומוסיף לצ׳אט.
    async function sendMessage(event) {
        event.preventDefault();
        if (!newMessage.trim() || !selectedMatch || sending) return;
        setSending(true);
        try {
            // מזהה חדר השיחה עבור שני המשתמשים.
            const roomId = createRoomId(currentUserId, selectedMatch._id);
            // תשובת השרת לבקשה שבוצעה.
            const response = await fetch(`${API}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, senderId: currentUserId, text: newMessage })
            });
            if (!response.ok) return alert('שגיאה בשליחת ההודעה');
            // ההודעה שנשמרה וחזרה מהשרת.
            const savedMessage = await response.json();
            setMessages((previous) => [...previous, savedMessage]);
            setNewMessage('');
        } catch (error) {
            alert('לא ניתן להתחבר לשרת');
        } finally {
            setSending(false);
        }
    }
    // כפתור דיווח - שולח למנהל את סיבת הדיווח.
    async function sendReport(event) {
        event.preventDefault();
        if (!reportReason.trim() || !selectedMatch) return;
        try {
            // תשובת השרת לבקשה שבוצעה.
            const response = await fetch(`${API}/reports`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reporterId: currentUserId,
                    reportedUserId: selectedMatch._id,
                    reason: reportReason
                })
            });
            if (!response.ok) return alert('שגיאה בשליחת הדיווח');
            alert('הדיווח נשלח בהצלחה');
            setShowReport(false);
            setReportReason('');
        } catch (error) {
            console.error('Error sending report:', error);
        }
    }
    if (!currentUser) return null;
    return (
        <div className="chats-page-container" dir="rtl">
            {/* כותרת הצ׳אטים וכפתור חזרה לדף הבית. */}
            <header className="chats-top-header">
                <h2>הודעות והתאמות</h2>
                <button className="back-btn" onClick={() => navigate('/')}>חזור לדף הבית</button>
            </header>
            <div className="chats-layout">
                {/* רשימת האנשים שיש איתם התאמה. */}
                <div className="chats-sidebar">
                    <div className="sidebar-title">ההתאמות שלי ({matches.length})</div>
                    <div>
                        {/* הודעה כשאין עדיין התאמות. */}
                        {matches.length === 0 && <p className="no-matches-text">אין עדיין התאמות</p>}
                        {/* כרטיס לכל התאמה; לחיצה בוחרת את השיחה. */}
                        {matches.map(match => (
                            <div key={match._id}
                                className={`match-item ${selectedMatch?._id === match._id ? 'active' : ''}`}
                                onClick={() => setSelectedMatch(match)}>
                                <img src={`http://localhost:8000/uploads/${match.profilePicture}`}
                                    alt={match.fullName} className="match-avatar" />
                                <div className="match-info">
                                    <h4>{match.fullName}</h4>
                                    <p>{match.email}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {/* אזור הצ׳אט של המשתמש שנבחר. */}
                <div className="chat-main-area">
                    {/* בלי שיחה נבחרת מציגים הנחיה, אחרת מציגים הודעות. */}
                    {!selectedMatch ? (
                        <div className="no-chat-selected">
                            <h3>בחר התאמה מהרשימה</h3>
                            <p>בחר משתמש כדי להתחיל שיחה.</p>
                        </div>
                    ) : (
                        <>
                            {/* שם ותמונה של בן השיחה וכפתור דיווח. */}
                            <div className="chat-header">
                                <div className="chat-user">
                                    <img src={`http://localhost:8000/uploads/${selectedMatch.profilePicture}`}
                                        alt={selectedMatch.fullName} className="chat-header-avatar" />
                                    <h3>צ'אט עם {selectedMatch.fullName}</h3>
                                </div>
                                {/* פתיחת חלון דיווח על המשתמש בשיחה. */}
                                <button onClick={() => setShowReport(true)}>דווח</button>
                            </div>
                            {/* הודעות השיחה המוצגות לפי הסדר שהגיעו. */}
                            <div className="messages-list">
                                {/* עובר על ההודעות וקובע לכל הודעה מי שלח אותה. */}
                                {messages.map(message => {
                                    // בודק אם ההודעה נשלחה על ידי המשתמש המחובר.
                                    const mine = String(message.senderId) === String(currentUserId);
                                    // יישור ועיצוב שונים להודעות שלי ולהודעות של האחר.
                                    return (
                                        <div key={message._id}
                                            className={`message-wrapper ${mine ? 'my-message-wrapper' : 'other-message-wrapper'}`}>
                                            <div className={`message ${mine ? 'my-message' : 'other-message'}`}>
                                                <p>{message.text}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {/* שדה כתיבת הודעה וכפתור שליחה. */}
                            <form onSubmit={sendMessage} className="chat-input-form">
                                {/* ההודעה החדשה מוקלדת כאן. */}
                                <input type="text" value={newMessage} placeholder="הקלד הודעה..."
                                    onChange={event => setNewMessage(event.target.value)} />
                                {/* שליחה; הכפתור נעול בזמן שהבקשה מתבצעת. */}
                                <button type="submit" disabled={sending}>{sending ? "שולח..." : "שלח"}</button>
                            </form>
                        </>
                    )}
                </div>
            </div>
            {/* חלון דיווח שמופיע רק אחרי לחיצה על "דווח". */}
            {showReport && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>דיווח על משתמש</h3>
                        {/* שליחת סיבת הדיווח לשרת. */}
                        <form onSubmit={sendReport}>
                            {/* כתיבת סיבה לדיווח. */}
                            <textarea value={reportReason}
                                onChange={event => setReportReason(event.target.value)}
                                placeholder="כתוב את סיבת הדיווח" rows="4" required />
                            <div className="modal-buttons">
                                {/* כפתור שליחת דיווח. */}
                                <button type="submit" className="save-btn">שלח דיווח</button>
                                {/* ביטול הדיווח וסגירת החלון. */}
                                <button type="button" onClick={() => {
                                    setShowReport(false);
                                    setReportReason('');
                                }}>ביטול</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
export default ChatPage;
