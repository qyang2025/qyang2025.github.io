import { proseHtml, escapeHtml } from './math.mjs';

export const schematicKinds = ['none', 'flow', 'compare', 'cycle', 'tree'];
export const schematicIcons = ['sensor', 'filter', 'vector', 'database', 'gear', 'target', 'warning', 'check', 'rod', 'network', 'field', 'derivative'];
const paths = {
 rod:'<rect x="4" y="18" width="40" height="12" rx="3"/><path d="M12 18v12M20 18v12M28 18v12M36 18v12M4 12v24M44 12v24"/>',
 network:'<path d="M10 10 25 17 40 24 25 31 10 38M10 10 25 31M10 24 25 17M10 24 25 31M10 38 25 17"/><circle cx="10" cy="10" r="3"/><circle cx="10" cy="24" r="3"/><circle cx="10" cy="38" r="3"/><circle cx="25" cy="17" r="3"/><circle cx="25" cy="31" r="3"/><circle cx="40" cy="24" r="3"/>',
 field:'<path d="M6 40V8M6 40h36M10 34c8-30 18-30 28 0M10 36c8-18 18-18 28 0M10 38c8-8 18-8 28 0"/>',
 derivative:'<path d="M6 40V8M6 40h36M10 33c5 0 10-23 16-23s9 20 14 20M15 33 31 9"/><circle cx="23" cy="21" r="3"/>',

  sensor: '<path d="M8 25h32M12 19l6-8 8 12 10-15"/><circle cx="18" cy="11" r="2"/><circle cx="26" cy="23" r="2"/><path d="M10 34h28M16 29v10M32 29v10"/>',
  filter: '<path d="M7 10h34L28 25v12l-8 4V25Z"/>',
  vector: '<path d="M9 39V9M9 39h31M12 35 36 14M27 14h9v9"/>',
  database: '<ellipse cx="24" cy="11" rx="16" ry="6"/><path d="M8 11v26c0 8 32 8 32 0V11M8 24c0 8 32 8 32 0"/>',
  gear: '<circle cx="24" cy="24" r="12"/><circle cx="24" cy="24" r="4"/><path d="M24 5v7M24 36v7M5 24h7M36 24h7M10 10l5 5M33 33l5 5M10 38l5-5M33 15l5-5"/>',
  target: '<circle cx="24" cy="24" r="18"/><circle cx="24" cy="24" r="10"/><circle cx="24" cy="24" r="2"/>',
  warning: '<path d="M24 6 44 40H4ZM24 17v12M24 34v2"/>',
  check: '<circle cx="24" cy="24" r="18"/><path d="m13 24 8 8 15-16"/>'
};
export function validateSchematic(diagram, beats) {
  if (diagram == null) return; // Legacy saved lessons.
  const fail = () => { throw new Error('示意图无效：请使用 2–4 个短标签节点和有效的逐步呈现顺序'); };
  if (!schematicKinds.includes(diagram.kind) || !Array.isArray(diagram.nodes) || !Array.isArray(diagram.links)) fail();
  if (diagram.kind === 'none') { if (diagram.nodes.length || diagram.links.length) fail(); return; }
  if (diagram.nodes.length < 2 || diagram.nodes.length > 4 || (diagram.kind === 'compare' && diagram.nodes.length !== 2)) fail();
  const expected = diagram.kind === 'compare' ? 0 : diagram.nodes.length - (diagram.kind === 'cycle' ? 0 : 1);
  if (diagram.links.length !== expected) fail();
  for (const n of diagram.nodes) {
    if ([n.label,n.labelEn,n.detail,n.detailEn].some(value=>typeof value==='string'&&/[\u0000-\u001f\u007f]/.test(value))) fail();
    if (!schematicIcons.includes(n.icon) || !Number.isInteger(n.revealAt) || n.revealAt < 0 || n.revealAt >= beats ||
      typeof n.label !== 'string' || !n.label.trim() || n.label.length > 60 || typeof n.labelEn !== 'string' || !n.labelEn.trim() || n.labelEn.length > 90 ||
      typeof n.detail !== 'string' || n.detail.length > 90 || typeof n.detailEn !== 'string' || n.detailEn.length > 130) fail();
  }
  if (diagram.nodes[0].revealAt !== 0 || diagram.nodes.some((n,i) => i && n.revealAt < diagram.nodes[i-1].revealAt)) fail();
  for (const l of diagram.links) if (typeof l.label !== 'string' || l.label.length > 40 || typeof l.labelEn !== 'string' || l.labelEn.length > 60) fail();
}
export function schematicHtml(diagram, step = 0, language = 'zh') {
  if (!diagram || diagram.kind === 'none') return '';
  const keepTail = (text='') => language === 'en' && !text.includes('$') ? text.replace(/(\S+)\s+(\S+)$/, '$1\u00a0$2') : text;
  const label = n => keepTail(language === 'en' ? n.labelEn : n.label);
  const detail = n => keepTail(language === 'en' ? n.detailEn : n.detail);
  const card = (n,i) => `<div class="schematic-node ${n.revealAt === step ? 'node-current' : ''}" ${n.revealAt > step ? 'hidden' : ''} data-reveal="${n.revealAt}" data-diagram-node="${i}"><svg viewBox="0 0 48 48" aria-hidden="true">${paths[n.icon] || paths.gear}</svg><strong>${proseHtml(label(n))}</strong>${detail(n) ? `<span>${proseHtml(detail(n))}</span>` : ''}</div>`;
  const link = (i, visible) => `<div class="schematic-link" data-diagram-link="${i}" ${visible ? '' : 'hidden'}><span>${proseHtml(language === 'en' ? diagram.links[i].labelEn : diagram.links[i].label)}</span><b aria-hidden="true">${diagram.kind === 'tree' ? '↓' : '→'}</b></div>`;
  let body;
  if (diagram.kind === 'tree') {
    body = `${card(diagram.nodes[0],0)}<div class="schematic-branches">${diagram.nodes.slice(1).map((n,i)=>`<div class="schematic-branch" ${n.revealAt > step ? 'hidden' : ''}>${link(i,true)}${card(n,i+1)}</div>`).join('')}</div>`;
  } else {
    body = diagram.nodes.map((n,i)=>`${i && diagram.kind !== 'compare' ? link(i-1,n.revealAt <= step) : ''}${card(n,i)}`).join('');
    if (diagram.kind === 'cycle') body += `<div class="schematic-return" ${diagram.nodes.at(-1).revealAt > step ? 'hidden' : ''}>↶ ${proseHtml(label(diagram.links.at(-1)))}</div>`;
  }
  return `<figure class="schematic schematic-${escapeHtml(diagram.kind)}" aria-label="${language === 'en' ? 'Simplified conceptual diagram' : '简化概念示意图'}"><div class="schematic-body">${body}</div></figure>`;
}
