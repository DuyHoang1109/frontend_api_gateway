import React from 'react';
import { Check, ChevronLeft, ChevronRight, Database, Edit3, Plus, Save, Trash2, X } from 'lucide-react';
import { backendFeatureStatus } from '../config/navigation.jsx';

export function Panel({ title, eyebrow, children, className = '' }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-title">
        <div>
          <p>{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

export function Field({ label, value, onChange, type = 'text', required = false, placeholder = '' }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value ?? ''} required={required} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function SelectField({ label, value, onChange, options, required = false }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value || ''} required={required} onChange={(event) => onChange(event.target.value)}>
        <option value="">Choose...</option>
        {options.map((option) => {
          const normalized = typeof option === 'string' ? { value: option, label: option } : option;
          return <option key={normalized.value} value={normalized.value}>{normalized.label}</option>;
        })}
      </select>
    </label>
  );
}

export function Toggle({ label, checked, onChange }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function FormActions({ editing, onCancel }) {
  return (
    <div className="form-actions">
      <button className="primary-button" type="submit">
        {editing ? <Save size={17} /> : <Plus size={17} />}
        {editing ? 'Update' : 'Create'}
      </button>
      {editing && (
        <button className="ghost-button" type="button" onClick={onCancel}>
          <X size={17} />
          Cancel
        </button>
      )}
    </div>
  );
}

export function RowActions({ onInspect, onEdit, onDelete, children }) {
  return (
    <div className="row-actions">
      {children}
      <button className="ghost-icon" onClick={onInspect} title="View detail"><Database size={16} /></button>
      <button className="ghost-icon" onClick={onEdit} title="Edit"><Edit3 size={16} /></button>
      <button className="danger-icon" onClick={onDelete} title="Delete"><Trash2 size={16} /></button>
    </div>
  );
}

export function Metric({ title, value, detail, icon: Icon, onClick }) {
  return (
    <button className="metric" onClick={onClick} type="button">
      <div className="metric-icon"><Icon size={22} /></div>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </button>
  );
}

export function StatusPill({ active, label }) {
  return (
    <span className={`status-pill ${active ? 'ok' : 'muted'}`}>
      {active ? <Check size={13} /> : <X size={13} />}
      {label}
    </span>
  );
}

export function StatusBadge({ status }) {
  const label =
    status === 'bound' ? 'Bound to GW_v1' :
    status === 'covered' ? 'Covered by another page' :
    status === 'partial' ? 'Partially bound' :
    status === 'local' ? 'Local only' :
    'Backend API missing';

  return <span className={`status-badge ${status}`}>{label}</span>;
}

export function InfoItem({ label, value }) {
  return (
    <div className="info-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function HealthCard({ title, active, payload }) {
  return (
    <div className="feature-card">
      <StatusPill active={active} label={active ? 'online' : 'offline'} />
      <strong>{title}</strong>
      <small>{payload ? JSON.stringify(payload) : 'No response loaded'}</small>
    </div>
  );
}

export function FeatureMatrix({ onlyMissing = false }) {
  const features = Object.entries(backendFeatureStatus)
    .filter(([, feature]) => !onlyMissing || feature.status === 'missing');

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Module</th>
          <th>Status</th>
          <th>Endpoints</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        {features.map(([id, feature]) => (
          <tr key={id}>
            <td><strong>{feature.title}</strong><small>{id}</small></td>
            <td><StatusBadge status={feature.status} /></td>
            <td>{feature.endpoints.map((endpoint) => <code className="inline-code" key={endpoint}>{endpoint}</code>)}</td>
            <td>{feature.summary}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Alert({ type, message, onClose }) {
  return (
    <div className={`alert ${type}`}>
      <span>{message}</span>
      <button onClick={onClose} title="Close"><X size={16} /></button>
    </div>
  );
}

export function DetailModal({ title, record, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="detail-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose}><X size={18} /></button>
        </div>
        <pre>{JSON.stringify(record, null, 2)}</pre>
      </section>
    </div>
  );
}

export function EmptyState({ text }) {
  return <div className="empty-state">{text}</div>;
}

export function Pagination({ page, pageSize, totalItems, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = totalItems === 0 ? 0 : ((safePage - 1) * pageSize) + 1;
  const end = Math.min(safePage * pageSize, totalItems);

  return (
    <div className="pagination-bar">
      <span>Showing {start}-{end} of {totalItems}</span>
      <div className="pagination-controls" aria-label="Pagination">
        <button className="icon-button" type="button" onClick={() => onPageChange(safePage - 1)} disabled={safePage === 1} title="Previous page">
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
          <button
            className={`page-button ${pageNumber === safePage ? 'active' : ''}`}
            type="button"
            key={pageNumber}
            onClick={() => onPageChange(pageNumber)}
            aria-label={`Page ${pageNumber}`}
            aria-current={pageNumber === safePage ? 'page' : undefined}
          >
            {pageNumber}
          </button>
        ))}
        <button className="icon-button" type="button" onClick={() => onPageChange(safePage + 1)} disabled={safePage === totalPages} title="Next page">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
