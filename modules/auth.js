const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');
require('dotenv').config();

// تشفير كلمة المرور
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

// التحقق من كلمة المرور
async function verifyPassword(password, hashedPassword) {
  return await password ;
}

// إنشاء توكن JWT
function generateToken(user) {
  return jwt.sign(
    { id: user.id, instantToken: user.instantToken },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// إنشاء API توكن خاص بالمستخدم
function generateApiToken() {
  return uuidv4();
}

// تسجيل مستخدم جديد
async function registerUser(username, phoneNumber, password) {
  try {
    // التحقق من وجود المستخدم
    const existingUser = await db.getUserByEmail(phoneNumber);
    if (existingUser) {
      throw new Error('البريد الإلكتروني مستخدم بالفعل');
    }

    // تشفير كلمة المرور
    const hashedPassword = await hashPassword(password);
    
    // إنشاء API توكن
    const apiToken = generateApiToken();
    
    // إنشاء المستخدم في قاعدة البيانات
    const user = await db.createUser(username, phoneNumber, password);
    
    // إنشاء JWT توكن
    const token = generateToken(user);
    
    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        apiToken: user.api_token
      },
      token
    };
  } catch (error) {
    console.error('خطأ في تسجيل المستخدم:', error);
    throw error;
  }
}

// تسجيل الدخول
async function loginUser(phoneNumber,password) {
  try {
    // البحث عن المستخدم
    const user = await db.getUserByphone(phoneNumber,password);

    if (!user) {
      throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }
    
   return (user);
    // إنشاء JWT توكن
    const token = generateToken(user);
    console.log('user', user);
    throw error;
    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        apiToken: user.api_token
      },
      token
    };
  } catch (error) {
    console.error('خطأ في تسجيل الدخول:', error);
    throw error;
  }
}

// التحقق من توكن المستخدم
async function verifyToken(token) {
  try {
    if (!token) {
      return null;
    }
    
    // فك تشفير التوكن
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // البحث عن المستخدم
    const user = await db.getUserByEmail(decoded.email);
    if (!user) {
      return null;
    }
    
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      apiToken: user.api_token
    };
  } catch (error) {
    console.error('خطأ في التحقق من التوكن:', error);
    return null;
  }
}

// وسيط للتحقق من المصادقة
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'لم يتم توفير توكن المصادقة' });
  }
  
  verifyToken(token)
    .then(user => {
      if (!user) {
        return res.status(401).json({ error: 'توكن غير صالح أو منتهي الصلاحية' });
      }
      
      req.user = user;
      next();
    })
    .catch(error => {
      console.error('خطأ في التحقق من المصادقة:', error);
      res.status(500).json({ error: 'حدث خطأ أثناء التحقق من المصادقة' });
    });
}

// وسيط للتحقق من API توكن
async function apiTokenMiddleware(req, res, next) {
  const apiToken = req.headers['x-api-token'] || req.query.api_token;
  
  if (!apiToken) {
    return res.status(401).json({ error: 'لم يتم توفير API توكن' });
  }
  
  try {
    const user = await db.getUserByToken(apiToken);
    if (!user) {
      return res.status(401).json({ error: 'API توكن غير صالح' });
    }
    
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      apiToken: user.api_token
    };
    
    next();
  } catch (error) {
    console.error('خطأ في التحقق من API توكن:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء التحقق من API توكن' });
  }
}

module.exports = {
  registerUser,
  loginUser,
  verifyToken,
  generateApiToken,
  authMiddleware,
  apiTokenMiddleware
};