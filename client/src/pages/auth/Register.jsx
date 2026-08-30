import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/common/Spinner';

function PasswordStrength({ password }) {
  const calc = pw => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const score = password ? calc(password) : 0;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', 'var(--color-danger)', 'var(--color-warning)', 'var(--color-info)', 'var(--color-success)'];

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{
              backgroundColor: i <= score ? colors[score] : 'var(--color-border)',
            }}
          />
        ))}
      </div>
      {score > 0 && (
        <p className="text-[11px]" style={{ color: colors[score] }}>
          {labels[score]}
        </p>
      )}
    </div>
  );
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    businessName: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(errs => ({ ...errs, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.businessName.trim()) errs.businessName = 'Business name is required.';
    if (!form.fullName.trim()) errs.fullName = 'Full name is required.';
    if (!form.email.trim()) errs.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email address.';
    if (!form.password) errs.password = 'Password is required.';
    else if (form.password.length < 6) errs.password = 'Password must be at least 6 characters.';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    return errs;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    const result = await register({
      businessName: form.businessName,
      fullName: form.fullName,
      email: form.email,
      password: form.password,
    });
    setLoading(false);
    if (result.success) {
      navigate('/dashboard', { replace: true });
    }
  };

  const Field = ({ id, name, label, type = 'text', placeholder, autoComplete, required, children }) => (
    <div>
      <label
        htmlFor={id}
        className="block text-[13px] font-medium mb-1.5"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {label}
        {!required && (
          <span className="ml-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            (optional)
          </span>
        )}
      </label>
      {children || (
        <input
          id={id}
          name={name}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={form[name]}
          onChange={handleChange}
          className={`input-base ${errors[name] ? 'border-[var(--color-danger)]' : ''}`}
          aria-required={required}
          aria-describedby={errors[name] ? `${id}-error` : undefined}
          disabled={loading}
        />
      )}
      {errors[name] && (
        <p
          id={`${id}-error`}
          className="mt-1 text-[12px]"
          style={{ color: 'var(--color-danger)' }}
          role="alert"
        >
          {errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2
          className="text-2xl font-bold mb-1.5"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Create merchant account
        </h2>
        <p className="text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>
          Join RevivePilot and start recovering revenue
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Business Name */}
        <Field id="reg-business" name="businessName" label="Business Name" placeholder="Acme Payments Ltd." required />

        {/* Full Name */}
        <Field id="reg-fullname" name="fullName" label="Full Name" autoComplete="name" placeholder="Priya Mehta" required />

        {/* Email */}
        <Field id="reg-email" name="email" label="Business Email" type="email" autoComplete="email" placeholder="you@company.com" required />

        {/* Phone */}
        <Field id="reg-phone" name="phone" label="Phone Number" type="tel" autoComplete="tel" placeholder="+91 98765 43210" required={false} />

        {/* Password */}
        <div>
          <label
            htmlFor="reg-password"
            className="block text-[13px] font-medium mb-1.5"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Password
          </label>
          <div className="relative">
            <input
              id="reg-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={handleChange}
              className={`input-base pr-10 ${errors.password ? 'border-[var(--color-danger)]' : ''}`}
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
          <PasswordStrength password={form.password} />
          {errors.password && (
            <p className="mt-1 text-[12px]" style={{ color: 'var(--color-danger)' }} role="alert">
              {errors.password}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="reg-confirm"
            className="block text-[13px] font-medium mb-1.5"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="reg-confirm"
              name="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={handleChange}
              className={`input-base pr-10 ${errors.confirmPassword ? 'border-[var(--color-danger)]' : ''}`}
              aria-required="true"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
              style={{ color: 'var(--color-text-muted)' }}
              aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-[12px]" style={{ color: 'var(--color-danger)' }} role="alert">
              {errors.confirmPassword}
            </p>
          )}
        </div>

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
              <span>Creating account…</span>
            </>
          ) : (
            <>
              <span>Create Merchant Account</span>
              <ArrowRight size={15} />
            </>
          )}
        </button>

        <p
          className="text-[11px] text-center leading-relaxed"
          style={{ color: 'var(--color-text-muted)' }}
        >
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <hr className="divider flex-1" />
        <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>or</span>
        <hr className="divider flex-1" />
      </div>

      {/* Login link */}
      <p className="text-center text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-semibold"
          style={{ color: 'var(--color-brand)' }}
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
