// tpl-wizard.jsx — 3-step portfolio creation wizard. window.CreatePortfolioWizard
const { useState: useWzS } = React;

const THEME_SWATCHES = ['#2E7D32', '#1565C0', '#7C3AED', '#DC2626', '#D97706', '#0E7490', '#BE185D', '#0F172A'];
const wzLabel = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#71717A' };
const wzInput = { width: '100%', height: 42, padding: '0 12px', borderRadius: 8, border: '1px solid #E4E4E7', outline: 'none', fontSize: 14, fontFamily: 'Inter, sans-serif', color: '#18181B', marginTop: 6 };

function Stepper({ step }) {
  const steps = ['Vos informations', 'Choix du template', 'Aperçu & création'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {steps.map((s, i) => {
        const n = i + 1, active = n === step, done = n < step;
        return (
          <React.Fragment key={s}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, background: done || active ? '#2E7D32' : '#F4F4F5', color: done || active ? '#fff' : '#A1A1AA', transition: 'all .25s' }}>
                {done ? <Icon name="check" size={13} stroke={3} /> : n}
              </span>
              <span style={{ fontSize: 13, fontWeight: active ? 600 : 500, color: active ? '#18181B' : '#A1A1AA' }} className="wz-stepname">{s}</span>
            </div>
            {i < steps.length - 1 && <span style={{ flex: 1, height: 1, minWidth: 16, background: done ? '#2E7D32' : '#E4E4E7' }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── STEP 1 : form ──────────────────────────────────────────────
function ChipInput({ items, onChange, placeholder, accent }) {
  const [v, setV] = useWzS('');
  const add = () => { const t = v.trim(); if (t) { onChange([...items, t]); setV(''); } };
  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={v} onChange={e => setV(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} placeholder={placeholder} style={{ ...wzInput, marginTop: 0 }} />
        <button onClick={add} style={{ height: 42, padding: '0 14px', borderRadius: 8, background: '#18181B', color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>Ajouter</button>
      </div>
      {items.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {items.map((it, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '4px 6px 4px 12px', borderRadius: 999, background: mixWhite(accent, 0.9), color: darken(accent, 0.1), fontWeight: 500 }}>
              {it}<button onClick={() => onChange(items.filter((_, j) => j !== i))} style={{ width: 18, height: 18, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.06)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'inherit' }}><Icon name="x" size={11} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function RepeatBlock({ title, items, onChange, fields, accent }) {
  const blank = fields.reduce((o, f) => (o[f.key] = '', o), {});
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={wzLabel}>{title}</span>
        <button onClick={() => onChange([...items, { ...blank }])} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: darken(accent, 0.05), background: 'none', border: 'none', cursor: 'pointer' }}><Icon name="plus" size={14} /> Ajouter</button>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {items.length === 0 && <p style={{ fontSize: 13, color: '#A1A1AA', margin: 0, padding: '10px 0' }}>Aucun élément — optionnel.</p>}
        {items.map((it, i) => (
          <div key={i} style={{ border: '1px solid #E4E4E7', borderRadius: 10, padding: 12, position: 'relative', background: '#FAFAFA' }}>
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 6, border: 'none', background: '#fff', cursor: 'pointer', color: '#DC2626', display: 'grid', placeItems: 'center' }}><Icon name="trash" size={13} /></button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {fields.map(f => (
                <div key={f.key} style={{ gridColumn: f.full ? '1 / -1' : 'auto' }}>
                  <input value={it[f.key] || ''} onChange={e => onChange(items.map((x, j) => j === i ? { ...x, [f.key]: e.target.value } : x))} placeholder={f.ph} style={{ ...wzInput, marginTop: 0, height: 38, fontSize: 13 }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepInfos({ fd, set, accent }) {
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => set({ ...window.SAMPLE_FORMDATA })} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: darken(accent, 0.05), background: mixWhite(accent, 0.9), border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}><Icon name="sparkles" size={13} /> Remplir avec un exemple</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div><label style={wzLabel}>Titre / Nom <span style={{ color: '#DC2626' }}>*</span></label><input value={fd.titre || ''} onChange={e => set({ ...fd, titre: e.target.value })} placeholder="Aminata Diallo" style={wzInput} /></div>
        <div><label style={wzLabel}>Domaine / Métier <span style={{ color: '#DC2626' }}>*</span></label><input value={fd.domaine || ''} onChange={e => set({ ...fd, domaine: e.target.value })} placeholder="Designer UX & Product" style={wzInput} /></div>
        <div><label style={wzLabel}>Localisation</label><input value={fd.localisation || ''} onChange={e => set({ ...fd, localisation: e.target.value })} placeholder="Dakar, Sénégal" style={wzInput} /></div>
        <div><label style={wzLabel}>Photo (URL)</label><input value={fd.photo || ''} onChange={e => set({ ...fd, photo: e.target.value })} placeholder="https://… (sinon initiales)" style={wzInput} /></div>
      </div>
      <div><label style={wzLabel}>Bio</label><textarea value={fd.bio || ''} onChange={e => set({ ...fd, bio: e.target.value })} rows={3} placeholder="Présentez-vous en quelques lignes…" style={{ ...wzInput, height: 'auto', padding: '10px 12px', resize: 'vertical' }} /></div>

      <div>
        <label style={wzLabel}>Couleur du thème</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {THEME_SWATCHES.map(c => {
            const on = (fd.couleur_theme || '') === c;
            return <button key={c} onClick={() => set({ ...fd, couleur_theme: c })} title={c} style={{ width: 30, height: 30, borderRadius: 8, background: c, cursor: 'pointer', border: on ? '2px solid #18181B' : '2px solid transparent', boxShadow: on ? '0 0 0 2px #fff inset' : 'none' }} />;
          })}
          <button onClick={() => set({ ...fd, couleur_theme: '' })} style={{ height: 30, padding: '0 10px', borderRadius: 8, border: '1px dashed #D4D4D8', background: '#fff', fontSize: 12, color: '#71717A', cursor: 'pointer' }}>Défaut du template</button>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#71717A', cursor: 'pointer' }}>
            <input type="color" value={fd.couleur_theme || '#2E7D32'} onChange={e => set({ ...fd, couleur_theme: e.target.value })} style={{ width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} /> Perso
          </label>
        </div>
      </div>

      <div><label style={wzLabel}>Compétences</label><div style={{ marginTop: 6 }}><ChipInput items={fd.competences || []} onChange={(v) => set({ ...fd, competences: v })} placeholder="Figma, User Research…" accent={accent} /></div></div>

      <RepeatBlock title="Projets" items={fd.projets || []} onChange={(v) => set({ ...fd, projets: v })} accent={accent}
        fields={[{ key: 'titre', ph: 'Titre du projet' }, { key: 'categorie', ph: 'Catégorie' }, { key: 'description', ph: 'Description courte', full: true }, { key: 'image', ph: 'Image (URL)', full: true }]} />

      <RepeatBlock title="Expériences" items={fd.experiences || []} onChange={(v) => set({ ...fd, experiences: v })} accent={accent}
        fields={[{ key: 'poste', ph: 'Poste' }, { key: 'entreprise', ph: 'Entreprise' }, { key: 'periode', ph: 'Période (2023 — Présent)', full: true }, { key: 'description', ph: 'Description', full: true }]} />

      <div><label style={wzLabel}>Réseaux & liens</label><div style={{ marginTop: 6 }}>
        <ChipInput items={(fd.social_links || []).map(s => s.label || s.type || s)} onChange={(labels) => set({ ...fd, social_links: labels.map(l => ({ type: l, label: l })) })} placeholder="LinkedIn, GitHub, Email…" accent={accent} />
      </div></div>
    </div>
  );
}

// ── STEP 2 : template grid ─────────────────────────────────────
const VARIANT_LABELS = {
  classic: 'Classique', cover: 'Couverture', split: 'Colonnes',
  centered: 'Centré', sidebar: 'Rail', band: 'Bandeau',
  list: 'Liste', center: 'Centré', index: 'Index',
  panel: 'Panneaux', hero: 'Héros', mono: 'Mono',
};
function thumbBody(tpl, c, dark, line, bar) {
  const v = tpl.variant, fam = tpl.famille;
  const soft = dark ? 'rgba(255,255,255,0.06)' : '#F4F4F5';
  const blk = (extra) => <div style={{ flex: 1, borderRadius: 3, background: soft, border: dark ? '1px solid rgba(255,255,255,0.08)' : 'none', ...extra }} />;
  const wrap = (children, st) => <div style={{ padding: 8, height: '100%', display: 'flex', flexDirection: 'column', gap: 5, ...st }}>{children}</div>;

  if (fam === 'editorial') {
    if (v === 'cover') return <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}><div style={{ height: 30, background: `linear-gradient(135deg, ${c}, ${c}99)`, display: 'grid', placeItems: 'center' }}><div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff' }} /></div><div style={{ padding: 8, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>{bar('50%', '#18181B', 5)}{bar('30%', c, 3)}<div style={{ display: 'flex', gap: 5, width: '100%', flex: 1, marginTop: 2 }}>{blk()}{blk()}</div></div></div>;
    if (v === 'split') return wrap(<div style={{ display: 'flex', gap: 6, height: '100%' }}><div style={{ width: '42%', display: 'flex', flexDirection: 'column', gap: 4 }}><div style={{ width: 14, height: 14, borderRadius: 4, background: c }} />{bar('100%', '#18181B', 6)}{bar('70%', c, 3)}{bar('90%', line, 3)}</div><div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>{blk()}{bar('80%', line, 3)}</div></div>);
    return wrap(<React.Fragment>{bar('62%', '#18181B', 8)}{bar('40%', c)}<div style={{ display: 'flex', gap: 5, flex: 1, marginTop: 3 }}><div style={{ width: '34%', display: 'flex', flexDirection: 'column', gap: 3 }}>{bar('100%', line, 3)}{bar('80%', line, 3)}</div>{blk()}</div></React.Fragment>);
  }
  if (fam === 'classique') {
    if (v === 'sidebar') return wrap(<div style={{ display: 'flex', gap: 6, height: '100%' }}><div style={{ width: '38%', borderRadius: 5, background: soft, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: 6 }}><div style={{ width: 16, height: 16, borderRadius: '50%', background: c }} />{bar('70%', '#18181B', 3)}{bar('50%', line, 2)}</div><div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>{blk()}{blk()}</div></div>);
    if (v === 'band') return <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}><div style={{ height: 34, background: `${c}22`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}><div style={{ width: 16, height: 16, borderRadius: '50%', background: c }} />{bar('40%', '#18181B', 3)}</div><div style={{ padding: 8, flex: 1, display: 'flex', gap: 5 }}>{blk()}{blk()}</div></div>;
    return wrap(<React.Fragment><div style={{ width: 22, height: 22, borderRadius: '50%', background: c, margin: '0 auto' }} />{bar('46%', '#18181B', 5)}{bar('30%', c, 3)}<div style={{ display: 'flex', gap: 5, width: '100%', flex: 1, marginTop: 3 }}>{blk()}{blk()}</div></React.Fragment>, { alignItems: 'center', gap: 4 });
  }
  if (fam === 'minimal') {
    if (v === 'center') return wrap(<React.Fragment><div style={{ width: 18, height: 18, borderRadius: '50%', background: c, margin: '4px auto 0' }} />{bar('50%', '#18181B', 6)}{bar('34%', line, 3)}<div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>{bar('70%', line, 3)}{bar('50%', line, 3)}</div></React.Fragment>, { alignItems: 'center', gap: 5, padding: 10 });
    if (v === 'index') return wrap(<React.Fragment>{bar('52%', '#18181B', 6)}<div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>{[0, 1, 2].map(i => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: c }} />{bar(i === 1 ? '70%' : '85%', line, 3)}</div>)}</div></React.Fragment>, { padding: 10 });
    return wrap(<React.Fragment>{bar('52%', '#18181B', 7)}<div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>{bar('24%', line, 3)}<span style={{ width: 5, height: 5, borderRadius: '50%', background: c }} /></div><div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>{bar('80%', line, 3)}{bar('60%', line, 3)}</div></React.Fragment>, { padding: 10, gap: 7 });
  }
  // sombre
  if (v === 'hero') return <div style={{ height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 8, overflow: 'hidden' }}><div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', width: 60, height: 60, borderRadius: '50%', background: `radial-gradient(circle, ${c}66, transparent 70%)` }} /><div style={{ position: 'relative', width: 18, height: 18, borderRadius: '50%', background: c, marginTop: 4 }} /><div style={{ position: 'relative', width: '52%', height: 6, borderRadius: 2, background: '#fff' }} />{bar('32%', c, 3)}<div style={{ display: 'flex', gap: 5, width: '100%', flex: 1, marginTop: 2 }}>{blk()}{blk()}</div></div>;
  if (v === 'mono') return wrap(<React.Fragment><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{bar('44%', '#fff', 6)}<span style={{ width: 8, height: 8, background: c }} /></div>{bar('30%', c, 3)}<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, flex: 1, marginTop: 3 }}>{blk()}{blk()}</div></React.Fragment>, { padding: 8 });
  return wrap(<React.Fragment>{bar('60%', '#fff', 8)}{bar('38%', c)}<div style={{ display: 'flex', gap: 5, flex: 1, marginTop: 3 }}><div style={{ width: '34%', display: 'flex', flexDirection: 'column', gap: 3 }}>{bar('100%', line, 3)}{bar('80%', line, 3)}</div>{blk()}</div></React.Fragment>);
}
function MiniThumb({ tpl, selected, locked, onClick }) {
  const c = tpl.couleur, dark = tpl.famille === 'sombre';
  const bg = dark ? '#0E0F13' : '#fff';
  const line = dark ? 'rgba(255,255,255,0.18)' : '#E4E4E7';
  const bar = (w, col, h = 4) => <div style={{ width: w, height: h, borderRadius: 2, background: col }} />;
  const body = thumbBody(tpl, c, dark, line, bar);

  return (
    <button onClick={onClick} style={{ textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
      <div style={{ position: 'relative', height: 104, borderRadius: 12, overflow: 'hidden', background: bg, border: selected ? `2px solid ${c}` : '1px solid #E4E4E7', boxShadow: selected ? `0 0 0 2px ${c}` : 'none', filter: locked ? 'grayscale(0.7)' : 'none', opacity: locked ? 0.7 : 1, transition: 'all .2s' }}>
        {body}
        {locked && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.45)' }}><span style={{ width: 28, height: 28, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'grid', placeItems: 'center', color: '#71717A' }}><Icon name="lock" size={14} /></span></div>}
        {selected && !locked && <span style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: '50%', background: c, display: 'grid', placeItems: 'center', color: onAccent(c) }}><Icon name="check" size={12} stroke={3} /></span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, gap: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#18181B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tpl.name}</span>
        {locked ? <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: '#F4F4F5', color: '#A1A1AA', flexShrink: 0 }}>{window.TIERS[tpl.tier].label}</span> : <span style={{ width: 9, height: 9, borderRadius: '50%', background: tpl.couleur, flexShrink: 0 }} />}
      </div>
      <span style={{ fontSize: 10.5, color: '#A1A1AA' }}>{window.FAMILLES[tpl.famille].label} · {VARIANT_LABELS[tpl.variant] || tpl.variant}</span>
    </button>
  );
}

function StepTemplates({ plan, selectedId, onPick, hint }) {
  const T = window.TEMPLATES;
  const [fam, setFam] = useWzS('all');
  const fams = [['all', 'Toutes'], ['editorial', 'Éditorial'], ['classique', 'Classique'], ['minimal', 'Minimal'], ['sombre', 'Sombre']];
  const list = fam === 'all' ? T : T.filter(t => t.famille === fam);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {fams.map(([k, l]) => <button key={k} onClick={() => setFam(k)} style={{ height: 32, padding: '0 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: fam === k ? 'none' : '1px solid #E4E4E7', background: fam === k ? '#18181B' : '#fff', color: fam === k ? '#fff' : '#52525B' }}>{l}</button>)}
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, padding: '5px 11px', borderRadius: 999, background: '#E8F5E9', color: '#2E7D32' }}><Icon name="sparkles" size={12} /> {window.unlockedCount(plan)} / {T.length} débloqués · {plan}</span>
      </div>
      {hint && (
        <div style={{ marginBottom: 14, borderRadius: 10, border: '1px solid #FCD9B6', background: '#FFF7ED', padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 32, height: 32, borderRadius: 8, background: '#FED7AA', color: '#B45309', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="lock" size={15} /></span>
          <div style={{ flex: 1, minWidth: 0 }}><p style={{ fontSize: 13, fontWeight: 700, color: '#9A3412', margin: 0 }}>« {hint.name} » nécessite la formule {window.TIERS[hint.tier].plan}</p><p style={{ fontSize: 12, color: '#B45309', margin: 0 }}>Passez à un plan supérieur pour le débloquer.</p></div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16 }}>
        {list.map(t => <MiniThumb key={t.id} tpl={t} selected={selectedId === t.id} locked={!window.isUnlocked(t, plan)} onClick={() => onPick(t)} />)}
      </div>
    </div>
  );
}

// ── STEP 3 : recap + preview ───────────────────────────────────
function StepRecap({ fd, tpl }) {
  const d = window.normalizeFormData(fd);
  const accent = d.couleur_theme || tpl.couleur;
  const rows = [
    ['Titre', d.titre], ['Domaine', d.domaine], ['Localisation', d.localisation || '—'],
    ['Template', `${tpl.name} · ${window.FAMILLES[tpl.famille].label}`],
    ['Projets', d.projets.length], ['Expériences', d.experiences.length], ['Compétences', d.competences.length],
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 28, alignItems: 'start' }} className="wz-recap">
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px' }}>Récapitulatif</h3>
        <div style={{ display: 'grid', gap: 0, border: '1px solid #E4E4E7', borderRadius: 12, overflow: 'hidden' }}>
          {rows.map(([k, v], i) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '11px 14px', fontSize: 13.5, background: i % 2 ? '#FAFAFA' : '#fff' }}>
              <span style={{ color: '#71717A' }}>{k}</span><span style={{ fontWeight: 600, color: '#18181B', textAlign: 'right' }}>{v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', fontSize: 13.5, background: '#fff' }}>
            <span style={{ color: '#71717A' }}>Couleur</span><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600 }}><span style={{ width: 16, height: 16, borderRadius: 5, background: accent }} /> {accent}</span>
          </div>
        </div>
        <p style={{ fontSize: 12.5, color: '#A1A1AA', margin: '14px 0 0', lineHeight: 1.6, display: 'flex', gap: 8 }}><Icon name="eye" size={15} style={{ flexShrink: 0, marginTop: 1 }} /> L'aperçu à droite simule le rendu réel sur mobile selon la famille « {window.FAMILLES[tpl.famille].label} » et votre couleur.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <PhonePreview tpl={tpl} formData={fd} />
        <span style={{ fontSize: 12, color: '#A1A1AA' }}>Aperçu live</span>
      </div>
    </div>
  );
}

// ── Wizard shell ───────────────────────────────────────────────
function CreatePortfolioWizard({ plan, onClose, onCreate, initialData, initialTemplateId }) {
  const [step, setStep] = useWzS(1);
  const [fd, setFd] = useWzS(initialData || { titre: '', domaine: '', social_links: [], competences: [], projets: [], experiences: [] });
  const [selId, setSelId] = useWzS(initialTemplateId || window.TEMPLATES[0].id);
  const [hint, setHint] = useWzS(null);
  const tpl = window.TEMPLATES.find(t => t.id === selId) || window.TEMPLATES[0];
  const accent = fd.couleur_theme || tpl.couleur;
  const canNext1 = (fd.titre || '').trim() && (fd.domaine || '').trim();

  const pick = (t) => { if (window.isUnlocked(t, plan)) { setSelId(t.id); setHint(null); } else setHint(t); };
  const next = () => setStep(s => Math.min(3, s + 1));
  const prev = () => setStep(s => Math.max(1, s - 1));

  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(16,24,40,0.55)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ background: '#fff', width: '100%', maxWidth: step === 2 ? 860 : step === 3 ? 800 : 680, borderRadius: 18, boxShadow: '0 30px 70px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', maxHeight: '92vh', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #EEE', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}><Stepper step={step} /></div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: '#F4F4F5', cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#71717A', flexShrink: 0 }}><Icon name="x" size={17} /></button>
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
          {step === 1 && <StepInfos fd={fd} set={setFd} accent={accent} />}
          {step === 2 && <StepTemplates plan={plan} selectedId={selId} onPick={pick} hint={hint} />}
          {step === 3 && <StepRecap fd={fd} tpl={tpl} />}
        </div>
        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid #EEE', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <button onClick={step === 1 ? onClose : prev} style={{ height: 42, padding: '0 18px', borderRadius: 8, border: '1px solid #E4E4E7', background: '#fff', fontSize: 14, fontWeight: 600, color: '#18181B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {step === 1 ? 'Annuler' : <React.Fragment><Icon name="arrow" size={15} style={{ transform: 'rotate(180deg)' }} /> Précédent</React.Fragment>}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {step === 2 && <span style={{ fontSize: 13, color: '#71717A' }}>Sélection : <strong style={{ color: '#18181B' }}>{tpl.name}</strong></span>}
            {step < 3
              ? <button onClick={next} disabled={step === 1 && !canNext1} style={{ height: 42, padding: '0 22px', borderRadius: 8, border: 'none', background: (step === 1 && !canNext1) ? '#A7C7A9' : '#2E7D32', color: '#fff', fontSize: 14, fontWeight: 600, cursor: (step === 1 && !canNext1) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>Suivant <Icon name="arrow" size={15} /></button>
              : <button onClick={() => { onCreate && onCreate(tpl, fd); }} style={{ height: 42, padding: '0 22px', borderRadius: 8, border: 'none', background: '#2E7D32', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="check" size={16} /> Créer le portfolio</button>}
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `@media(max-width:640px){.wz-stepname{display:none;}.wz-recap{grid-template-columns:1fr !important;justify-items:center;}}` }} />
    </div>
  );
}
window.CreatePortfolioWizard = CreatePortfolioWizard;
