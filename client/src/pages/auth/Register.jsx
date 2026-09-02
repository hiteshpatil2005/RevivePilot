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
  const colors = ['', '#dc2626', '#d97706', '#0891b2', '#059669'];

  if (!password) return null;

  return (
    <div style={{ marginTop: '6px' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '3px' }}>
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            style={{
              height: '3px',
              flex: 1,
              borderRadius: '2px',
              backgroundColor: i <= score ? colors[score] : '#e8eaed',
              transition: 'background-color 0.2s',
            }}
          />
        ))}
      </div>
      {score > 0 && (
        <p style={{ fontSize: '11px', color: colors[score], fontWeight: '500' }}>{labels[score]}</p>
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

  const inputStyle = (hasError) => ({
    width: '100%',
    height: '40px',
    padding: '0 12px',
    fontSize: '14px',
    border: `1px solid ${hasError ? '#dc2626' : '#d0d4db'}`,
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  });

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '5px',
  };

  const fieldWrap = { marginBottom: '14px' };

  const handleFocus = e => {
    e.target.style.borderColor = '#0c6ff9';
    e.target.style.boxShadow = '0 0 0 3px rgba(12,111,249,0.10)';
  };
  const handleBlur = e => {
    if (!e.target.value || !e.target.classList.contains('has-error')) {
      e.target.style.borderColor = '#d0d4db';
    }
    e.target.style.boxShadow = 'none';
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '6px' }}>
          Create your account
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          Join RevivePilot and start recovering revenue.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* Business Name */}
        <div style={fieldWrap}>
          <label htmlFor="reg-business" style={labelStyle}>Business Name</label>
          <input
            id="reg-business"
            name="businessName"
            type="text"
            placeholder="Acme Payments Ltd."
            value={form.businessName}
            onChange={handleChange}
            disabled={loading}
            style={inputStyle(errors.businessName)}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {errors.businessName && <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }} role="alert">{errors.businessName}</p>}
        </div>

        {/* Full Name */}
        <div style={fieldWrap}>
          <label htmlFor="reg-fullname" style={labelStyle}>Full Name</label>
          <input
            id="reg-fullname"
            name="fullName"
            type="text"
            autoComplete="name"
            placeholder="Priya Mehta"
            value={form.fullName}
            onChange={handleChange}
            disabled={loading}
            style={inputStyle(errors.fullName)}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {errors.fullName && <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }} role="alert">{errors.fullName}</p>}
        </div>

        {/* Email */}
        <div style={fieldWrap}>
          <label htmlFor="reg-email" style={labelStyle}>Business Email</label>
          <input
            id="reg-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={form.email}
            onChange={handleChange}
            disabled={loading}
            style={inputStyle(errors.email)}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {errors.email && <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }} role="alert">{errors.email}</p>}
        </div>

        {/* Phone (optional) */}
        <div style={fieldWrap}>
          <label htmlFor="reg-phone" style={labelStyle}>
            Phone Number <span style={{ fontSize: '11px', color: '#9299a7' }}>(optional)</span>
          </label>
          <input
            id="reg-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            value={form.phone}
            onChange={handleChange}
            disabled={loading}
            style={inputStyle(false)}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </div>

        {/* Password */}
        <div style={fieldWrap}>
          <label htmlFor="reg-password" style={labelStyle}>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              id="reg-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={handleChange}
              disabled={loading}
              style={{ ...inputStyle(errors.password), paddingRight: '40px' }}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <PasswordStrength password={form.password} />
          {errors.password && <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }} role="alert">{errors.password}</p>}
        </div>

        {/* Confirm Password */}
        <div style={fieldWrap}>
          <label htmlFor="reg-confirm" style={labelStyle}>Confirm Password</label>
          <div style={{ position: 'relative' }}>
            <input
              id="reg-confirm"
              name="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={handleChange}
              disabled={loading}
              style={{ ...inputStyle(errors.confirmPassword), paddingRight: '40px' }}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(v => !v)}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.confirmPassword && <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }} role="alert">{errors.confirmPassword}</p>}
        </div>

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
            marginTop: '8px',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#0057d4'; }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#0c6ff9'; }}
          aria-busy={loading}
        >
          {loading ? (
            <><Spinner size={15} /><span>Creating account...</span></>
          ) : (
            <><span>Create Account</span><ArrowRight size={15} /></>
          )}
        </button>

        <p style={{ fontSize: '11px', color: '#9299a7', textAlign: 'center', marginTop: '12px', lineHeight: '1.5' }}>
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>
      </form>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#e8eaed' }} />
        <span style={{ fontSize: '11px', color: '#9299a7' }}>or</span>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#e8eaed' }} />
      </div>

      <p style={{ textAlign: 'center', fontSize: '13px', color: '#6b7280' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: '#0c6ff9', fontWeight: '600', textDecoration: 'none' }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
