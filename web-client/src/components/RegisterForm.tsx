import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useStore } from '../store/useStore';
import { Mail, Lock, User, Shield, Loader2, LogIn } from 'lucide-react';

export function RegisterForm() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [esLicenciado, setEsLicenciado] = useState(false);
  const [numeroLicencia, setNumeroLicencia] = useState('');
  
  const { register, loading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await register({
      nombre,
      email,
      password,
      es_licenciado: esLicenciado,
      numero_licencia: numeroLicencia
    });
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: '480px' }}>
        <header style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', marginBottom: '16px' }}>
            <img src="/favicon.svg" alt="Mapas Logo" style={{ width: 48, height: 48 }} />
          </div>
          <h1 className="auth-title">Crear Cuenta</h1>
          <p className="auth-subtitle">Únete a la red de gestión cartográfica</p>
        </header>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '20px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="label">Nombre Completo</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                className="input"
                style={{ paddingLeft: '40px' }}
                placeholder="Juan Pérez"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Correo Electrónico</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                type="email"
                className="input"
                style={{ paddingLeft: '40px' }}
                placeholder="juan@ejemplo.com"
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
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>

          <div style={{ 
            background: 'var(--bg-tertiary)', 
            padding: '16px', 
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            marginTop: '8px'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={esLicenciado}
                onChange={(e) => setEsLicenciado(e.target.checked)}
                style={{ width: '18px', height: '18px' }}
              />
              <span style={{ fontSize: '14px', fontWeight: 500 }}>Soy profesional licenciado</span>
            </label>

            {esLicenciado && (
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="label">Número de Tarjeta Profesional</label>
                <div style={{ position: 'relative' }}>
                  <Shield size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <input
                    className="input"
                    style={{ paddingLeft: '40px' }}
                    placeholder="TP-123456"
                    value={numeroLicencia}
                    onChange={(e) => setNumeroLicencia(e.target.value)}
                    required={esLicenciado}
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
            style={{ height: '48px', marginTop: '12px' }}
          >
            {loading ? <Loader2 className="spinner" size={20} /> : 'Registrarme'}
          </button>
        </form>

        <footer style={{ marginTop: '32px', textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
          ¿Ya tienes una cuenta?{' '}
          <button 
            type="button"
            className="btn btn-ghost btn-sm link" 
            style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', padding: 0 }}
            onClick={() => useStore.getState().setAuthView('login')}
          >
            <LogIn size={14} /> Inicia sesión
          </button>
        </footer>
      </div>
    </div>
  );
}
