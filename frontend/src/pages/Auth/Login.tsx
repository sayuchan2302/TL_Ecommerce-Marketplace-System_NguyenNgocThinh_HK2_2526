import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, ShieldCheck } from 'lucide-react';
import './Auth.css';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { getReasonToast, getUiErrorMessage } from '../../utils/errorMessage';
import GoogleLoginButton from './GoogleLoginButton';
import FacebookLoginButton from './FacebookLoginButton';

const handledReasonKeys = new Set<string>();

const Login = () => {
  const { login, loginWithGoogle, loginWithFacebook } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);

  const redirectTo = useMemo(() => {
    const query = new URLSearchParams(location.search);
    const redirectFromQuery = query.get('redirect');
    const redirectFromState = (location.state as { from?: string } | null)?.from;
    return redirectFromQuery || redirectFromState || '/';
  }, [location.search, location.state]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reason = params.get('reason');
    if (!reason) {
      return;
    }

    const reasonKey = `${reason}|${params.get('redirect') || ''}`;
    if (handledReasonKeys.has(reasonKey)) {
      return;
    }
    handledReasonKeys.add(reasonKey);

    const reasonToast = getReasonToast(reason);
    if (reasonToast) {
      addToast(reasonToast.message, reasonToast.type);
    }

    params.delete('reason');
    const nextSearch = params.toString();
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : '',
      },
      { replace: true },
    );
  }, [location.pathname, location.search, addToast, navigate]);

  const validate = () => {
    const next: typeof errors = {};
    if (!email.trim()) next.email = 'Vui lòng nhập email';
    if (!password.trim()) next.password = 'Vui lòng nhập mật khẩu';
    return next;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      setLoading(true);
      await login(email.trim(), password.trim());
      addToast('Đăng nhập thành công', 'success');
      navigate(redirectTo, { replace: true });
    } catch (error: unknown) {
      addToast(getUiErrorMessage(error, 'Đăng nhập thất bại'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    try {
      setGoogleLoading(true);
      await loginWithGoogle(credential);
      addToast('Đăng nhập Google thành công', 'success');
      navigate(redirectTo, { replace: true });
    } catch (error: unknown) {
      addToast(getUiErrorMessage(error, 'Đăng nhập Google thất bại'), 'error');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleFacebookAccessToken = async (accessToken: string) => {
    try {
      setFacebookLoading(true);
      await loginWithFacebook(accessToken);
      addToast('Đăng nhập Facebook thành công', 'success');
      navigate(redirectTo, { replace: true });
    } catch (error: unknown) {
      addToast(getUiErrorMessage(error, 'Đăng nhập Facebook thất bại'), 'error');
    } finally {
      setFacebookLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Đăng nhập</h1>
        <p className="auth-subtitle">Đăng nhập để tích lũy quyền lợi và xem đơn hàng của bạn.</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label>Email</label>
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              name="email"
              autoComplete="email"
              spellCheck={false}
            />
            {errors.email && <div className="auth-error">{errors.email}</div>}
          </div>

          <div className="auth-field">
            <label>Mật khẩu</label>
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              name="password"
              autoComplete="current-password"
            />
            {errors.password && <div className="auth-error">{errors.password}</div>}
          </div>

          <div className="auth-link-row">
            <span />
            <Link to="/forgot">Quên mật khẩu?</Link>
          </div>

          <div className="auth-actions">
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? <><Loader2 size={18} className="auth-spinner" /> Đang đăng nhập...</> : 'Đăng nhập'}
            </button>
            <div className="auth-divider">
              <span>Hoặc tiếp tục với</span>
            </div>
            <div className="social-row">
              <button
                type="button"
                className="social-btn google-btn"
                onClick={() => window.google?.accounts?.id?.prompt?.()}
                disabled={loading || googleLoading}
              >
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>
              <FacebookLoginButton disabled={loading || facebookLoading} onAccessToken={handleFacebookAccessToken} />
            </div>
            <GoogleLoginButton disabled={loading || googleLoading} onCredential={handleGoogleCredential} />
            <div className="auth-secondary">
              Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
            </div>
            <div className="auth-secondary" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={16} /> Bảo mật thanh toán và thông tin khách hàng
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
