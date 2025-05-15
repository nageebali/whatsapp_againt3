const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// استيراد الوحدات
const db = require('./modules/database');
const auth = require('./modules/auth');
const whatsapp = require('./modules/whatsapp');

// إنشاء تطبيق Express
const app = express();
const PORT = process.env.PORT || 3000;

// الإعدادات الوسيطة
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==============================
// الصفحات الرئيسية
// ==============================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ==============================
// واجهة برمجة تطبيقات المصادقة
// ==============================

// تسجيل مستخدم جديد
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // التحقق من البيانات المدخلة
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'جميع الحقول مطلوبة: اسم المستخدم، البريد الإلكتروني، كلمة المرور'
      });
    }
    
    // تسجيل المستخدم
    const result = await auth.registerUser(username, email, password);
    
    res.status(201).json({
      success: true,
      message: 'تم تسجيل المستخدم بنجاح',
      user: result.user,
      token: result.token
    });
  } catch (error) {
    console.error('خطأ في تسجيل المستخدم:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// تسجيل الدخول
app.post('/api/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    // التحقق من البيانات المدخلة
    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        error: 'البريد الإلكتروني وكلمة المرور مطلوبان'
      });
    }
    
    // تسجيل الدخول
    const result = await auth.loginUser(phone, password);
    console.log('result:', result);
   return res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      user: result.user,
      instantToken: result.instantToken
    });
  } catch (error) {
    console.error('خطأ في تسجيل الدخول:', error);
    return  res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

// التحقق من توكن
app.get('/api/auth/verify', auth.authMiddleware, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// ==============================
// واجهة برمجة تطبيقات واتساب
// ==============================

// إنشاء جلسة واتساب جديدة
app.post('/api/whatsapp/sessions', auth.authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.id;
    const sessionId = uuidv4();
    
    // إنشاء الجلسة
    const result = await whatsapp.createWhatsAppSession(userId, sessionId, name);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.status(201).json({
      success: true,
      message: 'تم إنشاء جلسة واتساب بنجاح',
      sessionId: result.sessionId
    });
  } catch (error) {
    console.error('خطأ في إنشاء جلسة واتساب:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// الحصول على قائمة جلسات المستخدم
app.get('/api/whatsapp/sessions', auth.authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // الحصول على الجلسات
    const sessions = await db.getSessionsByUser(userId);
    
    res.json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error('خطأ في جلب جلسات المستخدم:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// الحصول على حالة جلسة
app.get('/api/whatsapp/sessions/:sessionId', auth.authMiddleware, async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    
    // التحقق من ملكية الجلسة
    const session = await db.getSessionById(sessionId);
    if (!session || session.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية الوصول إلى هذه الجلسة'
      });
    }
    
    // الحصول على حالة الجلسة
    const status = await whatsapp.getSessionStatus(sessionId);
    
    res.json(status);
  } catch (error) {
    console.error('خطأ في جلب حالة الجلسة:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// إرسال رسالة
app.post('/api/whatsapp/sessions/:sessionId/send', auth.authMiddleware, async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const { phone, message } = req.body;
    
    // التحقق من البيانات المدخلة
    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        error: 'رقم الهاتف والرسالة مطلوبان'
      });
    }
    
    // التحقق من ملكية الجلسة
    const session = await db.getSessionById(sessionId);
    if (!session || session.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية الوصول إلى هذه الجلسة'
      });
    }
    
    // إرسال الرسالة
    const result = await whatsapp.sendMessage(sessionId, phone, message);
    
    res.json(result);
  } catch (error) {
    console.error('خطأ في إرسال الرسالة:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// الحصول على رسائل الجلسة
app.get('/api/whatsapp/sessions/:sessionId/messages', auth.authMiddleware, async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    
    // التحقق من ملكية الجلسة
    const session = await db.getSessionById(sessionId);
    if (!session || session.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية الوصول إلى هذه الجلسة'
      });
    }
    
    // الحصول على الرسائل
    const messages = await db.getSessionMessages(sessionId, limit);
    
    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('خطأ في جلب رسائل الجلسة:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// الحصول على جهات اتصال الجلسة
app.get('/api/whatsapp/sessions/:sessionId/contacts', auth.authMiddleware, async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    
    // التحقق من ملكية الجلسة
    const session = await db.getSessionById(sessionId);
    if (!session || session.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية الوصول إلى هذه الجلسة'
      });
    }
    
    // الحصول على جهات الاتصال
    const contacts = await db.getSessionContacts(sessionId);
    
    res.json({
      success: true,
      contacts
    });
  } catch (error) {
    console.error('خطأ في جلب جهات اتصال الجلسة:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// إغلاق جلسة
app.post('/api/whatsapp/sessions/:sessionId/close', auth.authMiddleware, async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    
    // التحقق من ملكية الجلسة
    const session = await db.getSessionById(sessionId);
    if (!session || session.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية الوصول إلى هذه الجلسة'
      });
    }
    
    // إغلاق الجلسة
    const result = await whatsapp.closeSession(sessionId);
    
    res.json(result);
  } catch (error) {
    console.error('خطأ في إغلاق الجلسة:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// حذف جلسة
app.delete('/api/whatsapp/sessions/:sessionId', auth.authMiddleware, async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    
    // التحقق من ملكية الجلسة
    const session = await db.getSessionById(sessionId);
    if (!session || session.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية الوصول إلى هذه الجلسة'
      });
    }
    
    // إغلاق الجلسة إذا كانت نشطة
    await whatsapp.closeSession(sessionId);
    
    // حذف الجلسة من قاعدة البيانات
    await db.deleteSession(sessionId);
    
    res.json({
      success: true,
      message: 'تم حذف الجلسة بنجاح'
    });
  } catch (error) {
    console.error('خطأ في حذف الجلسة:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==============================
// واجهة برمجة تطبيقات الويب العامة
// ==============================

// إرسال رسالة باستخدام API توكن
app.post('/api/send', auth.apiTokenMiddleware, async (req, res) => {
  try {
    const { phone, message, sessionId } = req.body;
    
    // التحقق من البيانات المدخلة
    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        error: 'رقم الهاتف والرسالة مطلوبان'
      });
    }
    
    // الحصول على جلسات المستخدم
    const sessions = await db.getSessionsByUser(req.user.id);
    
    // اختيار الجلسة النشطة
    let targetSessionId = sessionId;
    if (!targetSessionId) {
      // اختيار أول جلسة نشطة
      const activeSession = sessions.find(s => s.status === 'READY');
      if (!activeSession) {
        return res.status(404).json({
          success: false,
          error: 'لا توجد جلسة نشطة'
        });
      }
      targetSessionId = activeSession.id;
    } else {
      // التحقق من أن الجلسة المحددة تنتمي للمستخدم
      const sessionExists = sessions.some(s => s.id === targetSessionId);
      if (!sessionExists) {
        return res.status(403).json({
          success: false,
          error: 'ليس لديك صلاحية الوصول إلى هذه الجلسة'
        });
      }
    }
    
    // إرسال الرسالة
    const result = await whatsapp.sendMessage(targetSessionId, phone, message);
    
    res.json(result);
  } catch (error) {
    console.error('خطأ في إرسال الرسالة عبر API:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// تشغيل الخادم
app.listen(PORT, async () => {
  console.log(`الخادم يعمل على المنفذ ${PORT}`);
  
  // اختبار الاتصال بقاعدة البيانات
  const connected = await db.testConnection();
  // if (!connected) {
  //   console.error('❌ خطأ: فشل الاتصال بقاعدة البيانات!');
  //   console.log('تأكد من:');
  //   console.log('1. وجود ملف .env مع معلومات Supabase الصحيحة');
  //   console.log('2. أن خدمة Supabase متاحة وتعمل');
  //   console.log('3. أن جداول قاعدة البيانات تم إنشاؤها بشكل صحيح');
  //   process.exit(1);
  // }
  
  // تحميل الجلسات النشطة
  await whatsapp.loadActiveSessions();
});

// معالجة إيقاف التشغيل
process.on('SIGINT', async () => {
  console.log('\nإيقاف التشغيل بشكل آمن...');
  
  try {
    await whatsapp.closeAllSessions();
    console.log('تم إغلاق جميع جلسات واتساب بنجاح');
  } catch (error) {
    console.error('خطأ أثناء إغلاق الجلسات:', error);
  }
  
  process.exit(0);
});