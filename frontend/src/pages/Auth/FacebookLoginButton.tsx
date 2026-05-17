import { useEffect, useRef, useState } from 'react';

const FACEBOOK_APP_ID = (import.meta.env.VITE_FACEBOOK_APP_ID || '').trim();

interface FacebookLoginButtonProps {
  disabled?: boolean;
  onAccessToken: (accessToken: string) => Promise<void> | void;
}

declare global {
  interface Window {
    FB?: {
      init: (config: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
      login: (callback: (response: { authResponse?: { accessToken: string } }) => void, config?: { scope: string }) => void;
      getLoginStatus: (callback: (response: { status: string; authResponse?: { accessToken: string } }) => void) => void;
    };
    fbAsyncInit?: () => void;
  }
}

const FacebookLoginButton = ({ disabled = false, onAccessToken }: FacebookLoginButtonProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const onAccessTokenRef = useRef(onAccessToken);
  const [sdkLoaded, setSdkLoaded] = useState(() => Boolean(window.FB));

  useEffect(() => {
    onAccessTokenRef.current = onAccessToken;
  }, [onAccessToken]);

  useEffect(() => {
    if (!FACEBOOK_APP_ID) {
      if (import.meta.env.DEV) {
        console.warn('[auth] VITE_FACEBOOK_APP_ID is empty. Facebook login button is hidden.');
      }
      return;
    }

    if (window.FB) {
      return;
    }

    window.fbAsyncInit = () => {
      window.FB?.init({
        appId: FACEBOOK_APP_ID,
        cookie: true,
        xfbml: false,
        version: 'v18.0',
      });
      setSdkLoaded(true);
    };

    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    script.id = 'facebook-jssdk';
    document.body.appendChild(script);

    return () => {
      const existingScript = document.getElementById('facebook-jssdk');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  const handleClick = () => {
    if (!window.FB || !sdkLoaded) {
      console.warn('[auth] Facebook SDK not loaded');
      return;
    }

    window.FB.login(
      (response) => {
        if (response.authResponse?.accessToken) {
          void onAccessTokenRef.current(response.authResponse.accessToken);
        }
      },
      { scope: 'public_profile,email' }
    );
  };

  if (!FACEBOOK_APP_ID) {
    return null;
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      className="social-btn facebook-btn"
      disabled={disabled || !sdkLoaded}
      onClick={handleClick}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
      Facebook
    </button>
  );
};

export default FacebookLoginButton;
