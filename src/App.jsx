import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, LogIn, LogOut, RefreshCcw, Save, Search, UserCircle } from 'lucide-react';
import {
  clearAuthTokens,
  createGatewayAdminApi,
  getSavedAccessToken,
  getSavedBaseUrl,
  getSavedRefreshToken,
  saveAccessToken,
  saveBaseUrl,
  saveRefreshToken
} from './api/gatewayAdminApi.js';
import { backendFeatureStatus, sections, standaloneFeaturePages } from './config/navigation.jsx';
import {
  defaultInstanceForm,
  defaultRouteForm,
  defaultServiceForm,
  instancePayload,
  routePayload,
  servicePayload
} from './utils/forms.js';
import { filterRows } from './utils/filterRows.js';
import { Alert, DetailModal, StatusPill } from './components/common.jsx';
import ConnectionsPage from './pages/ConnectionsPage.jsx';
import APIKeysPage from './pages/APIKeysPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import HealthChecksPage from './pages/HealthChecksPage.jsx';
import InfoPage from './pages/InfoPage.jsx';
import IPBlacklistPage from './pages/IPBlacklistPage.jsx';
import InstancesPage from './pages/InstancesPage.jsx';
import KongaFeaturePage from './pages/KongaFeaturePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import RateLimitsPage from './pages/RateLimitsPage.jsx';
import RoutesPage from './pages/RoutesPage.jsx';
import ServicesPage from './pages/ServicesPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import UpstreamsPage from './pages/UpstreamsPage.jsx';

const PAGE_SIZE = 5;
const PAGINATED_SECTIONS = new Set(['services', 'instances', 'routes']);
const LAST_SECTION_KEY = 'gateway_admin_last_section';

