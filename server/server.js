require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const express = require('express');
const utils = require('./userUtils');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const { GoogleGenAI } = require('@google/genai');

// שרת האתר מבוסס Express.
const app = express();
// חיבור לשירות Gemini שמסכם שאלונים ומחשב התאמות.
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});
// כתובת החיבור למסד הנתונים MongoDB.
const uri = process.env.MONGODB_URI;
// כתובת האימייל שמוגדרת כחשבון מנהל.
const ADMIN_EMAIL = 'highmatch.support@gmail.com';
// לקוח שמתחבר למסד הנתונים.
const client = new MongoClient(uri);

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// אוספי הנתונים: משתמשים, לייקים, התאמות, דיווחים והודעות.
let UserCollection, LikeCollection, MatchCollection, ReportCollection, MessageCollection;
// תשובת שגיאה כללית כשמשהו נכשל בשרת.
const serverError = (res, message = 'שגיאת שרת פנימית') => res.status(500).json({ error: message });
// בדיקת גיל 18 ומעלה לפי תאריך לידה.
const isAdult = (birthDate) => {
    // תאריך לידה והיום לצורך חישוב גיל.
    const birth = new Date(birthDate), today = new Date();
    // הגיל בשנים לאחר חישוב ההפרש.
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    return birthDate && !isNaN(birth) && birth <= today && age >= 18;
};
// המזל מחושב בשרת לפי תאריך הלידה ולא מתקבל מהטופס.
// חישוב מזל לפי תאריך לידה בצד השרת.
const getZodiacFromBirthDate = (birthDate) => {
    if (!birthDate) return "";
    // פירוק תאריך הלידה לשנה, חודש ויום.
    const parts = String(birthDate).split("-").map(Number);
    if (parts.length !== 3 || parts.some((part) => !part)) return "";
    // החודש והיום שנדרשים לקביעת המזל.
    const [, month, day] = parts;
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "טלה";
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "שור";
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "תאומים";
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "סרטן";
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "אריה";
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "בתולה";
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "מאזניים";
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "עקרב";
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "קשת";
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "גדי";
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "דלי";
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return "דגים";
    return "";
};

// בדיקת הרשאת מנהל לפני גישה לפעולות ניהול.
const isAdmin = (req, res, next) => req.headers['user-email'] === ADMIN_EMAIL
    ? next()
    : res.status(403).json({ error: 'אין לך הרשאות ניהול' });

// חיבור למסד הנתונים והכנת האוספים לעבודה.
async function connectToMongo() {
    try {
        await client.connect();
        // מסד הנתונים של הפרויקט.
        const db = client.db('Project-HighMatch');
        UserCollection = db.collection('users');
        LikeCollection = db.collection('likes');
        MatchCollection = db.collection('matches');
        ReportCollection = db.collection('reports');
        MessageCollection = db.collection('messages');

        if (!await UserCollection.findOne({ email: ADMIN_EMAIL })) {
            await UserCollection.insertOne({
                fullName: 'מנהל מערכת (Admin)', email: ADMIN_EMAIL, password: 'admin123456',
                isAdmin: true, gender: 'מנהל', city: 'מערכת', profilePicture: 'default-admin.png'
            });
        }
    } catch (error) {
        console.error('MongoDB connection error:', error);
    }
}

connectToMongo().then(() => app.listen(8000, () => console.log('server running on port 8000')));

// שליפת רשימת המשתמשים לחיפוש, בלי סיסמאות.
app.get('/api/users', async (req, res) => {
    try {
        // רשימת המשתמשים שהוחזרה ממסד הנתונים.
        const users = await UserCollection.find({ isAdmin: { $ne: true } })
            .project({ password: 0, aiAnswers: 0 }).toArray();
        res.json(users);
    } catch { serverError(res, 'שגיאה בשליפת משתמשים'); }
});

// הגדרת התיקייה ושמות הקבצים לתמונות שמעלים.
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
});
// הפעלת העלאת תמונות באמצעות multer.
const upload = multer({ storage });

