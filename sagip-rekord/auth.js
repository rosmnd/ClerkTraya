(() => {
  const form = document.querySelector('[data-auth-form]');
  if (!form) return;

  const message = document.getElementById('formMessage');
  const submitButton = form.querySelector('[type="submit"]');
  const identityField = document.getElementById('identity');
  const rememberCheckbox = document.getElementById('rememberMe');
  const rememberedIdentityKey = 'sagiprekord-demo-identity';
  const apiBase = document.querySelector('meta[name="api-base"]')?.content.trim() || './api.php';

  function authUrl(action) {
    const separator = apiBase.includes('?') ? '&' : '?';
    return `${apiBase}${separator}action=${encodeURIComponent(action)}`;
  }

  function dashboardUrl(user) {
    const defaultView = user.role === 'admin' ? 'admin' : user.role === 'worker' ? 'vault' : 'dashboard';
    return `./index.php?view=${encodeURIComponent(defaultView)}`;
  }

  if (identityField && rememberCheckbox) {
    try {
      const rememberedIdentity = localStorage.getItem(rememberedIdentityKey);
      if (rememberedIdentity) {
        identityField.value = rememberedIdentity;
        rememberCheckbox.checked = true;
      }
    } catch {
      // Remember-me is a convenience only; sign-in remains available if storage is blocked.
    }
  }

  function showMessage(text, type) {
    message.textContent = text;
    message.className = `auth-message auth-message--${type}`;
    message.setAttribute('role', type === 'error' ? 'alert' : 'status');
  }

  function clearInvalidState() {
    form.querySelectorAll('[aria-invalid="true"]').forEach(field => {
      field.removeAttribute('aria-invalid');
    });
  }

  form.querySelectorAll('[data-password-toggle]').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const input = document.getElementById(toggle.getAttribute('aria-controls'));
      const shouldShow = input.type === 'password';
      input.type = shouldShow ? 'text' : 'password';
      toggle.textContent = shouldShow ? 'Hide' : 'Show';
      toggle.setAttribute('aria-label', `${shouldShow ? 'Hide' : 'Show'} password`);
      toggle.setAttribute('aria-pressed', String(shouldShow));
      input.focus();
    });
  });

  form.addEventListener('input', clearInvalidState);
  form.addEventListener('change', clearInvalidState);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    clearInvalidState();
    message.textContent = '';
    message.className = 'auth-message';

    if (!form.reportValidity()) {
      const invalid = form.querySelector(':invalid');
      invalid?.setAttribute('aria-invalid', 'true');
      invalid?.focus();
      return;
    }

    const formData = new FormData(form);
    const password = String(formData.get('password') || '');
    const confirmPassword = formData.get('confirmPassword');

    if (password.length < 8) {
      const passwordField = document.getElementById('password');
      passwordField.setAttribute('aria-invalid', 'true');
      passwordField.focus();
      showMessage('Use a password with at least 8 characters.', 'error');
      return;
    }

    if (confirmPassword !== null && password !== confirmPassword) {
      const confirmField = document.getElementById('confirmPassword');
      confirmField.setAttribute('aria-invalid', 'true');
      confirmField.focus();
      showMessage('Your passwords do not match. Check both fields and try again.', 'error');
      return;
    }

    if (identityField && rememberCheckbox) {
      try {
        if (rememberCheckbox.checked) localStorage.setItem(rememberedIdentityKey, identityField.value.trim());
        else localStorage.removeItem(rememberedIdentityKey);
      } catch {
        // Never block the demo redirect because browser preference storage is unavailable.
      }
    }

    submitButton.disabled = true;
    submitButton.setAttribute('aria-busy', 'true');
    showMessage('Checking your account…', 'success');
    const isSignup = form.dataset.authAction === 'signup';
    const payload = isSignup
      ? { name: String(formData.get('fullName') || '').trim(), email: String(formData.get('email') || '').trim(), password }
      : { identity: String(formData.get('identity') || '').trim(), password };
    try {
      const response = await fetch(authUrl(isSignup ? 'auth_signup' : 'auth_login'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error('The server returned an invalid response. Please try again.');
      }
      if (!response.ok || data.success !== true || !data.user) {
        throw new Error(data.error || 'Could not sign in. Please check your details and try again.');
      }
      showMessage(isSignup ? 'Account created. Opening your dashboard…' : 'Signed in. Opening your dashboard…', 'success');
      window.location.assign(dashboardUrl(data.user));
    } catch (error) {
      showMessage(error.message || 'Could not reach SagipRekord. Check your connection and try again.', 'error');
      submitButton.disabled = false;
      submitButton.removeAttribute('aria-busy');
    }
  });

  fetch(authUrl('auth_status'), { credentials: 'same-origin' })
    .then(async response => response.ok ? response.json() : null)
    .then(data => {
      if (data?.success && data.user) window.location.replace(dashboardUrl(data.user));
    })
    .catch(() => {});
})();