export default function App() {
  const [activeSection, setActiveSection] = useState(() => getInitialSection());
  const [baseUrl, setBaseUrl] = useState(getSavedBaseUrl());
  const [accessToken, setAccessToken] = useState(getSavedAccessToken());
  const api = useMemo(() => createGatewayAdminApi(baseUrl, accessToken, {
    onTokensRefreshed: (tokens) => setAccessToken(tokens.access_token),
    onAuthFailure: () => {
      setAccessToken('');
      setAuthUser(null);
      setActiveSection('login');
    }
  }), [baseUrl, accessToken]);

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
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
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
      const [healthResult, readyResult, servicesResult, instancesResult, routesResult, cacheResult] = await Promise.allSettled([
        api.health(),
        api.ready(),
        api.listServices(),
        api.listInstances(),
        api.listRoutes(),
        api.getCacheVersion()
      ]);

      if (healthResult.status === 'fulfilled') setHealth(healthResult.value);
      if (readyResult.status === 'fulfilled') setReady(readyResult.value);
      if (servicesResult.status === 'fulfilled') setServices(servicesResult.value);
      if (instancesResult.status === 'fulfilled') setInstances(instancesResult.value);
      if (routesResult.status === 'fulfilled') setRoutes(routesResult.value);
      if (cacheResult.status === 'fulfilled') setCacheStatus(cacheResult.value);

      const rejected = [servicesResult, instancesResult, routesResult].find((item) => item.status === 'rejected');
      if (rejected) throw rejected.reason;
    } catch (err) {
      setError(err.message || 'Cannot connect to gateway');
    } finally {
      setLoading(false);
    }
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
    persistLocation(activeSection, pages[activeSection] || 1);
  }, [activeSection, authUser, pages]);

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
    if (activeSection === 'healthchecks' || activeSection === 'services') loadDetailedHealth();
    if (activeSection === 'settings') loadCacheVersion();
  }, [activeSection, authUser, api, services, instances]);

  async function loadCurrentUser() {
    if (!accessToken) {
      setAuthUser(null);
      return;
    }

    try {
      const currentUser = await api.me();
      setAuthUser(currentUser);
      if (activeSection === 'login') {
        setActiveSection('dashboard');
      }
    } catch {
      clearAuthTokens();
      setAccessToken('');
      setAuthUser(null);
      setActiveSection('login');
    }
  }

  function navigate(sectionId) {
    if (!authUser && sectionId !== 'login') {
      setActiveSection('login');
      return;
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
    } finally {
      setHealthLoading(false);
    }
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
    } catch (err) {
      setError(err.message || 'Cannot load cache version');
    }
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
  }

  function editInstance(instance) {
    setActiveSection('instances');
    setEditing({ type: 'instance', id: instance.id });
    setInstanceForm({ ...defaultInstanceForm, ...instance });
  }

  function editRoute(route) {
    setActiveSection('routes');
    setEditing({ type: 'route', id: route.id });
    setRouteForm({
      ...defaultRouteForm,
      ...route,
      rewrite_target: route.rewrite_target || '',
      rate_limit_id: route.rate_limit_id || ''
    });
  }

  function resetForms() {
    setEditing({ type: '', id: '' });
    setServiceForm(defaultServiceForm);
    setInstanceForm(defaultInstanceForm);
    setRouteForm(defaultRouteForm);
  }

  const filteredServices = filterRows(services, search);
  const filteredInstances = filterRows(instances, search);
  const filteredRoutes = filterRows(routes, search);
  const servicePage = pageSlice(filteredServices, pages.services, PAGE_SIZE);
  const instancePage = pageSlice(filteredInstances, pages.instances, PAGE_SIZE);
  const routePage = pageSlice(filteredRoutes, pages.routes, PAGE_SIZE);
  const isAuthenticated = Boolean(authUser);
  const visibleSections = isAuthenticated ? sections : sections.filter((section) => section.id === 'login');

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">GW</div>
          <div>
            <strong>Gateway Admin</strong>
            <span>React dashboard</span>
          </div>
        </div>

        <nav className="nav-list">
          {visibleSections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                className={activeSection === section.id ? 'active' : ''}
                onClick={() => navigate(section.id)}
                title={section.label}
              >
                <Icon size={18} />
                <span>{section.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p>API Gateway</p>
            <h1>{sections.find((section) => section.id === activeSection)?.label}</h1>
          </div>
          <div className="topbar-actions">
            <div className="base-url">
              <span>Gateway URL</span>
              <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
              <button className="icon-button" onClick={persistBaseUrl} title="Save gateway URL">
                <Save size={17} />
              </button>
            </div>
            <button className="icon-button" onClick={loadAll} title="Reload data">
              {loading ? <Loader2 className="spin" size={18} /> : <RefreshCcw size={18} />}
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

        {isAuthenticated && (
          <div className="status-row">
            <div className="search-box">
              <Search size={17} />
              <input placeholder="Search services, routes, instances..." value={search} onChange={(event) => {
                setSearch(event.target.value);
                if (PAGINATED_SECTIONS.has(activeSection)) {
                  setPages((current) => ({ ...current, [activeSection]: 1 }));
                }
              }} />
            </div>
            <StatusPill active={Boolean(health)} label={health ? 'Gateway reachable' : 'Gateway unknown'} />
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
            services={services}
            instances={instances}
            routes={routes}
            health={health}
            ready={ready}
            onNavigate={navigate}
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

        {isAuthenticated && activeSection === 'rate-limits' && (
          <RateLimitsPage api={api} />
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
            onReload={loadDetailedHealth}
            onCheckInstance={checkInstanceHealth}
          />
        )}

        {isAuthenticated && activeSection === 'connections' && (
          <ConnectionsPage
            baseUrl={baseUrl}
            setBaseUrl={setBaseUrl}
            onSave={persistBaseUrl}
          />
        )}

        {isAuthenticated && activeSection === 'settings' && (
          <SettingsPage
            baseUrl={baseUrl}
            setBaseUrl={setBaseUrl}
            onSave={persistBaseUrl}
            services={services}
            instances={instances}
            routes={routes}
            cacheStatus={cacheStatus}
            cacheLoading={cacheLoading}
            onRefreshCache={loadCacheVersion}
            onReloadCache={reloadCache}
          />
        )}

        {isAuthenticated && backendFeatureStatus[activeSection] && !standaloneFeaturePages.includes(activeSection) && (
          <KongaFeaturePage
            feature={backendFeatureStatus[activeSection]}
            services={services}
            routes={routes}
            instances={instances}
            onNavigate={navigate}
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

function pageSlice(items, requestedPage, pageSize) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(requestedPage || 1, 1), totalPages);
  const start = (page - 1) * pageSize;
  return { page, items: items.slice(start, start + pageSize) };
}
