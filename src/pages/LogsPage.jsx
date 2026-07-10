import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Database, RefreshCw, Search, X } from 'lucide-react';
import { Alert, DetailModal, EmptyState, Field, Pagination, Panel, SelectField } from '../components/common.jsx';

const PAGE_SIZE = 10;
const initialFilters = {
  q: '',
  search_field: 'path',
  service_name: '',
  method: '',
  status_class: '',
  status_code: '',
  client_ip: '',
  time_range: '',
  from_date: '',
  from_time: '',
  to_date: '',
  to_time: ''
};

const timeRangeOptions = [
  { value: '15m', label: 'Last 15 minutes' },
  { value: '1h', label: 'Last 1 hour' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: 'custom', label: 'Custom range' }
];

const timeOptions = buildTimeOptions();
const logSearchFieldOptions = [
  { value: 'path', label: 'Path' },
  { value: 'normalized_path', label: 'Normalized path' },
  { value: 'trace_id', label: 'Trace ID' },
  { value: 'api_key_id', label: 'API key ID' },
  { value: 'error_message', label: 'Error message' },
  { value: 'q', label: 'Any text' }
];

export default function LogsPage({ api, services = [] }) {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const skipNextEffectRef = useRef(false);

  const serviceOptions = useMemo(() => services
    .map((service) => service.name || service.service_name || service.id)
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right))
    .map((name) => ({ value: name, label: name })), [services]);

  const query = useMemo(() => buildLogQuery(appliedFilters, page), [appliedFilters, page]);
  const filtersDirty = !sameFilters(filters, appliedFilters);

  useEffect(() => {
    if (skipNextEffectRef.current) {
      skipNextEffectRef.current = false;
      return;
    }
    fetchLogs(query);
  }, [query]);

  async function fetchLogs(nextQuery) {
    setLoading(true);
    setError('');
    try {
      const result = api.getLogsPage ? await api.getLogsPage(nextQuery) : { items: await api.getLogs(nextQuery), meta: {} };
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

  function reloadLogs() {
    fetchLogs(query);
  }

  function applyFilters(event) {
    event.preventDefault();
    const validationError = validateStatusFilters(filters);
    if (validationError) {
      setError(validationError);
      return;
    }
    const timeError = validateTimeFilters(filters);
    if (timeError) {
      setError(timeError);
      return;
    }
    const nextFilters = normalizeFilters(filters);
    const nextQuery = buildLogQuery(nextFilters, 1);
    setError('');
    skipNextEffectRef.current = true;
    setPage(1);
    setAppliedFilters(nextFilters);
    fetchLogs(nextQuery);
  }

  function clearFilters() {
    const nextQuery = buildLogQuery(initialFilters, 1);
    skipNextEffectRef.current = true;
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setPage(1);
    fetchLogs(nextQuery);
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

  function updateTimeRange(timeRange) {
    setFilters((current) => ({
      ...current,
      time_range: timeRange,
      from_date: timeRange === 'custom' ? current.from_date : '',
      from_time: timeRange === 'custom' ? current.from_time : '',
      to_date: timeRange === 'custom' ? current.to_date : '',
      to_time: timeRange === 'custom' ? current.to_time : ''
    }));
  }

  function updateCustomTimeField(field, value) {
    setFilters((current) => ({
      ...current,
      [field]: value,
      ...(field === 'from_date' && value && !current.from_time ? { from_time: '00:00' } : {}),
      ...(field === 'to_date' && value && !current.to_time ? { to_time: '23:00' } : {})
    }));
  }

  return (
    <section className="content-stack">
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      <Panel title="Request logs" eyebrow="GET /admin/logs" className="request-logs-panel">
        <form className="form-grid logs-filter-form" onSubmit={applyFilters}>
          <Field label="Search" value={filters.q} onChange={(value) => setFilters({ ...filters, q: value })} placeholder={searchPlaceholder(filters.search_field)} />
          <SelectField label="Search by" value={filters.search_field} onChange={(value) => setFilters({ ...filters, search_field: value || 'path' })} options={logSearchFieldOptions} />
          <SelectField label="Service" value={filters.service_name} onChange={(value) => setFilters({ ...filters, service_name: value })} options={serviceOptions} placeholder="All services" />
          <SelectField label="Method" value={filters.method} onChange={(value) => setFilters({ ...filters, method: value })} options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE']} />
          <SelectField label="Status class" value={filters.status_class} onChange={updateStatusClass} options={['2xx', '3xx', '4xx', '5xx']} />
          <Field label="Status code" value={filters.status_code} onChange={updateStatusCode} placeholder="200" />
          <Field label="Client IP" value={filters.client_ip} onChange={(value) => setFilters({ ...filters, client_ip: value })} placeholder="127.0.0.1" />
          <SelectField label="Time" value={filters.time_range} onChange={updateTimeRange} options={timeRangeOptions} placeholder="All time" />
          {filters.time_range === 'custom' && (
            <div className="logs-custom-range">
              <div className="range-card">
                <span>From</span>
                <label>
                  Date
                  <input type="date" value={filters.from_date} onChange={(event) => updateCustomTimeField('from_date', event.target.value)} />
                </label>
                <label>
                  Time
                  <select value={filters.from_time} onChange={(event) => updateCustomTimeField('from_time', event.target.value)}>
                    <option value="">Time...</option>
                    {timeOptions.map((time) => <option key={`from-${time}`} value={time}>{time}</option>)}
                  </select>
                </label>
              </div>
              <div className="range-card">
                <span>To</span>
                <label>
                  Date
                  <input type="date" value={filters.to_date} onChange={(event) => updateCustomTimeField('to_date', event.target.value)} />
                </label>
                <label>
                  Time
                  <select value={filters.to_time} onChange={(event) => updateCustomTimeField('to_time', event.target.value)}>
                    <option value="">Time...</option>
                    {timeOptions.map((time) => <option key={`to-${time}`} value={time}>{time}</option>)}
                  </select>
                </label>
              </div>
            </div>
          )}
          <div className="form-actions logs-actions">
            <button className="primary-button" type="submit"><Search size={17} />Search</button>
            <button className="icon-button" type="button" onClick={reloadLogs} title="Reload logs"><RefreshCw className={loading ? 'spin' : ''} size={17} /></button>
            <button className="ghost-button cancel-button" type="button" onClick={clearFilters}><X size={17} />Cancel</button>
          </div>
          {filtersDirty && <span className="logs-filter-note">Filters changed. Press Search to apply.</span>}
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

function normalizeFilters(filters) {
  return Object.fromEntries(
    Object.entries(filters).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
  );
}

function sameFilters(left, right) {
  return JSON.stringify(normalizeFilters(left)) === JSON.stringify(normalizeFilters(right));
}

function buildLogQuery(filters, page) {
  return {
    ...serializeFilters(filters),
    page,
    limit: PAGE_SIZE,
    sort: '@timestamp:desc'
  };
}

function serializeFilters(filters) {
  const normalized = normalizeFilters(filters);
  const timeRange = resolveTimeRange(normalized);
  const out = {
    ...normalized,
    q: '',
    search_field: '',
    time_range: '',
    from_date: '',
    from_time: '',
    to_date: '',
    to_time: '',
    from: timeRange.from,
    to: timeRange.to
  };
  const searchValue = normalized.q;
  if (searchValue) {
    const searchField = normalized.search_field || 'path';
    if (['trace_id', 'path', 'normalized_path', 'api_key_id', 'error_message'].includes(searchField)) {
      out[searchField] = searchValue;
    } else {
      out.q = searchValue;
    }
  }
  return out;
}

function searchPlaceholder(searchField) {
  if (searchField === 'trace_id') return 'exact trace id...';
  if (searchField === 'normalized_path') return 'exact normalized path...';
  if (searchField === 'api_key_id') return 'exact API key id...';
  if (searchField === 'error_message') return 'error text...';
  if (searchField === 'q') return 'path, service, trace, error...';
  return 'exact path, e.g. /api/dashboard';
}

function toIsoDateTime(dateValue, timeValue, fallbackTime) {
  if (!dateValue) return '';
  const date = new Date(`${dateValue}T${timeValue || fallbackTime}:00`);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function resolveTimeRange(filters) {
  if (!filters.time_range || filters.time_range === 'custom') {
    return {
      from: toIsoDateTime(filters.from_date, filters.from_time, '00:00'),
      to: toIsoDateTime(filters.to_date, filters.to_time, '23:59')
    };
  }

  const now = new Date();
  const from = new Date(now.getTime() - timeRangeToMilliseconds(filters.time_range));
  return {
    from: from.toISOString(),
    to: now.toISOString()
  };
}

function timeRangeToMilliseconds(timeRange) {
  const amount = Number(timeRange.slice(0, -1));
  const unit = timeRange.slice(-1);
  if (!amount) return 0;
  if (unit === 'm') return amount * 60 * 1000;
  if (unit === 'h') return amount * 60 * 60 * 1000;
  if (unit === 'd') return amount * 24 * 60 * 60 * 1000;
  return 0;
}

function buildTimeOptions() {
  const options = [];
  for (let hour = 0; hour < 24; hour += 1) {
    options.push(`${String(hour).padStart(2, '0')}:00`);
  }
  return options;
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

function validateTimeFilters(filters) {
  if (filters.time_range !== 'custom') return '';
  const hasAnyValue = filters.from_date || filters.from_time || filters.to_date || filters.to_time;
  if (!hasAnyValue) return '';
  if (!filters.from_date || !filters.to_date) return 'Custom range needs both From date and To date.';
  const from = new Date(`${filters.from_date}T${filters.from_time || '00:00'}:00`);
  const to = new Date(`${filters.to_date}T${filters.to_time || '23:59'}:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 'Time filters are invalid.';
  if (from > to) return 'From time must be before To time.';
  return '';
}
