import React, { useEffect, useMemo, useState } from 'react';
import { Database, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { EmptyState, Pagination, Panel, StatusPill } from '../components/common.jsx';

const PAGE_SIZE = 8;

export default function RolesPage({ api }) {
  const [roles, setRoles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadRoles(); }, [api]);

  const filteredRoles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return roles;
    return roles.filter((role) => `${role.name} ${role.description || ''}`.toLowerCase().includes(query));
  }, [roles, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRoles.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleRoles = filteredRoles.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function loadRoles() {
    setLoading(true);
    setError('');
    try {
      setRoles(await api.listRoles());
    } catch (err) {
      setError(err.message || 'Cannot load roles');
    } finally {
      setLoading(false);
    }
  }

  async function inspect(role) {
    setDetailLoading(true);
    setError('');
    try {
      const [detail, permissions] = await Promise.all([
        api.getRole(role.id),
        api.getRolePermissions(role.id)
      ]);
      setSelected({ ...detail, permissions: Array.isArray(permissions) ? permissions : [] });
    } catch (err) {
      setError(err.message || 'Cannot load role detail');
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <section className="content-stack">
      {error && <div className="alert error"><span>{error}</span><button type="button" onClick={() => setError('')}><X size={16} /></button></div>}

      <Panel title="Roles" eyebrow="GET /admin/roles">
        <div className="table-toolbar">
          <input
            type="search"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Search role name or description..."
          />
          <button className="icon-button" type="button" onClick={loadRoles} title="Reload roles">
            <RefreshCw className={loading ? 'spin' : ''} size={17} />
          </button>
        </div>
        <table className="data-table authorization-table">
          <thead><tr><th>Role</th><th>Description</th><th>Status</th><th>Updated</th><th></th></tr></thead>
          <tbody>{visibleRoles.map((role) => (
            <tr key={role.id}>
              <td><strong>{role.name}</strong></td>
              <td>{role.description || '-'}</td>
              <td><StatusPill active={role.is_active} label={role.is_active ? 'active' : 'inactive'} /></td>
              <td>{formatDate(role.updated_at)}</td>
              <td><button className="ghost-icon" type="button" onClick={() => inspect(role)} disabled={detailLoading} title={`View ${role.name}`}><Database size={16} /></button></td>
            </tr>
          ))}</tbody>
        </table>
        {!loading && visibleRoles.length === 0 && <EmptyState text="No roles found" />}
        <Pagination page={safePage} pageSize={PAGE_SIZE} totalItems={filteredRoles.length} onPageChange={setPage} />
      </Panel>

      {selected && <RoleDetail role={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

function RoleDetail({ role, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="detail-modal authorization-detail" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div><small>Role detail</small><h2>{role.name}</h2></div>
          <button className="icon-button" type="button" onClick={onClose} title="Close"><X size={18} /></button>
        </div>
        <div className="detail-grid">
          <DetailItem label="Name" value={role.name} />
          <DetailItem label="Status" value={role.is_active ? 'Active' : 'Inactive'} />
          <DetailItem label="Description" value={role.description || '-'} wide />
          <DetailItem label="Created" value={formatDate(role.created_at)} />
          <DetailItem label="Updated" value={formatDate(role.updated_at)} />
        </div>
        <div className="assigned-permissions-head">
          <div><ShieldCheck size={18} /><strong>Assigned permissions</strong></div>
          <span>{role.permissions.length}</span>
        </div>
        {role.permissions.length > 0 ? (
          <div className="permission-detail-list">
            {role.permissions.map((permission) => (
              <div key={permission.name}>
                <code>{permission.name}</code>
                <small>Resource: {permission.resource} · Action: {permission.action}</small>
              </div>
            ))}
          </div>
        ) : <EmptyState text="This role has no assigned permissions" />}
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
