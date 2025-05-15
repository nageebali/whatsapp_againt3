    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        document.getElementById('userDisplayName').textContent = user.username || 'المستخدم';
        document.getElementById('userEmail').textContent = user.email || '';
        
        // تعبئة نموذج إعدادات الحساب
        const usernameInput = document.getElementById('settingsUsername');
        const emailInput = document.getElementById('settingsEmail');
        
        if (usernameInput && emailInput) {
            usernameInput.value = user.username || '';
            emailInput.value = user.email || '';
        }
    }

// تحميل البيانات الإحصائية ولوحة التحكم
async function loadDashboardData() {
    const token = localStorage.getItem('token');
    
    try {
        // تحميل الجلسات
        await loadSessions();
        
        // تحديث قوائم اختيار الجلسات
        updateSessionSelects();
        
        // تحميل الإحصائيات
        updateDashboardStats();
        
        // تحميل النشاط الأخير
        loadRecentActivity();
    } catch (error) {
        console.error('خطأ في تحميل بيانات لوحة التحكم:', error);
        showNotification('حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.', 'error');
    }
}

// تحميل الجلسات
async function loadSessions() {
    const token = localStorage.getItem('token');
    const sessionsList = document.getElementById('sessionsList');
    
    try {
        const response = await fetch('/api/whatsapp/sessions', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (sessionsList) {
                if (data.sessions.length === 0) {
                    sessionsList.innerHTML = `
                        <div class="no-data">
                            <i class="fas fa-qrcode"></i>
                            <p>لا توجد جلسات واتساب حالياً</p>
                            <button id="noSessionsCreateBtn" class="btn btn-primary">
                                <i class="fas fa-plus"></i>
                                <span>إنشاء جلسة جديدة</span>
                            </button>
                        </div>
                    `;
                    
                    // إضافة حدث للزر
                    document.getElementById('noSessionsCreateBtn').addEventListener('click', showCreateSessionModal);
                } else {
                    sessionsList.innerHTML = '';
                    
                    // عرض الجلسات
                    data.sessions.forEach(session => {
                        const sessionCard = createSessionCard(session);
                        sessionsList.appendChild(sessionCard);
                    });
                    
                    // تحديث عدد الجلسات النشطة
                    const activeSessions = data.sessions.filter(session => session.status === 'READY');
                    document.getElementById('activeSessionsCount').textContent = activeSessions.length;
                }
            }
            
            return data.sessions;
        } else {
            throw new Error(data.error || 'فشل في تحميل الجلسات');
        }
    } catch (error) {
        console.error('خطأ في تحميل الجلسات:', error);
        if (sessionsList) {
            sessionsList.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>حدث خطأ في تحميل الجلسات</p>
                    <button id="retryLoadSessionsBtn" class="btn btn-primary">
                        <i class="fas fa-sync-alt"></i>
                        <span>إعادة المحاولة</span>
                    </button>
                </div>
            `;
            
            // إضافة حدث للزر
            document.getElementById('retryLoadSessionsBtn').addEventListener('click', loadSessions);
        }
        
        throw error;
    }
}

// إنشاء بطاقة جلسة
function createSessionCard(session) {
    const template = document.getElementById('sessionCardTemplate');
    const clone = document.importNode(template.content, true);
    
    // تحديث بيانات الجلسة
    const card = clone.querySelector('.session-card');
    card.dataset.id = session.id;
    
    // اسم الجلسة
    clone.querySelector('.session-name').textContent = session.name || 'جلسة واتساب';
    
    // حالة الجلسة
    const statusElement = clone.querySelector('.session-status');
    statusElement.textContent = getStatusText(session.status);
    statusElement.className = `session-status ${getStatusClass(session.status)}`;
    
    // معلومات الجلسة
    const createdDate = new Date(session.created_at);
    clone.querySelector('.session-created').textContent = createdDate.toLocaleDateString('ar-SA');
    
    const lastActivity = new Date(session.last_activity);
    clone.querySelector('.session-last-activity').textContent = lastActivity.toLocaleDateString('ar-SA') + ' ' + lastActivity.toLocaleTimeString('ar-SA');
    
    // رمز QR إذا كان متاحاً
    const qrContainer = clone.querySelector('.session-qr');
    if (session.status === 'QR_GENERATED' && session.qr_code) {
        qrContainer.style.display = 'block';
        const qrImage = clone.querySelector('.session-qr img');
        qrImage.src = session.qr_code;
    } else {
        qrContainer.style.display = 'none';
    }
    
    // أزرار الإجراءات
    clone.querySelector('.session-view-btn').addEventListener('click', () => viewSession(session.id));
    clone.querySelector('.session-refresh-btn').addEventListener('click', () => refreshSession(session.id));
    clone.querySelector('.session-close-btn').addEventListener('click', () => closeSession(session.id));
    
    return clone;
}

// نص حالة الجلسة
function getStatusText(status) {
    switch (status) {
        case 'INITIALIZING':
            return 'جاري التهيئة';
        case 'QR_GENERATED':
            return 'في انتظار مسح QR';
        case 'READY':
            return 'متصل';
        case 'DISCONNECTED':
            return 'غير متصل';
        case 'AUTH_FAILURE':
            return 'فشل المصادقة';
        case 'CLOSED':
            return 'مغلق';
        case 'ERROR':
            return 'خطأ';
        default:
            return 'غير معروف';
    }
}

// صنف CSS لحالة الجلسة
function getStatusClass(status) {
    switch (status) {
        case 'READY':
            return 'ready';
        case 'INITIALIZING':
        case 'QR_GENERATED':
            return 'initializing';
        case 'DISCONNECTED':
        case 'AUTH_FAILURE':
        case 'ERROR':
            return 'error';
        default:
            return '';
    }
}

// عرض نافذة إنشاء جلسة جديدة
function showCreateSessionModal() {
    // إنشاء العنصر إذا لم يكن موجوداً
    let modal = document.getElementById('createSessionModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'createSessionModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>إنشاء جلسة واتساب جديدة</h2>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="createSessionForm">
                        <div class="form-group">
                            <label for="sessionName">اسم الجلسة</label>
                            <input type="text" id="sessionName" placeholder="اسم الجلسة (اختياري)" />
                        </div>
                        <div class="form-group">
                            <button type="submit" class="btn btn-primary btn-block">
                                <i class="fas fa-plus"></i>
                                <span>إنشاء جلسة</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // إضافة الأحداث
        modal.querySelector('.close-btn').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        modal.querySelector('#createSessionForm').addEventListener('submit', createNewSession);
        
        // إغلاق النافذة عند النقر خارجها
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    // عرض النافذة
    modal.style.display = 'block';
}

// إنشاء جلسة واتساب جديدة
async function createNewSession(e) {
    e.preventDefault();
    
    const token = localStorage.getItem('token');
    const sessionName = document.getElementById('sessionName').value || 'جلسة واتساب';
    const modal = document.getElementById('createSessionModal');
    
    try {
        const response = await fetch('/api/whatsapp/sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: sessionName })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // إخفاء النافذة
            modal.style.display = 'none';
            
            // إظهار رسالة نجاح
            showNotification('تم إنشاء الجلسة بنجاح. يرجى الانتظار لتوليد رمز QR.', 'success');
            
            // تحديث قائمة الجلسات
            loadSessions();
            
            // الانتقال إلى قسم الجلسات
            document.querySelector('[data-section="sessions"]').click();
        } else {
            throw new Error(data.error || 'فشل في إنشاء الجلسة');
        }
    } catch (error) {
        console.error('خطأ في إنشاء الجلسة:', error);
        showNotification(error.message, 'error');
    }
}

// عرض الجلسة (الانتقال إلى صفحة الجلسة)
function viewSession(sessionId) {
    // يمكن تنفيذ الانتقال إلى صفحة تفاصيل الجلسة
    window.location.href = `/session/${sessionId}`;
}

// تحديث حالة الجلسة
async function refreshSession(sessionId) {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`/api/whatsapp/sessions/${sessionId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // تحديث بطاقة الجلسة
            const sessionCard = document.querySelector(`.session-card[data-id="${sessionId}"]`);
            
            if (sessionCard) {
                // تحديث حالة الجلسة
                const statusElement = sessionCard.querySelector('.session-status');
                statusElement.textContent = getStatusText(data.status);
                statusElement.className = `session-status ${getStatusClass(data.status)}`;
                
                // تحديث رمز QR إذا كان متاحاً
                const qrContainer = sessionCard.querySelector('.session-qr');
                if (data.status === 'QR_GENERATED' && data.qrCode) {
                    qrContainer.style.display = 'block';
                    const qrImage = qrContainer.querySelector('img');
                    qrImage.src = data.qrCode;
                } else {
                    qrContainer.style.display = 'none';
                }
                
                // تحديث وقت آخر نشاط
                const lastActivity = new Date(data.lastActivity);
                sessionCard.querySelector('.session-last-activity').textContent = 
                    lastActivity.toLocaleDateString('ar-SA') + ' ' + lastActivity.toLocaleTimeString('ar-SA');
            }
            
            showNotification('تم تحديث حالة الجلسة بنجاح', 'success');
        } else {
            throw new Error(data.error || 'فشل في تحديث حالة الجلسة');
        }
    } catch (error) {
        console.error('خطأ في تحديث الجلسة:', error);
        showNotification(error.message, 'error');
    }
}

// إغلاق الجلسة
async function closeSession(sessionId) {
    if (!confirm('هل أنت متأكد من رغبتك في إغلاق هذه الجلسة؟')) {
        return;
    }
    
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`/api/whatsapp/sessions/${sessionId}/close`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // تحديث قائمة الجلسات
            loadSessions();
            
            showNotification('تم إغلاق الجلسة بنجاح', 'success');
        } else {
            throw new Error(data.error || 'فشل في إغلاق الجلسة');
        }
    } catch (error) {
        console.error('خطأ في إغلاق الجلسة:', error);
        showNotification(error.message, 'error');
    }
}

