import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, AlertCircle, Mail, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/common/Spinner';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: 'hiteshpatil0205@gmail.com',
    password: 'Hitesh@12345',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await login({ email: form.email, password: form.password });
    setLoading(false);
    if (result.success) {
      navigate('/dashboard', { replace: true });
    } else {
      setError(result.error || 'Authentication failed. Please verify your credentials.');
    }
  };

  const inputStyle = {
    width: '100%',
    height: '42px',
    padding: '0 12px 0 40px',
    fontSize: '14px',
    border: '1px solid #d0d4db',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    fontFamily: 'inherit',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '6px',
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '6px' }}>
          Sign in to RevivePilot
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          Enter merchant credentials to access the Recovery Cockpit.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate>
        {/* Email */}
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="login-email" style={labelStyle}>Business Email</label>
          <div style={{ position: 'relative' }}>
            <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="hiteshpatil0205@gmail.com"
              value={form.email}
              onChange={handleChange}
              disabled={loading}
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = '#0c6ff9'; e.target.style.boxShadow = '0 0 0 3px rgba(12,111,249,0.10)'; }}
              onBlur={e => { e.target.style.borderColor = '#d0d4db'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
        </div>

        {/* Password */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label htmlFor="login-password" style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
            <button type="button" style={{ fontSize: '12px', color: '#0c6ff9', fontWeight: '500', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              Forgot password?
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <KeyRound size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              disabled={loading}
              style={{ ...inputStyle, paddingRight: '40px' }}
              onFocus={e => { e.target.style.borderColor = '#0c6ff9'; e.target.style.boxShadow = '0 0 0 3px rgba(12,111,249,0.10)'; }}
              onBlur={e => { e.target.style.borderColor = '#d0d4db'; e.target.style.boxShadow = 'none'; }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Remember me */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <input
            type="checkbox"
            id="remember-me"
            checked={rememberMe}
            onChange={e => setRememberMe(e.target.checked)}
            style={{ width: '15px', height: '15px', accentColor: '#0c6ff9', cursor: 'pointer' }}
          />
          <label htmlFor="remember-me" style={{ fontSize: '13px', color: '#6b7280', cursor: 'pointer' }}>
            Keep me signed in
          </label>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: '6px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              marginBottom: '16px',
              fontSize: '13px',
              color: '#dc2626',
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            height: '42px',
            borderRadius: '6px',
            backgroundColor: loading ? '#7ab3fc' : '#0c6ff9',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: '600',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontFamily: 'inherit',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#0057d4'; }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#0c6ff9'; }}
        >
          {loading ? (
            <><Spinner size={16} /><span>Verifying...</span></>
          ) : (
            <><span>Sign in</span><ArrowRight size={15} /></>
          )}
        </button>
      </form>
    </div>
  );
}
