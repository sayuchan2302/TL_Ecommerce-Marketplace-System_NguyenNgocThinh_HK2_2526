import type { AuthResponse, User } from '../types';

const AUTH_KEY = 'coolmate_auth_v1';
const ADMIN_AUTH_KEY = 'coolmate_admin_auth_v1';
const REGISTERED_ACCOUNTS_KEY = 'coolmate_registered_accounts_v1';
const SESSION_REASON_KEY = 'coolmate_auth_reason_v1';
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

if (!API_BASE) {
  // eslint-disable-next-line no-console
  console.warn('[auth] VITE_API_URL is empty. Frontend will use mock auth (customer only).');
}

interface MockAccount {
  email: string;
  password: string;
  user: User;
}

interface BackendAuthResponse {
  token: string;
  refreshToken?: string;
  email?: string;
  name?: string;
  role?: string;
  storeId?: string;
  approvedVendor?: boolean;
}

const MOCK_ACCOUNTS: MockAccount[] = [
  {
    email: 'user@gmail.com',
    password: '123456',
    user: {
      id: 'u_customer_001',
      name: 'Nguyen Ngoc Thinh',
      email: 'user@gmail.com',
      phone: '0382253049',
      avatar: 'NT',
      gender: 'male',
      role: 'CUSTOMER',
    },
  },
  {
    email: 'vendor@gmail.com',
    password: '123456',
    user: {
      id: 'u_vendor_001',
      name: 'Shop Thoi Trang',
      email: 'vendor@gmail.com',
      phone: '0382253050',
      avatar: 'SH',
      role: 'VENDOR',
      storeId: 'store_001',
      isApprovedVendor: true,
    },
  },
  {
    email: 'vendorpending@gmail.com',
    password: '123456',
    user: {
      id: 'u_vendor_002',
      name: 'Shop Cho Duyet',
      email: 'vendorpending@gmail.com',
      phone: '0382253051',
      avatar: 'CD',
      role: 'VENDOR',
      storeId: 'store_002',
      isApprovedVendor: false,
    },
  },
  {
    email: 'admin@gmail.com',
    password: '123456',
    user: {
      id: 'u_super_admin_001',
      name: 'Admin Coolmate',
      email: 'admin@gmail.com',
      role: 'SUPER_ADMIN',
      avatar: 'AD',
    },
  },
];

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'U';

const buildApiUrl = (path: string) => {
  if (!API_BASE) {
    return path;
  }
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
};

const parseJsonSafely = async <T>(response: Response): Promise<T | null> => {
  try {
    return await response.json() as T;
  } catch {
    return null;
  }
};

const parseBackendError = async (response: Response) => {
  const payload = await parseJsonSafely<Record<string, unknown>>(response);
  if (typeof payload?.message === 'string' && payload.message.trim()) {
    return payload.message;
  }
  if (typeof payload?.error === 'string' && payload.error.trim()) {
    return payload.error;
  }
  return response.statusText || 'Authentication failed';
};

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const isBackendJwtToken = (token?: string | null) => Boolean(token && token.split('.').length === 3);

const getExpiry = (token?: string | null): number | null => {
  const claims = token ? decodeJwtPayload(token) : null;
  const exp = claims?.exp;
  return typeof exp === 'number' ? exp : null;
};

const isJwtExpired = (token?: string | null, skewSeconds = 60) => {
  const exp = getExpiry(token);
  if (!exp) return false;
  const nowSeconds = Date.now() / 1000;
  return exp - skewSeconds <= nowSeconds;
};

const mapBackendAuthResponse = (payload: BackendAuthResponse): AuthResponse => {
  const claims = decodeJwtPayload(payload.token);
  const role = payload.role === 'VENDOR' || payload.role === 'SUPER_ADMIN' || payload.role === 'CUSTOMER'
    ? payload.role
    : 'CUSTOMER';
  const name = payload.name?.trim() || payload.email?.split('@')[0] || 'User';
  const email = payload.email?.trim() || String(claims?.sub || '');
  const userId = typeof claims?.userId === 'string' ? claims.userId : `u_${Date.now()}`;

  return {
    token: payload.token,
    refreshToken: payload.refreshToken,
    user: {
      id: userId,
      name,
      email,
      avatar: getInitials(name),
      role,
      storeId: payload.storeId,
      isApprovedVendor: payload.approvedVendor ?? (role === 'VENDOR'),
    },
  };
};

