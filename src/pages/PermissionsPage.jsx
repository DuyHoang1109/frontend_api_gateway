import React, { useEffect, useMemo, useState } from 'react';
import { Database, RefreshCw, X } from 'lucide-react';
import { EmptyState, Pagination, Panel, StatusPill } from '../components/common.jsx';

const PAGE_SIZE = 10;

export default function PermissionsPage({ api }) {
  const [permissions, setPermissions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadPermissions(); }, [api]);

  const filteredPermissions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return permissions;
    return permissions.filter((permission) =>
      `${permission.name} ${permission.resource} ${permission.action}`.toLowerCase().includes(query)
    );
  }, [permissions, search]);

  const totalPages = Math.max(1, Math.ceil(filteredPermissions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visiblePermissions = filteredPermissions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function loadPermissions() {
    setLoading(true);
    setError('');
    try {
      setPermissions(await api.listPermissions());
    } catch (err) {
      setError(err.message || 'Cannot load permissions');
    } finally {
      setLoading(false);
    }
  }

  async function inspect(permission) {
    setError('');
    try {
      setSelected(await api.getPermission(permission.id));
    } catch (err) {
      setError(err.message || 'Cannot load permission detail');
    }
  }

  return (
    <section className="content-stack">
      {error && <div className="alert error"><span>{error}</span><button type="button" onClick={() => setError('')}><X size={16} /></button></div>}

      <Panel title="Permissions" eyebrow="GET /admin/permissions">
        <div className="table-toolbar">
          <input
            type="search"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Search name, resource or action..."
          />
          <button className="icon-button" type="button" onClick={loadPermissions} title="Reload permissions">
            <RefreshCw className={loading ? 'spin' : ''} size={17} />
          </button>
        </div>
        <table className="data-table authorization-table">
          <thead><tr><th>Permission</th><th>Resource</th><th>Action</th><th>Status</th><th></th></tr></thead>
          <tbody>{visiblePermissions.map((permission) => (
            <tr key={permission.id}>
              <td><code className="permission-name">{permission.name}</code></td>
              <td>{permission.resource}</td>
              <td>{permission.action}</td>
              <td><StatusPill active={permission.is_active} label={permission.is_active ? 'active' : 'inactive'} /></td>
              <td><button className="ghost-icon" type="button" onClick={() => inspect(permission)} title={`View ${permission.name}`}><Database size={16} /></button></td>
            </tr>
          ))}</tbody>
        </table>
        {!loading && visiblePermissions.length === 0 && <EmptyState text="No permissions found" />}
        <Pagination page={safePage} pageSize={PAGE_SIZE} totalItems={filteredPermissions.length} onPageChange={setPage} />
      </Panel>

      {selected && <PermissionDetail permission={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

function PermissionDetail({ permission, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="detail-modal authorization-detail" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div><small>Permission detail</small><h2>{permission.name}</h2></div>
          <button className="icon-button" type="button" onClick={onClose} title="Close"><X size={18} /></button>
        </div>
        <div className="detail-grid">
          <DetailItem label="Name" value={permission.name} wide />
          <DetailItem label="Resource" value={permission.resource} />
          <DetailItem label="Action" value={permission.action} />
          <DetailItem label="Status" value={permission.is_active ? 'Active' : 'Inactive'} />
          <DetailItem label="Created" value={formatDate(permission.created_at)} />
          <DetailItem label="Updated" value={formatDate(permission.updated_at)} />
        </div>
      </section>
    </div>
  );
}

function DetailItem({ label, value, wide = false }) {
  return <div className={`detail-item ${wide ? 'wide' : ''}`}><span>{label}</span><strong>{value}</strong></div>;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : '-';
}
