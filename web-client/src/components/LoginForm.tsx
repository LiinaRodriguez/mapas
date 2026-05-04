import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useStore } from '../store/useStore';
import { Mail, Lock, Loader2, UserPlus } from 'lucide-react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <header style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', marginBottom: '16px' }}>
            <img src="/favicon.svg" alt="Mapas Logo" style={{ width: 48, height: 48 }} />
          </div>
          <h1 className="auth-title">Bienvenido</h1>
          <p className="auth-subtitle">Ingresa a tu plataforma cartográfica</p>
        </header>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '20px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="label">Correo Electrónico</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                type="email"
                className="input"
                style={{ paddingLeft: '40px' }}
                placeholder="usuario@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Contraseña</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                type="password"
                className="input"
                style={{ paddingLeft: '40px' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
            style={{ height: '48px', marginTop: '12px' }}
          >
            {loading ? <Loader2 className="spinner" size={20} /> : 'Iniciar Sesión'}
          </button>
        </form>

        <footer style={{ marginTop: '32px', textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
          ¿No tienes una cuenta?{' '}
          <button 
            type="button"
            className="btn btn-ghost btn-sm link" 
            style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', padding: 0 }}
            onClick={() => useStore.getState().setAuthView('register')}
          >
            <UserPlus size={14} /> Regístrate aquí
          </button>
        </footer>
      </div>
    </div>
  );
}
