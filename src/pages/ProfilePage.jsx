import React from 'react';
import { LogIn, LogOut, ShieldCheck, UserCircle } from 'lucide-react';
import { EmptyState, InfoItem, Panel, StatusPill } from '../components/common.jsx';

export default function ProfilePage({ user, onLogout, onNavigate }) {
  if (!user) {
    return (
      <Panel title="Profile" eyebrow="Authentication">
        <EmptyState text="Sign in to load the current Gateway user." />
        <div className="linked-actions">
          <button className="primary-button" type="button" onClick={() => onNavigate('login')}>
            <LogIn size={17} />
            Go to Login
          </button>
        </div>
      </Panel>
    );
  }

  return (
    <div className="content-stack">
      <Panel title="Current User" eyebrow="GET /auth/me">
        <div className="profile-head">
          <div className="profile-avatar">
            <UserCircle size={36} />
          </div>
          <div>
            <h2>{user.username}</h2>
            <span>{user.email}</span>
          </div>
          <StatusPill active label={user.role || 'authenticated'} />
          <button className="ghost-button" type="button" onClick={onLogout}>
            <LogOut size={17} />
            Logout
          </button>
        </div>

        <div className="info-grid profile-info">
          <InfoItem label="User ID" value={user.id} />
          <InfoItem label="Role" value={user.role || '-'} />
          <InfoItem label="Email" value={user.email || '-'} />
          <InfoItem label="Permissions" value={`${user.permissions?.length || 0} granted`} />
        </div>
      </Panel>

      <Panel title="Permissions" eyebrow="Authorization">
        {user.permissions?.length ? (
          <div className="permission-grid">
            {user.permissions.map((permission) => (
              <span className="permission-chip" key={permission}>
                <ShieldCheck size={14} />
                {permission}
              </span>
            ))}
          </div>
        ) : (
          <EmptyState text="No permissions returned for this account." />
        )}
      </Panel>
    </div>
  );
}
