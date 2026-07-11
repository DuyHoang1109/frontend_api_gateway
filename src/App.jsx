import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, LogIn, LogOut, Network, RefreshCcw, Search, UserCircle } from 'lucide-react';
import {
  clearAuthTokens,
  createGatewayAdminApi,
  getSavedAccessToken,
  getSavedBaseUrl,
  getSavedLogServiceBaseUrl,
  getSavedRefreshToken,
  saveAccessToken,
  saveBaseUrl,
  saveLogServiceBaseUrl,
  saveRefreshToken
} from './api/gatewayAdminApi.js';
import { sections } from './config/navigation.jsx';
import {
  defaultInstanceForm,
  defaultRouteForm,
  defaultServiceForm,
  instancePayload,
  routePayload,
  servicePayload
} from './utils/forms.js';
import { filterRows } from './utils/filterRows.js';
import { scrollToUpdateForm } from './utils/scrollToUpdateForm.js';
import { Alert, DetailModal, StatusPill } from './components/common.jsx';
import ConnectionsPage from './pages/ConnectionsPage.jsx';
import AggregationsPage from './pages/AggregationsPage.jsx';
import APIKeysPage from './pages/APIKeysPage.jsx';
import ClientsPage from './pages/ClientsPage.jsx';
import CORSPoliciesPage from './pages/CORSPoliciesPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import HealthChecksPage from './pages/HealthChecksPage.jsx';
import InfoPage from './pages/InfoPage.jsx';
import IPBlacklistPage from './pages/IPBlacklistPage.jsx';
import InstancesPage from './pages/InstancesPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import LogsPage from './pages/LogsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import PermissionsPage from './pages/PermissionsPage.jsx';
import RateLimitsPage from './pages/RateLimitsPage.jsx';
import RolesPage from './pages/RolesPage.jsx';
import RoutesPage from './pages/RoutesPage.jsx';
import ServicesPage from './pages/ServicesPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import UpstreamsPage from './pages/UpstreamsPage.jsx';
import UsersPage from './pages/UsersPage.jsx';

const PAGE_SIZE = 5;
const PAGINATED_SECTIONS = new Set(['services', 'instances', 'routes']);
const LAST_SECTION_KEY = 'gateway_admin_last_section';
const SECTION_PERMISSIONS = {
  dashboard: ['logs:read', 'metrics:read'],
  logs: ['logs:read'],
  healthchecks: ['health:read'],
  info: ['services:read'],
  services: ['services:read'],
  instances: ['services:write'],
  routes: ['routes:read'],
  upstreams: ['services:write'],
  'api-keys': ['api_keys:read'],
  consumers: ['clients:read'],
  'rate-limits': ['rate_limits:read'],
  'cors-policies': ['cors_policies:read'],
  security: ['ip_blacklist:read'],
  roles: ['roles:read'],
  permissions: ['permissions:read'],
  users: ['users:read'],
  aggregation: ['aggregations:read'],
  connections: ['cache:reload'],
  settings: ['cache:reload'],
  profile: []
};

