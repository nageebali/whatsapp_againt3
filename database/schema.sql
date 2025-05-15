-- جدول المستخدمين
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    api_token TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول الجلسات
CREATE TABLE whatsapp_sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name TEXT,
    status TEXT DEFAULT 'INACTIVE',
    qr_code TEXT,
    last_activity TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول الرسائل
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    session_id TEXT REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    message TEXT NOT NULL,
    direction TEXT NOT NULL, -- 'incoming' or 'outgoing'
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول جهات الاتصال
CREATE TABLE contacts (
    id SERIAL PRIMARY KEY,
    session_id TEXT REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, phone)
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to users" ON users FOR ALL USING (true);

ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to whatsapp_sessions" ON whatsapp_sessions FOR ALL USING (true);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to messages" ON messages FOR ALL USING (true);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to contacts" ON contacts FOR ALL USING (true);
