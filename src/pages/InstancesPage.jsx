import React from 'react';
import { EmptyState, Field, FormActions, Panel, RowActions, SelectField, StatusPill, Toggle } from '../components/common.jsx';

export default function InstancesPage(props) {
  const { services, instances, form, setForm, editing, onSubmit, onCancel, onEdit, onDelete, onInspect, serviceName } = props;

  return (
    <section className="content-stack">
      <Panel title={editing ? 'Update instance' : 'Create instance'} eyebrow="POST /admin/services/:id/instances">
        <form className="form-grid" onSubmit={onSubmit}>
          <SelectField label="Service" value={form.service_id} onChange={(value) => setForm({ ...form, service_id: value })} options={services.map((service) => ({ value: service.id, label: service.name }))} required />
          <Field label="Host" value={form.host} onChange={(value) => setForm({ ...form, host: value })} required />
          <Field label="Port" type="number" value={form.port} onChange={(value) => setForm({ ...form, port: value })} required />
          <Field label="Weight" type="number" value={form.weight} onChange={(value) => setForm({ ...form, weight: value })} />
          <Toggle label="Active" checked={form.is_active} onChange={(value) => setForm({ ...form, is_active: value })} />
          <FormActions editing={editing} onCancel={onCancel} />
        </form>
      </Panel>

      <Panel title="Instances" eyebrow="GET /admin/instances">
        <table className="data-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Host</th>
              <th>Port</th>
              <th>Weight</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {instances.map((instance) => (
              <tr key={instance.id}>
                <td><strong>{serviceName(instance.service_id)}</strong><small>{instance.service_id}</small></td>
                <td>{instance.host}</td>
                <td>{instance.port}</td>
                <td>{instance.weight}</td>
                <td><StatusPill active={instance.is_active} label={instance.is_active ? 'active' : 'inactive'} /></td>
                <td><RowActions onInspect={() => onInspect(instance)} onEdit={() => onEdit(instance)} onDelete={() => onDelete(instance)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {instances.length === 0 && <EmptyState text="No instances found" />}
      </Panel>
    </section>
  );
}
