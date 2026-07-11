import React from 'react';
import { Loader2, RefreshCcw } from 'lucide-react';
import { EmptyState, Field, FormActions, Pagination, Panel, RowActions, SelectField, StatusPill, Toggle } from '../components/common.jsx';

export default function InstancesPage(props) {
  const {
    services,
    instances,
    form,
    setForm,
    editing,
    onSubmit,
    onCancel,
    onEdit,
    onDelete,
    onInspect,
    serviceName,
    canWrite = false,
    instanceHealth = {},
    healthLoading = false,
    checkingInstanceId = '',
    onCheckInstance,
    canRunInstanceCheck = false,
    page,
    pageSize,
    totalItems,
    onPageChange
  } = props;

  return (
    <section className="content-stack">
      {canWrite && (
        <Panel title={editing ? 'Update instance' : 'Create instance'} eyebrow={editing ? 'PUT /admin/instances/:id' : 'POST /admin/services/:id/instances'}>
          <form className="form-grid" onSubmit={onSubmit}>
            <SelectField label="Service" value={form.service_id} onChange={(value) => setForm({ ...form, service_id: value })} options={services.map((service) => ({ value: service.id, label: service.name }))} required />
            <Field label="Host" value={form.host} onChange={(value) => setForm({ ...form, host: value })} required />
            <Field label="Port" type="number" value={form.port} onChange={(value) => setForm({ ...form, port: value })} required />
            <Field label="Weight" type="number" value={form.weight} onChange={(value) => setForm({ ...form, weight: value })} />
            <Toggle label="Active" checked={form.is_active} onChange={(value) => setForm({ ...form, is_active: value })} />
            <FormActions editing={editing} onCancel={onCancel} />
          </form>
        </Panel>
      )}

      <Panel title="Instances" eyebrow="GET /admin/instances">
        <table className="data-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Host</th>
              <th>Port</th>
              <th>Weight</th>
              <th>Configuration</th>
              <th>Runtime health</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {instances.map((instance) => {
              const runtime = runtimeHealth(instance, instanceHealth[instance.id], healthLoading);
              const checking = checkingInstanceId === instance.id;
              return (
                <tr key={instance.id}>
                  <td><strong>{serviceName(instance.service_id)}</strong><small>{instance.service_id}</small></td>
                  <td>{instance.host}</td>
                  <td>{instance.port}</td>
                  <td>{instance.weight}</td>
                  <td><StatusPill active={instance.is_active} label={instance.is_active ? 'active' : 'inactive'} /></td>
                  <td>
                    <StatusPill active={runtime.healthy} label={runtime.label} />
                    {runtime.detail && <small>{runtime.detail}</small>}
                  </td>
                  <td>
                    <RowActions
                      onInspect={() => onInspect(instance)}
                      onEdit={canWrite ? () => onEdit(instance) : undefined}
                      onDelete={canWrite ? () => onDelete(instance) : undefined}
                    >
                      {canRunInstanceCheck && (
                        <button
                          className="ghost-icon"
                          type="button"
                          onClick={() => onCheckInstance?.(instance.id)}
                          disabled={checking}
                          title="Run health check"
                        >
                          {checking ? <Loader2 className="spin" size={16} /> : <RefreshCcw size={16} />}
                        </button>
                      )}
                    </RowActions>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {instances.length === 0 && <EmptyState text="No instances found" />}
        <Pagination page={page} pageSize={pageSize} totalItems={totalItems} onPageChange={onPageChange} />
      </Panel>
    </section>
  );
}

function runtimeHealth(instance, health, loading) {
  if (!instance.is_active) return { healthy: false, label: 'not checked', detail: 'inactive config' };
  if (!health) return { healthy: false, label: loading ? 'checking' : 'unknown', detail: '' };
  if (health.error) return { healthy: false, label: 'unavailable', detail: '' };
  if (health.status === 'alive') {
    return {
      healthy: true,
      label: 'alive',
      detail: Number.isFinite(health.latency_ms) ? `${health.latency_ms.toFixed(2)} ms` : ''
    };
  }
  if (health.status === 'down') return { healthy: false, label: 'down', detail: `${health.fail_count || 0} failed` };
  return { healthy: false, label: health.status || 'unknown', detail: '' };
}
