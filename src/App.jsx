import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCcw, Save, Search } from 'lucide-react';
import { createGatewayAdminApi, getSavedBaseUrl, saveBaseUrl } from './api/gatewayAdminApi.js';
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
import Dashboard from './pages/Dashboard.jsx';
import HealthChecksPage from './pages/HealthChecksPage.jsx';
import InfoPage from './pages/InfoPage.jsx';
import InstancesPage from './pages/InstancesPage.jsx';
import KongaFeaturePage from './pages/KongaFeaturePage.jsx';
import RoutesPage from './pages/RoutesPage.jsx';
import ServicesPage from './pages/ServicesPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import UpstreamsPage from './pages/UpstreamsPage.jsx';

export default function App() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [baseUrl, setBaseUrl] = useState(getSavedBaseUrl());
  const api = useMemo(() => createGatewayAdminApi(baseUrl), [baseUrl]);

  const [services, setServices] = useState([]);
  const [instances, setInstances] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [health, setHealth] = useState(null);
  const [ready, setReady] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [serviceForm, setServiceForm] = useState(defaultServiceForm);
  const [instanceForm, setInstanceForm] = useState(defaultInstanceForm);
  const [routeForm, setRouteForm] = useState(defaultRouteForm);
  const [editing, setEditing] = useState({ type: '', id: '' });

  async function loadAll() {
    setLoading(true);
    setError('');

    try {
      const [healthResult, readyResult, servicesResult, instancesResult, routesResult] = await Promise.allSettled([
        api.health(),
        api.ready(),
        api.listServices(),
        api.listInstances(),
        api.listRoutes()
      ]);

      if (healthResult.status === 'fulfilled') setHealth(healthResult.value);
      if (readyResult.status === 'fulfilled') setReady(readyResult.value);
      if (servicesResult.status === 'fulfilled') setServices(servicesResult.value);
      if (instancesResult.status === 'fulfilled') setInstances(instancesResult.value);
      if (routesResult.status === 'fulfilled') setRoutes(routesResult.value);

      const rejected = [servicesResult, instancesResult, routesResult].find((item) => item.status === 'rejected');
      if (rejected) throw rejected.reason;
    } catch (err) {
      setError(err.message || 'Cannot connect to gateway');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [api]);

  function persistBaseUrl() {
    setBaseUrl(saveBaseUrl(baseUrl));
    setNotice('Gateway URL saved');
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
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                className={activeSection === section.id ? 'active' : ''}
                onClick={() => setActiveSection(section.id)}
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
          </div>
        </header>

        <div className="status-row">
          <div className="search-box">
            <Search size={17} />
            <input placeholder="Search services, routes, instances..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <StatusPill active={Boolean(health)} label={health ? 'Gateway reachable' : 'Gateway unknown'} />
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        {notice && <Alert type="success" message={notice} onClose={() => setNotice('')} />}

        {activeSection === 'dashboard' && (
          <Dashboard
            services={services}
            instances={instances}
            routes={routes}
            health={health}
            ready={ready}
            onNavigate={setActiveSection}
          />
        )}

        {activeSection === 'info' && (
          <InfoPage
            baseUrl={baseUrl}
            health={health}
            ready={ready}
            services={services}
            instances={instances}
            routes={routes}
          />
        )}

        {activeSection === 'services' && (
          <ServicesPage
            services={filteredServices}
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
          />
        )}

        {activeSection === 'instances' && (
          <InstancesPage
            services={services}
            instances={filteredInstances}
            form={instanceForm}
            setForm={setInstanceForm}
            editing={editing.type === 'instance'}
            onSubmit={submitInstance}
            onCancel={resetForms}
            onEdit={editInstance}
            onDelete={(instance) => removeRecord('instance', instance.id, `${instance.host}:${instance.port}`)}
            onInspect={(instance) => inspectRecord('instance', instance.id)}
            serviceName={serviceName}
          />
        )}

        {activeSection === 'routes' && (
          <RoutesPage
            services={services}
            routes={filteredRoutes}
            form={routeForm}
            setForm={setRouteForm}
            editing={editing.type === 'route'}
            onSubmit={submitRoute}
            onCancel={resetForms}
            onEdit={editRoute}
            onDelete={(route) => removeRecord('route', route.id, `${route.method} ${route.path}`)}
            onInspect={(route) => inspectRecord('route', route.id)}
            serviceName={serviceName}
          />
        )}

        {activeSection === 'upstreams' && (
          <UpstreamsPage
            services={services}
            instances={filteredInstances}
            serviceName={serviceName}
            onNavigate={setActiveSection}
          />
        )}

        {activeSection === 'healthchecks' && (
          <HealthChecksPage
            health={health}
            ready={ready}
            instances={instances}
            services={services}
            serviceName={serviceName}
          />
        )}

        {activeSection === 'connections' && (
          <ConnectionsPage
            baseUrl={baseUrl}
            setBaseUrl={setBaseUrl}
            onSave={persistBaseUrl}
          />
        )}

        {activeSection === 'settings' && (
          <SettingsPage
            baseUrl={baseUrl}
            setBaseUrl={setBaseUrl}
            onSave={persistBaseUrl}
            services={services}
            instances={instances}
            routes={routes}
          />
        )}

        {backendFeatureStatus[activeSection] && !standaloneFeaturePages.includes(activeSection) && (
          <KongaFeaturePage
            feature={backendFeatureStatus[activeSection]}
            services={services}
            routes={routes}
            instances={instances}
            onNavigate={setActiveSection}
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