// הרשמה - בדיקת פרטים, גיל ואימייל ושמירת משתמש חדש.
app.post('/register', upload.single('profilePicture'), async (req, res) => {
    // נתוני המשתמש החדש שנשלחו מטופס ההרשמה.
    // שומרים בהרשמה רק שדות שמותר למשתמש חדש לשלוח.
    const registrationFields = [
        'fullName', 'email', 'password', 'birthDate', 'gender', 'city', 'region',
        'height', 'religion', 'education', 'militaryService', 'smoking', 'origin',
        'familyBackground', 'kippah', 'headCovering', 'country', 'aboutMe', 'lookingFor'
    ];
    const newUser = {};
    for (const field of registrationFields) {
        if (Object.prototype.hasOwnProperty.call(req.body, field)) newUser[field] = req.body[field];
    }
    // קובעים מזל לפי תאריך לידה ולא לפי ערך שהמשתמש הזין.
    newUser.zodiac = getZodiacFromBirthDate(newUser.birthDate);
    if (req.file) newUser.profilePicture = req.file.filename;
    if (!utils.checkRegister(newUser)) return res.status(400).json({ error: 'פרטי ההרשמה אינם תקינים' });
    if (!isAdult(newUser.birthDate)) return res.status(400).json({ error: 'ההרשמה מותרת מגיל 18 ומעלה בלבד' });
    try {
        if (await UserCollection.findOne({ email: newUser.email })) return res.status(409).json({ error: 'האימייל הזה כבר קיים במערכת' });
        // תוצאת הפעולה במסד הנתונים.
        const result = await UserCollection.insertOne(newUser);
        res.json({ message: 'הרשמה בוצעה בהצלחה', user: {
            _id: result.insertedId, fullName: newUser.fullName, email: newUser.email, gender: newUser.gender
        }});
    } catch { serverError(res); }
});

// התחברות - בדיקת אימייל וסיסמה מול המסד.
app.post('/login', async (req, res) => {
    // פרטי ההתחברות שנשלחו מהטופס.
    const login = req.body;
    if (!utils.checkLogin(login)) return res.status(404).json({ error: 'פרטי ההתחברות אינם תקינים' });
    try {
        // פרטי המשתמש שנמצאו במסד הנתונים.
        const user = await UserCollection.findOne({ email: login.email });
        if (!user || user.password !== login.password) return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
        res.json({ message: 'התחברות בוצעה בהצלחה', user: {
            _id: user._id, fullName: user.fullName, email: user.email, gender: user.gender
        }});
    } catch { serverError(res); }
});

// שמירת אהבתי או פחות מתאים ובדיקת התאמה הדדית.
app.post('/api/likes', async (req, res) => {
    try {
        // מי בחר, את מי בחר, והאם סימן אהבתי.
        const { fromUserId, toUserId, like } = req.body;
        if (!fromUserId || !toUserId || like === undefined) return res.status(400).json({ error: 'חסרים נתונים לשמירת הלייק' });
        // הבחירה בתור אמת או שקר, גם אם נשלחה כמחרוזת.
        const likeValue = like === true || like === 'true' || like === 1;

        await LikeCollection.updateOne(
            { fromUserId: String(fromUserId), toUserId: String(toUserId) },
            { $set: { like: likeValue, createdAt: new Date() } }, { upsert: true }
        );

        // האם התגלה לייק הדדי שיוצר התאמה.
        let isMatch = false;
        if (likeValue) {
            // בדיקה אם גם הצד השני סימן אהבתי.
            const reverseLike = await LikeCollection.findOne({
                fromUserId: String(toUserId), toUserId: String(fromUserId), like: true
            });
            if (reverseLike) {
                isMatch = true;
                // בדיקה אם ההתאמה כבר קיימת, בכל סדר של המשתמשים.
                const matchQuery = { $or: [
                    { user1: String(fromUserId), user2: String(toUserId) },
                    { user1: String(toUserId), user2: String(fromUserId) }
                ]};
                if (!await MatchCollection.findOne(matchQuery)) {
                    await MatchCollection.insertOne({ user1: String(fromUserId), user2: String(toUserId), createdAt: new Date() });
                }
            }
        }
        res.json({ message: 'הלייק נשמר בהצלחה', isMatch });
    } catch { serverError(res); }
});

// הצגת משתמשים שיש איתם התאמה הדדית.
app.get('/api/matches/:userId', async (req, res) => {
    try {
        // מזהה המשתמש שמגיע מהבקשה.
        const userId = String(req.params.userId);
        // רשימת ההתאמות שכבר שמורות במסד.
        const matches = await MatchCollection.find({ $or: [{ user1: userId }, { user2: userId }] }).toArray();
        // מזהי בני הזוג בצד השני של כל התאמה.
        const ids = matches.map(match => new ObjectId(match.user1 === userId ? match.user2 : match.user1));
        // רשימת המשתמשים שהוחזרה ממסד הנתונים.
        const users = await UserCollection.find({ _id: { $in: ids } })
            .project({ _id: 1, fullName: 1, email: 1, profilePicture: 1 }).toArray();
        res.json(users);
    } catch { serverError(res, 'שגיאה בשליפת התאמות'); }
});

// שליפת הודעות בשיחה לפי סדר הזמן.
app.get('/api/messages/:roomId', async (req, res) => {
    try {
        res.json(await MessageCollection.find({ roomId: req.params.roomId }).sort({ createdAt: 1 }).toArray());
    } catch { serverError(res, 'שגיאה בטעינת ההודעות'); }
});

