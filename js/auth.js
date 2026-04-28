const API_BASE = 'http://localhost:8080/api/auth';

// Muestra un mensaje de alerta en el formulario
function showAlert(elementId, msg, type) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = msg;
    el.className = 'alert-msg ' + type + ' show';
}

// Muestra u oculta la contraseña al hacer clic en el botón
function togglePass(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
    btn.textContent = input.type === 'password' ? 'Ver' : 'Ocultar';
}

// Maneja el inicio de sesión
async function handleLogin(e) {
    e.preventDefault();
    const identifier = document.getElementById('identifier').value.trim();
    const password   = document.getElementById('password').value;

    if (!identifier || !password) {
        showAlert('alertMsg', 'Complete todos los campos.', 'error');
        return;
    }

    try {
        const res  = await fetch(`${API_BASE}/login`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ identifier, password })
        });
        const data = await res.json();

        if (res.ok) {
            // Guardar token y nombre para usarlos en el dashboard
            if (data.token)  localStorage.setItem('token', data.token);
            if (data.nombre) localStorage.setItem('nombreUsuario', data.nombre);

            showAlert('alertMsg', 'Acceso concedido. Redirigiendo...', 'success');
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 1200);
        } else {
            showAlert('alertMsg', data.message || 'Credenciales incorrectas.', 'error');
        }
    } catch {
        showAlert('alertMsg', 'No se pudo conectar al servidor.', 'error');
    }
}

// Revisa qué tan segura es la contraseña mientras el usuario escribe
function checkStrength(val) {
    const bar   = document.getElementById('strengthBar');
    const label = document.getElementById('strengthLabel');
    if (!bar || !label) return;

    bar.className = 'strength-bar';
    if (!val) { label.textContent = ''; return; }

    const isStrong = /(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])/.test(val) && val.length >= 8;
    const isMedium = val.length >= 6;

    if (isStrong) {
        bar.classList.add('strong');
        label.textContent = 'Contraseña segura';
        label.style.color = '#27ae60';
    } else if (isMedium) {
        bar.classList.add('medium');
        label.textContent = 'Fortaleza media';
        label.style.color = '#e67e22';
    } else {
        bar.classList.add('weak');
        label.textContent = 'Contraseña débil';
        label.style.color = '#c0392b';
    }
}

// Maneja el registro de un nuevo usuario
async function handleRegister(e) {
    e.preventDefault();
    const nombre      = document.getElementById('nombre').value.trim();
    const correo      = document.getElementById('correo').value.trim();
    const password    = document.getElementById('password').value;
    const confirmPass = document.getElementById('confirmPass').value;

    if (!nombre || !correo || !password) {
        showAlert('alertMsg', 'Complete todos los campos.', 'error');
        return;
    }
    if (password !== confirmPass) {
        showAlert('alertMsg', 'Las contraseñas no coinciden.', 'error');
        return;
    }
    if (password.length < 8) {
        showAlert('alertMsg', 'La contraseña debe tener al menos 8 caracteres.', 'error');
        return;
    }

    try {
        const res  = await fetch(`${API_BASE}/register`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ nombre, correo, password })
        });
        const data = await res.json();

        if (res.ok || res.status === 201) {
            showAlert('alertMsg', 'Cuenta creada exitosamente. Redirigiendo...', 'success');
            setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        } else {
            showAlert('alertMsg', data.message || 'No se pudo completar el registro.', 'error');
        }
    } catch {
        showAlert('alertMsg', 'No se pudo conectar al servidor.', 'error');
    }
}

// Maneja la recuperación de contraseña por correo
async function handleRecover(e) {
    e.preventDefault();
    const correo = document.getElementById('correo').value.trim();

    if (!correo) {
        showAlert('alertMsg', 'Ingrese su correo electrónico.', 'error');
        return;
    }

    try {
        const res  = await fetch(`${API_BASE}/recover`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ correo })
        });
        const data = await res.json();

        if (res.ok) {
            const sentTo = document.getElementById('sentTo');
            if (sentTo) sentTo.textContent = correo;
            document.getElementById('formState').style.display  = 'none';
            document.getElementById('successState').className   = 'success-state show';
        } else {
            showAlert('alertMsg', data.message || 'No se encontró una cuenta con ese correo.', 'error');
        }
    } catch {
        showAlert('alertMsg', 'No se pudo conectar al servidor.', 'error');
    }
}