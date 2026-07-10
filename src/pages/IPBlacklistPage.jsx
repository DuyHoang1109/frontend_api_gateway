import React, { useEffect, useMemo, useState } from 'react';
import { Alert, DetailModal, EmptyState, Field, FormActions, Pagination, Panel, RowActions, StatusPill, Toggle } from '../components/common.jsx';
import { scrollToUpdateForm } from '../utils/scrollToUpdateForm.js';

const PAGE_SIZE = 5;
const emptyForm = { ip_or_cidr: '', reason: '', expires_at: '', is_active: true };

export default function IPBlacklistPage({ api }) {
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { loadEntries(); }, [api]);

  async function loadEntries() {
    setLoading(true);
    setError('');
    try {
      setEntries(await api.listIPBlacklist());
    } catch (err) {
      setError(err.message || 'Cannot load IP blacklist');
    } finally {
      setLoading(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    const payload = {
      ip_or_cidr: form.ip_or_cidr.trim(),
      reason: form.reason.trim() || null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      is_active: Boolean(form.is_active)
    };
    try {
      if (editingId) await api.updateIPBlacklistEntry(editingId, payload);
      else await api.createIPBlacklistEntry(payload);
      setNotice(editingId ? 'IP blacklist entry updated' : 'IP blacklist entry created');
      cancelEdit();
      await loadEntries();
    } catch (err) {
      setError(err.message || 'Cannot save IP blacklist entry');
    }
  }

  function edit(entry) {
    setEditingId(entry.id);
    setForm({
      ip_or_cidr: entry.ip_or_cidr,
      reason: entry.reason || '',
      expires_at: toDateTimeLocal(entry.expires_at),
      is_active: entry.is_active
    });
    scrollToUpdateForm();
  }

  function cancelEdit() {
    setEditingId('');
    setForm(emptyForm);
  }

  async function remove(entry) {
    if (!window.confirm(`Remove ${entry.ip_or_cidr} from the active blacklist?`)) return;
    setError('');
    try {
      await api.deleteIPBlacklistEntry(entry.id);
      setNotice('IP blacklist entry removed');
      await loadEntries();
    } catch (err) {
      setError(err.message || 'Cannot remove IP blacklist entry');
    }
  }

  const paginated = useMemo(() => paginate(entries, page, PAGE_SIZE), [entries, page]);

  return (
    <section className="content-stack">
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {notice && <Alert type="success" message={notice} onClose={() => setNotice('')} />}

      <Panel title={editingId ? 'Update blocked address' : 'Block an IP address'} eyebrow={editingId ? 'PUT /admin/ip-blacklist/:id' : 'POST /admin/ip-blacklist'}>
        <form className="form-grid" onSubmit={submit}>
          <Field label="IP address or CIDR" value={form.ip_or_cidr} onChange={(value) => setForm({ ...form, ip_or_cidr: value })} placeholder="192.168.1.10 or 10.0.0.0/24" required />
          <Field label="Reason" value={form.reason} onChange={(value) => setForm({ ...form, reason: value })} placeholder="Abusive traffic" />
          <Field label="Expires at" type="datetime-local" value={form.expires_at} onChange={(value) => setForm({ ...form, expires_at: value })} />
          <Toggle label="Active" checked={form.is_active} onChange={(value) => setForm({ ...form, is_active: value })} />
          <FormActions editing={Boolean(editingId)} onCancel={cancelEdit} />
        </form>
      </Panel>

      <Panel title="IP blacklist" eyebrow="GET /admin/ip-blacklist">
        <table className="data-table">
          <thead><tr><th>Address</th><th>Reason</th><th>Expires</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {paginated.items.map((entry) => (
              <tr key={entry.id}>
                <td><strong>{entry.ip_or_cidr}</strong><small>{entry.id}</small></td>
                <td>{entry.reason || '-'}</td>
                <td>{entry.expires_at ? new Date(entry.expires_at).toLocaleString() : 'Never'}</td>
                <td><StatusPill active={entry.is_active} label={entry.is_active ? 'blocked' : 'inactive'} /></td>
                <td><RowActions onInspect={() => setSelected(entry)} onEdit={() => edit(entry)} onDelete={() => remove(entry)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && entries.length === 0 && <EmptyState text="No blocked addresses found" />}
        {loading && <EmptyState text="Loading IP blacklist..." />}
        <Pagination page={paginated.page} pageSize={PAGE_SIZE} totalItems={entries.length} onPageChange={setPage} />
      </Panel>

      {selected && <DetailModal title="IP blacklist detail" record={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function paginate(items, requestedPage, pageSize) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(requestedPage, 1), totalPages);
  return { page, items: items.slice((page - 1) * pageSize, page * pageSize) };
}