const loginWithBackend = async (email: string, password: string): Promise<AuthResponse | null> => {
  if (!API_BASE) {
    return null;
  }

  try {
    const response = await fetch(buildApiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const message = await parseBackendError(response);
      throw new Error(message);
    }

    const payload = await parseJsonSafely<BackendAuthResponse>(response);
    return payload?.token ? mapBackendAuthResponse(payload) : null;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Dang nhap that bai');
  }
};

const registerWithBackend = async (name: string, email: string, password: string): Promise<AuthResponse | null> => {
  if (!API_BASE) {
    return null;
  }

  try {
    const response = await fetch(buildApiUrl('/api/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    if (response.ok) {
      const payload = await parseJsonSafely<BackendAuthResponse>(response);
      return payload?.token ? mapBackendAuthResponse(payload) : null;
    }

    if (response.status >= 400 && response.status < 500) {
      throw new Error(await parseBackendError(response));
    }

    return null;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    return null;
  }
};

const loadRegisteredAccounts = (): MockAccount[] => {
  try {
    const raw = localStorage.getItem(REGISTERED_ACCOUNTS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const persistRegisteredAccounts = (accounts: MockAccount[]) => {
  localStorage.setItem(REGISTERED_ACCOUNTS_KEY, JSON.stringify(accounts));
};

const getAllAccounts = (): MockAccount[] => [...MOCK_ACCOUNTS, ...loadRegisteredAccounts()];

const persist = (data: AuthResponse | null) => {
  if (data) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(data));
    localStorage.removeItem(SESSION_REASON_KEY);
  } else {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(SESSION_REASON_KEY);
  }
};

const persistAdmin = (data: AuthResponse | null) => {
  // Legacy admin-only storage is kept only for cleanup/migration.
  // Backend-authenticated sessions now persist through the main auth key.
  sessionStorage.removeItem(ADMIN_AUTH_KEY);
  if (data) {
    persist(data);
  }
};

const readLegacyAdminSession = (): AuthResponse | null => {
  try {
    const raw = sessionStorage.getItem(ADMIN_AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getPersistedSession = (): AuthResponse | null => {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    localStorage.removeItem(AUTH_KEY);
  }

  const legacyAdminSession = readLegacyAdminSession();
  if (legacyAdminSession) {
    persist(legacyAdminSession);
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
    return legacyAdminSession;
  }

  return null;
};

export const authService = {
  isBackendJwtToken,
  isJwtExpired,

  getSession(): AuthResponse | null {
    return getPersistedSession();
  },

  getRefreshToken(): string | null {
    return this.getSession()?.refreshToken || null;
  },

  clearSession(reason?: string) {
    if (reason) {
      localStorage.setItem(SESSION_REASON_KEY, reason);
    }
    persist(null);
    persistAdmin(null);
  },

  consumeClearReason(): string | null {
    const reason = localStorage.getItem(SESSION_REASON_KEY);
    if (reason) {
      localStorage.removeItem(SESSION_REASON_KEY);
      return reason;
    }
    return null;
  },

  async refresh(): Promise<AuthResponse> {
    if (!API_BASE) {
      throw new Error('Cannot refresh without backend API.');
    }
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('Missing refresh token.');
    }

    const response = await fetch(buildApiUrl('/api/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      const message = await parseBackendError(response);
      throw new Error(message);
    }

    const payload = await parseJsonSafely<BackendAuthResponse>(response);
    if (!payload?.token) {
      throw new Error('Refresh response missing token.');
    }

    const session = mapBackendAuthResponse(payload);
    persist(session);
    if (session.user.role === 'VENDOR' || session.user.role === 'SUPER_ADMIN') {
      persistAdmin(session);
    }
    return session;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    await new Promise(resolve => setTimeout(resolve, 300));

    if (!email || !password) {
      throw new Error('Vui long nhap email va mat khau');
    }

    const forceBackend = Boolean(API_BASE);
    try {
      const backendSession = await loginWithBackend(email, password);
      if (backendSession) {
        persist(backendSession);
        if (backendSession.user.role === 'VENDOR' || backendSession.user.role === 'SUPER_ADMIN') {
          persistAdmin(backendSession);
        }
        return backendSession;
      }
    } catch (error) {
      if (forceBackend) {
        throw error instanceof Error ? error : new Error('Dang nhap that bai');
      }
    }

    if (forceBackend) {
      throw new Error('Dang nhap that bai. Vui long kiem tra lai tai khoan/mat khau.');
    }

    const account = getAllAccounts().find(
      acc => acc.email.toLowerCase() === email.toLowerCase() && acc.password === password,
    );

    if (!account) {
      throw new Error('Email hoac mat khau khong dung');
    }

    if (account.user.role === 'VENDOR' || account.user.role === 'SUPER_ADMIN') {
      throw new Error('Tai khoan seller/admin phai dang nhap bang backend JWT that.');
    }

    const response: AuthResponse = {
      token: 'mock-token-' + Date.now(),
      user: account.user,
    };
    persist(response);
    return response;
  },

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    await new Promise(resolve => setTimeout(resolve, 300));

    if (!name || !email || !password) {
      throw new Error('Vui long nhap day du thong tin');
    }

    if (password.length < 6) {
      throw new Error('Mat khau phai co it nhat 6 ky tu');
    }

    const existing = getAllAccounts().find(
      acc => acc.email.toLowerCase() === email.toLowerCase(),
    );
    if (existing) {
      throw new Error('Email da duoc su dung');
    }

    try {
      const backendSession = await registerWithBackend(name, email, password);
      if (backendSession) {
        persist(backendSession);
        return backendSession;
      }
    } catch (error) {
      if (API_BASE) {
        throw error instanceof Error ? error : new Error('Dang ky that bai. Vui long thu lai.');
      }
    }

    if (API_BASE) {
      throw new Error('Dang ky that bai. Vui long thu lai.');
    }

    const newUser: User = {
      id: 'u_' + Date.now(),
      name,
      email,
      avatar: getInitials(name),
      role: 'CUSTOMER',
    };

    const newAccount: MockAccount = {
      email,
      password,
      user: newUser,
    };

    persistRegisteredAccounts([...loadRegisteredAccounts(), newAccount]);

    const response: AuthResponse = {
      token: 'mock-token-' + Date.now(),
      user: newUser,
    };
    persist(response);
    return response;
  },

  async forgot(email: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    if (!email) throw new Error('Vui long nhap email');
  },

  async reset(newPassword: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    if (!newPassword) throw new Error('Vui long nhap mat khau moi');
  },

  logout(reason?: string) {
    this.clearSession(reason);
  },

  updateSession(user: User) {
    const session = this.getSession();
    if (!session) return null;
    const next = { ...session, user } as AuthResponse;
    persist(next);
    if (user.role === 'VENDOR' || user.role === 'SUPER_ADMIN') {
      persistAdmin(next);
    }

    const registeredAccounts = loadRegisteredAccounts();
    const accountIndex = registeredAccounts.findIndex(
      (account) => account.email.toLowerCase() === user.email.toLowerCase(),
    );

    if (accountIndex >= 0) {
      registeredAccounts[accountIndex] = {
        ...registeredAccounts[accountIndex],
        user,
      };
      persistRegisteredAccounts(registeredAccounts);
    }

    return next;
  },

  getAdminSession(): AuthResponse | null {
    return getPersistedSession();
  },

  async adminLogin(email: string, password: string): Promise<AuthResponse> {
    await new Promise(resolve => setTimeout(resolve, 300));

    if (!email || !password) {
      throw new Error('Vui long nhap email va mat khau');
    }

    if (!API_BASE) {
      throw new Error('Admin/seller panel yeu cau backend JWT. Vui long cau hinh VITE_API_URL.');
    }

    const backendSession = await loginWithBackend(email, password);
    if (!backendSession) {
      throw new Error('Admin/seller panel now requires backend JWT login.');
    }

    if (backendSession.user.role !== 'SUPER_ADMIN' && backendSession.user.role !== 'VENDOR') {
      throw new Error('This account cannot access the admin/seller panel.');
    }

    persist(backendSession);
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
    return backendSession;
  },

  adminLogout(reason?: string) {
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
    const session = this.getSession();
    if (session?.user.role === 'SUPER_ADMIN' || session?.user.role === 'VENDOR') {
      this.clearSession(reason);
    }
  },

  isAdminAuthenticated(): boolean {
    const session = this.getAdminSession();
    return Boolean(session?.token);
  },
};
