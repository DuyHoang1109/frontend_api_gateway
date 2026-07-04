import {
  Archive,
  CircleDot,
  Cloud,
  Compass,
  GitFork,
  HeartPulse,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  LogIn,
  Lock,
  Network,
  PlugZap,
  Route,
  Server,
  Settings,
  Shield,
  SlidersHorizontal,
  TerminalSquare,
  UserCircle,
  Users
} from 'lucide-react';

export const sections = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'login', label: 'Login', icon: LogIn },
  { id: 'profile', label: 'Profile', icon: UserCircle },
  { id: 'info', label: 'Info', icon: CircleDot },
  { id: 'services', label: 'Services', icon: Cloud },
  { id: 'instances', label: 'Instances', icon: Server },
  { id: 'routes', label: 'Routes', icon: GitFork },
  { id: 'plugins', label: 'Plugins', icon: PlugZap },
  { id: 'consumers', label: 'Consumers', icon: Users },
  { id: 'api-keys', label: 'API Keys', icon: KeyRound },
  { id: 'rate-limits', label: 'Rate Limits', icon: SlidersHorizontal },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'aggregation', label: 'Aggregation', icon: ListChecks },
  { id: 'upstreams', label: 'Upstreams', icon: Network },
  { id: 'certificates', label: 'Certificates', icon: Lock },
  { id: 'healthchecks', label: 'Health Checks', icon: HeartPulse },
  { id: 'logs', label: 'Logs', icon: TerminalSquare },
  { id: 'connections', label: 'Connections', icon: Compass },
  { id: 'snapshots', label: 'Snapshots', icon: Archive },
  { id: 'cluster', label: 'Cluster', icon: Route },
  { id: 'settings', label: 'Settings', icon: Settings }
];

export const backendFeatureStatus = {
  info: {
    title: 'Gateway Info',
    status: 'bound',
    endpoints: ['GET /health', 'GET /ready'],
    summary: 'Health and readiness status from GW_v1.'
  },
  plugins: {
    title: 'Plugins',
    status: 'missing',
    endpoints: ['GET /admin/plugins', 'POST /admin/plugins', 'PUT /admin/plugins/:id', 'DELETE /admin/plugins/:id'],
    summary: 'Konga manages global, service, route, and consumer plugins. GW_v1 has gateway_plugins tables, but no admin API is exposed yet.'
  },
  consumers: {
    title: 'Consumers',
    status: 'missing',
    endpoints: ['GET /admin/consumers', 'POST /admin/consumers', 'PUT /admin/consumers/:id', 'DELETE /admin/consumers/:id'],
    summary: 'Konga has consumer management. GW_v1 currently does not expose consumer/user-facing admin endpoints.'
  },
  'api-keys': {
    title: 'API Keys',
    status: 'bound',
    endpoints: [
      'POST /admin/api-keys',
      'GET /admin/api-keys',
      'GET /admin/api-keys/:id',
      'PUT /admin/api-keys/:id',
      'POST /admin/api-keys/:id/revoke',
      'POST /admin/api-keys/:id/rotate'
    ],
    summary: 'Create, inspect, update, revoke, and rotate hashed API keys. Raw keys are shown only after create or rotate.'
  },
  'rate-limits': {
    title: 'Rate Limits',
    status: 'bound',
    endpoints: ['POST /admin/rate-limit-policies', 'GET /admin/rate-limit-policies', 'GET /admin/rate-limit-policies/:id', 'PUT /admin/rate-limit-policies/:id', 'DELETE /admin/rate-limit-policies/:id'],
    summary: 'Rate limit policy CRUD is bound to the Redis-backed gateway limiter.'
  },
  security: {
    title: 'IP Blacklist',
    status: 'bound',
    endpoints: ['POST /admin/ip-blacklist', 'GET /admin/ip-blacklist', 'GET /admin/ip-blacklist/:id', 'PUT /admin/ip-blacklist/:id', 'DELETE /admin/ip-blacklist/:id'],
    summary: 'Manage active or expiring IP/CIDR blocks used by the gateway security middleware.'
  },
  aggregation: {
    title: 'API Aggregation',
    status: 'missing',
    endpoints: ['GET /admin/aggregations', 'POST /admin/aggregations', 'PUT /admin/aggregations/:id', 'DELETE /admin/aggregations/:id'],
    summary: 'Schema includes aggregation configs/steps. Admin CRUD endpoints are not exposed yet.'
  },
  upstreams: {
    title: 'Upstreams',
    status: 'covered',
    endpoints: ['GET /admin/instances', 'POST /admin/services/:id/instances'],
    summary: 'Konga upstreams map closely to GW_v1 service_instances. Use the Instances page for actual binding.'
  },
  certificates: {
    title: 'Certificates',
    status: 'missing',
    endpoints: ['GET /admin/certificates', 'POST /admin/certificates'],
    summary: 'TLS certificate management exists in Konga, but GW_v1 has no certificate API yet.'
  },
  healthchecks: {
    title: 'Health Checks',
    status: 'bound',
    endpoints: ['GET /health', 'GET /ready', 'GET /admin/services/:id/health', 'GET /admin/instances/:id/health', 'POST /admin/instances/:id/health-check'],
    summary: 'Gateway, service, and instance health status are bound, including manual instance probes.'
  },
  logs: {
    title: 'Logs & Monitoring',
    status: 'missing',
    endpoints: ['GET /admin/logs', 'GET /admin/metrics'],
    summary: 'Gateway has Elasticsearch infrastructure, but the React dashboard needs log/metric query endpoints to show request latency/status.'
  },
  connections: {
    title: 'Connections',
    status: 'local',
    endpoints: ['localStorage gateway_admin_base_url'],
    summary: 'Konga manages Kong node connections. This dashboard uses the Gateway URL box in the top bar instead.'
  },
  snapshots: {
    title: 'Snapshots',
    status: 'missing',
    endpoints: ['GET /admin/snapshots', 'POST /admin/snapshots', 'POST /admin/snapshots/:id/restore'],
    summary: 'Konga can snapshot config. GW_v1 does not expose config snapshot APIs yet.'
  },
  cluster: {
    title: 'Cluster',
    status: 'missing',
    endpoints: ['GET /admin/cluster'],
    summary: 'Cluster/node visibility is useful later when Gateway runs multiple replicas.'
  },
  settings: {
    title: 'Settings',
    status: 'partial',
    endpoints: ['localStorage gateway_admin_base_url', 'GET /admin/cache/version', 'POST /admin/cache/reload'],
    summary: 'Gateway URL preferences and runtime configuration cache controls are bound.'
  }
};

export const standaloneFeaturePages = ['info', 'api-keys', 'rate-limits', 'security', 'upstreams', 'healthchecks', 'connections', 'settings'];
