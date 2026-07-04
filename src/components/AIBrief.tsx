import { useState } from 'react';
import type { AISuggestion } from '../types';

interface Props {
  onApply: (s: AISuggestion) => void;
}

export default function AIBrief({ onApply }: Props) {
  const [brief, setBrief] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AISuggestion | null>(null);
  const [error, setError] = useState('');

  async function runAI() {
    const apiKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) { setError('Falta VITE_ANTHROPIC_API_KEY en .env'); return; }
    if (!brief.trim()) { setError('Escribe una descripción primero.'); return; }

    setError('');
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/anthropic/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: `Eres un ingeniero civil argentino experto en diseño de barrios cerrados.
El usuario te describe su visión para el barrio. Responde EXCLUSIVAMENTE con un JSON con esta forma (sin markdown):
{
  "boulevardWidth": <número 10-24>,
  "secondaryRoadWidth": <número 6-14>,
  "setback": <número 4-20>,
  "standardLotWidth": <número>,
  "standardLotDepth": <número>,
  "largeLotWidth": <número>,
  "largeLotDepth": <número>,
  "largeLotPercent": <número 0-60>,
  "rationale": "<2 oraciones en español con fundamentación profesional>"
}
Solo incluye los campos que debas cambiar. Siempre incluye rationale.`,
          messages: [{ role: 'user', content: brief }],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const text = data.content?.[0]?.text ?? '';
      const parsed: AISuggestion = JSON.parse(text);
      setResult(parsed);
    } catch (e: any) {
      setError(e.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '10px 12px' }}>
      <div style={sectionLabel}>Intérprete de Brief (IA)</div>

      <textarea
        value={brief}
        onChange={e => setBrief(e.target.value)}
        placeholder="Ej: Quiero un barrio premium con lotes grandes, muchos espacios verdes y una laguna central con acceso privilegiado para las viviendas..."
        rows={4}
        style={{
          width: '100%',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          color: 'var(--text)',
          fontFamily: 'Inter, sans-serif',
          fontSize: 12,
          padding: '7px 8px',
          resize: 'vertical',
          outline: 'none',
          marginTop: 8,
          marginBottom: 8,
        }}
      />

      <button
        onClick={runAI}
        disabled={loading}
        style={{
          width: '100%',
          padding: '7px',
          background: loading ? 'var(--border)' : 'var(--purple)',
          color: 'var(--text)',
          border: 'none',
          borderRadius: 4,
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: 12,
          fontWeight: 600,
          fontFamily: 'Inter, sans-serif',
          marginBottom: 8,
        }}
      >
        {loading ? 'Analizando...' : 'Interpretar Brief'}
      </button>

      {error && <div style={{ color: '#ff6b6b', fontSize: 11, marginBottom: 8 }}>{error}</div>}

      {result && (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 5, padding: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--text)', marginBottom: 8, lineHeight: 1.5, fontStyle: 'italic' }}>
            "{result.rationale}"
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
            {Object.entries(result)
              .filter(([k]) => k !== 'rationale')
              .map(([k, v]) => (
                <span key={k} style={{ background: 'var(--surface2)', borderRadius: 3, padding: '2px 6px', fontSize: 10, color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {k}: {String(v)}
                </span>
              ))}
          </div>
          <button
            onClick={() => onApply(result)}
            style={{
              width: '100%',
              padding: '6px',
              background: 'var(--accent)',
              color: '#0b0f13',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Aplicar Sugerencias
          </button>
        </div>
      )}
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  fontSize: 9,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
};
