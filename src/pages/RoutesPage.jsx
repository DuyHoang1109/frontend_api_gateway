import React from 'react';
import { EmptyState, Field, FormActions, Pagination, Panel, RowActions, SelectField, StatusPill, Toggle } from '../components/common.jsx';

export default function RoutesPage(props) {
  const { services, routes, form, setForm, editing, onSubmit, onCancel, onEdit, onDelete, onInspect, serviceName, page, pageSize, totalItems, onPageChange } = props;

  return (
    <section className="content-stack">
      <Panel title={editing ? 'Update route' : 'Create route'} eyebrow="POST /admin/routes">
        <form className="form-grid" onSubmit={onSubmit}>
          <Field label="Path" value={form.path} onChange={(value) => setForm({ ...form, path: value })} placeholder="/api/products" required />
          <SelectField label="Method" value={form.method} onChange={(value) => setForm({ ...form, method: value })} options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE']} />
          <SelectField label="Service" value={form.service_id} onChange={(value) => setForm({ ...form, service_id: value })} options={services.map((service) => ({ value: service.id, label: service.name }))} required />
          <Field label="Rewrite target" value={form.rewrite_target || ''} onChange={(value) => setForm({ ...form, rewrite_target: value })} placeholder="/api/products" />
          <Field label="Rate limit id" value={form.rate_limit_id || ''} onChange={(value) => setForm({ ...form, rate_limit_id: value })} />
          <Field label="Priority" type="number" value={form.priority} onChange={(value) => setForm({ ...form, priority: value })} />
          <Toggle label="Strip prefix" checked={form.strip_prefix} onChange={(value) => setForm({ ...form, strip_prefix: value })} />
          <Toggle label="Auth required" checked={form.auth_required} onChange={(value) => setForm({ ...form, auth_required: value })} />
          <Toggle label="Active" checked={form.is_active} onChange={(value) => setForm({ ...form, is_active: value })} />
          <FormActions editing={editing} onCancel={onCancel} />
        </form>
      </Panel>

      <Panel title="Routes" eyebrow="GET /admin/routes">
        <table className="data-table">
          <thead>
            <tr>
              <th>Route</th>
              <th>Service</th>
              <th>Rewrite</th>
              <th>Strip</th>
              <th>Auth</th>
              <th>Priority</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {routes.map((route) => (
              <tr key={route.id}>
                <td><strong><span className="method">{route.method}</span> {route.path}</strong><small>{route.id}</small></td>
                <td>{serviceName(route.service_id)}</td>
                <td>{route.rewrite_target || '-'}</td>
                <td>{route.strip_prefix ? 'yes' : 'no'}</td>
                <td>{route.auth_required ? 'required' : 'public'}</td>
                <td>{route.priority}</td>
                <td><StatusPill active={route.is_active} label={route.is_active ? 'active' : 'inactive'} /></td>
                <td><RowActions onInspect={() => onInspect(route)} onEdit={() => onEdit(route)} onDelete={() => onDelete(route)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {routes.length === 0 && <EmptyState text="No routes found" />}
        <Pagination page={page} pageSize={pageSize} totalItems={totalItems} onPageChange={onPageChange} />
      </Panel>
    </section>
  );
}
