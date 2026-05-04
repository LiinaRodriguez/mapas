import { useCallback, useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { getMe, loginUser, registerUser } from '../api/client';

export function useAuth() {
  const { user, token, setUser, setToken, logout, authView, setAuthView } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token && !user) {
      getMe()
        .then(setUser)
        .catch(() => logout());
    }
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await loginUser(email, password);
      setToken(res.access_token);
      localStorage.setItem('refresh_token', res.refresh_token);
      const me = await getMe();
      setUser(me);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al iniciar sesión');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setToken, setUser]);

  const register = useCallback(
    async (data: {
      nombre: string;
      email: string;
      password: string;
      es_licenciado: boolean;
      numero_licencia?: string;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const res = await registerUser(data);
        setToken(res.access_token);
        localStorage.setItem('refresh_token', res.refresh_token);
        const me = await getMe();
        setUser(me);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Error al registrar usuario');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setToken, setUser]
  );

  return {
    user,
    isAuthenticated: !!token && !!user,
    isLoading: !!token && !user,
    loading,
    error,
    authView,
    setAuthView,
    login,
    register,
    logout,
  };
}
