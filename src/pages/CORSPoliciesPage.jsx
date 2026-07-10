import React, { useEffect, useMemo, useState } from 'react';
import { Alert, DetailModal, EmptyState, Field, FormActions, Pagination, Panel, RowActions, StatusPill, Toggle } from '../components/common.jsx';
import { scrollToUpdateForm } from '../utils/scrollToUpdateForm.js';

const PAGE_SIZE = 5;
const METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
const HEADER_OPTIONS = ['Accept', 'Authorization', 'Content-Type', 'Origin', 'X-API-Key', 'X-Request-ID', 'X-Requested-With'];

const emptyForm = {
  name: '',
  allowed_origins: 'http://localhost:5173',
  allowed_methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowed_headers: ['Authorization', 'Content-Type', 'X-API-Key'],
  exposed_headers: '',
  allow_credentials: false,
  max_age: 3600,
  is_active: true
};

export default function CORSPoliciesPage({ api }) {
  const [policies, setPolicies] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { loadPolicies(); }, [api]);

  async function loadPolicies() {
    setLoading(true);
    setError('');
    try {
      setPolicies(await api.listCORSPolicies());
    } catch (err) {
      setError(err.message || 'Cannot load CORS policies');
    } finally {
      setLoading(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      const payload = formToPayload(form);
      if (editingId) await api.updateCORSPolicy(editingId, payload);
      else await api.createCORSPolicy(payload);
      setNotice(editingId ? 'CORS policy updated' : 'CORS policy created');
      cancelEdit();
      await loadPolicies();
    } catch (err) {
      setError(err.message || 'Cannot save CORS policy');
    }
  }

  function edit(policy) {
    setEditingId(policy.id);
    setForm({
      name: policy.name,
      allowed_origins: (policy.allowed_origins || []).join('\n'),
      allowed_methods: policy.allowed_methods || [],
      allowed_headers: policy.allowed_headers || [],
      exposed_headers: (policy.exposed_headers || []).join('\n'),
      allow_credentials: Boolean(policy.allow_credentials),
      max_age: policy.max_age ?? 3600,
      is_active: policy.is_active !== false
    });
    scrollToUpdateForm();
  }

  function cancelEdit() {
    setEditingId('');
    setForm(emptyForm);
  }

  async function remove(policy) {
    if (!window.confirm(`Delete CORS policy ${policy.name}?`)) return;
    setError('');
    try {
      await api.deleteCORSPolicy(policy.id);
      setNotice('CORS policy deleted');
      await loadPolicies();
    } catch (err) {
      setError(err.message || 'Cannot delete CORS policy');
    }
  }

  function toggleMethod(method) {
    setForm((current) => ({
      ...current,
      allowed_methods: toggleValue(current.allowed_methods, method)
    }));
  }

  function toggleHeader(header) {
    setForm((current) => ({
      ...current,
      allowed_headers: toggleValue(current.allowed_headers, header)
    }));
  }

  const paginated = useMemo(() => paginate(policies, page, PAGE_SIZE), [policies, page]);

  return (
    <section className="content-stack">
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {notice && <Alert type="success" message={notice} onClose={() => setNotice('')} />}

      <Panel title={editingId ? 'Update CORS policy' : 'Create CORS policy'} eyebrow={editingId ? 'PUT /admin/cors-policies/:id' : 'POST /admin/cors-policies'}>
        <form className="cors-policy-form" onSubmit={submit}>
          <Field label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} placeholder="Public Web CORS" required />
          <Field label="Max age (seconds)" type="number" value={form.max_age} onChange={(value) => setForm({ ...form, max_age: value })} required />
          <Toggle label="Allow credentials" checked={form.allow_credentials} onChange={(value) => setForm({ ...form, allow_credentials: value })} />
          <Toggle label="Active" checked={form.is_active} onChange={(value) => setForm({ ...form, is_active: value })} />

          <label className="field cors-textarea">
            <span>Allowed origins</span>
            <textarea value={form.allowed_origins} onChange={(event) => setForm({ ...form, allowed_origins: event.target.value })} placeholder="http://localhost:5173" required />
          </label>

          <label className="field cors-textarea">
            <span>Exposed headers</span>
            <textarea value={form.exposed_headers} onChange={(event) => setForm({ ...form, exposed_headers: event.target.value })} placeholder="X-Request-ID" />
          </label>

          <fieldset className="choice-panel cors-methods-panel">
            <legend>Allowed methods</legend>
            <div className="choice-grid">
              {METHOD_OPTIONS.map((method) => (
                <label key={method}>
                  <input type="checkbox" checked={form.allowed_methods.includes(method)} onChange={() => toggleMethod(method)} />
                  <span>{method}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="choice-panel cors-headers-panel">
            <legend>Allowed headers</legend>
            <div className="choice-grid">
              {HEADER_OPTIONS.map((header) => (
                <label key={header}>
                  <input type="checkbox" checked={form.allowed_headers.includes(header)} onChange={() => toggleHeader(header)} />
                  <span>{header}</span>
                </label>
              ))}
            </div>
            <Field label="Extra headers" value={extraValues(form.allowed_headers, HEADER_OPTIONS).join(', ')} onChange={(value) => setForm({ ...form, allowed_headers: mergeValues(HEADER_OPTIONS.filter((header) => form.allowed_headers.includes(header)), splitValues(value)) })} placeholder="X-Custom-Header" />
          </fieldset>

          <FormActions editing={Boolean(editingId)} onCancel={cancelEdit} />
        </form>
      </Panel>

      <Panel title="CORS policies" eyebrow="GET /admin/cors-policies">
        <table className="data-table">
          <thead>
            <tr>
              <th>Policy</th>
              <th>Origins</th>
              <th>Methods</th>
              <th>Headers</th>
              <th>Credentials</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginated.items.map((policy) => (
              <tr key={policy.id}>
                <td><strong>{policy.name}</strong><small>{policy.id}</small></td>
                <td><ChipList values={policy.allowed_origins} limit={1} /></td>
                <td><ChipList values={policy.allowed_methods} limit={4} /></td>
                <td><ChipList values={policy.allowed_headers} limit={3} /></td>
                <td><span className={`mini-pill ${policy.allow_credentials ? 'on' : ''}`}>{policy.allow_credentials ? 'yes' : 'no'}</span><small>{policy.max_age}s</small></td>
                <td><StatusPill active={policy.is_active} label={policy.is_active ? 'active' : 'inactive'} /></td>
                <td><RowActions onInspect={() => setSelected(policy)} onEdit={() => edit(policy)} onDelete={() => remove(policy)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && policies.length === 0 && <EmptyState text="No CORS policies found" />}
        {loading && <EmptyState text="Loading CORS policies..." />}
        <Pagination page={paginated.page} pageSize={PAGE_SIZE} totalItems={policies.length} onPageChange={setPage} />
      </Panel>

      {selected && <DetailModal title="CORS policy detail" record={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

function formToPayload(form) {
  return {
    name: form.name.trim(),
    allowed_origins: splitValues(form.allowed_origins),
    allowed_methods: form.allowed_methods,
    allowed_headers: form.allowed_headers,
    exposed_headers: splitValues(form.exposed_headers),
    allow_credentials: Boolean(form.allow_credentials),
    max_age: Number(form.max_age),
    is_active: Boolean(form.is_active)
  };
}

function splitValues(value) {
  return String(value || '').split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
}

function mergeValues(base, extra) {
  return [...new Set([...base, ...extra])];
}

function extraValues(values, defaults) {
  return values.filter((value) => !defaults.includes(value));
}

function toggleValue(values, value) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function ChipList({ values = [], limit = 2 }) {
  if (!values.length) return '-';
  const visible = values.slice(0, limit);
  const remaining = values.length - visible.length;
  return (
    <span className="policy-chip-list">
      {visible.map((value) => <code className="policy-chip" key={value}>{value}</code>)}
      {remaining > 0 && <code className="policy-chip muted">+{remaining}</code>}
    </span>
  );
}

function paginate(items, requestedPage, pageSize) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(requestedPage, 1), totalPages);
  return { page, items: items.slice((page - 1) * pageSize, page * pageSize) };
}
