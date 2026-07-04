import React, { useEffect, useMemo, useState } from 'react';
import { Alert, DetailModal, EmptyState, Field, FormActions, Pagination, Panel, RowActions, SelectField, StatusPill, Toggle } from '../components/common.jsx';

const PAGE_SIZE = 5;
const emptyForm = {
  name: '',
  limit_type: 'ip',
  max_requests: 100,
  window_seconds: 60,
  is_active: true
};

export default function RateLimitsPage({ api }) {
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
      setPolicies(await api.listRateLimitPolicies());
    } catch (err) {
      setError(err.message || 'Cannot load rate limit policies');
    } finally {
      setLoading(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    const payload = {
      name: form.name.trim(),
      limit_type: form.limit_type,
      max_requests: Number(form.max_requests),
      window_seconds: Number(form.window_seconds),
      is_active: Boolean(form.is_active)
    };
    try {
      if (editingId) await api.updateRateLimitPolicy(editingId, payload);
      else await api.createRateLimitPolicy(payload);
      setNotice(editingId ? 'Rate limit policy updated' : 'Rate limit policy created');
      cancelEdit();
      await loadPolicies();
    } catch (err) {
      setError(err.message || 'Cannot save rate limit policy');
    }
  }

  function edit(policy) {
    setEditingId(policy.id);
    setForm({
      name: policy.name,
      limit_type: policy.limit_type,
      max_requests: policy.max_requests,
      window_seconds: policy.window_seconds,
      is_active: policy.is_active
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId('');
    setForm(emptyForm);
  }

  async function remove(policy) {
    if (!window.confirm(`Delete rate limit policy ${policy.name}?`)) return;
    setError('');
    try {
      await api.deleteRateLimitPolicy(policy.id);
      setNotice('Rate limit policy deleted');
      await loadPolicies();
    } catch (err) {
      setError(err.message || 'Cannot delete rate limit policy');
    }
  }

  const paginated = useMemo(() => paginate(policies, page, PAGE_SIZE), [policies, page]);

  return (
    <section className="content-stack">
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {notice && <Alert type="success" message={notice} onClose={() => setNotice('')} />}

      <Panel title={editingId ? 'Update rate limit policy' : 'Create rate limit policy'} eyebrow={editingId ? 'PUT /admin/rate-limit-policies/:id' : 'POST /admin/rate-limit-policies'}>
        <form className="form-grid" onSubmit={submit}>
          <Field label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} placeholder="Public API limit" required />
          <SelectField label="Limit by" value={form.limit_type} onChange={(value) => setForm({ ...form, limit_type: value })} options={[
            { value: 'ip', label: 'IP address' },
            { value: 'user', label: 'User' },
            { value: 'api_key', label: 'API key' }
          ]} required />
          <Field label="Maximum requests" type="number" value={form.max_requests} onChange={(value) => setForm({ ...form, max_requests: value })} required />
          <Field label="Window (seconds)" type="number" value={form.window_seconds} onChange={(value) => setForm({ ...form, window_seconds: value })} required />
          <Toggle label="Active" checked={form.is_active} onChange={(value) => setForm({ ...form, is_active: value })} />
          <FormActions editing={Boolean(editingId)} onCancel={cancelEdit} />
        </form>
      </Panel>

      <Panel title="Rate limit policies" eyebrow="GET /admin/rate-limit-policies">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Limit by</th><th>Allowance</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {paginated.items.map((policy) => (
              <tr key={policy.id}>
                <td><strong>{policy.name}</strong><small>{policy.id}</small></td>
                <td>{policy.limit_type}</td>
                <td>{policy.max_requests} requests / {policy.window_seconds}s</td>
                <td><StatusPill active={policy.is_active} label={policy.is_active ? 'active' : 'inactive'} /></td>
                <td><RowActions onInspect={() => setSelected(policy)} onEdit={() => edit(policy)} onDelete={() => remove(policy)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && policies.length === 0 && <EmptyState text="No rate limit policies found" />}
        {loading && <EmptyState text="Loading rate limit policies..." />}
        <Pagination page={paginated.page} pageSize={PAGE_SIZE} totalItems={policies.length} onPageChange={setPage} />
      </Panel>

      {selected && <DetailModal title="Rate limit policy detail" record={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

function paginate(items, requestedPage, pageSize) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(requestedPage, 1), totalPages);
  return { page, items: items.slice((page - 1) * pageSize, page * pageSize) };
}
