import React, { useEffect, useMemo, useState } from 'react';
import { Ban, Copy, Database, Edit3, KeyRound, Play, RefreshCw, X } from 'lucide-react';
import { DetailModal, EmptyState, Field, Pagination, Panel, SelectField, StatusPill, Toggle } from '../components/common.jsx';
import { normalizeBaseUrl } from '../api/storage.js';

const PAGE_SIZE = 5;
const emptyForm = {
  label: '',
  client_id: '',
  permission_ids: '',
  rate_limit_id: '',
  expires_at: '',
  is_active: true
};

export default function APIKeysPage({ api, baseUrl, accessToken }) {
  const [keys, setKeys] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [createdKey, setCreatedKey] = useState('');
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [testRequest, setTestRequest] = useState({
    method: 'GET',
    path: '/api/orders',
    authType: 'api-key',
    apiKey: '',
    body: ''
  });
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadKeys();
  }, [api]);

  const filteredKeys = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return keys;
    return keys.filter((key) => JSON.stringify(key).toLowerCase().includes(query));
  }, [keys, search]);

  const totalPages = Math.max(1, Math.ceil(filteredKeys.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleKeys = filteredKeys.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function loadKeys() {
    setLoading(true);
    setError('');
    try {
      setKeys(await api.listAPIKeys());
    } catch (err) {
      setError(err.message || 'Cannot load API keys');
    } finally {
      setLoading(false);
    }
  }

  function payloadFromForm() {
    return {
      label: form.label.trim() || null,
      client_id: form.client_id.trim(),
      permission_ids: splitValues(form.permission_ids),
      rate_limit_id: form.rate_limit_id.trim() || null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      is_active: form.is_active
    };
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.updateAPIKey(editingId, payloadFromForm());
        setMessage('API key updated');
      } else {
        const result = await api.createAPIKey(payloadFromForm());
        setCreatedKey(result.key);
        setTestRequest((current) => ({ ...current, apiKey: result.key }));
        setMessage('API key created. Store the raw key now; it will not be shown again.');
      }
      resetForm();
      await loadKeys();
    } catch (err) {
      setError(err.message || 'Cannot save API key');
    }
  }

  function startEdit(key) {
    setEditingId(key.id);
    setForm({
      label: key.label || '',
      client_id: key.client_id || '',
      permission_ids: (key.permission_ids || []).join('\n'),
      rate_limit_id: key.rate_limit_id || '',
      expires_at: toDateTimeLocal(key.expires_at),
      is_active: key.is_active
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setEditingId('');
    setForm(emptyForm);
  }

  async function inspect(key) {
    try {
      setSelected(await api.getAPIKey(key.id));
    } catch (err) {
      setError(err.message || 'Cannot load API key');
    }
  }

  async function revoke(key) {
    if (!window.confirm(`Revoke ${key.label || key.key_prefix}? The current key will stop working immediately.`)) return;
    try {
      await api.revokeAPIKey(key.id);
      setMessage('API key revoked');
      await loadKeys();
    } catch (err) {
      setError(err.message || 'Cannot revoke API key');
    }
  }

  async function rotate(key) {
    if (!window.confirm(`Rotate ${key.label || key.key_prefix}? The old key will stop working immediately.`)) return;
    try {
      const result = await api.rotateAPIKey(key.id);
      setCreatedKey(result.key);
      setTestRequest((current) => ({ ...current, apiKey: result.key }));
      setMessage('API key rotated. Store the new raw key now; it will not be shown again.');
      await loadKeys();
    } catch (err) {
      setError(err.message || 'Cannot rotate API key');
    }
  }

  async function copyCreatedKey() {
    await navigator.clipboard.writeText(createdKey);
    setMessage('API key copied');
  }

  async function sendTest(event) {
    event.preventDefault();
    setTesting(true);
    setTestResult(null);
    const startedAt = performance.now();
    try {
      const headers = { Accept: 'application/json' };
      if (testRequest.authType === 'jwt' && accessToken) headers.Authorization = `Bearer ${accessToken}`;
      if (testRequest.authType === 'api-key' && testRequest.apiKey) headers['X-API-Key'] = testRequest.apiKey;

      const options = { method: testRequest.method, headers };
      if (!['GET', 'HEAD'].includes(testRequest.method) && testRequest.body.trim()) {
        headers['Content-Type'] = 'application/json';
        options.body = testRequest.body;
      }

      const response = await fetch(`${normalizeBaseUrl(baseUrl)}${normalizePath(testRequest.path)}`, options);
      const contentType = response.headers.get('content-type') || '';
      const body = contentType.includes('application/json') ? await response.json() : await response.text();
      setTestResult({ status: response.status, ok: response.ok, duration: Math.round(performance.now() - startedAt), body });
    } catch (err) {
      setTestResult({ status: 0, ok: false, duration: Math.round(performance.now() - startedAt), body: err.message });
    } finally {
      setTesting(false);
    }
  }

  return (
    <section className="content-stack">
      {(error || message) && (
        <div className={`alert ${error ? 'error' : 'success'}`}>
          <span>{error || message}</span>
          <button type="button" onClick={() => { setError(''); setMessage(''); }} title="Close"><X size={16} /></button>
        </div>
      )}

      {createdKey && (
        <div className="api-key-secret">
          <KeyRound size={20} />
          <div><strong>Raw API key - shown once</strong><code>{createdKey}</code></div>
          <button className="ghost-button" type="button" onClick={copyCreatedKey}><Copy size={16} />Copy</button>
          <button className="icon-button" type="button" onClick={() => setCreatedKey('')} title="Hide key"><X size={16} /></button>
        </div>
      )}

      <Panel title={editingId ? 'Update API key' : 'Create API key'} eyebrow={editingId ? 'PUT /admin/api-keys/:id' : 'POST /admin/api-keys'}>
        <form className="form-grid" onSubmit={submit}>
          <Field label="Label" value={form.label} onChange={(value) => setForm({ ...form, label: value })} placeholder="order-client" />
          <Field label="Client ID" value={form.client_id} onChange={(value) => setForm({ ...form, client_id: value })} placeholder="Client UUID" required />
          <Field label="Rate limit ID" value={form.rate_limit_id} onChange={(value) => setForm({ ...form, rate_limit_id: value })} placeholder="Optional UUID" />
          <Field label="Expires at" type="datetime-local" value={form.expires_at} onChange={(value) => setForm({ ...form, expires_at: value })} />
          <label className="field field-wide"><span>Permission IDs (one per line)</span><textarea value={form.permission_ids} onChange={(event) => setForm({ ...form, permission_ids: event.target.value })} placeholder={'Permission UUID\nPermission UUID'} required /></label>
          <Toggle label="Active" checked={form.is_active} onChange={(value) => setForm({ ...form, is_active: value })} />
          <div className="form-actions">
            <button className="primary-button" type="submit"><KeyRound size={17} />{editingId ? 'Update' : 'Create'}</button>
            {editingId && <button className="ghost-button" type="button" onClick={resetForm}><X size={17} />Cancel</button>}
          </div>
        </form>
      </Panel>

      <Panel title="API keys" eyebrow="GET /admin/api-keys">
        <div className="table-toolbar">
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search label, prefix, client or permission..." />
          <button className="icon-button" type="button" onClick={loadKeys} title="Reload API keys"><RefreshCw className={loading ? 'spin' : ''} size={17} /></button>
        </div>
        <table className="data-table api-key-table">
          <thead><tr><th>Key</th><th>Client / permissions</th><th>Expiry</th><th>Last used</th><th>Status</th><th></th></tr></thead>
          <tbody>{visibleKeys.map((key) => (
            <tr key={key.id}>
              <td><strong>{key.label || 'Unlabelled key'}</strong><small>{key.key_prefix}...</small></td>
              <td>
                <small>{key.client_id || '-'}</small>
                <div className="scope-list">{(key.permission_ids || []).map((permissionId) => <code key={permissionId}>{permissionId}</code>)}</div>
              </td>
              <td>{formatDate(key.expires_at)}</td>
              <td>{formatDate(key.last_used_at)}</td>
              <td><StatusPill active={key.is_active && !key.revoked_at} label={key.revoked_at ? 'revoked' : key.is_active ? 'active' : 'inactive'} /></td>
              <td><div className="row-actions">
                <button className="ghost-icon" type="button" onClick={() => inspect(key)} title="View detail"><Database size={16} /></button>
                <button className="ghost-icon" type="button" onClick={() => startEdit(key)} title="Edit"><Edit3 size={16} /></button>
                <button className="ghost-icon" type="button" onClick={() => rotate(key)} title="Rotate key"><RefreshCw size={16} /></button>
                <button className="danger-icon" type="button" onClick={() => revoke(key)} disabled={!key.is_active} title="Revoke key"><Ban size={16} /></button>
              </div></td>
            </tr>
          ))}</tbody>
        </table>
        {!loading && visibleKeys.length === 0 && <EmptyState text="No API keys found" />}
        <Pagination page={safePage} pageSize={PAGE_SIZE} totalItems={filteredKeys.length} onPageChange={setPage} />
      </Panel>

      <Panel title="Test protected route" eyebrow="JWT OR X-API-KEY">
        <form className="api-test-form" onSubmit={sendTest}>
          <SelectField label="Method" value={testRequest.method} onChange={(value) => setTestRequest({ ...testRequest, method: value })} options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE']} />
          <Field label="Gateway path" value={testRequest.path} onChange={(value) => setTestRequest({ ...testRequest, path: value })} placeholder="/api/orders" required />
          <SelectField label="Authentication" value={testRequest.authType} onChange={(value) => setTestRequest({ ...testRequest, authType: value })} options={[{ value: 'api-key', label: 'X-API-Key' }, { value: 'jwt', label: 'Bearer JWT' }, { value: 'none', label: 'None' }]} />
          {testRequest.authType === 'api-key' && <Field label="Raw API key" value={testRequest.apiKey} onChange={(value) => setTestRequest({ ...testRequest, apiKey: value })} placeholder="gw_live_..." required />}
          {!['GET', 'HEAD'].includes(testRequest.method) && <label className="field field-wide"><span>JSON body</span><textarea value={testRequest.body} onChange={(event) => setTestRequest({ ...testRequest, body: event.target.value })} placeholder='{"name":"example"}' /></label>}
          <button className="primary-button" type="submit" disabled={testing}><Play size={17} />{testing ? 'Sending...' : 'Send request'}</button>
        </form>
        {testResult && <div className={`api-test-result ${testResult.ok ? 'ok' : 'failed'}`}><strong>{testResult.status || 'Network error'} <span>{testResult.duration} ms</span></strong><pre>{typeof testResult.body === 'string' ? testResult.body : JSON.stringify(testResult.body, null, 2)}</pre></div>}
      </Panel>

      {selected && <DetailModal title="API key detail" record={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

function normalizePath(path) {
  const value = path.trim();
  return value.startsWith('/') ? value : `/${value}`;
}

function splitValues(value) {
  return value.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
}

function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : '-';
}
