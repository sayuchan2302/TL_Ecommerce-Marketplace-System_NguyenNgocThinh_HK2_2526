import { useEffect, useRef } from 'react';

const GOOGLE_SCRIPT_ID = 'google-identity-services';
const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

let scriptPromise: Promise<void> | null = null;
let warnedMissingClientId = false;

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    ux_mode?: 'popup' | 'redirect';
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      type?: 'standard' | 'icon';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      width?: number;
      locale?: string;
    },
  ) => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId;
      };
    };
  }
}

interface GoogleLoginButtonProps {
  disabled?: boolean;
  onIdToken: (idToken: string) => Promise<void> | void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
}

const GoogleMark = () => (
  <svg className="google-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

const loadGoogleScript = (): Promise<void> => {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => {
        scriptPromise = null;
        reject(new Error('Cannot load Google Identity Services.'));
      }, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;

    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });

    script.addEventListener('error', () => {
      scriptPromise = null;
      reject(new Error('Cannot load Google Identity Services.'));
    }, { once: true });

    document.head.appendChild(script);
  });

  return scriptPromise;
};

const GoogleLoginButton = ({
  disabled = false,
  onIdToken,
  text = 'continue_with',
}: GoogleLoginButtonProps) => {
  const slotRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const onIdTokenRef = useRef(onIdToken);

  useEffect(() => {
    onIdTokenRef.current = onIdToken;
  }, [onIdToken]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      if (import.meta.env.DEV && !warnedMissingClientId) {
        console.warn('[auth] VITE_GOOGLE_CLIENT_ID is empty. Google login button is hidden.');
        warnedMissingClientId = true;
      }
      return;
    }

    let cancelled = false;
    let renderedContainer: HTMLDivElement | null = null;

    loadGoogleScript()
      .then(() => {
        if (cancelled) return;

        const api = window.google?.accounts?.id;
        const container = buttonRef.current;
        const slot = slotRef.current;
        if (!api || !container || !slot) {
          return;
        }

        renderedContainer = container;
        container.innerHTML = '';
        api.initialize({
          client_id: GOOGLE_CLIENT_ID,
          ux_mode: 'popup',
          callback: (response) => {
            if (response.credential) {
              void onIdTokenRef.current(response.credential);
            }
          },
        });

        if (cancelled) return;

        const width = Math.min(Math.max(Math.round(slot.getBoundingClientRect().width) || 174, 120), 400);
        api.renderButton(container, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text,
          shape: 'rectangular',
          width,
          locale: 'vi',
        });
      })
      .catch((error: unknown) => {
        if (import.meta.env.DEV) {
          console.error('[auth] Google login initialization failed', error);
        }
      });

    return () => {
      cancelled = true;
      if (renderedContainer) {
        renderedContainer.innerHTML = '';
      }
    };
  }, [text]);

  if (!GOOGLE_CLIENT_ID) {
    return null;
  }

  return (
    <div ref={slotRef} className={`google-login-slot${disabled ? ' is-disabled' : ''}`} aria-disabled={disabled}>
      <div className="social-btn google-btn google-login-display" aria-hidden="true">
        <GoogleMark />
        <span>Google</span>
      </div>
      <div ref={buttonRef} className="google-login-native" />
    </div>
  );
};

export default GoogleLoginButton;
