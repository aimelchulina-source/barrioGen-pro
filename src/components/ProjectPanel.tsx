import React, { useState } from 'react';
import type { Project } from '../types';
import { newId } from '../lib/storage';
import { DEFAULT_PARAMS } from '../types';

interface Props {
  projects: Project[];
  activeId: string | null;
  onSelect: (p: Project) => void;
  onCreate: (p: Project) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onLoadDemo: () => void;
}

export default function ProjectPanel({ projects, activeId, onSelect, onCreate, onDelete, onRename, onLoadDemo }: Props) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');

  function handleNew() {
    const p: Project = {
      id: newId(),
      name: `Proyecto ${projects.length + 1}`,
      coordinates: [],
      params: { ...DEFAULT_PARAMS, amenities: { ...DEFAULT_PARAMS.amenities } },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onCreate(p);
  }

  function startRename(p: Project) {
    setRenaming(p.id);
    setRenameVal(p.name);
  }

  function commitRename(id: string) {
    if (renameVal.trim()) onRename(id, renameVal.trim());
    setRenaming(null);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
      <div style={{ padding: '14px 12px 10px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
          BarrioGen Pro
        </div>
        <button onClick={handleNew} style={btnStyle('#e8c84a', '#0b0f13')}>+ Nuevo Proyecto</button>
        <button onClick={onLoadDemo} style={{ ...btnStyle('var(--border)', 'var(--text)'), marginTop: 6 }}>Cargar Demo</button>
      </div>

      <div className="panel-scroll" style={{ padding: '8px 0' }}>
        {projects.length === 0 && (
          <div style={{ padding: '20px 12px', color: 'var(--muted)', fontSize: 12, textAlign: 'center' }}>
            No hay proyectos.<br />Crea uno o carga el Demo.
          </div>
        )}
        {projects.map(p => (
          <div
            key={p.id}
            onClick={() => onSelect(p)}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              background: activeId === p.id ? 'var(--surface2)' : 'transparent',
              borderLeft: activeId === p.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: 1,
            }}
          >
            {renaming === p.id ? (
              <input
                autoFocus
                value={renameVal}
                onChange={e => setRenameVal(e.target.value)}
                onBlur={() => commitRename(p.id)}
                onKeyDown={e => { if (e.key === 'Enter') commitRename(p.id); if (e.key === 'Escape') setRenaming(null); }}
                style={{ background: 'var(--bg)', border: '1px solid var(--accent)', color: 'var(--text)', padding: '2px 6px', borderRadius: 3, width: '100%', fontSize: 12 }}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <>
                <div style={{ fontSize: 12, fontWeight: 500, color: activeId === p.id ? 'var(--accent)' : 'var(--text)', marginBottom: 2 }}>{p.name}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }} className="mono">
                  {p.coordinates.length > 0 ? `${p.coordinates.length} pts` : 'Sin coordenadas'}
                  {' · '}
                  {new Date(p.updatedAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
                  <button
                    onClick={e => { e.stopPropagation(); startRename(p); }}
                    style={smallBtn}
                  >Renombrar</button>
                  <button
                    onClick={e => { e.stopPropagation(); if (confirm('¿Eliminar este proyecto?')) onDelete(p.id); }}
                    style={{ ...smallBtn, color: '#ff6b6b' }}
                  >Eliminar</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const btnStyle = (bg: string, color: string): React.CSSProperties => ({
  display: 'block',
  width: '100%',
  padding: '7px 10px',
  background: bg,
  color,
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
  fontFamily: 'Inter, sans-serif',
});

const smallBtn: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--border)',
  color: 'var(--muted)',
  borderRadius: 3,
  padding: '2px 6px',
  fontSize: 10,
  cursor: 'pointer',
  fontFamily: 'Inter, sans-serif',
};
