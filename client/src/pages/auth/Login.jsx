import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/common/Spinner';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async e => {
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
      setError(result.error || 'Login failed. Please try again.');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2
          className="text-2xl font-bold mb-1.5"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Welcome back
        </h2>
        <p className="text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>
          Sign in to your RevivePilot merchant account
        </p>
      </div>

      {/* Demo hint */}
      <div
        className="flex items-start gap-3 p-3.5 rounded-lg mb-6"
        style={{ backgroundColor: 'var(--color-brand-light)', border: '1px solid rgba(37,99,235,0.18)' }}
      >
        <div
          className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
          style={{ backgroundColor: 'var(--color-brand)' }}
        />
        <div>
          <p
            className="text-[12px] font-semibold"
            style={{ color: 'var(--color-brand)' }}
          >
            Demo credentials
          </p>
          <p className="text-[11px] mt-0.5 font-mono-data" style={{ color: 'var(--color-brand)' }}>
            demo@revivepilot.ai · demo123
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Email */}
        <div>
          <label
            htmlFor="login-email"
            className="block text-[13px] font-medium mb-1.5"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Business email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={form.email}
            onChange={handleChange}
            className="input-base"
            aria-required="true"
            disabled={loading}
          />
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="login-password"
              className="block text-[13px] font-medium"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Password
            </label>
            <button
              type="button"
              className="btn-link"
              aria-label="Forgot password"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              className="input-base pr-10"
              aria-required="true"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
              style={{ color: 'var(--color-text-muted)' }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Remember me */}
        <div className="flex items-center gap-2">
          <input
            id="login-remember"
            type="checkbox"
            checked={rememberMe}
            onChange={e => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded accent-[var(--color-brand)] cursor-pointer"
          />
          <label
            htmlFor="login-remember"
            className="text-[13px] cursor-pointer select-none"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Remember me
          </label>
        </div>

        {/* Error message */}
        {error && (
          <div
            className="flex items-center gap-2 p-3 rounded-lg text-[13px]"
            style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}
            role="alert"
          >
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          className="btn-primary mt-2"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? (
            <>
              <Spinner size={15} />
              <span>Signing in…</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight size={15} />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <hr className="divider flex-1" />
        <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>or</span>
        <hr className="divider flex-1" />
      </div>

      {/* Register link */}
      <p className="text-center text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
        Don&apos;t have an account?{' '}
        <Link
          to="/register"
          className="font-semibold"
          style={{ color: 'var(--color-brand)' }}
        >
          Create merchant account
        </Link>
      </p>
    </div>
  );
}
