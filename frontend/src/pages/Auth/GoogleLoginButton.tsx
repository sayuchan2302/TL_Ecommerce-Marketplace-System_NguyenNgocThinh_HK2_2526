import { useEffect, useRef } from 'react';

const GOOGLE_SCRIPT_ID = 'google-identity-services';
const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

// Module-level promise: shared across all component instances
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
  prompt?: () => void;
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
  onCredential: (credential: string) => Promise<void> | void;
}

const loadGoogleScript = (): Promise<void> => {
  // Already fully loaded
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }
  // In-flight load — reuse the same promise
  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;

    if (existing) {
      // Script tag already in DOM — mark handled and resolve
      existing.dataset.loaded === 'true' ? resolve() : existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => { scriptPromise = null; reject(new Error('Cannot load Google Identity Services.')); }, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    // NOTE: Do NOT set a random nonce here — nonce must match CSP header or be omitted.

    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      if (import.meta.env.DEV) {
        console.log('[GSI] Google Identity Services script loaded', {
          apiAvailable: !!window.google?.accounts?.id,
          timestamp: new Date().toISOString(),
        });
      }
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

const GoogleLoginButton = ({ disabled = false, onCredential }: GoogleLoginButtonProps) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  // Keep a stable ref to the callback so the closure inside useEffect is always fresh
  const onCredentialRef = useRef(onCredential);

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      if (import.meta.env.DEV && !warnedMissingClientId) {
        console.warn('[auth] VITE_GOOGLE_CLIENT_ID is empty. Google login button is hidden.');
        warnedMissingClientId = true;
      }
      return;
    }

    // Cancellation flag — set to true when the effect is cleaned up (unmount / StrictMode re-run)
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        // Guard: effect was cleaned up while the script was loading
        if (cancelled) return;

        const api = window.google?.accounts?.id;
        const container = buttonRef.current;

        if (!api || !container) {
          if (import.meta.env.DEV) {
            console.warn('[GSI] API or container not available after script load', {
              api: !!api,
              container: !!container,
            });
          }
          return;
        }

        container.innerHTML = '';

        if (import.meta.env.DEV) {
          console.log('[GSI] Initializing with config:', {
            clientId: GOOGLE_CLIENT_ID,
            origin: window.location.origin,
            timestamp: new Date().toISOString(),
          });
        }

        api.initialize({
          client_id: GOOGLE_CLIENT_ID,
          ux_mode: 'popup',
          callback: (response) => {
            if (response.credential) {
              void onCredentialRef.current(response.credential);
            }
          },
        });

        // Guard again — effect may have been cleaned up during async microtask
        if (cancelled) return;

        api.renderButton(container, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text: 'continue_with',
          shape: 'rectangular',
          width: Math.min(container.clientWidth || 360, 400),
          locale: 'vi',
        });

        if (import.meta.env.DEV) {
          console.log('[GSI] Button rendered successfully');
        }
      })
      .catch((error: unknown) => {
        if (import.meta.env.DEV) {
          console.error('[GSI] Initialization failed', {
            error,
            origin: window.location.origin,
            clientId: GOOGLE_CLIENT_ID,
            hint: 'Ensure this origin is in Google Cloud Console → Authorized JavaScript origins',
          });
        }
      });

    return () => {
      cancelled = true;
      // Clear the rendered button on cleanup so the next mount starts fresh
      if (buttonRef.current) {
        buttonRef.current.innerHTML = '';
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!GOOGLE_CLIENT_ID) {
    return null;
  }

  return (
    <div className={`google-login-slot${disabled ? ' is-disabled' : ''}`} aria-disabled={disabled}>
      <div ref={buttonRef} />
    </div>
  );
};

export default GoogleLoginButton;
