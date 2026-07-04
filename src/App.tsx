import { useState, useEffect } from 'react';
import ProjectPanel from './components/ProjectPanel';
import MapView from './components/MapView';
import CoordInput from './components/CoordInput';
import DesignControls from './components/DesignControls';
import StatsPanel from './components/StatsPanel';
import AIBrief from './components/AIBrief';
import ExportBar from './components/ExportBar';
import { generatePlan } from './lib/planGenerator';
import { loadProjects, saveProject, deleteProject as deleteProjectStorage, newId as genId } from './lib/storage';
import type { Project, DesignParams, GeneratedPlan, AISuggestion, LatLng } from './types';
import { DEFAULT_PARAMS, DEMO_COORDS } from './types';

export default function App() {
  const [projects, setProjects] = useState<Project[]>(() => loadProjects());
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [satellite, setSatellite] = useState(true);
  const [rightTab, setRightTab] = useState<'design' | 'ai'>('design');
  const [pickingLaguna, setPickingLaguna] = useState(false);

  useEffect(() => {
    if (!activeProject || activeProject.coordinates.length < 3) {
      setPlan(null);
      return;
    }
    const generated = generatePlan(activeProject.coordinates, activeProject.params);
    setPlan(generated);
  }, [activeProject]);

  function updateProject(updated: Project) {
    const withTime = { ...updated, updatedAt: Date.now() };
    setActiveProject(withTime);
    setProjects(prev => prev.map(p => p.id === withTime.id ? withTime : p));
    saveProject(withTime);
  }

  function handleParamsChange(params: DesignParams) {
    if (!activeProject) return;
    updateProject({ ...activeProject, params });
  }

  function handleCoordsChange(coords: LatLng[]) {
    if (!activeProject) return;
    updateProject({ ...activeProject, coordinates: coords });
  }

  function handleCreateProject(p: Project) {
    setProjects(prev => [p, ...prev]);
    setActiveProject(p);
    saveProject(p);
  }

  function handleDeleteProject(id: string) {
    deleteProjectStorage(id);
    setProjects(prev => prev.filter(p => p.id !== id));
    if (activeProject?.id === id) { setActiveProject(null); setPlan(null); }
  }

  function handleRenameProject(id: string, name: string) {
    const p = projects.find(p => p.id === id);
    if (!p) return;
    updateProject({ ...p, name });
  }

  function handleLoadDemo() {
    const demo: Project = {
      id: genId(),
      name: 'Demo — Pilar, BA',
      coordinates: DEMO_COORDS,
      params: { ...DEFAULT_PARAMS, amenities: { ...DEFAULT_PARAMS.amenities } },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    handleCreateProject(demo);
  }

  function handleApplyAI(suggestion: AISuggestion) {
    if (!activeProject) return;
    const { rationale: _, ...rest } = suggestion;
    handleParamsChange({ ...activeProject.params, ...rest });
  }

  function handlePickLagunaCenter(center: import('./types').LatLng) {
    if (!activeProject) return;
    setPickingLaguna(false);
    const currentConfig = activeProject.params.lagunaConfig ?? DEFAULT_PARAMS.lagunaConfig;
    handleParamsChange({
      ...activeProject.params,
      lagunaConfig: { ...currentConfig, center },
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <ExportBar
        project={activeProject}
        satellite={satellite}
        onToggleSatellite={() => setSatellite(s => !s)}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left panel */}
        <div style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <ProjectPanel
            projects={projects}
            activeId={activeProject?.id ?? null}
            onSelect={setActiveProject}
            onCreate={handleCreateProject}
            onDelete={handleDeleteProject}
            onRename={handleRenameProject}
            onLoadDemo={handleLoadDemo}
          />
        </div>

        {/* Map */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {!activeProject && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', zIndex: 10,
              background: 'rgba(11,15,19,0.88)', pointerEvents: 'none',
            }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>🗺️</div>
              <div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>BarrioGen Pro</div>
              <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', maxWidth: 260, lineHeight: 1.6 }}>
                Crea un proyecto o carga el Demo para comenzar a planificar tu barrio cerrado.
              </div>
            </div>
          )}
          <MapView
            coordinates={activeProject?.coordinates ?? []}
            plan={plan}
            satellite={satellite}
            showLotNumbers={activeProject?.params.showLotNumbers ?? true}
            showDimensions={activeProject?.params.showDimensions ?? false}
            pickingLaguna={pickingLaguna}
            onPickLagunaCenter={handlePickLagunaCenter}
          />
        </div>

        {/* Right panel */}
        <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'var(--surface)', borderLeft: '1px solid var(--border)', overflow: 'hidden' }}>
          <CoordInput
            coordinates={activeProject?.coordinates ?? []}
            onChange={handleCoordsChange}
          />

          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            {(['design', 'ai'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                style={{
                  flex: 1, padding: '7px 0',
                  background: rightTab === tab ? 'var(--surface2)' : 'transparent',
                  border: 'none',
                  borderBottom: rightTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                  color: rightTab === tab ? 'var(--accent)' : 'var(--muted)',
                  cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  fontFamily: 'Inter, sans-serif',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}
              >
                {tab === 'design' ? 'Diseño' : 'Brief IA'}
              </button>
            ))}
          </div>

          <div className="panel-scroll">
            {rightTab === 'design' ? (
              <DesignControls
                params={activeProject?.params ?? DEFAULT_PARAMS}
                onChange={handleParamsChange}
                pickingLaguna={pickingLaguna}
                onTogglePickLaguna={() => setPickingLaguna(p => !p)}
              />
            ) : (
              <AIBrief onApply={handleApplyAI} />
            )}
          </div>

          <StatsPanel stats={plan?.stats ?? null} />
        </div>
      </div>
    </div>
  );
}
