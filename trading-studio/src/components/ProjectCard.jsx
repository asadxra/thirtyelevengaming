import React from 'react';
import { Badge, Menu, fmtDate, timeAgo } from './ui.jsx';
import { Icon } from './Icon.jsx';
import { scriptStatus, voiceStatus, generationStatus, projectDuration, STATUS_LABEL, STATUS_TONE } from '../lib/status.js';
import { fmtShort } from '../../shared/scenes.js';
import { FORMATS } from '../../shared/defaults.js';
import { conceptById } from '../../shared/concepts.js';

export function Thumbnail({ project, character, compact }) {
  const hue = project.thumbnail?.hue ?? 270;
  const firstPose = project.scenes?.[0]?.pose || 'sitting';
  return (
    <div className={`thumb thumb-${project.format}`} style={{ '--h': hue }}>
      <div className="thumb-grid" />
      <svg className="thumb-chart" viewBox="0 0 100 40" preserveAspectRatio="none">
        <polyline points="0,32 10,28 18,30 28,20 36,24 46,14 56,18 66,9 76,13 86,6 100,8" fill="none" stroke={`hsl(${hue} 90% 65%)`} strokeWidth="1.2" />
      </svg>
      {!compact && <div className="thumb-title">{project.title}</div>}
      <span className="thumb-format">{FORMATS[project.format]?.ratio}</span>
      {project.archived && <span className="thumb-archived">Archived</span>}
    </div>
  );
}

export default function ProjectCard({ project, characters, onOpen, actions, selected }) {
  const character = characters.find((c) => c.id === project.characterId);
  const ss = scriptStatus(project);
  const vs = voiceStatus(project);
  const gs = generationStatus(project, characters);
  const dur = projectDuration(project);
  return (
    <article className={`project-card panel ${selected ? 'picked' : ''}`} onClick={onOpen} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen()} aria-pressed={selected}>
      {selected !== undefined && <span className={`pick-box ${selected ? 'on' : ''}`}>{selected && <Icon name="check" size={14} />}</span>}
      <Thumbnail project={project} character={character} />
      <div className="pc-body">
        <div className="row between start">
          <div>
            <h4 className="pc-title">{project.title}</h4>
            {project.conceptId && <span className="small accent-text">{conceptById(project.conceptId)?.name || 'Custom concept'}</span>}
          </div>
          {actions && <Menu items={actions} />}
        </div>
        <div className="pc-meta muted small">
          <span><Icon name="clock" size={12} /> {dur ? fmtShort(dur) : '—'}</span>
          <span>{FORMATS[project.format]?.label}</span>
          <span><Icon name="chart" size={12} /> {(project.examples || []).length} chart example{(project.examples || []).length === 1 ? '' : 's'}</span>
        </div>
        <div className="pc-badges">
          <Badge tone={STATUS_TONE[ss]}>Script · {STATUS_LABEL[ss]}</Badge>
          <Badge tone={STATUS_TONE[vs]}>Voice · {STATUS_LABEL[vs]}</Badge>
          <Badge tone={STATUS_TONE[gs]}>{STATUS_LABEL[gs]}</Badge>
          {project.publication?.status === 'published' && <Badge tone="ok">Published</Badge>}
          {project.publication?.status === 'scheduled' && <Badge tone="accent">Scheduled</Badge>}
          {project.sample && <Badge tone="muted">Sample</Badge>}
        </div>
        <div className="pc-dates muted small">
          <span>Created {fmtDate(project.createdAt)}</span>
          <span>Edited {timeAgo(project.updatedAt)}</span>
        </div>
      </div>
    </article>
  );
}
