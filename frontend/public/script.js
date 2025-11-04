// Configuración global
const API_BASE_URL = '/api';

// Elementos del DOM
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const closeBtn = document.getElementById('closeBtn');
const menuItems = document.querySelectorAll('.menu-item');
const pages = document.querySelectorAll('.page');

// Elementos del formulario de autenticación
const authForm = document.getElementById('authForm');
const sendCodeBtn = document.getElementById('sendCodeBtn');
const verifyCodeBtn = document.getElementById('verifyCodeBtn');
const resendCodeBtn = document.getElementById('resendCodeBtn');
const codeGroup = document.getElementById('codeGroup');
const countdownSpan = document.getElementById('countdown');
const formStatus = document.getElementById('formStatus');
const passwordToggle = document.getElementById('passwordToggle');
const passwordToggleIcon = document.getElementById('passwordToggleIcon');
const passwordInput = document.getElementById('password');

// Variables globales
let countdownTimer = null;
let countdownSeconds = 60;

// Detectar si estamos en modo desarrollo
function isDevelopmentMode() {
    const hostname = window.location.hostname;
    // Detectar localhost, 127.0.0.1, o dominios locales
    return hostname === 'localhost' || 
           hostname === '127.0.0.1' || 
           hostname === '0.0.0.0' ||
           hostname.startsWith('192.168.') ||
           hostname.startsWith('10.0.') ||
           hostname.includes('.local');
}

// Valores predeterminados para desarrollo/testing
const DEFAULT_FORM_VALUES = {
    name: 'Juan Pérez García',
    institution: 'Universidad Nacional',
    contactPhone: '+52 123 456 7890',
    whatsappPhone: '+52 123 456 7890',
    password: 'Test123!',
    verificationCode: '12345'
};

// Prellenar formulario solo en modo desarrollo
function fillDefaultValuesIfDevelopment() {
    if (!isDevelopmentMode()) {
        return; // No hacer nada en producción
    }

    // Solo prellenar si los campos están vacíos
    const nameInput = document.getElementById('name');
    const institutionInput = document.getElementById('institution');
    const contactPhoneInput = document.getElementById('contactPhone');
    const whatsappPhoneInput = document.getElementById('whatsappPhone');
    const passwordInput = document.getElementById('password');
    const verificationCodeInput = document.getElementById('verificationCode');

    if (nameInput && !nameInput.value) {
        nameInput.value = DEFAULT_FORM_VALUES.name;
    }
    if (institutionInput && !institutionInput.value) {
        institutionInput.value = DEFAULT_FORM_VALUES.institution;
    }
    if (contactPhoneInput && !contactPhoneInput.value) {
        contactPhoneInput.value = DEFAULT_FORM_VALUES.contactPhone;
    }
    if (whatsappPhoneInput && !whatsappPhoneInput.value) {
        whatsappPhoneInput.value = DEFAULT_FORM_VALUES.whatsappPhone;
    }
    if (passwordInput && !passwordInput.value) {
        passwordInput.value = DEFAULT_FORM_VALUES.password;
    }
    if (verificationCodeInput && !verificationCodeInput.value) {
        verificationCodeInput.value = DEFAULT_FORM_VALUES.verificationCode;
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    showPage('home');
    // Prellenar valores solo en desarrollo
    fillDefaultValuesIfDevelopment();
}

function setupEventListeners() {
    // Menú lateral
    menuToggle.addEventListener('click', toggleSidebar);
    closeBtn.addEventListener('click', closeSidebar);
    
    // Navegación del menú
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            showPage(page);
            closeSidebar();
        });
    });
    
    // Botones CTA que navegan a auth
    document.querySelectorAll('[data-page="auth"]').forEach(btn => {
        btn.addEventListener('click', function() {
            showPage('auth');
        });
    });
    
    // Formulario de autenticación
    sendCodeBtn.addEventListener('click', sendVerificationCode);
    verifyCodeBtn.addEventListener('click', verifyCode);
    resendCodeBtn.addEventListener('click', resendCode);
    
    // Toggle mostrar/ocultar contraseña
    if (passwordToggle) {
        passwordToggle.addEventListener('click', togglePasswordVisibility);
    }
    
    // Validación en tiempo real
    setupFormValidation();
}

