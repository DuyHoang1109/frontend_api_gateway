import React, { useEffect, useMemo, useState } from 'react';
import { Database, Edit3, Eye, EyeOff, RefreshCw, Trash2, X } from 'lucide-react';
import { Alert, EmptyState, Pagination, Panel, StatusPill } from '../components/common.jsx';

const PAGE_SIZE = 10;

export default function UsersPage({ api, currentUser }) {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { loadUsers(); }, [api]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      `${user.username} ${user.email} ${user.role_name}`.toLowerCase().includes(query)
    );
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleUsers = filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function loadUsers() {
    setLoading(true);
    setError('');
    try {
      const [userList, roleList] = await Promise.all([
        api.listUsers(),
        api.listRoles()
      ]);
      setUsers(userList);
      setRoles(roleList);
    } catch (err) {
      setError(err.message || 'Cannot load users');
    } finally {
      setLoading(false);
    }
  }

  async function inspect(user) {
    setError('');
    try {
      setSelected(await api.getUser(user.id));
    } catch (err) {
      setError(err.message || 'Cannot load user detail');
    }
  }

  function edit(user) {
    setSelected(null);
    setEditing(user);
    setForm({
      username: user.username || '',
      email: user.email || '',
      role_id: user.role_id || '',
      password: '',
      password_confirm: '',
      is_active: Boolean(user.is_active)
    });
  }

  async function submit(event) {
    event.preventDefault();
    if (!editing) return;

    setSaving(true);
    setError('');
    try {
      const payload = {
        username: form.username,
        email: form.email,
        role_id: form.role_id,
        is_active: form.is_active
      };
      const password = form.password.trim();
      const passwordConfirm = form.password_confirm.trim();
      if (password || passwordConfirm) {
        const passwordError = validatePassword(password);
        if (passwordError) {
          setError(passwordError);
          return;
        }
        if (password !== passwordConfirm) {
          setError('Password confirmation does not match');
          return;
        }
        payload.password = password;
      }
      await api.updateUser(editing.id, payload);
      setNotice('User updated');
      setEditing(null);
      setForm(defaultForm);
      await loadUsers();
    } catch (err) {
      setError(err.message || 'Cannot update user');
    } finally {
      setSaving(false);
    }
  }

  async function remove(user) {
    if (!window.confirm(`Delete ${user.username}?`)) return;

    setError('');
    try {
      await api.deleteUser(user.id);
      setNotice('User deleted');
      await loadUsers();
    } catch (err) {
      setError(err.message || 'Cannot delete user');
    }
  }

  return (
    <section className="content-stack">
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {notice && <Alert type="success" message={notice} onClose={() => setNotice('')} />}

      <Panel title="Users" eyebrow="GET /ADMIN/USERS">
        <div className="table-toolbar">
          <input
            type="search"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Search username, email or role..."
          />
          <button className="icon-button" type="button" onClick={loadUsers} title="Reload users">
            <RefreshCw className={loading ? 'spin' : ''} size={17} />
          </button>
        </div>

        <table className="data-table authorization-table">
          <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Updated</th><th></th></tr></thead>
          <tbody>{visibleUsers.map((user) => {
            const isSelf = currentUser?.id === user.id;
            return (
              <tr key={user.id}>
                <td><strong>{user.username}</strong><small>{user.email}</small></td>
                <td>{user.role_name}</td>
                <td><StatusPill active={user.is_active} label={user.is_active ? 'active' : 'inactive'} /></td>
                <td>{formatDate(user.updated_at)}</td>
                <td>
                  <div className="row-actions">
                    <span className="action-group">
                      <button className="ghost-icon" type="button" onClick={() => inspect(user)} title={`View ${user.username}`}><Database size={16} /></button>
                      <button className="ghost-icon" type="button" onClick={() => edit(user)} title={`Edit ${user.username}`}><Edit3 size={16} /></button>
                    </span>
                    <span className="action-group danger-actions">
                      <button className="danger-icon" type="button" onClick={() => remove(user)} disabled={isSelf} title={isSelf ? 'Cannot delete your own user' : `Delete ${user.username}`}><Trash2 size={16} /></button>
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}</tbody>
        </table>

        {!loading && visibleUsers.length === 0 && <EmptyState text="No users found" />}
        <Pagination page={safePage} pageSize={PAGE_SIZE} totalItems={filteredUsers.length} onPageChange={setPage} />
      </Panel>

      {selected && <UserDetail user={selected} onClose={() => setSelected(null)} />}
      {editing && (
        <UserEditModal
          user={editing}
          form={form}
          setForm={setForm}
          roles={roles}
          saving={saving}
          isSelf={currentUser?.id === editing.id}
          onSubmit={submit}
          onClose={() => { setEditing(null); setForm(defaultForm); }}
        />
      )}
    </section>
  );
}

const defaultForm = {
  username: '',
  email: '',
  role_id: '',
  password: '',
  password_confirm: '',
  is_active: true
};

function UserDetail({ user, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="detail-modal authorization-detail" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div><small>User detail</small><h2>{user.username}</h2></div>
          <button className="icon-button" type="button" onClick={onClose} title="Close"><X size={18} /></button>
        </div>
        <div className="detail-grid">
          <DetailItem label="Username" value={user.username} />
          <DetailItem label="Email" value={user.email} />
          <DetailItem label="Role" value={user.role_name} />
          <DetailItem label="Status" value={user.is_active ? 'Active' : 'Inactive'} />
          <DetailItem label="User ID" value={user.id} wide />
          <DetailItem label="Role ID" value={user.role_id} wide />
          <DetailItem label="Created" value={formatDate(user.created_at)} />
          <DetailItem label="Updated" value={formatDate(user.updated_at)} />
        </div>
      </section>
    </div>
  );
}

function UserEditModal({ user, form, setForm, roles, saving, isSelf, onSubmit, onClose }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  function togglePasswordChange() {
    setChangingPassword((current) => {
      const next = !current;
      if (!next) {
        setForm({ ...form, password: '', password_confirm: '' });
        setShowPassword(false);
        setShowPasswordConfirm(false);
      }
      return next;
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="detail-modal authorization-detail user-edit-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div><small>Update user</small><h2>{user.username}</h2></div>
          <button className="icon-button" type="button" onClick={onClose} title="Close"><X size={18} /></button>
        </div>
        <form className="form-grid user-edit-form" onSubmit={onSubmit}>
          <label className="field">
            <span>Username</span>
            <input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          </label>
          <label className="field">
            <span>Role</span>
            <select value={form.role_id} onChange={(event) => setForm({ ...form, role_id: event.target.value })} required disabled={isSelf}>
              <option value="">Choose role...</option>
              {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </select>
          </label>
          <div className="password-change-panel field-wide">
            <button className="ghost-button" type="button" onClick={togglePasswordChange}>
              {changingPassword ? 'Keep current password' : 'Change password'}
            </button>
            {changingPassword && (
              <div className="password-change-fields">
                <label className="field">
                  <span>New password</span>
                  <div className="password-input">
                    <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="New password" minLength={6} required />
                    <button className="password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} title={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>
                <label className="field">
                  <span>Confirm password</span>
                  <div className="password-input">
                    <input type={showPasswordConfirm ? 'text' : 'password'} value={form.password_confirm} onChange={(event) => setForm({ ...form, password_confirm: event.target.value })} placeholder="Repeat new password" minLength={6} required />
                    <button className="password-toggle" type="button" onClick={() => setShowPasswordConfirm((value) => !value)} title={showPasswordConfirm ? 'Hide password' : 'Show password'}>
                      {showPasswordConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>
                <small>Password must include lowercase, uppercase and number.</small>
              </div>
            )}
          </div>
          <label className="toggle user-active-toggle">
            <input type="checkbox" checked={form.is_active} disabled={isSelf && form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
            <span>Active</span>
          </label>
          <div className="form-actions field-wide user-edit-actions">
            <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Update'}</button>
            <button className="ghost-button" type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DetailItem({ label, value, wide = false }) {
  return <div className={`detail-item ${wide ? 'wide' : ''}`}><span>{label}</span><strong>{value || '-'}</strong></div>;
}

function validatePassword(password) {
  if (password.length < 6) return 'Password must be at least 6 characters';
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter';
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must include a number';
  return '';
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : '-';
}
