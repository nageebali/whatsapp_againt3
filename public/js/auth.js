document.addEventListener('DOMContentLoaded', function() {
    // التحقق من وجود المستخدم في المخزن المحلي
    checkAuthState();
    
    // التعامل مع نموذج تسجيل الدخول
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // التعامل مع نموذج إنشاء حساب
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // أزرار إظهار/إخفاء كلمة المرور
    const passwordToggles = document.querySelectorAll('.password-toggle');
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', togglePasswordVisibility);
    });
});

// التحقق من حالة المصادقة
function checkAuthState() {
    const token = localStorage.getItem('token');
    const currentPath = window.location.pathname;
    
    if (token) {
        // إذا كان المستخدم مسجل الدخول وهو على صفحة تسجيل الدخول/إنشاء حساب
        if (currentPath === '/login' || currentPath === '/register' || currentPath === '/') {
            // التحقق من صلاحية التوكن
            fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = '/dashboard';
                } else {
                    // التوكن غير صالح، مسح بيانات المصادقة
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            })
            .catch(error => {
                console.error('خطأ في التحقق من المصادقة:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            });
        }
    } else {
        // إذا كان المستخدم غير مسجل وهو على صفحة محمية
        if (currentPath.startsWith('/dashboard')) {
            window.location.href = '/login';
        }
    }
}

// معالجة تسجيل الدخول
async function handleLogin(e) {
    e.preventDefault();
    
    const phone = document.getElementById('phone').value;
    const password = document.getElementById('password').value;
    const alertMessage = document.getElementById('alertMessage');
    const btnText = document.querySelector('#loginForm .btn-text');
    const btnLoader = document.querySelector('#loginForm .btn-loader');
    
    // عرض حالة التحميل
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';
    
    try {
        const response = await fetch('/api/login/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phone, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // تخزين بيانات المستخدم والتوكن
            localStorage.setItem('token', data.instantToken);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // توجيه المستخدم إلى لوحة التحكم
            window.location.href = '/dashboard';
        } else {
            // عرض رسالة الخطأ
            alertMessage.textContent = data.error || 'فشل تسجيل الدخول، يرجى التحقق من بياناتك.';
            alertMessage.className = 'alert alert-error';
            alertMessage.style.display = 'block';
            
            // إخفاء حالة التحميل
            btnText.style.display = 'inline-block';
            btnLoader.style.display = 'none';
        }
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        
        // عرض رسالة الخطأ
        alertMessage.textContent = 'حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى.';
        alertMessage.className = 'alert alert-error';
        alertMessage.style.display = 'block';
        
        // إخفاء حالة التحميل
        btnText.style.display = 'inline-block';
        btnLoader.style.display = 'none';
    }
}

// معالجة إنشاء حساب
async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const terms = document.getElementById('terms').checked;
    const alertMessage = document.getElementById('alertMessage');
    const btnText = document.querySelector('#registerForm .btn-text');
    const btnLoader = document.querySelector('#registerForm .btn-loader');
    
    // التحقق من تطابق كلمات المرور
    if (password !== confirmPassword) {
        alertMessage.textContent = 'كلمات المرور غير متطابقة.';
        alertMessage.className = 'alert alert-error';
        alertMessage.style.display = 'block';
        return;
    }
    
    // التحقق من الموافقة على الشروط
    if (!terms) {
        alertMessage.textContent = 'يجب الموافقة على الشروط والأحكام.';
        alertMessage.className = 'alert alert-error';
        alertMessage.style.display = 'block';
        return;
    }
    
    // عرض حالة التحميل
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // تخزين بيانات المستخدم والتوكن
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // توجيه المستخدم إلى لوحة التحكم
            window.location.href = '/dashboard';
        } else {
            // عرض رسالة الخطأ
            alertMessage.textContent = data.error || 'فشل إنشاء الحساب. يرجى التحقق من البيانات المدخلة.';
            alertMessage.className = 'alert alert-error';
            alertMessage.style.display = 'block';
            
            // إخفاء حالة التحميل
            btnText.style.display = 'inline-block';
            btnLoader.style.display = 'none';
        }
    } catch (error) {
        console.error('خطأ في إنشاء الحساب:', error);
        
        // عرض رسالة الخطأ
        alertMessage.textContent = 'حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى.';
        alertMessage.className = 'alert alert-error';
        alertMessage.style.display = 'block';
        
        // إخفاء حالة التحميل
        btnText.style.display = 'inline-block';
        btnLoader.style.display = 'none';
    }
}

// تبديل عرض/إخفاء كلمة المرور
function togglePasswordVisibility(e) {
    const button = e.currentTarget;
    const input = button.parentElement.querySelector('input');
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'far fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'far fa-eye';
    }
}