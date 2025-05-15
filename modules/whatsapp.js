const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const db = require('./database');

// تخزين جلسات واتساب النشطة
const activeClients = new Map();

// إنشاء جلسة واتساب جديدة
async function createWhatsAppSession(userId, sessionId, name = 'واتساب الرئيسي') {
  try {
    // التحقق من وجود الجلسة في الذاكرة
    if (activeClients.has(sessionId)) {
      return { success: false, error: 'الجلسة موجودة بالفعل' };
    }
    
    // إنشاء الجلسة في قاعدة البيانات
    await db.createSession(userId, sessionId, name);
    
    // إنشاء عميل واتساب
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: sessionId }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });
    
    // معالجة حدث رمز QR
    client.on('qr', async (qrCode) => {
      try {
        // تحويل رمز QR إلى صورة
        const qrImageDataUrl = await qrcode.toDataURL(qrCode);
        
        // تحديث رمز QR في قاعدة البيانات
        await db.updateSessionQR(sessionId, qrImageDataUrl);
        
        console.log(`تم إنشاء رمز QR للجلسة ${sessionId}`);
      } catch (error) {
        console.error('خطأ في حفظ رمز QR:', error);
      }
    });
    
    // معالجة حدث جاهزية العميل
    client.on('ready', async () => {
      console.log(`تم تفعيل جلسة واتساب ${sessionId}`);
      
      // تحديث حالة الجلسة في قاعدة البيانات
      await db.updateSessionStatus(sessionId, 'READY');
      
      // جمع جهات الاتصال
      setTimeout(async () => {
        try {
          await collectContacts(client, sessionId);
        } catch (error) {
          console.error('خطأ في جمع جهات الاتصال:', error);
        }
      }, 5000);
    });
    
    // معالجة حدث الرسائل الواردة
    client.on('message', async (msg) => {
      // تجاهل الرسائل المرسلة من قبل المستخدم نفسه
      if (msg.fromMe) return;
      
      try {
        // حفظ الرسالة في قاعدة البيانات
        await db.saveMessage(
          sessionId,
          msg.from,
          msg.body,
          'INCOMING',
          'RECEIVED'
        );
        
        console.log(`تم استلام رسالة من ${msg.from} إلى الجلسة ${sessionId}`);
      } catch (error) {
        console.error('خطأ في حفظ الرسالة الواردة:', error);
      }
    });
    
    // معالجة حدث فشل المصادقة
    client.on('auth_failure', async (error) => {
      console.error(`فشل المصادقة للجلسة ${sessionId}:`, error);
      
      // تحديث حالة الجلسة في قاعدة البيانات
      await db.updateSessionStatus(sessionId, 'AUTH_FAILURE');
      
      // إزالة العميل من الذاكرة
      activeClients.delete(sessionId);
    });
    
    // معالجة حدث قطع الاتصال
    client.on('disconnected', async (reason) => {
      console.log(`تم قطع الاتصال للجلسة ${sessionId}:`, reason);
      
      // تحديث حالة الجلسة في قاعدة البيانات
      await db.updateSessionStatus(sessionId, 'DISCONNECTED');
      
      // إزالة العميل من الذاكرة
      activeClients.delete(sessionId);
    });
    
    // بدء تشغيل العميل
    client.initialize();
    
    // تخزين العميل في الذاكرة
    activeClients.set(sessionId, client);
    
    return { success: true, sessionId };
  } catch (error) {
    console.error('خطأ في إنشاء جلسة واتساب:', error);
    return { success: false, error: error.message };
  }
}

// الحصول على حالة الجلسة
async function getSessionStatus(sessionId) {
  try {
    // البحث عن الجلسة في قاعدة البيانات
    const session = await db.getSessionById(sessionId);
    if (!session) {
      return { success: false, error: 'الجلسة غير موجودة' };
    }
    
    const isActive = activeClients.has(sessionId);
    
    return {
      success: true,
      status: session.status,
      qrCode: session.status === 'QR_GENERATED' ? session.qr_code : null,
      isActive,
      lastActivity: session.last_activity
    };
  } catch (error) {
    console.error('خطأ في الحصول على حالة الجلسة:', error);
    return { success: false, error: error.message };
  }
}

// إرسال رسالة
async function sendMessage(sessionId, phone, message) {
  try {
    // التحقق من وجود الجلسة في الذاكرة
    const client = activeClients.get(sessionId);
    if (!client) {
      return { success: false, error: 'الجلسة غير نشطة' };
    }
    
    // تنسيق رقم الهاتف
    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.endsWith('@c.us')) {
      formattedPhone += '@c.us';
    }
    
    // إرسال الرسالة
    await client.sendMessage(formattedPhone, message);
    
    // حفظ الرسالة في قاعدة البيانات
    await db.saveMessage(
      sessionId,
      formattedPhone,
      message,
      'OUTGOING',
      'SENT'
    );
    
    return { success: true, message: 'تم إرسال الرسالة بنجاح' };
  } catch (error) {
    console.error('خطأ في إرسال الرسالة:', error);
    
    // حفظ الرسالة كفاشلة في قاعدة البيانات
    await db.saveMessage(
      sessionId,
      phone,
      message,
      'OUTGOING',
      'FAILED'
    );
    
    return { success: false, error: error.message };
  }
}