// تحديث قوائم اختيار الجلسات
async function updateSessionSelects() {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch('/api/whatsapp/sessions', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const messageSessionSelect = document.getElementById('messageSessionSelect');
            const contactSessionSelect = document.getElementById('contactSessionSelect');
            
            // تحديث قائمة اختيار الجلسة في قسم الرسائل
            if (messageSessionSelect) {
                const currentValue = messageSessionSelect.value;
                messageSessionSelect.innerHTML = '<option value="">اختر جلسة</option>';
                
                data.sessions.forEach(session => {
                    const option = document.createElement('option');
                    option.value = session.id;
                    option.text = session.name || `جلسة ${session.id}`;
                    option.disabled = session.status !== 'READY';
                    messageSessionSelect.appendChild(option);
                });
                
                // إعادة تحديد القيمة السابقة إذا كانت موجودة
                if (currentValue && messageSessionSelect.querySelector(`option[value="${currentValue}"]`)) {
                    messageSessionSelect.value = currentValue;
                }
            }
            
            // تحديث قائمة اختيار الجلسة في قسم جهات الاتصال
            if (contactSessionSelect) {
                const currentValue = contactSessionSelect.value;
                contactSessionSelect.innerHTML = '<option value="">اختر جلسة</option>';
                
                data.sessions.forEach(session => {
                    const option = document.createElement('option');
                    option.value = session.id;
                    option.text = session.name || `جلسة ${session.id}`;
                    contactSessionSelect.appendChild(option);
                });
                
                // إعادة تحديد القيمة السابقة إذا كانت موجودة
                if (currentValue && contactSessionSelect.querySelector(`option[value="${currentValue}"]`)) {
                    contactSessionSelect.value = currentValue;
                }
            }
        }
    } catch (error) {
        console.error('خطأ في تحديث قوائم اختيار الجلسات:', error);
    }
}

