// בדיקת טופס הרשמה - שם, אימייל, סיסמה, גיל וגובה.
const checkRegister = (user) => {
  if (!user.fullName || user.fullName.length < 3 || user.fullName.length > 30) {
    return false;
  }

  if (!user.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
    return false;
  }

  if (!user.password || user.password.length < 8) {
    return false;
  }

  if (!user.birthDate || !user.gender) {
    return false;
  }

  if (user.height) {
    // הגובה כמספר כדי לבדוק שהוא בתחום המותר.
    const height = Number(user.height);
    if (height < 60 || height > 220) {
      return false;
    }
  }

  return true;
};

// בדיקת תקינות אימייל וסיסמה לפני ניסיון התחברות.
const checkLogin = (user) => {
  if (!user.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
    return false;
  }

  if (!user.password || user.password.length < 8) {
    return false;
  }

  return true;
};

module.exports = { checkRegister, checkLogin };
