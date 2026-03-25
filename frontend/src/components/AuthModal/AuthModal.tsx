import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Facebook, Loader2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { authService } from '../../services/authService';
import './AuthModal.css';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'register';
}

interface LoginErrors {
  email?: string;
  password?: string;
}

interface RegisterErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

type RedirectLocationState = {
  from?: string;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const isValidEmailOrPhone = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || /^(0[3|5|7|8|9])+([0-9]{8})$/.test(value);

const AuthModal = ({ isOpen, onClose, initialTab = 'login' }: AuthModalProps) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);
  const [isForgot, setIsForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [loginErrors, setLoginErrors] = useState<LoginErrors>({});
  const [registerErrors, setRegisterErrors] = useState<RegisterErrors>({});
  const [forgotError, setForgotError] = useState<string | null>(null);

  const { login, register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const resetFormState = () => {
    setFullName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setForgotEmail('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setLoginErrors({});
    setRegisterErrors({});
    setForgotError(null);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setActiveTab(initialTab);
      setIsForgot(false);
      return () => {
        document.body.style.overflow = 'auto';
      };
    }

    document.body.style.overflow = 'auto';
    resetFormState();
    return undefined;
  }, [initialTab, isOpen]);

  const validateLogin = (): LoginErrors => {
    const errors: LoginErrors = {};

    if (!email.trim()) {
      errors.email = 'Vui lòng nhập email hoặc số điện thoại';
    } else if (!isValidEmailOrPhone(email.trim())) {
      errors.email = 'Email hoặc số điện thoại không hợp lệ';
    }

    if (!password) {
      errors.password = 'Vui lòng nhập mật khẩu';
    } else if (password.length < 6) {
      errors.password = 'Mật khẩu tối thiểu 6 ký tự';
    }

    return errors;
  };

  const validateRegister = (): RegisterErrors => {
    const errors: RegisterErrors = {};

    if (!fullName.trim()) {
      errors.fullName = 'Vui lòng nhập họ và tên';
    }

    if (!email.trim()) {
      errors.email = 'Vui lòng nhập email hoặc số điện thoại';
    } else if (!isValidEmailOrPhone(email.trim())) {
      errors.email = 'Email hoặc số điện thoại không hợp lệ';
    }

    if (!password) {
      errors.password = 'Vui lòng nhập mật khẩu';
    } else if (password.length < 6) {
      errors.password = 'Mật khẩu tối thiểu 6 ký tự';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Vui lòng nhập lại mật khẩu';
    } else if (confirmPassword !== password) {
      errors.confirmPassword = 'Mật khẩu không khớp';
    }

    return errors;
  };

  const clearLoginError = (field: keyof LoginErrors) => {
    if (loginErrors[field]) {
      setLoginErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const clearRegisterError = (field: keyof RegisterErrors) => {
    if (registerErrors[field]) {
      setRegisterErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const handleTabChange = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    setIsForgot(false);
    resetFormState();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errors = activeTab === 'login' ? validateLogin() : validateRegister();
    if (activeTab === 'login') {
      setLoginErrors(errors);
    } else {
      setRegisterErrors(errors);
    }

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      setIsLoading(true);

      if (activeTab === 'login') {
        await login(email.trim(), password.trim());
        addToast('Đăng nhập thành công', 'success');

        const currentSession = authService.getSession() || authService.getAdminSession();
        const role = currentSession?.user?.role;

        if (role === 'SUPER_ADMIN') {
          onClose();
          navigate('/admin', { replace: true });
          return;
        }

        if (role === 'VENDOR') {
          onClose();
          navigate('/vendor', { replace: true });
          return;
        }
      } else {
        await register(fullName.trim(), email.trim(), password.trim());
        addToast('Tạo tài khoản thành công', 'success');
      }

      const redirectState = location.state as RedirectLocationState | null;
      const redirectTo = redirectState?.from || '/';
      onClose();
      navigate(redirectTo, { replace: true });
    } catch (error: unknown) {
      addToast(getErrorMessage(error, 'Thao tác thất bại'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!forgotEmail.trim()) {
      setForgotError('Vui lòng nhập email');
      return;
    }

    setForgotError(null);

    try {
      setIsLoading(true);
      await authService.forgot(forgotEmail.trim());
      addToast('Đã gửi hướng dẫn đặt lại mật khẩu', 'success');
      setIsForgot(false);
      setForgotEmail('');
    } catch (error: unknown) {
      addToast(getErrorMessage(error, 'Gửi yêu cầu thất bại'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (typeof window === 'undefined' || !isOpen) {
    return null;
  }

  return createPortal(
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-content" onClick={(event) => event.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose} aria-label="Đóng">
          <X size={24} />
        </button>

        {!isForgot ? (
          <div className="auth-tabs">
            <button className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`} onClick={() => handleTabChange('login')}>
              Đăng nhập
            </button>
            <button className={`auth-tab-btn ${activeTab === 'register' ? 'active' : ''}`} onClick={() => handleTabChange('register')}>
              Đăng ký
            </button>
          </div>
        ) : null}

        <div className="auth-form-container">
          {!isForgot ? (
            <div key={activeTab} className="auth-tab-content">
              <p className="auth-subtitle">
                {activeTab === 'login'
                  ? 'Đăng nhập để không bỏ lỡ quyền lợi tích lũy và hoàn tiền cho bất kỳ đơn hàng nào.'
                  : 'Trở thành thành viên để nhận nhiều ưu đãi độc quyền và theo dõi đơn hàng dễ dàng hơn.'}
              </p>

              <form className="auth-form" onSubmit={handleSubmit} noValidate>
                {activeTab === 'register' ? (
                  <div className="form-group">
                    <input
                      type="text"
                      name="fullName"
                      autoComplete="name"
                      className={`form-input ${registerErrors.fullName ? 'input-error' : ''}`}
                      placeholder="Họ và tên *"
                      value={fullName}
                      onChange={(event) => {
                        setFullName(event.target.value);
                        clearRegisterError('fullName');
                      }}
                    />
                    {registerErrors.fullName ? <span className="field-error">{registerErrors.fullName}</span> : null}
                  </div>
                ) : null}

                <div className="form-group">
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    className={`form-input ${(activeTab === 'login' ? loginErrors.email : registerErrors.email) ? 'input-error' : ''}`}
                    placeholder="Email / Số điện thoại *"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (activeTab === 'login') {
                        clearLoginError('email');
                      } else {
                        clearRegisterError('email');
                      }
                    }}
                  />
                  {activeTab === 'login' && loginErrors.email ? <span className="field-error">{loginErrors.email}</span> : null}
                  {activeTab === 'register' && registerErrors.email ? <span className="field-error">{registerErrors.email}</span> : null}
                </div>

                <div className="form-group">
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'}
                      className={`form-input ${(activeTab === 'login' ? loginErrors.password : registerErrors.password) ? 'input-error' : ''}`}
                      placeholder="Mật khẩu *"
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        if (activeTab === 'login') {
                          clearLoginError('password');
                        } else {
                          clearRegisterError('password');
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {activeTab === 'login' && loginErrors.password ? <span className="field-error">{loginErrors.password}</span> : null}
                  {activeTab === 'register' && registerErrors.password ? <span className="field-error">{registerErrors.password}</span> : null}

                  {activeTab === 'register' && password.length > 0 ? (
                    <div className="password-strength">
                      <div className={`strength-bar ${password.length < 6 ? 'weak' : password.length < 10 ? 'medium' : 'strong'}`} />
                      <span className="strength-label">{password.length < 6 ? 'Yếu' : password.length < 10 ? 'Trung bình' : 'Mạnh'}</span>
                    </div>
                  ) : null}
                </div>

                {activeTab === 'register' ? (
                  <div className="form-group">
                    <div className="password-input-wrapper">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        autoComplete="new-password"
                        className={`form-input ${registerErrors.confirmPassword ? 'input-error' : ''}`}
                        placeholder="Nhập lại mật khẩu *"
                        value={confirmPassword}
                        onChange={(event) => {
                          setConfirmPassword(event.target.value);
                          clearRegisterError('confirmPassword');
                        }}
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowConfirmPassword((current) => !current)}
                        aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {registerErrors.confirmPassword ? <span className="field-error">{registerErrors.confirmPassword}</span> : null}
                    {confirmPassword.length > 0 ? (
                      <span className={`match-indicator ${confirmPassword === password ? 'match' : 'no-match'}`}>
                        {confirmPassword === password ? 'Mật khẩu khớp' : 'Mật khẩu chưa khớp'}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {activeTab === 'login' ? (
                  <div className="auth-forgot-password">
                    <button
                      type="button"
                      className="auth-link-btn"
                      onClick={() => {
                        setIsForgot(true);
                        setForgotEmail(email);
                        setForgotError(null);
                      }}
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                ) : null}

                <button type="submit" className="btn-auth-submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="auth-spinner" />
                      Đang xử lý...
                    </>
                  ) : activeTab === 'login' ? (
                    'Đăng nhập'
                  ) : (
                    'Đăng ký'
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="auth-tab-content">
              <p className="auth-subtitle">Nhập email để nhận hướng dẫn đặt lại mật khẩu.</p>
              <form className="auth-form" onSubmit={handleForgotSubmit}>
                <div className="form-group">
                  <input
                    type="email"
                    className={`form-input ${forgotError ? 'input-error' : ''}`}
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={(event) => {
                      setForgotEmail(event.target.value);
                      setForgotError(null);
                    }}
                  />
                  {forgotError ? <span className="field-error">{forgotError}</span> : null}
                </div>

                <button type="submit" className="btn-auth-submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="auth-spinner" />
                      Đang gửi...
                    </>
                  ) : (
                    'Gửi hướng dẫn'
                  )}
                </button>

                <div className="auth-link-row" style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className="auth-link-btn"
                    onClick={() => {
                      setIsForgot(false);
                      setForgotError(null);
                    }}
                  >
                    Quay lại đăng nhập
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="auth-divider">
            <span>hoặc</span>
          </div>

          <div className="auth-social-btns">
            <button className="btn-social btn-google" type="button">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>Google</span>
            </button>
            <button className="btn-social btn-facebook" type="button">
              <Facebook size={18} fill="#ffffff" color="#1877F2" className="facebook-icon" />
              <span>Facebook</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default AuthModal;