export default function App() {
  const [activeSection, setActiveSection] = useState(() => getInitialSection());
  const [baseUrl, setBaseUrl] = useState(getSavedBaseUrl());
  const [logServiceBaseUrl, setLogServiceBaseUrl] = useState(getSavedLogServiceBaseUrl());
  const [accessToken, setAccessToken] = useState(getSavedAccessToken());
  const api = useMemo(() => createGatewayAdminApi(baseUrl, accessToken, {
    onTokensRefreshed: (tokens) => setAccessToken(tokens.access_token),
    onAuthFailure: () => {
      setAccessToken('');
      setAuthUser(null);
      setActiveSection('login');
    }
  }), [baseUrl, logServiceBaseUrl, accessToken]);

  const [services, setServices] = useState([]);
  const [instances, setInstances] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [health, setHealth] = useState(null);
  const [ready, setReady] = useState(null);
  const [serviceHealth, setServiceHealth] = useState({});
  const [instanceHealth, setInstanceHealth] = useState({});
  const [healthLoading, setHealthLoading] = useState(false);
  const [checkingInstanceId, setCheckingInstanceId] = useState('');
  const [cacheStatus, setCacheStatus] = useState(null);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(Boolean(accessToken));
  const [selected, setSelected] = useState(null);
  const [serviceForm, setServiceForm] = useState(defaultServiceForm);
  const [instanceForm, setInstanceForm] = useState(defaultInstanceForm);
  const [routeForm, setRouteForm] = useState(defaultRouteForm);
  const [editing, setEditing] = useState({ type: '', id: '' });
  const [pages, setPages] = useState(() => getInitialPages());

  async function loadAll() {
    setLoading(true);
    setError('');

    try {
      const canReadServices = canUsePermission(authUser, 'services:read');
      const canReadRoutes = canUsePermission(authUser, 'routes:read');
      const canReadCache = canUsePermission(authUser, 'cache:reload');
      const [healthResult, readyResult, servicesResult, instancesResult, routesResult, cacheResult] = await Promise.allSettled([
        api.health(),
        api.ready(),
        canReadServices ? api.listServices() : Promise.resolve([]),
        canReadServices ? api.listInstances() : Promise.resolve([]),
        canReadRoutes ? api.listRoutes() : Promise.resolve([]),
        canReadCache ? api.getCacheVersion() : Promise.resolve(null)
      ]);

      if (healthResult.status === 'fulfilled') setHealth(healthResult.value);
      if (readyResult.status === 'fulfilled') setReady(readyResult.value);
      if (servicesResult.status === 'fulfilled') setServices(servicesResult.value);
      if (instancesResult.status === 'fulfilled') setInstances(instancesResult.value);
      if (routesResult.status === 'fulfilled') setRoutes(routesResult.value);
      if (cacheResult.status === 'fulfilled') setCacheStatus(cacheResult.value);

      const rejected = [
        canReadServices ? servicesResult : null,
        canReadServices ? instancesResult : null,
        canReadRoutes ? routesResult : null
      ].filter(Boolean).find((item) => item.status === 'rejected');
      if (rejected) throw rejected.reason;
      return true;
    } catch (err) {
      setError(err.message || 'Cannot connect to gateway');
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function refreshAll() {
    const refreshed = await loadAll();
    if (refreshed) setNotice('Dashboard data refreshed');
  }

  useEffect(() => {
    if (authUser) {
      loadAll();
    } else {
      setLoading(false);
    }
  }, [api, authUser]);

  useEffect(() => {
    loadCurrentUser();
  }, [api, accessToken]);

  useEffect(() => {
    if (!authUser) return;
    if (activeSection === 'login') {
      setActiveSection('dashboard');
      return;
    }
    if (!canAccessSection(activeSection, authUser)) {
      setActiveSection(defaultSectionForUser(authUser));
      return;
    }
    persistLocation(activeSection, pages[activeSection] || 1);
  }, [activeSection, authUser, pages]);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0 });
    });
  }, [activeSection]);

  useEffect(() => {
    const onPopState = () => {
      const section = sectionFromLocation();
      setActiveSection(section);
      if (PAGINATED_SECTIONS.has(section)) {
        setPages((current) => ({ ...current, [section]: pageFromLocation() }));
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!authUser) return;
    if (activeSection === 'healthchecks' || activeSection === 'services' || activeSection === 'instances') loadDetailedHealth();
    if (activeSection === 'settings') loadCacheVersion();
  }, [activeSection, authUser, api, services, instances]);

  async function loadCurrentUser() {
    if (!accessToken) {
      setAuthUser(null);
      setAuthChecking(false);
      return;
    }

    setAuthChecking(true);
    try {
      const currentUser = await api.me();
      setAuthUser(currentUser);
      if (activeSection === 'login') {
        setActiveSection('dashboard');
      }
    } catch (err) {
      if (err.status === 401) {
        clearAuthTokens();
        setAccessToken('');
        setAuthUser(null);
        setActiveSection('login');
      } else {
        setError(err.message || 'Cannot verify current session');
      }
    } finally {
      setAuthChecking(false);
    }
  }

  function navigate(sectionId) {
    if (!authUser && sectionId !== 'login') {
      setError('');
      setNotice('');
      setActiveSection('login');
      return;
    }
    if (authUser && !canAccessSection(sectionId, authUser)) {
      setError('You do not have permission to access this section');
      setActiveSection(defaultSectionForUser(authUser));
      return;
    }

    if (sectionId !== activeSection) {
      setError('');
      setNotice('');
    }
    setActiveSection(sectionId);
  }

  function changePage(section, page) {
    const total = section === 'services' ? filteredServices.length : section === 'instances' ? filteredInstances.length : filteredRoutes.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    setPages((current) => ({ ...current, [section]: Math.min(Math.max(page, 1), totalPages) }));
  }

  function persistBaseUrl() {
    setBaseUrl(saveBaseUrl(baseUrl));
    setNotice('Gateway URL saved');
  }

  function persistLogServiceBaseUrl() {
    setLogServiceBaseUrl(saveLogServiceBaseUrl(logServiceBaseUrl));
    setNotice('Log service URL saved');
  }

  async function login(credentials) {
    setAuthLoading(true);
    setError('');

    try {
      const result = await api.login(credentials);
      saveAccessToken(result.access_token);
      saveRefreshToken(result.refresh_token);
      setAccessToken(result.access_token);
      setAuthUser(result.user);
      setNotice('Signed in');
      setActiveSection('dashboard');
    } catch (err) {
      setError(err.message || 'Cannot sign in');
    } finally {
      setAuthLoading(false);
    }
  }

  async function logout() {
    setAuthLoading(true);
    setError('');

    try {
      const refreshToken = getSavedRefreshToken();
      if (accessToken && refreshToken) {
        await api.logout(refreshToken);
      }
      setNotice('Signed out');
    } catch (err) {
      setError(`${err.message || 'Cannot reach logout endpoint'}. Local session was cleared.`);
    } finally {
      clearAuthTokens();
      setAccessToken('');
      setAuthUser(null);
      setActiveSection('login');
      setAuthLoading(false);
    }
  }

  async function loadDetailedHealth() {
    setHealthLoading(true);
    try {
      const serviceEntries = await Promise.all(services.map(async (service) => {
        try {
          return [service.id, await api.getServiceHealth(service.id)];
        } catch (err) {
          return [service.id, { status: 'unknown', error: err.message }];
        }
      }));
      const instanceEntries = await Promise.all(instances.map(async (instance) => {
        try {
          return [instance.id, await api.getInstanceHealth(instance.id)];
        } catch (err) {
          return [instance.id, { status: 'unknown', error: err.message }];
        }
      }));
      setServiceHealth(Object.fromEntries(serviceEntries));
      setInstanceHealth(Object.fromEntries(instanceEntries));
      return true;
    } finally {
      setHealthLoading(false);
    }
  }

  async function refreshDetailedHealth() {
    await loadDetailedHealth();
    setNotice('Health status refreshed');
  }

  async function checkInstanceHealth(instanceId) {
    setCheckingInstanceId(instanceId);
    setError('');
    try {
      const result = await api.checkInstanceHealth(instanceId);
      setInstanceHealth((current) => ({ ...current, [instanceId]: result }));
      setNotice('Instance health check completed');
    } catch (err) {
      setError(err.message || 'Health check failed');
    } finally {
      setCheckingInstanceId('');
    }
  }

  async function loadCacheVersion() {
    try {
      setCacheStatus(await api.getCacheVersion());
      return true;
    } catch (err) {
      setError(err.message || 'Cannot load cache version');
      return false;
    }
  }

  async function refreshCacheVersion() {
    const refreshed = await loadCacheVersion();
    if (refreshed) setNotice('Cache version refreshed');
  }

  async function reloadCache() {
    setCacheLoading(true);
    setError('');
    try {
      const result = await api.reloadCache();
      setCacheStatus(result);
      setNotice('Gateway configuration cache reloaded');
    } catch (err) {
      setError(err.message || 'Cannot reload cache');
    } finally {
      setCacheLoading(false);
    }
  }

  function serviceName(serviceId) {
    return services.find((service) => service.id === serviceId)?.name || serviceId || '-';
  }

  function serviceInstanceCount(serviceId) {
    return instances.filter((instance) => instance.service_id === serviceId).length;
  }

  function routeCount(serviceId) {
    return routes.filter((route) => route.service_id === serviceId).length;
  }

  async function submitService(event) {
    event.preventDefault();
    try {
      if (editing.type === 'service') {
        await api.updateService(editing.id, servicePayload(serviceForm));
      } else {
        await api.createService(servicePayload(serviceForm));
      }
      setNotice('Service saved');
      resetForms();
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function submitInstance(event) {
    event.preventDefault();
    try {
      if (editing.type === 'instance') {
        await api.updateInstance(editing.id, instancePayload(instanceForm));
      } else {
        await api.createInstance(instanceForm.service_id, instancePayload(instanceForm));
      }
      setNotice('Instance saved');
      resetForms();
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function submitRoute(event) {
    event.preventDefault();
    try {
      if (editing.type === 'route') {
        await api.updateRoute(editing.id, routePayload(routeForm));
      } else {
        await api.createRoute(routePayload(routeForm));
      }
      setNotice('Route saved');
      resetForms();
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeRecord(type, id, label) {
    if (!window.confirm(`Delete ${label}?`)) return;

    try {
      if (type === 'service') await api.deleteService(id);
      if (type === 'instance') await api.deleteInstance(id);
      if (type === 'route') await api.deleteRoute(id);
      setNotice(`${label} deleted`);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function inspectRecord(type, id) {
    try {
      const record =
        type === 'service' ? await api.getService(id) :
        type === 'instance' ? await api.getInstance(id) :
        await api.getRoute(id);

      setSelected({ type, record });
    } catch (err) {
      setError(err.message);
    }
  }

  function editService(service) {
    setActiveSection('services');
    setEditing({ type: 'service', id: service.id });
    setServiceForm({ ...defaultServiceForm, ...service, description: service.description || '' });
    scrollToUpdateForm();
  }

  function editInstance(instance) {
    setActiveSection('instances');
    setEditing({ type: 'instance', id: instance.id });
    setInstanceForm({ ...defaultInstanceForm, ...instance });
    scrollToUpdateForm();
  }

  function editRoute(route) {
    setActiveSection('routes');
    setEditing({ type: 'route', id: route.id });
    setRouteForm({
      ...defaultRouteForm,
      ...route,
      rewrite_target: route.rewrite_target || '',
      rate_limit_id: route.rate_limit_id || '',
      cors_policy_id: route.cors_policy_id || ''
    });
    scrollToUpdateForm();
  }

  function resetForms() {
    setEditing({ type: '', id: '' });
    setServiceForm(defaultServiceForm);
    setInstanceForm(defaultInstanceForm);
    setRouteForm(defaultRouteForm);
    setError('');
  }

  const filteredServices = filterRows(services, search);
  const filteredInstances = filterRows(instances, search);
  const filteredRoutes = filterRows(routes, search);
  const servicePage = pageSlice(filteredServices, pages.services, PAGE_SIZE);
  const instancePage = pageSlice(filteredInstances, pages.instances, PAGE_SIZE);
  const routePage = pageSlice(filteredRoutes, pages.routes, PAGE_SIZE);
  const isAuthenticated = Boolean(authUser);
  const visibleSections = isAuthenticated ? sections.filter((section) => section.id !== 'login' && canAccessSection(section.id, authUser)) : sections.filter((section) => section.id === 'login');
  const searchableSections = {
    services: 'Search services...',
    instances: 'Search instances...',
    routes: 'Search routes...'
  };
  const searchPlaceholder = searchableSections[activeSection];
  const searchTerm = search.trim().toLowerCase();
  const searchSuggestions = searchTerm ? getSearchSuggestions(activeSection, {
    services,
    instances,
    routes,
    serviceName
  }, searchTerm) : [];
  const showSearchSuggestions = Boolean(searchFocused && searchTerm);

  function chooseSearchSuggestion(suggestion) {
    if (!suggestion) return;
    setSearch(suggestion.value);
    setPages((current) => ({ ...current, [activeSection]: 1 }));
    setSearchFocused(false);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0 });
    });
  }

  if (!isAuthenticated && authChecking) {
    return (
      <main className="login-shell">
        <div className="login-loading">
          <Loader2 className="spin" size={22} />
          <span>Checking session</span>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="login-shell">
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        {notice && <Alert type="success" message={notice} onClose={() => setNotice('')} />}
        <LoginPage
          currentUser={authUser}
          loading={authLoading}
          onLogin={login}
          onNavigate={navigate}
          baseUrl={baseUrl}
          setBaseUrl={setBaseUrl}
          onSaveBaseUrl={persistBaseUrl}
        />
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" type="button" onClick={() => navigate('dashboard')} title="Go to dashboard">
          <div className="brand-mark" aria-hidden="true"><Network size={25} strokeWidth={2.5} /></div>
          <div>
            <strong>Gateway Admin</strong>
            <span>Control Plane</span>
          </div>
        </button>

        <nav className="nav-list">
          {visibleSections.map((section, index) => {
            const Icon = section.icon;
            const previousGroup = visibleSections[index - 1]?.group;
            const showGroup = section.group && section.group !== previousGroup;
            return (
              <React.Fragment key={section.id}>
                {showGroup && <span className="nav-group-label">{section.group}</span>}
                <button
                  className={activeSection === section.id ? 'active' : ''}
                  onClick={() => navigate(section.id)}
                  title={section.label}
                >
                  <Icon size={18} />
                  <span>{section.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </nav>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="page-heading">
            <p>API Gateway</p>
            <h1>{sections.find((section) => section.id === activeSection)?.label}</h1>
          </div>
          <div className="topbar-actions">
            <StatusPill active={Boolean(health)} label={health ? 'Gateway reachable' : 'Gateway unknown'} />
            <button className="ghost-button" type="button" onClick={refreshAll} title="Refresh dashboard data">
              {loading ? <Loader2 className="spin" size={18} /> : <RefreshCcw size={18} />}
              Refresh
            </button>
            {authUser ? (
              <div className="topbar-auth">
                <button className="ghost-button" type="button" onClick={() => navigate('profile')}>
                  <UserCircle size={17} />
                  {authUser.username}
                </button>
                <button className="icon-button" type="button" onClick={logout} title="Logout">
                  <LogOut size={17} />
                </button>
              </div>
            ) : (
              <button className="ghost-button" type="button" onClick={() => navigate('login')}>
                <LogIn size={17} />
                Login
              </button>
            )}
          </div>
        </header>

        {isAuthenticated && searchPlaceholder && (
          <div className="status-row">
            <div className="search-box">
              <Search size={17} />
              <input
                placeholder={searchPlaceholder}
                value={search}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setSearchFocused(true);
                  setPages((current) => ({ ...current, [activeSection]: 1 }));
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    chooseSearchSuggestion(searchSuggestions[0] || (searchTerm ? { value: search } : null));
                  }
                  if (event.key === 'Escape') {
                    setSearchFocused(false);
                  }
                }}
              />
              {showSearchSuggestions && (
                <div className="search-suggestions">
                  {searchSuggestions.length > 0 ? searchSuggestions.map((suggestion) => (
                    <button
                      type="button"
                      key={suggestion.id}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        chooseSearchSuggestion(suggestion);
                      }}
                    >
                      <strong>{suggestion.title}</strong>
                      <small>{suggestion.detail}</small>
                    </button>
                  )) : (
                    <div className="search-suggestion-empty">No matching results</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        {notice && <Alert type="success" message={notice} onClose={() => setNotice('')} />}

        {activeSection === 'login' && (
          <LoginPage
            currentUser={authUser}
            loading={authLoading}
            onLogin={login}
            onNavigate={navigate}
            baseUrl={baseUrl}
            setBaseUrl={setBaseUrl}
            onSaveBaseUrl={persistBaseUrl}
          />
        )}

        {isAuthenticated && activeSection === 'profile' && (
          <ProfilePage
            user={authUser}
            onLogout={logout}
            onNavigate={navigate}
          />
        )}

        {isAuthenticated && activeSection === 'dashboard' && (
          <Dashboard
            api={api}
            services={services}
            instances={instances}
            routes={routes}
            health={health}
            ready={ready}
            onNavigate={navigate}
            showGatewayResources={canAccessSection('services', authUser)}
          />
        )}

        {isAuthenticated && activeSection === 'info' && (
          <InfoPage
            baseUrl={baseUrl}
            health={health}
            ready={ready}
            services={services}
            instances={instances}
            routes={routes}
          />
        )}

        {isAuthenticated && activeSection === 'services' && (
          <ServicesPage
            services={servicePage.items}
            form={serviceForm}
            setForm={setServiceForm}
            editing={editing.type === 'service'}
            onSubmit={submitService}
            onCancel={resetForms}
            onEdit={editService}
            onDelete={(service) => removeRecord('service', service.id, service.name)}
            onInspect={(service) => inspectRecord('service', service.id)}
            instanceCount={serviceInstanceCount}
            routeCount={routeCount}
            serviceHealth={serviceHealth}
            healthLoading={healthLoading}
            canWrite={canUsePermission(authUser, 'services:write')}
            page={servicePage.page}
            pageSize={PAGE_SIZE}
            totalItems={filteredServices.length}
            onPageChange={(page) => changePage('services', page)}
          />
        )}

        {isAuthenticated && activeSection === 'instances' && (
          <InstancesPage
            services={services}
            instances={instancePage.items}
            form={instanceForm}
            setForm={setInstanceForm}
            editing={editing.type === 'instance'}
            onSubmit={submitInstance}
            onCancel={resetForms}
            onEdit={editInstance}
            onDelete={(instance) => removeRecord('instance', instance.id, `${instance.host}:${instance.port}`)}
            onInspect={(instance) => inspectRecord('instance', instance.id)}
            serviceName={serviceName}
            canWrite={canUsePermission(authUser, 'services:write')}
            instanceHealth={instanceHealth}
            healthLoading={healthLoading}
            checkingInstanceId={checkingInstanceId}
            onCheckInstance={checkInstanceHealth}
            canRunInstanceCheck={canUsePermission(authUser, 'health:write')}
            page={instancePage.page}
            pageSize={PAGE_SIZE}
            totalItems={filteredInstances.length}
            onPageChange={(page) => changePage('instances', page)}
          />
        )}

        {isAuthenticated && activeSection === 'routes' && (
          <RoutesPage
            api={api}
            services={services}
            routes={routePage.items}
            form={routeForm}
            setForm={setRouteForm}
            editing={editing.type === 'route'}
            onSubmit={submitRoute}
            onCancel={resetForms}
            onEdit={editRoute}
            onDelete={(route) => removeRecord('route', route.id, `${route.method} ${route.path}`)}
            onInspect={(route) => inspectRecord('route', route.id)}
            serviceName={serviceName}
            canWrite={canUsePermission(authUser, 'routes:write')}
            canReadRateLimits={canUsePermission(authUser, 'rate_limits:read')}
            canReadApiKeys={canUsePermission(authUser, 'api_keys:read')}
            canReadCorsPolicies={canUsePermission(authUser, 'cors_policies:read')}
            page={routePage.page}
            pageSize={PAGE_SIZE}
            totalItems={filteredRoutes.length}
            onPageChange={(page) => changePage('routes', page)}
          />
        )}

        {isAuthenticated && activeSection === 'api-keys' && (
          <APIKeysPage
            api={api}
            baseUrl={baseUrl}
            accessToken={accessToken}
          />
        )}

        {isAuthenticated && activeSection === 'consumers' && (
          <ClientsPage
            api={api}
            onNavigate={navigate}
          />
        )}

        {isAuthenticated && activeSection === 'roles' && (
          <RolesPage api={api} />
        )}

        {isAuthenticated && activeSection === 'permissions' && (
          <PermissionsPage api={api} />
        )}

        {isAuthenticated && activeSection === 'users' && (
          <UsersPage api={api} currentUser={authUser} />
        )}

        {isAuthenticated && activeSection === 'rate-limits' && (
          <RateLimitsPage api={api} currentUser={authUser} />
        )}

        {isAuthenticated && activeSection === 'cors-policies' && (
          <CORSPoliciesPage api={api} />
        )}

        {isAuthenticated && activeSection === 'aggregation' && (
          <AggregationsPage api={api} services={services} />
        )}

        {isAuthenticated && activeSection === 'security' && (
          <IPBlacklistPage api={api} />
        )}

        {isAuthenticated && activeSection === 'upstreams' && (
          <UpstreamsPage
            services={services}
            instances={filteredInstances}
            serviceName={serviceName}
            onNavigate={navigate}
            canWriteInstances={canUsePermission(authUser, 'services:write')}
          />
        )}

        {isAuthenticated && activeSection === 'healthchecks' && (
          <HealthChecksPage
            health={health}
            ready={ready}
            instances={instances}
            services={services}
            serviceName={serviceName}
            serviceHealth={serviceHealth}
            instanceHealth={instanceHealth}
            loading={healthLoading}
            checkingInstanceId={checkingInstanceId}
            onReload={refreshDetailedHealth}
            onCheckInstance={checkInstanceHealth}
            canRunInstanceCheck={canUsePermission(authUser, 'health:write')}
          />
        )}

        {isAuthenticated && activeSection === 'logs' && (
          <LogsPage api={api} services={services} />
        )}

        {isAuthenticated && activeSection === 'connections' && (
          <ConnectionsPage
            baseUrl={baseUrl}
            setBaseUrl={setBaseUrl}
            onSave={persistBaseUrl}
            logServiceBaseUrl={logServiceBaseUrl}
            setLogServiceBaseUrl={setLogServiceBaseUrl}
            onSaveLogService={persistLogServiceBaseUrl}
          />
        )}

        {isAuthenticated && activeSection === 'settings' && (
          <SettingsPage
            baseUrl={baseUrl}
            setBaseUrl={setBaseUrl}
            onSave={persistBaseUrl}
            logServiceBaseUrl={logServiceBaseUrl}
            setLogServiceBaseUrl={setLogServiceBaseUrl}
            onSaveLogService={persistLogServiceBaseUrl}
            services={services}
            instances={instances}
            routes={routes}
            cacheStatus={cacheStatus}
            cacheLoading={cacheLoading}
            onRefreshCache={refreshCacheVersion}
            onReloadCache={reloadCache}
          />
        )}
      </main>

      {selected && (
        <DetailModal
          title={`${selected.type} detail`}
          record={selected.record}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function getInitialSection() {
  if (!getSavedAccessToken()) return 'login';
  return sectionFromLocation();
}

function sectionFromLocation() {
  const candidate = new URLSearchParams(window.location.search).get('section') || localStorage.getItem(LAST_SECTION_KEY) || 'dashboard';
  return sections.some((section) => section.id === candidate) && candidate !== 'login' ? candidate : 'dashboard';
}

function pageFromLocation() {
  const page = Number.parseInt(new URLSearchParams(window.location.search).get('page') || '1', 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function getInitialPages() {
  const section = sectionFromLocation();
  return {
    services: section === 'services' ? pageFromLocation() : 1,
    instances: section === 'instances' ? pageFromLocation() : 1,
    routes: section === 'routes' ? pageFromLocation() : 1
  };
}

function persistLocation(section, page) {
  localStorage.setItem(LAST_SECTION_KEY, section);
  const params = new URLSearchParams(window.location.search);
  params.set('section', section);
  if (PAGINATED_SECTIONS.has(section)) params.set('page', String(page));
  else params.delete('page');
  window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
}

function canAccessSection(sectionId, user) {
  if (sectionId === 'login') return !user;
  if (!user) return false;
  if (isAdminUser(user)) return true;
  const required = SECTION_PERMISSIONS[sectionId];
  if (!required) return false;
  if (required.length === 0) return true;
  return required.some((permission) => canUsePermission(user, permission));
}

function canUsePermission(user, permission) {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  return Array.isArray(user.permissions) && user.permissions.some((item) => String(item).toLowerCase() === permission.toLowerCase());
}

function isAdminUser(user) {
  return String(user?.role || user?.role_name || '').trim().toLowerCase() === 'admin';
}

function defaultSectionForUser(user) {
  if (canAccessSection('dashboard', user)) return 'dashboard';
  if (canAccessSection('logs', user)) return 'logs';
  return 'profile';
}

function getSearchSuggestions(section, data, term) {
  if (section === 'services') {
    return data.services
      .filter((service) => JSON.stringify(service).toLowerCase().includes(term))
      .slice(0, 6)
      .map((service) => ({
        id: service.id,
        value: service.name,
        title: service.name,
        detail: `${service.protocol || 'http'} / ${service.lb_strategy || 'round_robin'}`
      }));
  }

  if (section === 'instances') {
    return data.instances
      .filter((instance) => JSON.stringify(instance).toLowerCase().includes(term))
      .slice(0, 6)
      .map((instance) => ({
        id: instance.id,
        value: `${instance.host}:${instance.port}`,
        title: `${instance.host}:${instance.port}`,
        detail: data.serviceName(instance.service_id)
      }));
  }

  if (section === 'routes') {
    return data.routes
      .filter((route) => JSON.stringify(route).toLowerCase().includes(term))
      .slice(0, 6)
      .map((route) => ({
        id: route.id,
        value: route.path,
        title: `${route.method} ${route.path}`,
        detail: data.serviceName(route.service_id)
      }));
  }

  return [];
}

function pageSlice(items, requestedPage, pageSize) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(requestedPage || 1, 1), totalPages);
  const start = (page - 1) * pageSize;
  return { page, items: items.slice(start, start + pageSize) };
}
