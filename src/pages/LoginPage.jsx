import React, { useState } from 'react';
import { LogIn, ShieldCheck } from 'lucide-react';
import { Field, Panel } from '../components/common.jsx';

export default function LoginPage({ currentUser, loading, onLogin, onNavigate }) {
  const [form, setForm] = useState({ username: '', password: '' });

  async function submit(event) {
    event.preventDefault();
    await onLogin(form);
  }

  if (currentUser) {
    return (
      <Panel title="Signed in" eyebrow="Authentication">
        <div className="auth-success">
          <ShieldCheck size={28} />
          <div>
            <strong>{currentUser.username}</strong>
            <span>{currentUser.email}</span>
          </div>
          <button className="primary-button" type="button" onClick={() => onNavigate('profile')}>
            View Profile
          </button>
        </div>
      </Panel>
    );
  }

  return (
    <div className="auth-layout">
      <Panel title="Login" eyebrow="Authentication" className="auth-panel">
        <form className="auth-form" onSubmit={submit}>
          <Field
            label="Username or Email"
            value={form.username}
            placeholder="Enter your username or email"
            required
            onChange={(value) => setForm((current) => ({ ...current, username: value }))}
          />
          <Field
            label="Password"
            type="password"
            value={form.password}
            placeholder="Enter your password"
            required
            onChange={(value) => setForm((current) => ({ ...current, password: value }))}
          />
          <button className="primary-button" type="submit" disabled={loading}>
            <LogIn size={17} />
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </Panel>

      <Panel title="How it works" eyebrow="JWT">
        <div className="auth-flow">
          <div>
            <strong>1. Login</strong>
            <span>POST /auth/login with username and password.</span>
          </div>
          <div>
            <strong>2. Store token</strong>
            <span>The dashboard keeps the access and refresh tokens locally.</span>
          </div>
          <div>
            <strong>3. Renew session</strong>
            <span>Expired access tokens are renewed through POST /auth/refresh.</span>
          </div>
        </div>
      </Panel>
    </div>
  );
}