// שליחת הודעה חדשה - שמירה במסד הנתונים.
app.post('/api/messages', async (req, res) => {
    try {
        // מזהה השיחה, מי שלח ותוכן ההודעה.
        const { roomId, senderId, text } = req.body;
        if (!roomId || !senderId || !text?.trim()) return res.status(400).json({ error: 'חסרים פרטי הודעה' });
        // ההודעה החדשה עם זמן השליחה שלה.
        const message = { roomId, senderId: String(senderId), text: text.trim(), createdAt: new Date() };
        // תוצאת הפעולה במסד הנתונים.
        const result = await MessageCollection.insertOne(message);
        res.status(201).json({ ...message, _id: result.insertedId });
    } catch { serverError(res, 'שגיאה בשליחת ההודעה'); }
});

// שליפת משתמשים שכבר נבחרו או הותאמו כדי להסתיר בחיפוש.
app.get('/api/search/hidden/:userId', async (req, res) => {
    try {
        // מזהה המשתמש שמגיע מהבקשה.
        const userId = String(req.params.userId);
        // רשימת ההתאמות שכבר שמורות במסד.
        const matches = await MatchCollection.find({ $or: [{ user1: userId }, { user2: userId }] }).toArray();
        // כל הבחירות שכבר עשה המשתמש.
        const choices = await LikeCollection.find({ fromUserId: userId }).toArray();
        // מזהי משתמשים שכבר יש איתם התאמה.
        const matchIds = matches.map(match => match.user1 === userId ? match.user2 : match.user1);
        res.json([...matchIds, ...choices.map(item => item.toUserId)]);
    } catch { serverError(res); }
});

// הבאת פרופיל משתמש לפי המזהה שלו.
app.get('/api/users/:id', async (req, res) => {
    try {
        // פרטי המשתמש שנמצאו במסד הנתונים.
        const user = await UserCollection.findOne({ _id: new ObjectId(req.params.id) });
        if (!user) return res.status(404).json({ error: 'משתמש לא נמצא' });
        delete user.password;
        res.json(user);
    } catch { serverError(res); }
});

// עדכון פרופיל - נתונים אישיים ותמונה חדשה.
app.put('/api/users/:id', upload.single('profilePicture'), async (req, res) => {
    try {
        // מזהה המשתמש שמגיע מהבקשה.
        const userId = req.params.id;
        // רק פרטים שמותר לערוך: מייל, סיסמה והרשאות לא נכללים ברשימה.
        const editableFields = [
            'fullName', 'birthDate', 'gender', 'city', 'region', 'height',
            'religion', 'education', 'militaryService', 'smoking', 'origin',
            'familyBackground', 'kippah', 'headCovering', 'country', 'aboutMe', 'lookingFor'
        ];
        const data = {};
        for (const field of editableFields) {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) data[field] = req.body[field];
        }
        // מחשבים מחדש מזל בכל שמירת פרופיל.
        if (data.birthDate) data.zodiac = getZodiacFromBirthDate(data.birthDate);
        if (data.height && (Number(data.height) < 60 || Number(data.height) > 220)) return res.status(400).json({ error: 'הגובה צריך להיות בין 60 ל-220 ס״מ' });
        if (data.birthDate && !isAdult(data.birthDate)) return res.status(400).json({ error: 'המערכת מיועדת לבני 18 ומעלה בלבד' });
        if (req.file) data.profilePicture = req.file.filename;
        // תוצאת הפעולה במסד הנתונים.
        const result = await UserCollection.updateOne({ _id: new ObjectId(userId) }, { $set: data });
        if (result.matchedCount === 0) return res.status(404).json({ error: 'משתמש לא נמצא' });
        res.json({ message: 'הפרופיל עודכן בהצלחה!', fullName: data.fullName, profilePicture: data.profilePicture });
    } catch { serverError(res); }
});

// רשימת משתמשים במסך המנהל, בלי סיסמאות.
app.get('/api/admin/users', isAdmin, async (req, res) => {
    try {
        // רשימת המשתמשים שהוחזרה ממסד הנתונים.
        const users = await UserCollection.find({ isAdmin: { $ne: true }, gender: { $ne: 'מנהל' }, email: { $ne: ADMIN_EMAIL } }).project({ password: 0 }).toArray();
        res.json(users);
    } catch { serverError(res); }
});

