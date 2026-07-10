import React from 'react';
import { InfoItem, Panel } from '../components/common.jsx';

export default function InfoPage({ baseUrl, health, ready, services, instances, routes }) {
  const modules = gatewayModules({ services, instances, routes });

  return (
    <section className="content-stack">
      <Panel title="Gateway status" eyebrow="GET /health + GET /ready">
        <div className="info-grid">
          <InfoItem label="Gateway URL" value={baseUrl} />
          <InfoItem label="Health" value={health ? JSON.stringify(health) : 'unavailable'} />
          <InfoItem label="Ready" value={ready ? JSON.stringify(ready) : 'unavailable'} />
          <InfoItem label="Bound admin resources" value={`${services.length} services, ${instances.length} instances, ${routes.length} routes`} />
        </div>
      </Panel>

      <Panel title="Available gateway modules" eyebrow="bound features">
        <table className="data-table module-info-table">
          <thead>
            <tr>
              <th>Module</th>
              <th>Status</th>
              <th>What it manages</th>
              <th>Endpoints</th>
              <th>Source / live data</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((module) => (
              <tr key={module.name}>
                <td><strong>{module.name}</strong></td>
                <td><span className="module-status bound">Bound</span></td>
                <td>{module.description}</td>
                <td><div className="endpoint-chip-list">{module.endpoints.map((endpoint) => <EndpointChip endpoint={endpoint} key={endpoint} />)}</div></td>
                <td><span className={`module-count ${module.live ? 'live' : 'static'}`}>{module.count}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </section>
  );
}

function EndpointChip({ endpoint }) {
  const method = endpoint.split(' ')[0].toLowerCase();
  return <code className={`endpoint-chip ${method}`}>{endpoint}</code>;
}

function gatewayModules({ services, instances, routes }) {
  return [
    {
      name: 'Authentication',
      description: 'Admin sign-in, token refresh, session profile, and logout.',
      endpoints: ['POST /auth/login', 'POST /auth/refresh', 'GET /auth/me', 'POST /auth/logout'],
      count: 'Session API'
    },
    {
      name: 'Services',
      description: 'Backend service definitions and load-balancing strategy.',
      endpoints: ['GET /admin/services', 'POST /admin/services', 'GET /admin/services/:id', 'PUT /admin/services/:id', 'DELETE /admin/services/:id', 'GET /admin/services/:id/health'],
      count: `${services.length} services`,
      live: true
    },
    {
      name: 'Instances',
      description: 'Upstream targets attached to services.',
      endpoints: ['GET /admin/instances', 'GET /admin/services/:id/instances', 'POST /admin/services/:id/instances', 'GET /admin/instances/:id', 'PUT /admin/instances/:id', 'DELETE /admin/instances/:id', 'GET /admin/instances/:id/health', 'POST /admin/instances/:id/health-check'],
      count: `${instances.length} instances`,
      live: true
    },
    {
      name: 'Routes',
      description: 'Public gateway paths, methods, auth flags, and CORS bindings.',
      endpoints: ['GET /admin/routes', 'POST /admin/routes', 'GET /admin/routes/:id', 'PUT /admin/routes/:id', 'DELETE /admin/routes/:id'],
      count: `${routes.length} routes`,
      live: true
    },
    {
      name: 'Health Checks',
      description: 'Gateway readiness, service aggregate health, and manual instance probes.',
      endpoints: ['GET /health', 'GET /ready', 'GET /admin/services/:id/health', 'GET /admin/instances/:id/health', 'POST /admin/instances/:id/health-check'],
      count: 'Live health store'
    },
    {
      name: 'Logs & Metrics',
      description: 'Request logs, realtime metrics, latency, status code, and route analytics.',
      endpoints: ['GET /admin/logging/health', 'GET /admin/logs', 'GET /admin/metrics/summary', 'GET /admin/metrics/rps', 'GET /admin/metrics/error-rate', 'GET /admin/metrics/latency', 'GET /admin/metrics/status-codes', 'GET /admin/metrics/top-routes', 'GET /admin/metrics/realtime/stream'],
      count: 'Elasticsearch log-service'
    },
    {
      name: 'API Keys & Clients',
      description: 'Client identities, hashed API keys, revoke, rotate, and request testing.',
      endpoints: ['GET /admin/clients', 'POST /admin/clients', 'GET /admin/clients/:id', 'PUT /admin/clients/:id', 'DELETE /admin/clients/:id', 'GET /admin/api-keys', 'GET /admin/api-keys/options', 'POST /admin/api-keys', 'GET /admin/api-keys/:id', 'PUT /admin/api-keys/:id', 'POST /admin/api-keys/:id/revoke', 'POST /admin/api-keys/:id/rotate'],
      count: 'Access control'
    },
    {
      name: 'Security Policies',
      description: 'Rate limits, CORS policies, and IP blacklist rules.',
      endpoints: ['GET /admin/rate-limit-policies', 'POST /admin/rate-limit-policies', 'PUT /admin/rate-limit-policies/:id', 'DELETE /admin/rate-limit-policies/:id', 'GET /admin/cors-policies', 'POST /admin/cors-policies', 'PUT /admin/cors-policies/:id', 'DELETE /admin/cors-policies/:id', 'GET /admin/ip-blacklist', 'POST /admin/ip-blacklist', 'PUT /admin/ip-blacklist/:id', 'DELETE /admin/ip-blacklist/:id'],
      count: 'Policy engine'
    },
    {
      name: 'Authorization',
      description: 'Admin users, roles, and permission catalog.',
      endpoints: ['GET /admin/users', 'POST /admin/users', 'GET /admin/users/:id', 'PUT /admin/users/:id', 'DELETE /admin/users/:id', 'GET /admin/roles', 'GET /admin/roles/:id', 'GET /admin/roles/:id/permissions', 'GET /admin/permissions', 'GET /admin/permissions/:id'],
      count: 'Admin RBAC'
    },
    {
      name: 'Aggregation',
      description: 'Composite gateway endpoints with ordered upstream steps.',
      endpoints: ['GET /admin/aggregations', 'POST /admin/aggregations', 'GET /admin/aggregations/:id', 'PUT /admin/aggregations/:id', 'DELETE /admin/aggregations/:id', 'GET /admin/aggregations/:id/steps', 'POST /admin/aggregations/:id/steps', 'PUT /admin/aggregation-steps/:id', 'DELETE /admin/aggregation-steps/:id'],
      count: 'Advanced routing'
    },
    {
      name: 'Configuration Cache',
      description: 'Runtime config version visibility and cache reload control.',
      endpoints: ['GET /admin/cache/version', 'POST /admin/cache/reload'],
      count: 'Redis-backed'
    }
  ];
}
