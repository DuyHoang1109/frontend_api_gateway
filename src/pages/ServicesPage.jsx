import React from 'react';
import { EmptyState, Field, FormActions, Panel, RowActions, SelectField, StatusPill, Toggle } from '../components/common.jsx';

export default function ServicesPage(props) {
  const { services, form, setForm, editing, onSubmit, onCancel, onEdit, onDelete, onInspect, instanceCount, routeCount } = props;

  return (
    <section className="content-stack">
      <Panel title={editing ? 'Update service' : 'Create service'} eyebrow="POST /admin/services">
        <form className="form-grid" onSubmit={onSubmit}>
          <Field label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
          <Field label="Description" value={form.description || ''} onChange={(value) => setForm({ ...form, description: value })} />
          <SelectField label="Protocol" value={form.protocol} onChange={(value) => setForm({ ...form, protocol: value })} options={['http', 'https', 'grpc']} />
          <SelectField label="LB Strategy" value={form.lb_strategy} onChange={(value) => setForm({ ...form, lb_strategy: value })} options={['round_robin', 'weighted']} />
          <Field label="Timeout ms" type="number" value={form.timeout_ms} onChange={(value) => setForm({ ...form, timeout_ms: value })} />
          <Field label="Retry" type="number" value={form.retry_count} onChange={(value) => setForm({ ...form, retry_count: value })} />
          <Toggle label="Circuit breaker" checked={form.circuit_breaker_enabled} onChange={(value) => setForm({ ...form, circuit_breaker_enabled: value })} />
          <Toggle label="Active" checked={form.is_active} onChange={(value) => setForm({ ...form, is_active: value })} />
          <FormActions editing={editing} onCancel={onCancel} />
        </form>
      </Panel>

      <Panel title="Services" eyebrow="GET /admin/services">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Protocol</th>
              <th>LB</th>
              <th>Timeout</th>
              <th>Instances</th>
              <th>Routes</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.id}>
                <td><strong>{service.name}</strong><small>{service.description || service.id}</small></td>
                <td>{service.protocol}</td>
                <td>{service.lb_strategy}</td>
                <td>{service.timeout_ms} ms</td>
                <td>{instanceCount(service.id)}</td>
                <td>{routeCount(service.id)}</td>
                <td><StatusPill active={service.is_active} label={service.is_active ? 'active' : 'inactive'} /></td>
                <td><RowActions onInspect={() => onInspect(service)} onEdit={() => onEdit(service)} onDelete={() => onDelete(service)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {services.length === 0 && <EmptyState text="No services found" />}
      </Panel>
    </section>
  );
}