// מחיקת משתמש וכל הלייקים, השיחות והדיווחים שלו.
app.delete('/api/admin/users/:id', isAdmin, async (req, res) => {
    try {
        // מזהה המשתמש שמגיע מהבקשה.
        const userId = String(req.params.id);
        // פרטי המשתמש שנמצאו במסד הנתונים.
        const user = await UserCollection.findOne({ _id: new ObjectId(userId) });
        if (!user) return res.status(404).json({ error: 'משתמש לא נמצא' });
        if (user.isAdmin === true || user.gender === 'מנהל' || user.email === ADMIN_EMAIL) return res.status(403).json({ error: 'לא ניתן למחוק מנהל מערכת' });
        await UserCollection.deleteOne({ _id: user._id });
        await LikeCollection.deleteMany({ $or: [{ fromUserId: userId }, { toUserId: userId }] });
        await MatchCollection.deleteMany({ $or: [{ user1: userId }, { user2: userId }] });
        await ReportCollection.deleteMany({ $or: [{ reporterId: userId }, { reportedUserId: userId }] });
        await MessageCollection.deleteMany({ $or: [{ senderId: userId }, { roomId: { $regex: userId } }] });
        res.json({ message: 'המשתמש וכל הנתונים שלו נמחקו בהצלחה' });
    } catch { serverError(res); }
});

// שמירת דיווח חדש על משתמש.
app.post('/api/reports', async (req, res) => {
    try {
        // מי דיווח, על מי, ומה סיבת הדיווח.
        const { reporterId, reportedUserId, reason } = req.body;
        if (!reporterId || !reportedUserId || !reason) return res.status(400).json({ error: 'חסרים נתונים לדיווח' });
        await ReportCollection.insertOne({
            reporterId: String(reporterId), reportedUserId: String(reportedUserId), reason,
            status: 'ממתין לטיפול', createdAt: new Date()
        });
        res.json({ message: 'הדיווח נשלח בהצלחה למנהל המערכת' });
    } catch { serverError(res); }
});

// טעינת דיווחים עבור המנהל, מהחדש לישן.
app.get('/api/admin/reports', isAdmin, async (req, res) => {
    try { res.json(await ReportCollection.find({}).sort({ createdAt: -1 }).toArray()); }
    catch { serverError(res); }
});

// מחיקת דיווח שטופל מלוח המנהל.
app.delete('/api/admin/reports/:id', isAdmin, async (req, res) => {
    try {
        // תוצאת הפעולה במסד הנתונים.
        const result = await ReportCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        if (result.deletedCount === 0) return res.status(404).json({ error: 'דיווח לא נמצא' });
        res.json({ message: 'הדיווח הוסר בהצלחה' });
    } catch { serverError(res); }
});

// התחברות גוגל - בדיקה אם כבר קיים חשבון או צריך הרשמה.
app.post('/api/google-login', async (req, res) => {
    try {
        // פרטי המשתמש שחזרו מחשבון גוגל.
        const { email, fullName, profilePicture } = req.body;
        if (!email) return res.status(400).json({ error: 'חסר אימייל מגוגל' });
        // פרטי המשתמש שנמצאו במסד הנתונים.
        const user = await UserCollection.findOne({ email });
        if (user) {
                return res.json({ isNewUser: false, user: {
                _id: user._id, fullName: user.fullName, email: user.email, gender: user.gender, profilePicture: user.profilePicture
            }});
        }
        res.json({ isNewUser: true, prefillData: { email, fullName: fullName || '', profilePicture: profilePicture || '' } });
    } catch { serverError(res); }
});

// בדיקה אם האימייל לשחזור סיסמה קיים במערכת.
app.post('/api/forgot-password', async (req, res) => {
    try {
        if (!await UserCollection.findOne({ email: req.body.email })) return res.status(404).json({ error: 'האימייל לא קיים במערכת' });
        res.json({ message: 'האימייל נמצא בהצלחה' });
    } catch { serverError(res, 'שגיאה בשרת'); }
});

// עדכון סיסמה חדשה עבור האימייל שנשלח.
app.post('/api/reset-password', async (req, res) => {
    try {
        // האימייל והסיסמה החדשה שהגיעו מהטופס.
        const { email, newPassword } = req.body;
        // פרטי המשתמש שנמצאו במסד הנתונים.
        const user = await UserCollection.findOne({ email });
        if (!user) return res.status(404).json({ error: 'האימייל לא קיים במערכת' });
        if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'הסיסמה חייבת להכיל לפחות 8 תווים' });
        await UserCollection.updateOne({ _id: user._id }, { $set: { password: newPassword } });
        res.json({ message: 'הסיסמה עודכנה בהצלחה!' });
    } catch { serverError(res, 'שגיאה בשרת'); }
});

