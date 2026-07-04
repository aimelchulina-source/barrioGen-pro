import type { PlanStats } from '../types';

interface Props {
  stats: PlanStats | null;
}

export default function StatsPanel({ stats }: Props) {
  if (!stats) return (
    <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
      <div style={sectionLabel}>Estadísticas</div>
      <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 8 }}>Genera un plan para ver estadísticas.</div>
    </div>
  );

  return (
    <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
      <div style={sectionLabel}>Estadísticas del Plan</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
        <StatCard label="Total Lotes" value={String(stats.totalLots)} color="var(--green)" />
        <StatCard label="Área Total" value={`${stats.totalArea.toFixed(1)} ha`} color="var(--accent)" />
        <StatCard label="Cobertura Vial" value={`${stats.roadCoveragePercent}%`} color="var(--muted)" />
        <StatCard label="Espacio Verde" value={`${stats.greenSpacePercent}%`} color="var(--green)" />
        <StatCard label="Lote Prom." value={`${stats.avgLotSize} m²`} color="var(--blue)" />
        <StatCard label="Perímetro" value={`${stats.perimeter} m`} color="var(--muted)" />
        <StatCard label="Lotes Est." value={String(stats.standardLots)} color="var(--green)" />
        <StatCard label="Lotes Gdes." value={String(stats.largeLots)} color="var(--purple)" />
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 5, padding: '6px 8px', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>{value}</div>
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  fontSize: 9,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
};
