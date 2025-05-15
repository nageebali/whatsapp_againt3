const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// إنشاء اتصال بقاعدة البيانات
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// اختبار الاتصال بقاعدة البيانات
async function testConnection() {
  try {
    const { data, error } = await supabase.from('usersT').select('id').limit(1);
    if (error) throw error;
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
    return true;
  } catch (err) {
    console.error('❌ فشل الاتصال بقاعدة البيانات:', err.message);
    return false;
  }
}

// وظائف المستخدمين
async function createUser(username, phoneNumber, password) {
  try {
    const { data, error } = await supabase
      .from('usersT')
      .insert({
        username,
        phoneNumber,
        password, // يجب تشفير كلمة المرور قبل التخزين
      
      })
      .select();
      
    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('خطأ في إنشاء المستخدم:', error);
    throw error;
  }
}
async function getUserByphone(phoneNumber,password) {
  try {
    const { data, error } = await supabase
      .from('usersT')
      .select('*')
      .eq('phoneNumber', phoneNumber)
      .eq('password', password)
      .single();
      
      return data;

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    console.error('خطأ في البحث عن المستخدم:', error);
    throw error;
  }
}


async function getUserByEmail(phoneNumber) {
  try {
    const { data, error } = await supabase
      .from('usersT')
      .select('*')
      .eq('phoneNumber', phoneNumber)
      .single();
      
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    console.error('خطأ في البحث عن المستخدم:', error);
    throw error;
  }
}

async function getUserByToken(token) {
  try {
    const { data, error } = await supabase
      .from('usersT')
      .select('*')
      .eq('api_token', token)
      .single();
      
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    console.error('خطأ في البحث عن المستخدم بواسطة التوكن:', error);
    throw error;
  }
}

// وظائف إدارة جلسات واتساب
async function createSession(userId, sessionId, name = 'واتساب الرئيسي') {
  try {
    const { data, error } = await supabase
      .from('whatsapp_sessions')
      .insert({
        id: sessionId,
        user_id: userId,
        name,
        status: 'INITIALIZING',
        last_activity: new Date().toISOString()
      })
      .select();
      
    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('خطأ في إنشاء جلسة واتساب:', error);
    throw error;
  }
}

async function updateSessionQR(sessionId, qrCode) {
  try {
    const { data, error } = await supabase
      .from('whatsapp_sessions')
      .update({
        qr_code: qrCode,
        status: 'QR_GENERATED',
        last_activity: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select();
      
    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('خطأ في تحديث رمز QR:', error);
    throw error;
  }
}

async function updateSessionStatus(sessionId, status) {
  try {
    const { data, error } = await supabase
      .from('whatsapp_sessions')
      .update({
        status,
        last_activity: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select();
      
    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('خطأ في تحديث حالة الجلسة:', error);
    throw error;
  }
}

async function getSessionsByUser(userId) {
  try {
    const { data, error } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('خطأ في جلب جلسات المستخدم:', error);
    throw error;
  }
}

async function getSessionById(sessionId) {
  try {
    const { data, error } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
      
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    console.error('خطأ في جلب بيانات الجلسة:', error);
    throw error;
  }
}

async function deleteSession(sessionId) {
  try {
    const { error } = await supabase
      .from('whatsapp_sessions')
      .delete()
      .eq('id', sessionId);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('خطأ في حذف الجلسة:', error);
    throw error;
  }
}

// وظائف إدارة الرسائل
async function saveMessage(sessionId, phone, message, direction, status = 'SENT') {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        session_id: sessionId,
        phone,
        message,
        direction,
        status
      })
      .select();
      
    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('خطأ في حفظ الرسالة:', error);
    throw error;
  }
}

async function getSessionMessages(sessionId, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('خطأ في جلب رسائل الجلسة:', error);
    throw error;
  }
}

// وظائف إدارة جهات الاتصال
async function saveContact(sessionId, phone, name) {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .upsert({
        session_id: sessionId,
        phone,
        name
      })
      .select();
      
    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('خطأ في حفظ جهة الاتصال:', error);
    throw error;
  }
}

async function getSessionContacts(sessionId) {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('session_id', sessionId)
      .order('name', { ascending: true });
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('خطأ في جلب جهات الاتصال:', error);
    throw error;
  }
}

module.exports = {
  supabase,
  testConnection,
  createUser,
  getUserByEmail,
  getUserByToken,
  createSession,
  updateSessionQR,
  updateSessionStatus,
  getSessionsByUser,
  getSessionById,
  deleteSession,
  saveMessage,
  getSessionMessages,
  saveContact,
  getSessionContacts
  ,getUserByphone
};