// تحميل الرسائل
async function loadMessages() {
    const token = localStorage.getItem('token');
    const sessionId = document.getElementById('messageSessionSelect').value;
    const messagesList = document.getElementById('messagesList');
    
    if (!sessionId) {
        if (messagesList) {
            messagesList.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-comments"></i>
                    <p>الرجاء اختيار جلسة لعرض الرسائل</p>
                </div>
            `;
        }
        return;
    }
    
    try {
        const response = await fetch(`/api/whatsapp/sessions/${sessionId}/messages`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (messagesList) {
                if (data.messages.length === 0) {
                    messagesList.innerHTML = `
                        <div class="no-data">
                            <i class="fas fa-inbox"></i>
                            <p>لا توجد رسائل في هذه الجلسة</p>
                        </div>
                    `;
                } else {
                    messagesList.innerHTML = '';
                    
                    // عرض الرسائل
                    data.messages.forEach(message => {
                        const messageItem = createMessageItem(message);
                        messagesList.appendChild(messageItem);
                    });
                    
                    // تحديث عدد الرسائل اليوم في لوحة التحكم
                    const todayMessages = data.messages.filter(message => {
                        const messageDate = new Date(message.created_at);
                        const today = new Date();
                        return messageDate.toDateString() === today.toDateString();
                    });
                    
                    document.getElementById('todayMessagesCount').textContent = todayMessages.length;
                }
            }
        } else {
            throw new Error(data.error || 'فشل في تحميل الرسائل');
        }
    } catch (error) {
        console.error('خطأ في تحميل الرسائل:', error);
        
        if (messagesList) {
            messagesList.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>حدث خطأ في تحميل الرسائل</p>
                    <button id="retryLoadMessagesBtn" class="btn btn-primary">
                        <i class="fas fa-sync-alt"></i>
                        <span>إعادة المحاولة</span>
                    </button>
                </div>
            `;
            
            // إضافة حدث للزر
            document.getElementById('retryLoadMessagesBtn').addEventListener('click', loadMessages);
        }
    }
}

