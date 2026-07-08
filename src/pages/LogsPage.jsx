import React, { useEffect, useMemo, useState } from 'react';
import { Database, RefreshCw, Search, X } from 'lucide-react';
import { Alert, DetailModal, EmptyState, Field, Pagination, Panel, SelectField } from '../components/common.jsx';

const PAGE_SIZE = 10;
const initialFilters = {
  q: '',
  service_name: '',
  method: '',
  status_class: '',
  status_code: '',
  client_ip: ''
};

export default function LogsPage({ api }) {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const query = useMemo(() => ({
    ...appliedFilters,
    page,
    limit: PAGE_SIZE,
    sort: '@timestamp:desc'
  }), [appliedFilters, page]);

  useEffect(() => {
    loadLogs();
  }, [query]);

  async function loadLogs() {
    setLoading(true);
    setError('');
    try {
      const result = api.getLogsPage ? await api.getLogsPage(query) : { items: await api.getLogs(query), meta: {} };
      setLogs(result.items);
      setTotalItems(Number(result.meta?.total ?? result.items.length));
    } catch (err) {
      setLogs([]);
      setTotalItems(0);
      setError(err.message || 'Cannot load logs');
    } finally {
      setLoading(false);
    }
  }

  function applyFilters(event) {
    event.preventDefault();
    const validationError = validateStatusFilters(filters);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setPage(1);
    setAppliedFilters(filters);
  }

  function clearFilters() {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setPage(1);
  }

  function updateStatusClass(statusClass) {
    setFilters((current) => ({
      ...current,
      status_class: statusClass,
      status_code: statusCodeMatchesClass(current.status_code, statusClass) ? current.status_code : ''
    }));
  }

  function updateStatusCode(statusCode) {
    const normalizedCode = statusCode.replace(/\D/g, '').slice(0, 3);
    setFilters((current) => ({
      ...current,
      status_code: normalizedCode,
      status_class: current.status_class || statusClassForCode(normalizedCode)
    }));
  }

  return (
    <section className="content-stack">
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      <Panel title="Request logs" eyebrow="GET /admin/logs" className="request-logs-panel">
        <form className="form-grid logs-filter-form" onSubmit={applyFilters}>
          <Field label="Search" value={filters.q} onChange={(value) => setFilters({ ...filters, q: value })} placeholder="trace, path, error..." />
          <Field label="Service" value={filters.service_name} onChange={(value) => setFilters({ ...filters, service_name: value })} placeholder="order-service" />
          <SelectField label="Method" value={filters.method} onChange={(value) => setFilters({ ...filters, method: value })} options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE']} />
          <SelectField label="Status class" value={filters.status_class} onChange={updateStatusClass} options={['2xx', '3xx', '4xx', '5xx']} />
          <Field label="Status code" value={filters.status_code} onChange={updateStatusCode} placeholder="200" />
          <Field label="Client IP" value={filters.client_ip} onChange={(value) => setFilters({ ...filters, client_ip: value })} placeholder="127.0.0.1" />
          <div className="form-actions logs-actions">
            <button className="primary-button" type="submit"><Search size={17} />Search</button>
            <button className="icon-button" type="button" onClick={loadLogs} title="Reload logs"><RefreshCw className={loading ? 'spin' : ''} size={17} /></button>
            <button className="ghost-button" type="button" onClick={clearFilters}><X size={17} />Clear</button>
          </div>
        </form>
      </Panel>

      <Panel title="Log stream" eyebrow="Elasticsearch" className="log-stream-panel">
        <table className="data-table logs-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Request</th>
              <th>Service</th>
              <th>Client</th>
              <th>Status</th>
              <th>Latency</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, index) => (
              <tr key={log.trace_id || `${log['@timestamp']}-${index}`}>
                <td>{formatDate(log['@timestamp'])}<small>{log.trace_id || '-'}</small></td>
                <td><span className={`method-badge ${String(log.method || '').toLowerCase()}`}>{log.method || '-'}</span><small><code className="path-code">{log.path || log.normalized_path || '-'}</code></small></td>
                <td>{log.service_name || '-'}<small>{log.route_id || '-'}</small></td>
                <td>{log.client_ip || '-'}<small>{log.api_key_id ? `key ${shortId(log.api_key_id)}` : log.user_id ? `user ${shortId(log.user_id)}` : '-'}</small></td>
                <td><span className={`status-code s${String(log.status_code || '')[0]}`}>{log.status_code || '-'}</span><small>{log.error_type || ''}</small></td>
                <td>{Math.round(Number(log.response_time_ms || 0))}ms<small>upstream {Math.round(Number(log.upstream_latency_ms || 0))}ms</small></td>
                <td><button className="ghost-icon" type="button" onClick={() => setSelected(log)} title="View detail"><Database size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && logs.length === 0 && <EmptyState text="No request logs found" />}
        <Pagination page={page} pageSize={PAGE_SIZE} totalItems={totalItems} onPageChange={setPage} />
      </Panel>

      {selected && <DetailModal title="Log detail" record={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function shortId(value) {
  return String(value || '').slice(0, 8);
}

function statusClassForCode(statusCode) {
  if (!/^[1-5]\d{2}$/.test(statusCode)) return '';
  return `${statusCode[0]}xx`;
}

function statusCodeMatchesClass(statusCode, statusClass) {
  if (!statusCode || !statusClass) return true;
  return statusClassForCode(statusCode) === statusClass;
}

function validateStatusFilters(filters) {
  const statusCode = filters.status_code.trim();
  if (!statusCode) return '';
  if (!/^\d{3}$/.test(statusCode)) return 'Status code must be exactly 3 digits, e.g. 200 or 404.';
  const statusClass = statusClassForCode(statusCode);
  if (!statusClass) return 'Status code must be between 100 and 599.';
  if (filters.status_class && filters.status_class !== statusClass) {
    return `Status code ${statusCode} belongs to ${statusClass}, not ${filters.status_class}.`;
  }
  return '';
}