// إغلاق جلسة واتساب
async function closeSession(sessionId) {
  try {
    // التحقق من وجود الجلسة في الذاكرة
    const client = activeClients.get(sessionId);
    if (client) {
      // إغلاق اتصال العميل
      await client.destroy();
      
      // إزالة العميل من الذاكرة
      activeClients.delete(sessionId);
    }
    
    // تحديث حالة الجلسة في قاعدة البيانات
    await db.updateSessionStatus(sessionId, 'CLOSED');
    
    return { success: true, message: 'تم إغلاق الجلسة بنجاح' };
  } catch (error) {
    console.error('خطأ في إغلاق الجلسة:', error);
    return { success: false, error: error.message };
  }
}

// جمع جهات الاتصال من واتساب
async function collectContacts(client, sessionId) {
  try {
    // الحصول على جهات الاتصال
    const contacts = await client.getContacts();
    
    // معالجة كل جهة اتصال
    for (const contact of contacts) {
      // تجاهل جهات الاتصال بدون رقم أو اسم أو التي تبدأ بـ +
      if (!contact.number || !contact.name || contact.number.startsWith('+')) {
        continue;
      }
      
      // حفظ جهة الاتصال في قاعدة البيانات
      await db.saveContact(sessionId, contact.number, contact.name);
    }
    
    console.log(`تم جمع ${contacts.length} جهة اتصال للجلسة ${sessionId}`);
  } catch (error) {
    console.error('خطأ في جمع جهات الاتصال:', error);
    throw error;
  }
}

// تحميل الجلسات النشطة عند بدء التشغيل
async function loadActiveSessions() {
  try {
    // البحث عن الجلسات النشطة في قاعدة البيانات
    const { data: sessions, error } = await db.supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('status', 'READY')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    console.log(`وجدت ${sessions.length} جلسات نشطة للتحميل`);
    
    // تحميل كل جلسة
    for (const session of sessions) {
      try {
        if (!activeClients.has(session.id)) {
          console.log(`جاري تحميل الجلسة ${session.id}...`);
          
          // إنشاء عميل واتساب
          const client = new Client({
            authStrategy: new LocalAuth({ clientId: session.id }),
            puppeteer: {
              headless: true,
              args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
          });
          
          // معالجة حدث جاهزية العميل
          client.on('ready', () => {
            console.log(`تم تفعيل الجلسة ${session.id}`);
          });
          
          // معالجة حدث الرسائل الواردة
          client.on('message', async (msg) => {
            if (msg.fromMe) return;
            
            try {
              // حفظ الرسالة في قاعدة البيانات
              await db.saveMessage(
                session.id,
                msg.from,
                msg.body,
                'INCOMING',
                'RECEIVED'
              );
            } catch (error) {
              console.error('خطأ في حفظ الرسالة الواردة:', error);
            }
          });
          
          // معالجة حدث فشل المصادقة
          client.on('auth_failure', async () => {
            console.log(`فشل المصادقة للجلسة ${session.id}`);
            
            // تحديث حالة الجلسة في قاعدة البيانات
            await db.updateSessionStatus(session.id, 'AUTH_FAILURE');
            
            // إزالة العميل من الذاكرة
            activeClients.delete(session.id);
          });
          
          // معالجة حدث قطع الاتصال
          client.on('disconnected', async () => {
            console.log(`تم قطع الاتصال للجلسة ${session.id}`);
            
            // تحديث حالة الجلسة في قاعدة البيانات
            await db.updateSessionStatus(session.id, 'DISCONNECTED');
            
            // إزالة العميل من الذاكرة
            activeClients.delete(session.id);
          });
          
          // بدء تشغيل العميل
          await client.initialize();
          
          // تخزين العميل في الذاكرة
          activeClients.set(session.id, client);
        }
      } catch (error) {
        console.error(`خطأ في تحميل الجلسة ${session.id}:`, error);
      }
    }
  } catch (error) {
    console.error('خطأ في تحميل الجلسات النشطة:', error);
  }
}

// إغلاق جميع الجلسات النشطة
async function closeAllSessions() {
  const closePromises = [];
  
  for (const [sessionId, client] of activeClients.entries()) {
    try {
      console.log(`جاري إغلاق الجلسة ${sessionId}...`);
      closePromises.push(closeSession(sessionId));
    } catch (error) {
      console.error(`خطأ في إغلاق الجلسة ${sessionId}:`, error);
    }
  }
  
  await Promise.allSettled(closePromises);
  activeClients.clear();
  
  return { success: true, message: `تم إغلاق ${closePromises.length} جلسات` };
}

module.exports = {
  createWhatsAppSession,
  getSessionStatus,
  sendMessage,
  closeSession,
  loadActiveSessions,
  closeAllSessions
};