// נוסח השאלות לצורך שליחת תשובות עם הקשר ל-AI.
const AI_QUESTIONS = {
    q1: 'איזה סוג של בן/בת זוג אתה באמת מחפש?',
    q2: 'איך היית רוצה שהבית העתידי שלך ירגיש ביום-יום?',
    q3: 'איזה מקום היית רוצה שיהיה לדת, אמונה ומסורת בבית שלך?',
    q4: 'איזה קשר היית רוצה שיהיה לבית שלך עם המשפחות משני הצדדים?',
    q5: 'איך אתה רואה את נושא הילדים והמשפחה בעתיד?',
    q6: 'איך אתה מדמיין את חלוקת האחריות בבית?',
    q7: 'איזה סגנון חיים היית רוצה שיהיה לכם כזוג?',
    q8: 'איך היית רוצה שהתקשורת ביניכם תיראה?',
    q9: 'כשיש קושי או מחלוקת, איזה בן/בת זוג היית רוצה שיהיו מולך?',
    q10: 'איך היית רוצה לשלב עבודה, קריירה ומשפחה?',
    q11: 'איפה ואיך היית רוצה לבנות את החיים שלכם?',
    q12: 'על אילו דברים אתה לא מוכן להתפשר בזוגיות?',
    q13: 'באילו דברים אתה דווקא מוכן להיות מופתע ולתת הזדמנות?'
};

// משקלי שמונת תחומי ההתאמה; הציון הסופי מחושב בשרת ולא על ידי ה-AI.
const MATCH_DOMAINS = {
    religiousValues: { name: 'ערכים דתיים והשקפת עולם', weight: 20 },
    homeFamily: { name: 'מטרות בית ומשפחה', weight: 15 },
    childrenEducation: { name: 'ילדים וחינוך', weight: 15 },
    communication: { name: 'תקשורת ופתרון קונפליקטים', weight: 15 },
    relationshipResponsibility: { name: 'תפיסת זוגיות וחלוקת אחריות', weight: 10 },
    careerFamily: { name: 'קריירה ואיזון עבודה-משפחה', weight: 10 },
    lifestyle: { name: 'סגנון חיים', weight: 5 },
    flexibility: { name: 'גמישות ופשרה', weight: 10 }
};

// מחזיר תשובות עם ניסוח השאלות המלא, כדי שה-AI יבין את ההקשר ולא רק מזהי q1-q13.
function buildDetailedAnswers(answers = {}) {
    return Object.keys(AI_QUESTIONS).map(id => ({
        questionId: id,
        question: AI_QUESTIONS[id],
        choice: answers[id]?.choice || '',
        freeText: answers[id]?.text || '',
        skipped: answers[id]?.skip === true
    }));
}


// מחשב ציון התאמה משוקלל. מידע חסר מקבל ציון ניטרלי 50.
function calculateWeightedMatchScore(domainScores = {}) {
    // סכום הנקודות המשוקללות לפני חלוקה ב-100.
    let weightedTotal = 0;
    for (const [domainId, domain] of Object.entries(MATCH_DOMAINS)) {
        // הציון המקורי של תחום מסוים מתשובת ה-AI.
        const rawValue = domainScores[domainId];
        // המרת הציון למספר, אם אפשר.
        const rawScore = rawValue === null || rawValue === undefined || rawValue === '' ? NaN : Number(rawValue);
        // ציון תקין בין 0 ל-100; אם חסר, ברירת המחדל היא 50.
        const score = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, rawScore)) : 5;
        weightedTotal += score * domain.weight;
    }
    return Math.round(weightedTotal / 100);
}

// בדיקת תקינות הטקסט שמוחזר מהמודל: סיכומים מוצגים בעברית בלבד.
// בפרט, לא מאפשרים לטקסט בכתב ערבי או עם סימני כיווניות סמויים להגיע למסך.
const AI_ARABIC_SCRIPT = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/u;
const AI_HEBREW_LETTERS = /[\u05D0-\u05EA]/u;

