import React, { useState } from 'react';
import { LogIn, Save, ShieldCheck } from 'lucide-react';
import { Field, Panel } from '../components/common.jsx';

export default function LoginPage({ currentUser, loading, onLogin, onNavigate, baseUrl, setBaseUrl, onSaveBaseUrl }) {
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
    <div className="login-stack">
      <div className="login-brand">
        <div className="brand-mark">GW</div>
        <div>
          <strong>Gateway Admin</strong>
          <span>Control Plane</span>
        </div>
      </div>

      <Panel title="Sign in" eyebrow="Authentication" className="auth-panel">
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

        {baseUrl !== undefined && (
          <div className="login-connection">
            <label htmlFor="login-base-url">Gateway URL</label>
            <div className="login-connection-row">
              <input
                id="login-base-url"
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
              />
              <button className="icon-button" type="button" onClick={onSaveBaseUrl} title="Save Gateway URL">
                <Save size={16} />
              </button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
