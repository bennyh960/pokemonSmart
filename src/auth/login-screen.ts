import './login-screen.css';
import { signIn, signUp, isAccountActive } from './auth-service.js';

type ScreenMode = 'login' | 'register';
type Locale = 'he' | 'en';

const LOCALE_KEY = 'pokemon-math-locale';

const strings = {
  he: {
    titlePixel: 'פוקימון',
    titleText: 'הרפתקה בנומריה',
    loginTab: 'כניסה',
    registerTab: 'הרשמה',
    emailLabel: 'אימייל',
    passwordLabel: 'סיסמה',
    confirmLabel: 'אשר סיסמה',
    submitLogin: 'כנס',
    submitRegister: 'הרשם',
    pendingMsg1: 'החשבון ממתין לאישור המנהל.',
    pendingMsg2: 'לאחר האישור, כנס מחדש.',
    pendingContact: 'ליצירת קשר עם המנהל לאישור.',
    retryBtn: 'נסה שוב',
    errorInvalid: 'אימייל או סיסמה שגויים.',
    errorExists: 'האימייל כבר רשום.',
    errorMismatch: 'הסיסמאות אינן תואמות.',
    errorFill: 'מלא את כל השדות.',
    errorNetwork: 'שגיאת רשת. נסה שוב.',
    successRegistered: 'נרשמת! ממתין לאישור מנהל. (אפשר להתקשר ישירות למנהל שיאשר זריז)',
    langToggle: 'EN',
  },
  en: {
    titlePixel: 'POKEMON',
    titleText: 'Math Adventure',
    loginTab: 'Login',
    registerTab: 'Register',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    confirmLabel: 'Confirm Password',
    submitLogin: 'Sign In',
    submitRegister: 'Register',
    pendingMsg1: 'Account pending admin approval.',
    pendingMsg2: 'Sign in again after activation.',
    pendingContact: 'Contact the admin to speed up approval.',
    retryBtn: 'Try Again',
    errorInvalid: 'Wrong email or password.',
    errorExists: 'Email already registered.',
    errorMismatch: "Passwords don't match.",
    errorFill: 'Fill in all fields.',
    errorNetwork: 'Network error. Try again.',
    successRegistered: 'Registered! Waiting for approval.',
    langToggle: 'עב',
  },
} as const;