// إنشاء عنصر رسالة
function createMessageItem(message) {
    const template = document.getElementById('messageItemTemplate');
    const clone = document.importNode(template.content, true);
    
    // تحديث بيانات الرسالة
    clone.querySelector('.message-phone').textContent = formatPhoneNumber(message.phone);
    
    const messageTime = new Date(message.created_at);
    clone.querySelector('.message-time').textContent = messageTime.toLocaleString('ar-SA');
    
    clone.querySelector('.message-content').textContent = message.message;
    
    const messageStatus = clone.querySelector('.message-status');
    messageStatus.textContent = getMessageStatusText(message.status);
    messageStatus.className = `message-status ${message.status.toLowerCase()}`;
    
    // إضافة صنف لتمييز الرسائل الواردة والصادرة
    const messageItem = clone.querySelector('.message-item');
    messageItem.classList.add(message.direction.toLowerCase());
    
    return clone;
}

// تنسيق رقم الهاتف
function formatPhoneNumber(phone) {
    // إزالة @c.us من آخر الرقم
    return phone.replace('@c.us', '');
}

// نص حالة الرسالة
function getMessageStatusText(status) {
    switch (status) {
        case 'SENT':
            return 'تم الإرسال';
        case 'RECEIVED':
            return 'تم الاستلام';
        case 'FAILED':
            return 'فشل الإرسال';
        default:
            return status;
    }
}

// إرسال رسالة جديدة
async function handleSendMessage(e) {
    e.preventDefault();
    
    const token = localStorage.getItem('token');
    const sessionId = document.getElementById('messageSessionSelect').value;
    const phone = document.getElementById('messagePhone').value;
    const message = document.getElementById('messageText').value;
    
    if (!sessionId) {
        showNotification('الرجاء اختيار جلسة لإرسال الرسالة', 'error');
        return;
    }
    
    if (!phone || !message) {
        showNotification('الرجاء إدخال رقم الهاتف ونص الرسالة', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/whatsapp/sessions/${sessionId}/send`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phone, message })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // مسح النموذج
            document.getElementById('messageText').value = '';
            
            // تحديث قائمة الرسائل
            loadMessages();
            
            showNotification('تم إرسال الرسالة بنجاح', 'success');
        } else {
            throw new Error(data.error || 'فشل في إرسال الرسالة');
        }
    } catch (error) {
        console.error('خطأ في إرسال الرسالة:', error);
        showNotification(error.message, 'error');
    }
}

// تحميل جهات الاتصال
async function loadContacts() {
    const token = localStorage.getItem('token');
    const sessionId = document.getElementById('contactSessionSelect').value;
    const contactsList = document.getElementById('contactsList');
    
    if (!sessionId) {
        if (contactsList) {
            contactsList.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-address-book"></i>
                    <p>الرجاء اختيار جلسة لعرض جهات الاتصال</p>
                </div>
            `;
        }
        return;
    }
    
    try {
        const response = await fetch(`/api/whatsapp/sessions/${sessionId}/contacts`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (contactsList) {
                if (data.contacts.length === 0) {
                    contactsList.innerHTML = `
                        <div class="no-data">
                            <i class="fas fa-address-book"></i>
                            <p>لا توجد جهات اتصال في هذه الجلسة</p>
                        </div>
                    `;
                } else {
                    contactsList.innerHTML = '';
                    
                    // عرض جهات الاتصال
                    data.contacts.forEach(contact => {
                        const contactItem = createContactItem(contact, sessionId);
                        contactsList.appendChild(contactItem);
                    });
                    
                    // تحديث عدد جهات الاتصال في لوحة التحكم
                    document.getElementById('contactsCount').textContent = data.contacts.length;

                }
            }
        } else {
            throw new Error(data.error || 'فشل في تحميل جهات الاتصال');
        }
    } catch (error) {
        console.error('خطأ في تحميل جهات الاتصال:', error);
    }
}