// Navegación SPA
function showPage(pageId) {
    // Ocultar todas las páginas
    pages.forEach(page => {
        page.classList.remove('active');
    });
    
    // Mostrar página seleccionada
    const targetPage = document.getElementById(`${pageId}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Actualizar menú activo
    menuItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === pageId) {
            item.classList.add('active');
        }
    });

    // Si se muestra la página de auth, prellenar valores en desarrollo
    if (pageId === 'auth') {
        // Pequeño delay para asegurar que los elementos estén visibles
        setTimeout(() => {
            fillDefaultValuesIfDevelopment();
        }, 100);
    }
}

// Menú lateral
function toggleSidebar() {
    sidebar.classList.toggle('active');
}

function closeSidebar() {
    sidebar.classList.remove('active');
}

// Toggle mostrar/ocultar contraseña
function togglePasswordVisibility() {
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        passwordToggleIcon.classList.remove('fa-eye');
        passwordToggleIcon.classList.add('fa-eye-slash');
        passwordToggle.setAttribute('aria-label', 'Ocultar contraseña');
    } else {
        passwordInput.type = 'password';
        passwordToggleIcon.classList.remove('fa-eye-slash');
        passwordToggleIcon.classList.add('fa-eye');
        passwordToggle.setAttribute('aria-label', 'Mostrar contraseña');
    }
}

// Validación de formulario
function setupFormValidation() {
    const passwordInput = document.getElementById('password');
    const whatsappPhoneInput = document.getElementById('whatsappPhone');
    
    passwordInput.addEventListener('input', validatePassword);
    whatsappPhoneInput.addEventListener('input', validatePhone);
}

function validatePassword() {
    const password = document.getElementById('password').value;
    const errorElement = document.getElementById('passwordError');
    
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLongEnough = password.length >= 8;
    
    if (password && (!hasLetter || !hasNumber || !hasSpecial || !isLongEnough)) {
        errorElement.textContent = 'Error en la contraseña';
        errorElement.classList.add('show');
        return false;
    } else {
        errorElement.classList.remove('show');
        return true;
    }
}

function validatePhone() {
    const phone = document.getElementById('whatsappPhone').value;
    const errorElement = document.getElementById('whatsappPhoneError');
    
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    
    if (phone && !phoneRegex.test(phone)) {
        errorElement.textContent = 'Ingresa un número de teléfono válido';
        errorElement.classList.add('show');
        return false;
    } else {
        errorElement.classList.remove('show');
        return true;
    }
}

function validateForm() {
    const name = document.getElementById('name').value.trim();
    const institution = document.getElementById('institution').value.trim();
    const contactPhone = document.getElementById('contactPhone').value.trim();
    const whatsappPhone = document.getElementById('whatsappPhone').value.trim();
    const password = document.getElementById('password').value;
    
    let isValid = true;
    
    // Validar campos requeridos
    if (!name) {
        showFieldError('nameError', 'El nombre es requerido');
        isValid = false;
    }
    
    if (!institution) {
        showFieldError('institutionError', 'La institución es requerida');
        isValid = false;
    }
    
    if (!contactPhone) {
        showFieldError('contactPhoneError', 'El teléfono de contacto es requerido');
        isValid = false;
    }
    
    if (!whatsappPhone) {
        showFieldError('whatsappPhoneError', 'El teléfono WhatsApp es requerido');
        isValid = false;
    } else if (!validatePhone()) {
        isValid = false;
    }
    
    if (!password) {
        showFieldError('passwordError', 'La contraseña es requerida');
        isValid = false;
    } else if (!validatePassword()) {
        isValid = false;
    }
    
    return isValid;
}

function showFieldError(errorId, message) {
    const errorElement = document.getElementById(errorId);
    errorElement.textContent = message;
    errorElement.classList.add('show');
}

function clearFieldErrors() {
    document.querySelectorAll('.error-message').forEach(error => {
        error.classList.remove('show');
    });
}

// Envío de código de verificación
async function sendVerificationCode() {
    clearFieldErrors();
    clearFormStatus();
    
    if (!validateForm()) {
        return;
    }
    
    const formData = {
        name: document.getElementById('name').value.trim(),
        institution: document.getElementById('institution').value.trim(),
        contactPhone: document.getElementById('contactPhone').value.trim(),
        phone: document.getElementById('whatsappPhone').value.trim(),
        password: document.getElementById('password').value
    };
    
    try {
        sendCodeBtn.disabled = true;
        sendCodeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        
        const response = await fetch(`${API_BASE_URL}/send-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showFormStatus('success', 'Código enviado exitosamente a tu WhatsApp');
            showCodeVerification();
            startCountdown();
        } else {
            showFormStatus('error', result.error || 'Error al enviar el código');
        }
    } catch (error) {
        console.error('Error:', error);
        showFormStatus('error', 'Error de conexión. Intenta nuevamente.');
    } finally {
        sendCodeBtn.disabled = false;
        sendCodeBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Código';
    }
}

