import React, { useEffect, useMemo, useState } from 'react';
import { KeyRound, RefreshCw, Search, ShieldCheck, UserRound } from 'lucide-react';
import {
  Alert,
  DetailModal,
  EmptyState,
  Field,
  FormActions,
  Metric,
  Pagination,
  Panel,
  RowActions,
  SelectField,
  StatusPill,
  Toggle
} from '../components/common.jsx';

const PAGE_SIZE = 5;
const emptyForm = {
  name: '',
  client_type: 'partner',
  owner_user_id: '',
  is_active: true
};

export default function ClientsPage({ api, onNavigate }) {
  const [clients, setClients] = useState([]);
  const [keys, setKeys] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    loadClients();
  }, [api]);

  const clientRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = clients.filter(Boolean).map((client) => {
      const clientKeys = keys.filter((key) => key?.client_id === client.id);
      const permissionNames = uniqueValues(clientKeys.flatMap((key) => (
        Array.isArray(key.permissions)
          ? key.permissions.map((permission) => typeof permission === 'string' ? permission : permission?.name)
          : []
      )));

      return {
        ...client,
        keys: clientKeys,
        activeKeyCount: clientKeys.filter(isUsable).length,
        permissionNames
      };
    });

    if (!query) return rows;
    return rows.filter((client) => JSON.stringify(client).toLowerCase().includes(query));
  }, [clients, keys, search]);

  const paginated = useMemo(() => paginate(clientRows, page, PAGE_SIZE), [clientRows, page]);
  const activeClientCount = clients.filter((client) => client?.is_active).length;
  const usableKeyCount = keys.filter(isUsable).length;

  async function loadClients() {
    setLoading(true);
    setError('');
    try {
      const [clientList, apiKeys, options, userList] = await Promise.all([
        api.listClients(),
        api.listAPIKeys(),
        api.getAPIKeyOptions(),
        api.listUsers()
      ]);
      setClients(Array.isArray(clientList) ? clientList.filter(Boolean) : []);
      setKeys(Array.isArray(apiKeys) ? apiKeys.filter(Boolean) : []);
      setPermissions(Array.isArray(options?.permissions) ? options.permissions : []);
      setUsers(Array.isArray(userList) ? userList.filter(Boolean) : []);
    } catch (err) {
      setError(err.message || 'Cannot load clients');
    } finally {
      setLoading(false);
    }
  }

  function payloadFromForm() {
    return {
      name: form.name.trim(),
      client_type: form.client_type,
      owner_user_id: form.owner_user_id.trim(),
      is_active: Boolean(form.is_active)
    };
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.updateClient(editingId, payloadFromForm());
        setNotice('Client updated');
      } else {
        await api.createClient(payloadFromForm());
        setNotice('Client created');
      }
      cancelEdit();
      await loadClients();
    } catch (err) {
      setError(err.message || 'Cannot save client');
    }
  }

  function edit(client) {
    setEditingId(client.id);
    setForm({
      name: client.name || '',
      client_type: client.client_type || 'partner',
      owner_user_id: client.owner_user_id || '',
      is_active: client.is_active
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId('');
    setForm(emptyForm);
  }

  async function inspect(client) {
    try {
      const detail = await api.getClient(client.id);
      setSelected({
        ...detail,
        keys: keys.filter((key) => key?.client_id === client.id)
      });
    } catch (err) {
      setError(err.message || 'Cannot load client');
    }
  }

  async function remove(client) {
    if (!window.confirm(`Delete client ${client.name}?`)) return;
    setError('');
    try {
      await api.deleteClient(client.id);
      setNotice('Client deleted');
      await loadClients();
    } catch (err) {
      setError(err.message || 'Cannot delete client');
    }
  }

  return (
    <section className="content-stack">
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {notice && <Alert type="success" message={notice} onClose={() => setNotice('')} />}

      <section className="page-grid client-metrics">
        <Metric title="Clients" value={clients.length} detail={`${activeClientCount} active`} icon={UserRound} />
        <Metric title="API Keys" value={keys.length} detail={`${usableKeyCount} usable`} icon={KeyRound} onClick={() => onNavigate('api-keys')} />
        <Metric title="Permissions" value={permissions.length} detail="available scopes" icon={ShieldCheck} onClick={() => onNavigate('permissions')} />
      </section>

      <Panel title={editingId ? 'Update client' : 'Create client'} eyebrow={editingId ? 'PUT /admin/clients/:id' : 'POST /admin/clients'}>
        <form className="form-grid" onSubmit={submit}>
          <Field label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} placeholder="partner-portal" required />
          <SelectField label="Client type" value={form.client_type} onChange={(value) => setForm({ ...form, client_type: value })} options={[
            { value: 'internal_app', label: 'Internal app' },
            { value: 'partner', label: 'Partner' },
            { value: 'service', label: 'Service' }
          ]} required />
          <SelectField label="Owner" value={form.owner_user_id} onChange={(value) => setForm({ ...form, owner_user_id: value })} options={ownerOptions(users)} placeholder="No owner" />
          <Toggle label="Active" checked={form.is_active} onChange={(value) => setForm({ ...form, is_active: value })} />
          <FormActions editing={Boolean(editingId)} onCancel={cancelEdit} />
        </form>
      </Panel>

      <Panel title="Clients" eyebrow="GET /admin/clients">
        <div className="table-toolbar client-toolbar">
          <div className="client-search">
            <Search size={16} />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name, type, key or permission..." />
          </div>
          <button className="icon-button" type="button" onClick={loadClients} title="Reload clients">
            <RefreshCw className={loading ? 'spin' : ''} size={17} />
          </button>
        </div>

        <table className="data-table clients-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Type</th>
              <th>Keys</th>
              <th>Permissions</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginated.items.map((client) => (
              <tr key={client.id}>
                <td><strong>{client.name}</strong><small>{ownerLabel(client.owner_user_id, users) || client.id}</small></td>
                <td>{formatClientType(client.client_type)}</td>
                <td><strong>{client.keys.length}</strong><small>{client.activeKeyCount} active</small></td>
                <td>
                  <div className="scope-list compact-scopes">
                    {client.permissionNames.slice(0, 4).map((permission) => <code key={permission}>{permission}</code>)}
                    {client.permissionNames.length > 4 && <code>+{client.permissionNames.length - 4}</code>}
                  </div>
                  {client.permissionNames.length === 0 && <small>No permissions assigned</small>}
                </td>
                <td><StatusPill active={client.is_active} label={client.is_active ? 'active' : 'inactive'} /></td>
                <td><RowActions onInspect={() => inspect(client)} onEdit={() => edit(client)} onDelete={() => remove(client)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && paginated.items.length === 0 && <EmptyState text="No clients found" />}
        {loading && <EmptyState text="Loading clients..." />}
        <Pagination page={paginated.page} pageSize={PAGE_SIZE} totalItems={clientRows.length} onPageChange={setPage} />
      </Panel>

      {selected && <DetailModal title="Client detail" record={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

function paginate(items, requestedPage, pageSize) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(requestedPage, 1), totalPages);
  return { page, items: items.slice((page - 1) * pageSize, page * pageSize) };
}

function isUsable(key) {
  if (!key) return false;
  const expired = key.expires_at && new Date(key.expires_at) <= new Date();
  return Boolean(key.is_active && !key.revoked_at && !expired);
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function formatClientType(value) {
  return value ? value.replace('_', ' ') : '-';
}

function ownerOptions(users) {
  return users
    .filter((user) => user?.is_active)
    .map((user) => ({
      value: user.id,
      label: `${user.username} (${user.email})`
    }));
}

function ownerLabel(ownerUserID, users) {
  if (!ownerUserID) return 'No owner';
  const owner = users.find((user) => user.id === ownerUserID);
  return owner ? `${owner.username} (${owner.email})` : ownerUserID;
}