export function showLoginScreen(onSuccess: () => Promise<void>, initialError?: string): void {
  const overlay = document.createElement('div');
  overlay.id = 'login-overlay';

  let locale: Locale = (localStorage.getItem(LOCALE_KEY) as Locale) || 'he';
  let mode: ScreenMode = 'login';
  let loading = false;

  function s() {
    return strings[locale];
  }

  function render(): void {
    loading = false;
    const isLogin = mode === 'login';
    const isRTL = locale === 'he';
    overlay.innerHTML = `
      <div class="login-card" dir="${isRTL ? 'rtl' : 'ltr'}">
        <div class="login-logo">
          <p class="login-title-text">${s().titlePixel}</p>
          <p class="login-title-pixel">${s().titleText}</p>
        </div>

        <div class="tab-switcher">
          <button class="tab-btn ${isLogin ? 'active' : ''}" id="tab-login">${s().loginTab}</button>
          <button class="tab-btn ${!isLogin ? 'active' : ''}" id="tab-register">${s().registerTab}</button>
        </div>

        <div class="status-msg" id="status-msg">${initialError ? `<span class="error">${initialError}</span>` : ''}</div>

        <form id="auth-form" autocomplete="on">
          <div class="form-group">
            <label>${s().emailLabel}</label>
            <input type="email" id="email-input" autocomplete="email" required />
          </div>
          <div class="form-group">
            <label>${s().passwordLabel}</label>
            <input type="password" id="password-input" autocomplete="${isLogin ? 'current-password' : 'new-password'}" required />
          </div>
          ${
            !isLogin
              ? `
          <div class="form-group">
            <label>${s().confirmLabel}</label>
            <input type="password" id="confirm-input" autocomplete="new-password" required />
          </div>`
              : ''
          }
          <button type="submit" id="submit-btn">
            ${isLogin ? s().submitLogin : s().submitRegister}
          </button>
        </form>

        <div class="lang-toggle-row">
          <button id="lang-toggle-btn">${s().langToggle}</button>
        </div>
      </div>
    `;

    initialError = undefined;

    overlay.querySelector('#tab-login')!.addEventListener('click', () => {
      if (mode !== 'login') {
        mode = 'login';
        render();
      }
    });
    overlay.querySelector('#tab-register')!.addEventListener('click', () => {
      if (mode !== 'register') {
        mode = 'register';
        render();
      }
    });
    overlay.querySelector('#auth-form')!.addEventListener('submit', handleSubmit);
    overlay.querySelector('#lang-toggle-btn')!.addEventListener('click', () => {
      locale = locale === 'he' ? 'en' : 'he';
      localStorage.setItem(LOCALE_KEY, locale);
      render();
    });
  }

  function setStatus(msg: string, type: 'error' | 'success' | ''): void {
    const el = overlay.querySelector('#status-msg');
    if (!el) return;
    el.className = `status-msg${type ? ' ' + type : ''}`;
    el.innerHTML = msg;
  }

  function setLoading(val: boolean): void {
    loading = val;
    const btn = overlay.querySelector<HTMLButtonElement>('#submit-btn');
    if (!btn) return;
    btn.disabled = val;
    btn.innerHTML = val ? '<span class="btn-spinner"></span>' : mode === 'login' ? s().submitLogin : s().submitRegister;
  }

  async function handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    if (loading) return;

    const email = overlay.querySelector<HTMLInputElement>('#email-input')!.value.trim();
    const password = overlay.querySelector<HTMLInputElement>('#password-input')!.value;

    if (!email || !password) {
      setStatus(s().errorFill, 'error');
      return;
    }

    if (mode === 'register') {
      const confirm = overlay.querySelector<HTMLInputElement>('#confirm-input')!.value;
      if (password !== confirm) {
        setStatus(s().errorMismatch, 'error');
        return;
      }
    }

    setLoading(true);
    setStatus('', '');

    try {
      if (mode === 'login') {
        const { data, error } = await signIn(email, password);
        if (error || !data.user) {
          setStatus(s().errorInvalid, 'error');
          setLoading(false);
          return;
        }
        const active = await isAccountActive(data.user.id);
        if (!active) {
          showPending();
          return;
        }
        overlay.remove();
        await onSuccess();
      } else {
        const { data: signUpData, error } = await signUp(email, password);
        if (error) {
          // With email confirmation disabled, Supabase auto-attempts sign-in for
          // existing emails. Wrong password → "Invalid login credentials" from the
          // token endpoint. Either case means the account already exists.
          const isExistingAccount =
            error.message.toLowerCase().includes('already') ||
            error.message.toLowerCase().includes('credentials') ||
            error.message.toLowerCase().includes('registered');
          if (isExistingAccount) {
            showPending();
            return;
          }
          setStatus(error.message, 'error');
          setLoading(false);
          return;
        }
        // With email confirmation disabled, signUp succeeds and returns the user
        // if the password matches an existing account — treat that as a login.
        if (signUpData.user && !signUpData.user.confirmed_at && signUpData.session === null) {
          // New user created but confirmation pending (email confirmation re-enabled)
          setStatus(s().successRegistered, 'success');
          setLoading(false);
          return;
        }
        if (signUpData.session) {
          // Email confirmation disabled + existing user + correct password = auto-login
          const active = await isAccountActive(signUpData.user!.id);
          if (!active) { showPending(); return; }
          overlay.remove();
          await onSuccess();
          return;
        }
        setStatus(s().successRegistered, 'success');
        setLoading(false);
      }
    } catch {
      setStatus(s().errorNetwork, 'error');
      setLoading(false);
    }
  }

  function showPending(): void {
    loading = false;
    const isRTL = locale === 'he';
    overlay.innerHTML = `
      <div class="login-card" dir="${isRTL ? 'rtl' : 'ltr'}">
        <div class="login-logo">
          <p class="login-title-pixel">${s().titlePixel}</p>
          <p class="login-title-text">${s().titleText}</p>
        </div>
        <div class="pending-view">
          <p>${s().pendingMsg1}</p>
          <p>${s().pendingContact}</p>
          <p class="pending-note">${s().pendingMsg2}</p>
          <button id="retry-btn">${s().retryBtn}</button>
        </div>
        <div class="lang-toggle-row">
          <button id="lang-toggle-btn">${s().langToggle}</button>
        </div>
      </div>
    `;
    overlay.querySelector('#retry-btn')!.addEventListener('click', () => {
      mode = 'login';
      render();
    });
    overlay.querySelector('#lang-toggle-btn')!.addEventListener('click', () => {
      locale = locale === 'he' ? 'en' : 'he';
      localStorage.setItem(LOCALE_KEY, locale);
      showPending();
    });
  }

  render();
  document.body.appendChild(overlay);
}