// Verificación de código
async function verifyCode() {
    const code = document.getElementById('verificationCode').value.trim();
    const phone = document.getElementById('whatsappPhone').value.trim();
    const password = document.getElementById('password').value;
    
    if (!code || code.length !== 5) {
        showFieldError('codeError', 'Ingresa un código de 5 dígitos');
        return;
    }
    
    try {
        verifyCodeBtn.disabled = true;
        verifyCodeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
        
        const response = await fetch(`${API_BASE_URL}/verify-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phone: phone,
                code: code,
                password: password
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showFormStatus('success', '¡Registro exitoso! Bienvenido a la plataforma.');
            setTimeout(() => {
                showPage('home');
                resetAuthForm();
            }, 2000);
        } else {
            showFormStatus('error', result.error || 'Código incorrecto');
        }
    } catch (error) {
        console.error('Error:', error);
        showFormStatus('error', 'Error de conexión. Intenta nuevamente.');
    } finally {
        verifyCodeBtn.disabled = false;
        verifyCodeBtn.innerHTML = '<i class="fas fa-check"></i> Verificar Código';
    }
}

// Reenvío de código
async function resendCode() {
    if (resendCodeBtn.disabled) return;
    
    await sendVerificationCode();
}

// Funciones de UI
function showCodeVerification() {
    codeGroup.style.display = 'block';
    verifyCodeBtn.style.display = 'inline-block';
    resendCodeBtn.style.display = 'inline-block';
    
    // Prellenar código de verificación en desarrollo
    if (isDevelopmentMode()) {
        const verificationCodeInput = document.getElementById('verificationCode');
        if (verificationCodeInput && !verificationCodeInput.value) {
            verificationCodeInput.value = DEFAULT_FORM_VALUES.verificationCode;
        }
    }
}

function startCountdown() {
    countdownSeconds = 60;
    resendCodeBtn.disabled = true;
    
    countdownTimer = setInterval(() => {
        countdownSeconds--;
        countdownSpan.textContent = countdownSeconds;
        
        if (countdownSeconds <= 0) {
            clearInterval(countdownTimer);
            resendCodeBtn.disabled = false;
            countdownSpan.textContent = '60';
        }
    }, 1000);
}

function showFormStatus(type, message) {
    formStatus.className = `form-status ${type}`;
    formStatus.textContent = message;
}

function clearFormStatus() {
    formStatus.className = 'form-status';
    formStatus.textContent = '';
}

function resetAuthForm() {
    authForm.reset();
    codeGroup.style.display = 'none';
    verifyCodeBtn.style.display = 'none';
    resendCodeBtn.style.display = 'none';
    clearFieldErrors();
    clearFormStatus();
    
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownSeconds = 60;
        countdownSpan.textContent = '60';
    }
}

// Cerrar sidebar al hacer clic fuera
document.addEventListener('click', function(e) {
    if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
        closeSidebar();
    }
});

// Manejo de teclas
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeSidebar();
    }
});
