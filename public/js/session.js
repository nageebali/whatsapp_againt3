// تكملة ملف session.js

// تحديث حالة الجلسة
async function updateSessionStatus(sessionId) {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`/api/whatsapp/sessions/${sessionId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // تحديث حالة الجلسة
            const sessionStatus = document.getElementById('sessionStatus');
            if (sessionStatus) {
                sessionStatus.textContent = getStatusText(data.status);
                sessionStatus.className = `session-status ${getStatusClass(data.status)}`;
            }
            
            // تحديث رمز QR إذا كان متاحاً
            const qrContainer = document.getElementById('sessionQR');
            if (qrContainer) {
                if (data.status === 'QR_GENERATED' && data.qrCode) {
                    qrContainer.style.display = 'block';
                    const qrImage = qrContainer.querySelector('img');
                    if (qrImage) {
                        qrImage.src = data.qrCode;
                    }
                } else {
                    qrContainer.style.display = 'none';
                }
            }
            
            // تحديث وقت آخر نشاط
            const sessionLastActivity = document.getElementById('sessionLastActivity');
            if (sessionLastActivity && data.lastActivity) {
                const lastActivity = new Date(data.lastActivity);
                sessionLastActivity.textContent = lastActivity.toLocaleDateString('ar-SA') + ' ' + lastActivity.toLocaleTimeString('ar-SA');
            }
            
            // إذا كان هناك تغيير في الحالة (تم التوصيل مثلاً)، تحديث البيانات بالكامل
            if (data.status === 'READY' && document.getElementById('sessionStatus').getAttribute('data-last-status') !== 'READY') {
                loadSessionData(sessionId);
            }
            
            // تخزين الحالة الأخيرة
            document.getElementById('sessionStatus').setAttribute('data-last-status', data.status);
        }
    } catch (error) {
        console.error('خطأ في تحديث حالة الجلسة:', error);
    }
}

// تنسيق رقم الهاتف
function formatPhoneNumber(phone) {
    // إزالة @c.us من آخر الرقم
    return phone.replace('@c.us', '');
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
    notification.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
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

document.addEventListener('DOMContentLoaded', function() {
    // التحقق من حالة المصادقة
    checkAuth();

    // الحصول على معرف الجلسة من عنوان URL
    const sessionId = getSessionIdFromUrl();

    if (!sessionId) {
        // إذا لم يتم توفير معرف الجلسة، إعادة التوجيه إلى لوحة التحكم
        window.location.href = '/dashboard';
        return;
    }

    // تحميل بيانات الجلسة
    loadSessionData(sessionId);

    // إضافة أحداث للأزرار
    initializeEvents(sessionId);

    // بدء تحديث حالة الجلسة كل 5 ثوانٍ
    startSessionStatusUpdates(sessionId);
});

// التحقق من المصادقة
function checkAuth() {
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = '/login';
        return;
    }

    // التحقق من صلاحية التوكن
    fetch('/api/auth/verify', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) {
            // التوكن غير صالح، توجيه المستخدم إلى صفحة تسجيل الدخول
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
    })
    .catch(error => {
        console.error('خطأ في التحقق من المصادقة:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    });
}

// الحصول على معرف الجلسة من عنوان URL
function getSessionIdFromUrl() {
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.length - 1];
}

// تهيئة أحداث الصفحة
function initializeEvents(sessionId) {
    // زر العودة إلى لوحة التحكم
    const backBtn = document.getElementById('backToDashboardBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = '/dashboard';
        });
    }

    // زر تحديث الجلسة
    const refreshBtn = document.getElementById('refreshSessionBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadSessionData(sessionId);
        });
    }

    // زر إغلاق الجلسة
    const closeBtn = document.getElementById('closeSessionBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            closeSession(sessionId);
        });
    }

    // زر حذف الجلسة
    const deleteBtn = document.getElementById('deleteSessionBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            deleteSession(sessionId);
        });
    }

    // نموذج إرسال رسالة
    const sendMessageForm = document.getElementById('sendMessageForm');
    if (sendMessageForm) {
        sendMessageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            sendMessage(sessionId);
        });
    }
}

// تحميل بيانات الجلسة
async function loadSessionData(sessionId) {
    const token = localStorage.getItem('token');

    try {
        // تحميل معلومات الجلسة
        const sessionResponse = await fetch(`/api/whatsapp/sessions/${sessionId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const sessionData = await sessionResponse.json();

        if (sessionData.success) {
            updateSessionInfo(sessionData);
        } else {
            throw new Error(sessionData.error || 'فشل في تحميل معلومات الجلسة');
        }

        // تحميل رسائل الجلسة
        const messagesResponse = await fetch(`/api/whatsapp/sessions/${sessionId}/messages`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const messagesData = await messagesResponse.json();

        if (messagesData.success) {
            updateMessages(messagesData.messages);
        } else {
            throw new Error(messagesData.error || 'فشل في تحميل رسائل الجلسة');
        }

        // تحميل جهات اتصال الجلسة
        const contactsResponse = await fetch(`/api/whatsapp/sessions/${sessionId}/contacts`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const contactsData = await contactsResponse.json();

        if (contactsData.success) {
            updateContacts(contactsData.contacts);
        } else {
            throw new Error(contactsData.error || 'فشل في تحميل جهات اتصال الجلسة');
        }
    } catch (error) {
        console.error('خطأ في تحميل بيانات الجلسة:', error);
        showNotification(error.message, 'error');
    }
}

// تحديث معلومات الجلسة في الواجهة
function updateSessionInfo(sessionData) {
    // تحديث عنوان الصفحة
    document.title = `جلسة واتساب - ${sessionData.name || sessionData.id}`;

    // تحديث اسم الجلسة
    const sessionName = document.getElementById('sessionName');
    if (sessionName) {
        sessionName.textContent = sessionData.name || 'جلسة واتساب';
    }

    // تحديث حالة الجلسة
    const sessionStatus = document.getElementById('sessionStatus');
    if (sessionStatus) {
        sessionStatus.textContent = getStatusText(sessionData.status);
        sessionStatus.className = `session-status ${getStatusClass(sessionData.status)}`;
    }

    // تحديث رمز QR إذا كان متاحاً
    const qrContainer = document.getElementById('sessionQR');
    if (qrContainer) {
        if (sessionData.status === 'QR_GENERATED' && sessionData.qrCode) {
            qrContainer.style.display = 'block';
            const qrImage = qrContainer.querySelector('img');
            if (qrImage) {
                qrImage.src = sessionData.qrCode;
            }
        } else {
            qrContainer.style.display = 'none';
        }
    }

    // تحديث معلومات الجلسة الأخرى
    const sessionCreated = document.getElementById('sessionCreated');
    if (sessionCreated && sessionData.created_at) {
        const createdDate = new Date(sessionData.created_at);
        sessionCreated.textContent = createdDate.toLocaleDateString('ar-SA');
    }

    const sessionLastActivity = document.getElementById('sessionLastActivity');
    if (sessionLastActivity && sessionData.lastActivity) {
        const lastActivity = new Date(sessionData.lastActivity);
        sessionLastActivity.textContent = lastActivity.toLocaleDateString('ar-SA') + ' ' + lastActivity.toLocaleTimeString('ar-SA');
    }
}

// تحديث قائمة الرسائل في الواجهة
function updateMessages(messages) {
    const messagesList = document.getElementById('sessionMessages');
    if (!messagesList) return;

    if (messages.length === 0) {
        messagesList.innerHTML = `
            <div class="no-data">
                <i class="fas fa-inbox"></i>
                <p>لا توجد رسائل في هذه الجلسة</p>
            </div>
        `;
        return;
    }

    messagesList.innerHTML = '';

    // عرض الرسائل مرتبة حسب التاريخ (الأحدث أولاً)
    messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    messages.forEach(message => {
        const messageItem = document.createElement('div');
        messageItem.className = `message-item ${message.direction.toLowerCase()}`;

        const messageInfo = document.createElement('div');
        messageInfo.className = 'message-info';

        const messagePhone = document.createElement('div');
        messagePhone.className = 'message-phone';
        messagePhone.textContent = formatPhoneNumber(message.phone);

        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        const timestamp = new Date(message.created_at);
        messageTime.textContent = timestamp.toLocaleString('ar-SA');

        messageInfo.appendChild(messagePhone);
        messageInfo.appendChild(messageTime);

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = message.message;

        const messageStatus = document.createElement('div');
        messageStatus.className = `message-status ${message.status.toLowerCase()}`;
        messageStatus.textContent = getMessageStatusText(message.status);

        messageItem.appendChild(messageInfo);
        messageItem.appendChild(messageContent);
        messageItem.appendChild(messageStatus);

        messagesList.appendChild(messageItem);
    });

    // تحديث عداد الرسائل
    const messagesCount = document.getElementById('messagesCount');
    if (messagesCount) {
        messagesCount.textContent = messages.length;
    }
}

// تحديث قائمة جهات الاتصال في الواجهة
function updateContacts(contacts) {
    const contactsList = document.getElementById('sessionContacts');
    if (!contactsList) return;

    if (contacts.length === 0) {
        contactsList.innerHTML = `
            <div class="no-data">
                <i class="fas fa-address-book"></i>
                <p>لا توجد جهات اتصال في هذه الجلسة</p>
            </div>
        `;
        return;
    }

    contactsList.innerHTML = '';

    // عرض جهات الاتصال مرتبة حسب الاسم
    contacts.sort((a, b) => {
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB);
    });

    contacts.forEach(contact => {
        const contactItem = document.createElement('div');
        contactItem.className = 'contact-item';

        const contactAvatar = document.createElement('div');
        contactAvatar.className = 'contact-avatar';

        const avatarIcon = document.createElement('i');
        avatarIcon.className = 'fas fa-user';
        contactAvatar.appendChild(avatarIcon);

        const contactInfo = document.createElement('div');
        contactInfo.className = 'contact-info';

        const contactName = document.createElement('div');
        contactName.className = 'contact-name';
        contactName.textContent = contact.name || 'بدون اسم';

        const contactPhone = document.createElement('div');
        contactPhone.className = 'contact-phone';
        contactPhone.textContent = formatPhoneNumber(contact.phone);

        contactInfo.appendChild(contactName);
        contactInfo.appendChild(contactPhone);

        const contactActions = document.createElement('div');
        contactActions.className = 'contact-actions';

        const messageBtn = document.createElement('button');
        messageBtn.className = 'btn btn-icon contact-message-btn';
        messageBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
        messageBtn.addEventListener('click', () => {
            // تعبئة نموذج الرسالة برقم جهة الاتصال
            document.getElementById('messagePhone').value = formatPhoneNumber(contact.phone);
            document.getElementById('messageText').focus();

            // التمرير إلى نموذج الرسالة
            document.getElementById('sendMessageForm').scrollIntoView({ behavior: 'smooth' });
        });

        contactActions.appendChild(messageBtn);

        contactItem.appendChild(contactAvatar);
        contactItem.appendChild(contactInfo);
        contactItem.appendChild(contactActions);

        contactsList.appendChild(contactItem);
    });

    // تحديث عداد جهات الاتصال
    const contactsCount = document.getElementById('contactsCount');
    if (contactsCount) {
        contactsCount.textContent = contacts.length;
    }
}

// إرسال رسالة
async function sendMessage(sessionId) {
    const token = localStorage.getItem('token');
    const phone = document.getElementById('messagePhone').value;
    const message = document.getElementById('messageText').value;

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
            loadSessionData(sessionId);

            showNotification('تم إرسال الرسالة بنجاح', 'success');
        } else {
            throw new Error(data.error || 'فشل في إرسال الرسالة');
        }
    } catch (error) {
        console.error('خطأ في إرسال الرسالة:', error);
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
            showNotification('تم إغلاق الجلسة بنجاح', 'success');

            // تحديث بيانات الجلسة
            loadSessionData(sessionId);
        } else {
            throw new Error(data.error || 'فشل في إغلاق الجلسة');
        }
    } catch (error) {
        console.error('خطأ في إغلاق الجلسة:', error);
        showNotification(error.message, 'error');
    }
}

// حذف الجلسة
async function deleteSession(sessionId) {
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذه الجلسة نهائياً؟ لا يمكن التراجع عن هذا الإجراء.')) {
        return;
    }

    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`/api/whatsapp/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            showNotification('تم حذف الجلسة بنجاح', 'success');

            // الانتقال إلى لوحة التحكم
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);
        } else {
            throw new Error(data.error || 'فشل في حذف الجلسة');
        }
    } catch (error) {
        console.error('خطأ في حذف الجلسة:', error);
        showNotification(error.message, 'error');
    }
}

// بدء تحديث حالة الجلسة بشكل دوري
function startSessionStatusUpdates(sessionId) {
    // التحديث الأولي
    setTimeout(() => {
        // تحديث حالة الجلسة كل 5 ثوانٍ
        setInterval(() => {
            updateSessionStatus(sessionId);
        }, 5000);
    }, 1000);
}
