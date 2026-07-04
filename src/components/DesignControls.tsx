import type { DesignParams, LagunaConfig, LagunaShape } from '../types';
import { DEFAULT_PARAMS } from '../types';

interface Props {
  params: DesignParams;
  onChange: (p: DesignParams) => void;
  pickingLaguna: boolean;
  onTogglePickLaguna: () => void;
}

export default function DesignControls({ params, onChange, pickingLaguna, onTogglePickLaguna }: Props) {
  function set<K extends keyof DesignParams>(key: K, val: DesignParams[K]) {
    onChange({ ...params, [key]: val });
  }

  function setAmenity(key: keyof DesignParams['amenities'], val: boolean) {
    onChange({ ...params, amenities: { ...params.amenities, [key]: val } });
  }

  function setLagunaConfig(cfg: LagunaConfig) {
    onChange({ ...params, lagunaConfig: cfg });
  }

  const lagunaConfig = params.lagunaConfig ?? DEFAULT_PARAMS.lagunaConfig;

  return (
    <div style={{ padding: '10px 12px' }}>
      <Section label="Vías">
        <Slider label="Bulevar Principal" value={params.boulevardWidth} min={10} max={24} step={1} unit="m"
          onChange={v => set('boulevardWidth', v)} />
        <Slider label="Calle Secundaria" value={params.secondaryRoadWidth} min={6} max={14} step={1} unit="m"
          onChange={v => set('secondaryRoadWidth', v)} />
        <Slider label="Retiro Perimetral" value={params.setback} min={4} max={20} step={1} unit="m"
          onChange={v => set('setback', v)} />
      </Section>

      <Section label="Lote Estándar">
        <DimRow
          w={params.standardLotWidth} d={params.standardLotDepth}
          onW={v => set('standardLotWidth', v)} onD={v => set('standardLotDepth', v)}
        />
      </Section>

      <Section label="Lote Grande">
        <DimRow
          w={params.largeLotWidth} d={params.largeLotDepth}
          onW={v => set('largeLotWidth', v)} onD={v => set('largeLotDepth', v)}
        />
        <Slider label="% Lotes Grandes" value={params.largeLotPercent} min={0} max={60} step={5} unit="%"
          onChange={v => set('largeLotPercent', v)} />
      </Section>

      <Section label="Visualización">
        <Toggle label="Números de Lote" checked={params.showLotNumbers} onChange={v => set('showLotNumbers', v)} />
        <Toggle label="Etiquetas de Cota" checked={params.showDimensions} onChange={v => set('showDimensions', v)} />
      </Section>

      <Section label="Amenidades">
        {(Object.keys(params.amenities) as Array<keyof DesignParams['amenities']>).map(key => (
          <div key={key}>
            <Toggle label={amenityLabels[key]} checked={params.amenities[key]}
              onChange={v => setAmenity(key, v)} />
            {key === 'laguna' && params.amenities.laguna && (
              <LagunaPanel
                config={lagunaConfig}
                onChange={setLagunaConfig}
                picking={pickingLaguna}
                onTogglePick={onTogglePickLaguna}
              />
            )}
          </div>
        ))}
      </Section>
    </div>
  );
}

const amenityLabels: Record<keyof DesignParams['amenities'], string> = {
  laguna: 'Laguna',
  parqueCentral: 'Parque Central',
  clubhouse: 'SUM / Clubhouse',
  entrada: 'Entrada / Roundabout',
  parrillas: 'Parrillas',
  canchas: 'Canchas Deportivas',
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function Slider({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text)' }}>{label}</span>
        <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" }}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))} />
    </div>
  );
}

function DimRow({ w, d, onW, onD }: { w: number; d: number; onW: (v: number) => void; onD: (v: number) => void }) {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    color: 'var(--accent)',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    padding: '4px 6px',
    textAlign: 'right',
    outline: 'none',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
      <div>
        <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 3 }}>ANCHO (m)</div>
        <input type="number" value={w} min={5} max={80} style={inputStyle}
          onChange={e => onW(Number(e.target.value))} />
      </div>
      <div>
        <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 3 }}>FONDO (m)</div>
        <input type="number" value={d} min={10} max={120} style={inputStyle}
          onChange={e => onD(Number(e.target.value))} />
      </div>
    </div>
  );
}

