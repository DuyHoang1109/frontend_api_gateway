import React from 'react';
import { AlertCircle, Check, ChevronLeft, ChevronRight, CircleCheck, Database, Edit3, Info, Plus, Save, Trash2, X } from 'lucide-react';
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

export function SelectField({ label, value, onChange, options, required = false, placeholder = 'Choose...' }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value || ''} required={required} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder}</option>
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
      <span className="action-group">
        <button className="ghost-icon" onClick={onInspect} title="View detail"><Database size={16} /></button>
        <button className="ghost-icon" onClick={onEdit} title="Edit"><Edit3 size={16} /></button>
      </span>
      {children && <span className="action-group secondary-actions">{children}</span>}
      <span className="action-group danger-actions">
        <button className="danger-icon" onClick={onDelete} title="Delete"><Trash2 size={16} /></button>
      </span>
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

export function Alert({ type, message, onClose, autoDismissMs = 4000, className = '' }) {
  React.useEffect(() => {
    if (!message || !autoDismissMs || !onClose) return undefined;
    const timer = window.setTimeout(onClose, autoDismissMs);
    return () => window.clearTimeout(timer);
  }, [message, autoDismissMs, onClose]);

  const Icon = type === 'error' ? AlertCircle : type === 'success' ? CircleCheck : Info;

  return (
    <div className={`alert ${type} ${className}`} role="status">
      <span className="alert-icon"><Icon size={17} /></span>
      <span className="alert-message">{message}</span>
      <button type="button" onClick={onClose} title="Close"><X size={15} /></button>
      {autoDismissMs ? <span className="alert-timer" style={{ '--alert-duration': `${autoDismissMs}ms` }} /> : null}
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
  const pages = paginationItems(safePage, totalPages);

  return (
    <div className="pagination-bar">
      <span>Showing {start}-{end} of {totalItems}</span>
      <div className="pagination-controls" aria-label="Pagination">
        <button className="icon-button" type="button" onClick={() => onPageChange(safePage - 1)} disabled={safePage === 1} title="Previous page">
          <ChevronLeft size={16} />
        </button>
        {pages.map((item, index) => (
          item === 'ellipsis' ? (
            <span className="page-ellipsis" key={`ellipsis-${index}`}>...</span>
          ) : (
            <button
              className={`page-button ${item === safePage ? 'active' : ''}`}
              type="button"
              key={item}
              onClick={() => onPageChange(item)}
              aria-label={`Page ${item}`}
              aria-current={item === safePage ? 'page' : undefined}
            >
              {item}
            </button>
          )
        ))}
        <button className="icon-button" type="button" onClick={() => onPageChange(safePage + 1)} disabled={safePage === totalPages} title="Next page">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function paginationItems(currentPage, totalPages) {
  if (totalPages <= 9) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const visible = new Set([1, 2, totalPages - 1, totalPages]);
  for (let page = currentPage - 2; page <= currentPage + 2; page += 1) {
    if (page >= 1 && page <= totalPages) visible.add(page);
  }

  const sorted = Array.from(visible).sort((a, b) => a - b);
  const items = [];
  sorted.forEach((page, index) => {
    const previous = sorted[index - 1];
    if (previous && page - previous > 1) items.push('ellipsis');
    items.push(page);
  });
  return items;
}
