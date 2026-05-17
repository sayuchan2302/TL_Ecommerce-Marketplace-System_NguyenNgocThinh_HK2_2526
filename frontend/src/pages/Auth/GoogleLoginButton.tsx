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

const loadGoogleScript = () => {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }
  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    const script = existingScript || document.createElement('script');

    const handleLoad = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    const handleError = () => {
      scriptPromise = null;
      reject(new Error('Cannot load Google Identity Services.'));
    };

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });

    if (!existingScript) {
      script.id = GOOGLE_SCRIPT_ID;
      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    } else if (existingScript.dataset.loaded === 'true') {
      handleLoad();
    }
  });

  return scriptPromise;
};

const GoogleLoginButton = ({ disabled = false, onCredential }: GoogleLoginButtonProps) => {
  const buttonRef = useRef<HTMLDivElement>(null);
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

    let cancelled = false;
    let renderedContainer: HTMLDivElement | null = null;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !buttonRef.current || !window.google?.accounts?.id) {
          return;
        }

        const container = buttonRef.current;
        renderedContainer = container;
        container.innerHTML = '';
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          ux_mode: 'popup',
          callback: (response) => {
            if (response.credential) {
              void onCredentialRef.current(response.credential);
            }
          },
        });
        window.google.accounts.id.renderButton(container, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text: 'continue_with',
          shape: 'rectangular',
          width: Math.min(container.clientWidth || 360, 400),
          locale: 'vi',
        });
      })
      .catch((error: unknown) => {
        if (import.meta.env.DEV) {
          console.warn('[auth] Google login button failed to load.', error);
        }
      });

    return () => {
      cancelled = true;
      if (renderedContainer) {
        renderedContainer.innerHTML = '';
      }
    };
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
