import { useState } from 'react';
import type { LatLng } from '../types';
import { parsePlotArea } from '../lib/planGenerator';

interface Props {
  coordinates: LatLng[];
  onChange: (coords: LatLng[]) => void;
}

export default function CoordInput({ coordinates, onChange }: Props) {
  const [raw, setRaw] = useState('');
  const [error, setError] = useState('');

  function parse() {
    setError('');
    const lines = raw.trim().split('\n').filter(l => l.trim());
    const coords: LatLng[] = [];
    for (const line of lines) {
      const parts = line.trim().split(/[\s,;\t]+/);
      if (parts.length < 2) continue;
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (isNaN(lat) || isNaN(lng)) { setError(`Línea inválida: "${line}"`); return; }
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) { setError(`Coordenadas fuera de rango: ${lat}, ${lng}`); return; }
      coords.push({ lat, lng });
    }
    if (coords.length < 3) { setError('Se necesitan al menos 3 puntos.'); return; }
    onChange(coords);
  }

  const info = coordinates.length >= 3 ? parsePlotArea(coordinates) : null;

  return (
    <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
      <label style={labelStyle}>Coordenadas del Lote (lat, lng por línea)</label>
      <textarea
        value={raw}
        onChange={e => setRaw(e.target.value)}
        placeholder={'-34.4450, -58.9150\n-34.4405, -58.9150\n-34.4405, -58.9094\n-34.4450, -58.9094'}
        rows={5}
        style={{
          width: '100%',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          color: 'var(--text)',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          padding: '6px 8px',
          resize: 'vertical',
          outline: 'none',
          marginBottom: 6,
        }}
      />
      {error && <div style={{ color: '#ff6b6b', fontSize: 11, marginBottom: 6 }}>{error}</div>}
      <button onClick={parse} style={parseBtn}>Parsear y Generar Plan</button>
      {info && (
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <Stat label="Área" value={`${info.areaHa.toFixed(2)} ha`} />
          <Stat label="Perímetro" value={`${Math.round(info.perimeter)} m`} />
          <Stat label="Puntos" value={`${coordinates.length}`} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 6,
};

const parseBtn: React.CSSProperties = {
  width: '100%',
  padding: '7px',
  background: 'var(--accent)',
  color: '#0b0f13',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
  fontFamily: 'Inter, sans-serif',
};
