import type { Project } from '../types';

interface Props {
  project: Project | null;
  satellite: boolean;
  onToggleSatellite: () => void;
}

export default function ExportBar({ project, satellite, onToggleSatellite }: Props) {
  function exportJSON() {
    if (!project) return;
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${project.name.replace(/\s+/g, '_')}.json`;
    a.click();
  }

  function exportPNG() {
    // Take screenshot of the map via html2canvas or leaflet export
    // For now: alert with instructions
    alert('Para exportar PNG: usa la tecla Print Screen o la herramienta de captura de tu sistema operativo.');
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '0 12px',
      height: 36,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.05em', marginRight: 8 }}>
        {project?.name ?? 'BarrioGen Pro'}
      </span>

      <button onClick={onToggleSatellite} style={barBtn}>
        {satellite ? 'OSM' : 'Satélite'}
      </button>

      <div style={{ flex: 1 }} />

      <button onClick={exportJSON} style={barBtn} disabled={!project}>
        Exportar JSON
      </button>
      <button onClick={exportPNG} style={barBtn}>
        Exportar PNG
      </button>
    </div>
  );
}

const barBtn: React.CSSProperties = {
  padding: '3px 10px',
  background: 'var(--surface2)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 11,
  fontFamily: 'Inter, sans-serif',
};