function cleanAiHebrewText(value) {
    return String(value || '')
        .replace(/```(?:text|markdown|hebrew)?/gi, '')
        .replace(/```/g, '')
        .replace(/\*\*/g, '')
        .replace(/^\s*#{1,6}\s*/gm, '')
        .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
        .replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, '') // ניקוד וסימני טעמים שאינם נחוצים לטקסט רגיל
        .replace(/\r\n?/g, '\n')
        .replace(/\u00a0/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n[ \t]*/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function isReadableHebrewAiText(value) {
    const hebrewCount = (value.match(/[\u05D0-\u05EA]/g) || []).length;
    const latinCount = (value.match(/[A-Za-z]/g) || []).length;
    return value.length >= 35 && hebrewCount >= 25 && hebrewCount >= latinCount * 4 && !AI_ARABIC_SCRIPT.test(value);
}

// אם המודל החזיר פסקה אחת, מנסים לחלק אותה בעדינות לשתי פסקאות בין משפטים.
function ensureTwoReadableParagraphs(value) {
    const cleaned = cleanAiHebrewText(value);
    if (/\n\s*\n/.test(cleaned)) return cleaned;
    const sentences = cleaned.split(/(?<=[.!?])\s+/u).filter(Boolean);
    if (sentences.length < 4) return cleaned;
    const middle = Math.ceil(sentences.length / 2);
    return `${sentences.slice(0, middle).join(' ')}\n\n${sentences.slice(middle).join(' ')}`;
}

// במקרה של פלט משובש/שפה זרה, מבקשים ניסוח מחדש ולא מציגים את הטקסט הבעייתי.
async function generateHebrewProfileSummary(prompt) {
    for (let attempt = 0; attempt < 2; attempt++) {
        const instructions = attempt === 0 ? prompt : `${prompt}\nחשוב מאוד: התשובה הקודמת לא הייתה תקינה. נסח מחדש טקסט בעברית תקנית בלבד, ללא שום תו בכתב ערבי, ללא ניקוד ובלי כותרות. החזר שתי פסקאות של פרוזה טבעית המופרדות בשורה ריקה.`;
        const response = await ai.models.generateContent({ model: 'gemini-3.5-flash-lite', contents: instructions });
        const text = ensureTwoReadableParagraphs(response.text);
        if (isReadableHebrewAiText(text)) return text;
    }
    throw new Error('Gemini returned a summary that is not readable Hebrew');
}

// יצירת סיכום AI לפי פרטי המשתמש ותשובות השאלון.
app.post('/api/ai-profile', async (req, res) => {
    try {
        // מזהה המשתמש והתשובות שלו לשאלון.
        const { userId, answers } = req.body;
        if (!userId || !answers) return res.status(400).json({ error: 'חסרים נתונים ליצירת סיכום AI' });
        // פרטי המשתמש שנמצאו במסד הנתונים.
        const user = await UserCollection.findOne({ _id: new ObjectId(userId) });
        if (!user) return res.status(404).json({ error: 'משתמש לא נמצא' });

        // התשובות בצירוף נוסח כל שאלה.
        const answerList = buildDetailedAnswers(answers);
        // פרטי רקע נוספים שנשלחים לבניית הסיכום.
        const profile = {
            gender: user.gender, religion: user.religion, familyBackground: user.familyBackground, education: user.education,
            militaryService: user.militaryService, smoking: user.smoking, aboutMe: user.aboutMe, lookingFor: user.lookingFor
        };
        // הנחיית ניסוח בלשון זכר או נקבה.
        const genderInstructions = user.gender === 'נקבה'
            ? 'הסיכום מתאר אישה. השתמש בלשון נקבה עקבית (היא, מחפשת, רוצה, מוכנה), גם כשמתארים את בן הזוג שהיא מחפשת.'
            : 'הסיכום מתאר גבר. השתמש בלשון זכר עקבית (הוא, מחפש, רוצה, מוכן), גם כשמתארים את בת הזוג שהוא מחפש.';
        // ההוראות והמידע שנשלחים למודל ה-AI.
        const prompt = `אתה עורך תוכן מקצועי של אפליקציית ההיכרויות HighMatch. המשימה שלך לכתוב טקסט אישי יפה, קריא, טבעי ומכבד, שמיועד להופיע ישירות בפרופיל של המשתמש או המשתמשת.
הסתמך רק על העובדות שהוזנו, בלי להמציא ערכים, כוונות, תכונות אופי או העדפות שלא נאמרו.
כתוב בשפה עברית מודרנית, פשוטה ורהוטה, בגוף שלישי, בנימה חמימה ולא שיווקית. זה צריך להישמע כמו תיאור אישי של אדם ולא כמו פלט מכונה.
חובה להשתמש באותיות עבריות בלבד (למעט מספרים וסימני פיסוק): בלי אותיות ערביות בכלל, בלי ניקוד, בלי אנגלית, בלי אימוג'ים ובלי סימוני Markdown.
מגדר האדם: ${user.gender || 'לא צוין'}.
${genderInstructions}
מבנה התשובה: שתי פסקאות טבעיות, עם שורה ריקה ביניהן. אין כותרות ואין רשימות.
בפסקה הראשונה תאר באופן רציף את אופיו/העדפותיו, הרקע הדתי אם צוין, ואת מה שחשוב לו בקשר ובבן או בת הזוג.
בפסקה השנייה תאר את החזון לבית ולמשפחה, את אופי התקשורת ופתרון הקשיים, ואת הגמישות או הגבולות רק ככל שנאמרו בפועל.
אורך רצוי: 100 עד 160 מילים כאשר יש מספיק מידע; אם יש מעט תשובות, כתוב פחות והימנע ממילוי מלאכותי. הימנע מחזרות וממשפטים ריקים.
אל תזכיר 'שאלון', 'תשובה מספר', 'המודל', 'הבינה המלאכותית', 'על פי הנתונים' או 'נראה כי'. אל תכתוב הסבר של התאמה בין שני אנשים; זה סיכום אישי על אדם אחד.
אם יש סתירות בין תשובות, אל תמציא פתרון. אם פרט לא הוזן, אל תכתוב עליו. תן חשיבות רבה לתשובות הטקסט החופשי.
פרטי פרופיל: ${JSON.stringify(profile)}
שאלות ותשובות (דילוג=skipped=true, ולכן מתעלמים מהשאלה): ${JSON.stringify(answerList)}
החזר רק את שתי הפסקאות בעברית, ללא הקדמה. `;

        // מייצר סיכום שנבדק גם מבחינת שפה, פסקאות וכתב תקין.
        const summary = await generateHebrewProfileSummary(prompt);
        await UserCollection.updateOne({ _id: new ObjectId(userId) }, {
            $set: { aiAnswers: answers, aiSummary: summary, aiSummaryUpdatedAt: new Date() }
        });
        res.json({ summary });
    } catch (error) {
        console.error('AI profile error:', error);
        serverError(res, 'שגיאה ביצירת סיכום AI');
    }
});

// שמירת סיכום ה-AI לאחר עריכה של המשתמש.
app.put('/api/ai-summary', async (req, res) => {
    try {
        // מזהה המשתמש והסיכום שאותו שומרים.
        const { userId, summary } = req.body;
        if (!userId || !summary?.trim()) return res.status(400).json({ error: 'הסיכום לא יכול להיות ריק' });
        // תוצאת הפעולה במסד הנתונים.
        const result = await UserCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: { aiSummary: summary.trim(), aiSummaryUpdatedAt: new Date() } }
        );
        if (result.matchedCount === 0) return res.status(404).json({ error: 'משתמש לא נמצא' });
        res.json({ message: 'סיכום ה-AI נשמר בהצלחה' });
    } catch { serverError(res, 'שגיאה בשמירת סיכום AI'); }
});

