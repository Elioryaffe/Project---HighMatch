// חישוב מזל לפי תאריך לידה, בלי שינוי שנגרם מאזורי זמן.
// חישוב מזל לפי תאריך לידה, בלי בעיות של אזורי זמן.
export function getZodiacFromBirthDate(birthDate) {
    if (!birthDate) return "";
    // פירוק תאריך הלידה לשנה, חודש ויום.
    const [year, month, day] = birthDate.split("-").map(Number);
    if (!year || !month || !day) return "";

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
}