// إنشاء عنصر جهة الاتصال
function createContactItem(contact, sessionId) {
    const template = document.getElementById('contactItemTemplate');
    const clone = document.importNode(template.content, true);

    // تحديث بيانات جهة الاتصال
    clone.querySelector('.contact-name').textContent = contact.name || 'بدون اسم';
    clone.querySelector('.contact-phone').textContent = formatPhoneNumber(contact.phone);

    // أحداث الأزرار
    clone.querySelector('.contact-message-btn').addEventListener('click', () => {
        // الانتقال إلى قسم الرسائل مع ملء رقم الهاتف
        document.querySelector('[data-section="messages"]').click();
        document.getElementById('messageSessionSelect').value = sessionId;
        document.getElementById('messagePhone').value = formatPhoneNumber(contact.phone);
        document.getElementById('messageText').focus();
    });

    clone.querySelector('.contact-info-btn').addEventListener('click', () => {
        // عرض معلومات جهة الاتصال (يمكن تنفيذ نافذة منبثقة)
        alert(`معلومات جهة الاتصال\nالاسم: ${contact.name || 'بدون اسم'}\nالهاتف: ${formatPhoneNumber(contact.phone)}`);
    });

    return clone;
}

// تصفية جهات الاتصال (البحث)
function filterContacts() {
    const searchTerm = document.getElementById('contactSearch').value.toLowerCase();
    const contactItems = document.querySelectorAll('.contact-item');

    contactItems.forEach(item => {
        const name = item.querySelector('.contact-name').textContent.toLowerCase();
        const phone = item.querySelector('.contact-phone').textContent.toLowerCase();

        if (name.includes(searchTerm) || phone.includes(searchTerm)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// تحميل مفتاح API
function loadApiKey() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.apiToken) {
        const apiKeyInput = document.getElementById('apiKeyInput');
        if (apiKeyInput) {
            apiKeyInput.value = user.apiToken;
        }
    }
}

// نسخ مفتاح API إلى الحافظة
function copyApiKeyToClipboard() {
    const apiKeyInput = document.getElementById('apiKeyInput');
    if (apiKeyInput) {
        apiKeyInput.select();
        document.execCommand('copy');
        showNotification('تم نسخ مفتاح API إلى الحافظة', 'success');
    }
}

// تحديث الإحصائيات
function updateDashboardStats() {
    // وقت التشغيل (من بداية الجلسة)
    const sessionStart = localStorage.getItem('sessionStartTime') || Date.now();
    localStorage.setItem('sessionStartTime', sessionStart);

    const uptimeHours = Math.floor((Date.now() - sessionStart) / (1000 * 60 * 60));
    document.getElementById('uptime').textContent = `${uptimeHours} ساعة`;

    // يمكن إضافة إحصائيات أخرى من خلال طلبات API
}

// تحميل النشاط الأخير
async function loadRecentActivity() {
    const token = localStorage.getItem('token');
    const activityList = document.getElementById('recentActivity');

    if (!activityList) return;

    try {
        // يمكن إضافة طلب API لجلب النشاط الأخير
        // هنا نستخدم بيانات وهمية للعرض

        const activities = [
            {
                type: 'message',
                text: 'تم استلام رسالة جديدة',
                timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() // قبل 5 دقائق
            },
            {
                type: 'session',
                text: 'تم إنشاء جلسة واتساب جديدة',
                timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() // قبل 30 دقيقة
            },
            {
                type: 'message',
                text: 'تم إرسال رسالة',
                timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString() // قبل 45 دقيقة
            }
        ];

        if (activities.length === 0) {
            activityList.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-inbox"></i>
                    <p>لا يوجد نشاط حديث</p>
                </div>
            `;
        } else {
            activityList.innerHTML = '';

            activities.forEach(activity => {
                const activityItem = document.createElement('div');
                activityItem.className = 'activity-item';

                const activityIcon = document.createElement('div');
                activityIcon.className = `activity-icon ${activity.type}`;

                const icon = document.createElement('i');
                if (activity.type === 'message') {
                    icon.className = 'fas fa-comment';
                } else if (activity.type === 'session') {
                    icon.className = 'fas fa-qrcode';
                } else {
                    icon.className = 'fas fa-bell';
                }

                activityIcon.appendChild(icon);

                const activityContent = document.createElement('div');
                activityContent.className = 'activity-content';

                const activityText = document.createElement('p');
                activityText.textContent = activity.text;

                const activityTime = document.createElement('div');
                activityTime.className = 'activity-time';

                const timestamp = new Date(activity.timestamp);
                activityTime.textContent = `${timestamp.toLocaleDateString('ar-SA')} ${timestamp.toLocaleTimeString('ar-SA')}`;

                activityContent.appendChild(activityText);
                activityContent.appendChild(activityTime);

                activityItem.appendChild(activityIcon);
                activityItem.appendChild(activityContent);

                activityList.appendChild(activityItem);
            });
        }
    } catch (error) {
        console.error('خطأ في تحميل النشاط الأخير:', error);
        activityList.innerHTML = `
            <div class="no-data">
                <i class="fas fa-exclamation-triangle"></i>
                <p>حدث خطأ في تحميل النشاط الأخير</p>
            </div>
        `;
    }
}

// تسجيل الخروج
function logout() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('sessionStartTime');
        window.location.href = '/login';
    }
}

// عرض إشعار
function showNotification(message, type = 'info') {
    // التحقق من وجود عنصر الإشعارات
    let notifications = document.getElementById('notifications');

    if (!notifications) {
        notifications = document.createElement('div');
        notifications.id = 'notifications';
        notifications.style.position = 'fixed';
        notifications.style.top = '20px';
        notifications.style.left = '20px';
        notifications.style.zIndex = '9999';
        document.body.appendChild(notifications);
    }

    // إنشاء الإشعار
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas ${getNotificationIcon(type)}"></i>
        </div>
        <div class="notification-content">
            <p>${message}</p>
        </div>
        <button class="notification-close">&times;</button>
    `;

    // إضافة نمط الإشعار
    notification.style.display = 'flex';
    notification.style.alignItems = 'center';
    notification.style.margin = '10px 0';
    notification.style.padding = '15px';
    notification.style.background = 'white';
    notification.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.1)';
    notification.style.borderRadius = '5px';
    notification.style.borderRight = `4px solid ${getNotificationColor(type)}`;

    // نمط أيقونة الإشعار
    notification.querySelector('.notification-icon').style.marginLeft = '10px';
    notification.querySelector('.notification-icon').style.color = getNotificationColor(type);

    // نمط زر الإغلاق
    const closeButton = notification.querySelector('.notification-close');
    closeButton.style.marginRight = 'auto';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '20px';
    closeButton.style.color = '#999';

    // إضافة الإشعار إلى القائمة
    notifications.appendChild(notification);

    // حدث إغلاق الإشعار
    closeButton.addEventListener('click', () => {
        notification.remove();
    });

    // إغلاق الإشعار تلقائياً بعد 5 ثوانٍ
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s ease';

        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 5000);
}

// الحصول على أيقونة الإشعار حسب النوع
function getNotificationIcon(type) {
    switch (type) {
        case 'success':
            return 'fa-check-circle';
        case 'error':
            return 'fa-exclamation-circle';
        case 'warning':
            return 'fa-exclamation-triangle';
        default:
            return 'fa-info-circle';
    }
}

// الحصول على لون الإشعار حسب النوع
function getNotificationColor(type) {
    switch (type) {
        case 'success':
            return '#2ecc71';
        case 'error':
            return '#e74c3c';
        case 'warning':
            return '#f39c12';
        default:
            return '#3498db';
    }
}

// إضافة CSS للنمط المخصص للإشعارات
function addNotificationStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
        }

        .modal-content {
            background-color: white;
            margin: 10% auto;
            padding: 20px;
            border-radius: 8px;
            width: 90%;
            max-width: 500px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }

        .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #eee;
        }

        .modal-header h2 {
            margin: 0;
            font-size: 20px;
            color: var(--primary-color);
        }

        .close-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #999;
        }
    `;

    document.head.appendChild(styleElement);
}

// إضافة نمط الإشعارات عند تحميل الصفحة
addNotificationStyles();