// חיפוש התאמות AI מתוך פרופילים עם שאלון וסיכום.
app.post('/api/ai-match', async (req, res) => {
    try {
        // מזהה המשתמש שעבורו מבקשים למצוא התאמות.
        const { userId } = req.body;
        if (!userId) return res.status(401).json({ error: 'צריך להתחבר כדי להשתמש בהתאמות AI' });
        // המשתמש שעבורו מחפשים התאמות.
        const currentUser = await UserCollection.findOne({ _id: new ObjectId(userId) });
        if (!currentUser?.aiSummary) return res.status(400).json({ error: 'קודם צריך להשלים את שאלון ה-AI וליצור סיכום' });

        // רשימת ההתאמות שכבר שמורות במסד.
        const matches = await MatchCollection.find({ $or: [{ user1: String(userId) }, { user2: String(userId) }] }).toArray();
        // כל הבחירות שכבר עשה המשתמש.
        const choices = await LikeCollection.find({ fromUserId: String(userId) }).toArray();
        // מזהי משתמשים שכבר הותאמו או נבחרו, להסתרה.
        const hiddenIds = [
            ...matches.map(match => match.user1 === String(userId) ? match.user2 : match.user1),
            ...choices.map(item => item.toUserId)
        ].filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));

        // עד 30 מועמדים שעומדים בתנאי החיפוש הבסיסיים.
        let users = await UserCollection.find({
            _id: { $nin: [new ObjectId(userId), ...hiddenIds] }, isAdmin: { $ne: true },
            gender: { $ne: currentUser.gender }, aiSummary: { $exists: true, $ne: '' }, aiAnswers: { $exists: true }
        }).project({ password: 0, email: 0 }).limit(30).toArray();

        if (!users.length) return res.json([]);

        // מכין נתוני התאמה מלאים עבור כל צד, כולל מגדר, סיכום ותוכן השאלון.
        // נתוני המועמדים שמועברים למודל ההתאמה.
        const candidates = users.map(user => ({
            id: user._id.toString(), gender: user.gender, summary: user.aiSummary,
            answers: buildDetailedAnswers(user.aiAnswers)
        }));
        // נתוני המחפש מול נתוני המועמדים.
        const myData = {
            gender: currentUser.gender, summary: currentUser.aiSummary,
            answers: buildDetailedAnswers(currentUser.aiAnswers)
        };
        // ההוראות והמידע שנשלחים למודל ה-AI.
        const prompt = `אתה מנוע ההתאמות של HighMatch.
מגדר המחפש: ${myData.gender || 'לא צוין'}
המחפש (כולל סיכום ותשובות מלאות): ${JSON.stringify(myData)}
המועמדים (כולל מגדר, סיכום ותשובות מלאות): ${JSON.stringify(candidates)}
בצע התאמה הדדית: בדוק את הציפיות של המחפש מול מה שכל מועמד/ת מציע/ה, וגם את ציפיות המועמד/ת מול המחפש. אל תבצע שתי השוואות חד-צדדיות נפרדות.
השווה סמנטית את המשמעות של תשובות, לא מילות מפתח. הבחן בין התאמה, השלמה, פערים שאפשר לגשר עליהם, לבין סתירות מהותיות. קח בחשבון טקסט חופשי, בחירות, סיכומים, דברים שלא מוכנים להתפשר עליהם וגמישות. התעלם מתשובות שסומנו skipped=true או שאין בהן מידע. אל תמציא מידע; כאשר אין מספיק מידע לתחום מסוים, הענק לו ציון ניטרלי 50.
תן לכל מועמד/ת ציון 0-100 בכל אחד משמונת התחומים הבאים, לפי ההגדרות והמשקלים (אל תחשב את הציון הכולל):
- religiousValues: ערכים דתיים והשקפת עולם (20%)
- homeFamily: מטרות בית ומשפחה (15%)
- childrenEducation: ילדים וחינוך (15%)
- communication: תקשורת ופתרון קונפליקטים (15%)
- relationshipResponsibility: תפיסת זוגיות וחלוקת אחריות (10%)
- careerFamily: קריירה ואיזון עבודה-משפחה (10%)
- lifestyle: סגנון חיים (5%)
- flexibility: גמישות ופשרה (10%)
החזר ציון אמיתי בכל תחום. בנוסף, לכל מועמד כתוב בשדה reason הסבר אישי, קריא, אנושי ומכבד בעברית תקנית בלבד, בלי אותיות ערביות, בלי ניקוד, בלי אנגלית, בלי אימוג'ים ובלי Markdown.
ההסבר מיועד להופיע כטקסט גלוי למשתמש, לא כניתוח טכני. כתוב בגוף שלישי והתאם במדויק למגדר המחפש והמועמד/ת. אין להמציא פרטים.
כתוב שני קטעים קצרים עם שורה ריקה ביניהם: הראשון מסביר באילו ערכים, רצונות וסגנון חיים קיימת התאמה על סמך דברים קונקרטיים מהתשובות; השני מציין בעדינות פערים משמעותיים, אם יש, או מסביר במה הזוג עשוי להשלים זה את זה בלי הבטחות מופרזות.
כדאי לכתוב כ-4 משפטים בסך הכול, באופן זורם ומדויק ולא שבלוני. אל תזכיר ציונים, אחוזים, שמות התחומים, שאלות או מודל AI.
החזר את כל המועמדים שנבדקו בפורמט JSON בלבד: [{"id":"מזהה משתמש","domainScores":{"religiousValues":0,"homeFamily":0,"childrenEducation":0,"communication":0,"relationshipResponsibility":0,"careerFamily":0,"lifestyle":0,"flexibility":0},"reason":"שתי פסקאות קצרות בעברית"}].`;

        // מנתחים JSON, ומבקשים מחדש אם ההסבר מכיל כתב זר או אינו בעברית קריאה.
        let aiResults;
        for (let attempt = 0; attempt < 2; attempt++) {
            const contents = attempt === 0 ? prompt : `${prompt}\nבדיקת איכות נכשלה: הקפד שכל שדה reason יכיל אך ורק טקסט עברי קריא, בשתי פסקאות, ללא שום אות ערבית.`;
            const response = await ai.models.generateContent({
                model: 'gemini-3.5-flash-lite', contents, config: { responseMimeType: 'application/json' }
            });
            try {
                const parsed = JSON.parse(String(response.text || '').replace(/```json/gi, '').replace(/```/g, '').trim());
                if (Array.isArray(parsed) && parsed.every(item => item && typeof item.id === 'string' && item.domainScores && typeof item.reason === 'string')) {
                    const cleaned = parsed.map(item => ({ ...item, reason: ensureTwoReadableParagraphs(item.reason) }));
                    if (cleaned.every(item => isReadableHebrewAiText(item.reason))) {
                        aiResults = cleaned;
                        break;
                    }
                }
            } catch (parseError) {
                console.warn('AI match returned invalid JSON or Hebrew text', parseError.message);
            }
        }
        if (!aiResults) throw new Error('Gemini did not return valid Hebrew match explanations');
        // התאמות עם ציון של לפחות 70, עד שלוש המלצות.
        const results = aiResults.map(item => ({
            ...item,
            score: calculateWeightedMatchScore(item.domainScores)
        })).filter(item => item.score >= 70).sort((a, b) => b.score - a.score).slice(0, 3).map(item => {
            // המועמד המתאים למזהה שחזר מה-AI.
            const user = users.find(user => user._id.toString() === String(item.id));
            if (!user) return null;
            // עותק פרופיל שממנו מסירים תשובות אישיות לפני החזרה.
            const publicUser = { ...user };
            delete publicUser.aiAnswers;
            return { user: publicUser, reason: item.reason, score: item.score };
        }).filter(Boolean);
        res.json(results);
    } catch (error) {
        console.error('AI match error:', error);
        serverError(res, 'שגיאה בחיפוש התאמות');
    }
});