function LagunaPanel({ config, onChange, picking, onTogglePick }: {
  config: LagunaConfig;
  onChange: (c: LagunaConfig) => void;
  picking: boolean;
  onTogglePick: () => void;
}) {
  const btnBase: React.CSSProperties = {
    flex: 1,
    fontSize: 10,
    padding: '4px 6px',
    borderRadius: 3,
    border: '1px solid var(--border)',
    cursor: 'pointer',
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 600,
  };

  return (
    <div style={{
      marginLeft: 40, marginBottom: 8, marginTop: -2,
      padding: '8px 8px 6px',
      background: 'var(--bg)',
      borderRadius: 4,
      border: '1px solid var(--border)',
    }}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Forma</div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          {(['circle', 'semicircle'] as LagunaShape[]).map(shape => (
            <button
              key={shape}
              onClick={() => onChange({ ...config, shape })}
              style={{
                ...btnBase,
                background: config.shape === shape ? 'var(--accent)' : 'var(--surface2)',
                color: config.shape === shape ? '#0b0f13' : 'var(--text)',
              }}
            >
              {shape === 'circle' ? 'Círculo' : 'Semicírculo'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text)' }}>Radio</span>
          <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" }}>{config.radiusM}m</span>
        </div>
        <input type="range" min={20} max={400} step={10} value={config.radiusM}
          onChange={e => onChange({ ...config, radiusM: Number(e.target.value) })} />
      </div>

      {config.shape === 'semicircle' && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text)' }}>Orientación</span>
            <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" }}>{config.orientationDeg}°</span>
          </div>
          <input type="range" min={0} max={360} step={15} value={config.orientationDeg}
            onChange={e => onChange({ ...config, orientationDeg: Number(e.target.value) })} />
          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            {([
              { label: 'N', deg: 0 },
              { label: 'E', deg: 90 },
              { label: 'S', deg: 180 },
              { label: 'O', deg: 270 },
            ]).map(({ label, deg }) => (
              <button
                key={label}
                onClick={() => onChange({ ...config, orientationDeg: deg })}
                style={{
                  ...btnBase,
                  flex: 'unset',
                  minWidth: 28,
                  padding: '3px 6px',
                  background: config.orientationDeg === deg ? 'var(--accent)' : 'transparent',
                  color: config.orientationDeg === deg ? '#0b0f13' : 'var(--muted)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Centro</div>
      <div style={{
        fontSize: 10,
        color: config.center ? 'var(--accent)' : 'var(--muted)',
        fontFamily: "'JetBrains Mono', monospace",
        marginBottom: 6,
        lineHeight: 1.5,
      }}>
        {config.center
          ? `${config.center.lat.toFixed(5)}\n${config.center.lng.toFixed(5)}`
          : 'Auto (centroide)'}
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        <button
          onClick={onTogglePick}
          style={{
            ...btnBase,
            background: picking ? 'var(--accent)' : 'var(--surface2)',
            color: picking ? '#0b0f13' : 'var(--text)',
          }}
        >
          {picking ? 'Clic en mapa...' : 'Elegir en mapa'}
        </button>
        {config.center && (
          <button
            onClick={() => onChange({ ...config, center: null })}
            style={{ ...btnBase, background: 'transparent', color: 'var(--muted)' }}
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, cursor: 'pointer' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 32, height: 17, borderRadius: 9,
          background: checked ? 'var(--accent)' : 'var(--border)',
          position: 'relative', flexShrink: 0, transition: 'background 0.2s',
        }}
      >
        <div style={{
          position: 'absolute', top: 2.5,
          left: checked ? 17 : 2.5,
          width: 12, height: 12, borderRadius: '50%',
          background: checked ? '#0b0f13' : 'var(--muted)',
          transition: 'left 0.2s',
        }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--text)' }}>{label}</span>
    </label>
  );
}
