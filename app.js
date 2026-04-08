import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// ── CONFIG ─────────────────────────────────────────────
const SUPABASE_URL = 'https://tndnbeuzulxbsiyrwtea.supabase.co'
const SUPABASE_KEY = 'sb_publishable_Temis8liudKBnUVCoifUCA_nVRNmNDs'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── AUTH GUARD ─────────────────────────────────────────
const { data: { session } } = await supabase.auth.getSession()
if (!session) {
  window.location.href = 'login.html'
}

const { data: profil } = await supabase
  .from('profiles')
  .select('rolle, navn')
  .eq('id', session.user.id)
  .single()

if (profil?.rolle !== 'admin') {
  window.location.href = 'kunde.html'
}

document.getElementById('nav-bruger').textContent = '// ' + (profil?.navn || session.user.email).toUpperCase()

window.logUd = async function() {
  await supabase.auth.signOut()
  window.location.href = 'login.html'
}

// ── BANE SUGGESTION ────────────────────────────────────
const baneRegler = [
  { max: 10,   navn: 'CQB — Tæt Kamp',   desc: '1-10 spillere · Lille indendørs/skovbane med tæt kamp' },
  { max: 20,   navn: 'Blandet Terræn',    desc: '11-20 spillere · Mellem bane med åbne og lukkede zoner' },
  { max: 40,   navn: 'Åbent Terræn',      desc: '21-40 spillere · Stor bane med langtræks-engagement' },
  { max: 9999, navn: 'Scenarie-bane',     desc: '40+ spillere · Stor multi-zone scenariebane med mål' },
]

function getBane(antal) {
  return baneRegler.find(r => antal <= r.max)
}

window.suggestBane = function(antal) {
  const box = document.getElementById('bane-box')
  if (!antal || antal < 1) { box.classList.remove('visible'); return }
  const bane = getBane(parseInt(antal))
  document.getElementById('bane-name').textContent = bane.navn
  document.getElementById('bane-desc').textContent = bane.desc
  box.classList.add('visible')
}

// ── NAVIGATION ─────────────────────────────────────────
document.querySelectorAll('nav a[data-page]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault()
    const page = link.dataset.page
    document.querySelectorAll('nav a[data-page]').forEach(a => a.classList.remove('active'))
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
    link.classList.add('active')
    document.getElementById('page-' + page).classList.add('active')
    if (page === 'events')   loadEvents()
    if (page === 'spillere') loadSpillere()
    if (page === 'udstyr')   loadUdstyr()
    if (page === 'brugere')  loadBrugere()
  })
})

window.togglePanel = function(id) {
  document.getElementById(id).classList.toggle('open')
}

function toast(msg) {
  const t = document.getElementById('toast')
  t.textContent = msg
  t.classList.add('show')
  setTimeout(() => t.classList.remove('show'), 2500)
}

// ══════════════════════════════════════════════════════
//  EVENTS
// ══════════════════════════════════════════════════════
async function loadEvents() {
  const { data, error } = await supabase.from('events').select('*').order('dato')
  if (error) { console.error(error); return }

  document.getElementById('stat-events').textContent = data.length

  const tbody = document.getElementById('events-body')
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">INGEN EVENTS OPRETTET</td></tr>'
    return
  }

  tbody.innerHTML = data.map(ev => {
    const dato = ev.dato ? new Date(ev.dato).toLocaleDateString('da-DK') : '—'
    return `
      <tr>
        <td><strong>${ev.titel || '—'}</strong></td>
        <td>${dato}</td>
        <td>${ev.lokation || '—'}</td>
        <td>${ev.antal_spillere || '—'}</td>
        <td>${ev.bane || '—'}</td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="deleteEvent(${ev.id})">Slet</button>
        </td>
      </tr>
    `
  }).join('')
}

window.gemEvent = async function() {
  const titel       = document.getElementById('e-titel').value.trim()
  const dato        = document.getElementById('e-dato').value
  const lokation    = document.getElementById('e-lokation').value.trim()
  const antal       = parseInt(document.getElementById('e-spillere').value)
  const beskrivelse = document.getElementById('e-beskrivelse').value.trim()

  if (!titel || !dato) { toast('FEJL: Udfyld titel og dato'); return }

  const bane = antal ? getBane(antal).navn : null

  const { error } = await supabase.from('events').insert({
    titel, dato, lokation, beskrivelse,
    antal_spillere: antal || null,
    bane
  })

  if (error) { toast('FEJL: ' + error.message); return }

  toast('✓ EVENT OPRETTET')
  togglePanel('event-form')
  ;['e-titel','e-dato','e-lokation','e-spillere','e-beskrivelse'].forEach(id => {
    document.getElementById(id).value = ''
  })
  document.getElementById('bane-box').classList.remove('visible')
  loadEvents()
}

window.deleteEvent = async function(id) {
  if (!confirm('Slet dette event?')) return
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) { toast('FEJL: ' + error.message); return }
  toast('✓ EVENT SLETTET')
  loadEvents()
}

// ══════════════════════════════════════════════════════
//  SPILLERE
// ══════════════════════════════════════════════════════
async function loadSpillere() {
  const { data, error } = await supabase.from('spillere').select('*').order('navn')
  if (error) { console.error(error); return }

  document.getElementById('stat-spillere').textContent = data.length

  const tbody = document.getElementById('spillere-body')
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty">INGEN SPILLERE REGISTRERET</td></tr>'
    return
  }

  tbody.innerHTML = data.map(s => `
  <tr>
    <td><strong>${s.navn}</strong></td>
    <td>
      <span class="badge ${s.medlem ? 'badge-green' : 'badge-dim'}">
        ${s.medlem ? 'MEDLEM' : 'IKKE-MEDLEM'}
      </span>
      ${s.ansøgt && !s.medlem ? '<span class="badge badge-red" style="margin-left:6px">ANSØGT</span>' : ''}
    </td>
    <td>
      <span class="badge ${s.tilmeldt ? 'badge-green' : 'badge-dim'}">
        ${s.tilmeldt ? 'TILMELDT' : 'IKKE TILMELDT'}
      </span>
    </td>
    <td>
      ${s.ansøgt && !s.medlem
        ? `<button class="btn btn-sm" onclick="godkendMedlem(${s.id})">Godkend</button>`
        : ''
      }
      <button class="btn btn-sm" onclick="toggleTilmeldt(${s.id}, ${s.tilmeldt})">
        ${s.tilmeldt ? 'Frameld' : 'Tilmeld'}
      </button>
      <button class="btn btn-sm btn-danger" onclick="deleteSpiller(${s.id})">Slet</button>
    </td>
  </tr>
`).join('')
}

window.gemSpiller = async function() {
  const navn   = document.getElementById('s-navn').value.trim()
  const medlem = document.getElementById('s-medlem').value === 'true'

  if (!navn) { toast('FEJL: Indtast et navn'); return }

  const { error } = await supabase.from('spillere').insert({ navn, medlem, tilmeldt: false })
  if (error) { toast('FEJL: ' + error.message); return }

  toast('✓ SPILLER TILFØJET')
  togglePanel('spiller-form')
  document.getElementById('s-navn').value = ''
  loadSpillere()
}

window.toggleTilmeldt = async function(id, nuværende) {
  const { error } = await supabase.from('spillere').update({ tilmeldt: !nuværende }).eq('id', id)
  if (error) { toast('FEJL: ' + error.message); return }
  toast(nuværende ? '✓ FRAMELDT' : '✓ TILMELDT')
  loadSpillere()
}

window.godkendMedlem = async function(id) {
  const { error } = await supabase
    .from('spillere')
    .update({ medlem: true, ansøgt: false })
    .eq('id', id)
  if (error) { toast('FEJL: ' + error.message); return }
  toast('✓ MEDLEMSKAB GODKENDT')
  loadSpillere()
}

window.deleteSpiller = async function(id) {
  if (!confirm('Slet denne spiller?')) return
  const { error } = await supabase.from('spillere').delete().eq('id', id)
  if (error) { toast('FEJL: ' + error.message); return }
  toast('✓ SPILLER SLETTET')
  loadSpillere()
}

// ══════════════════════════════════════════════════════
//  UDSTYR
// ══════════════════════════════════════════════════════
async function loadUdstyr() {
  const { data, error } = await supabase.from('udstyr').select('*').order('navn')
  if (error) { console.error(error); return }

  document.getElementById('stat-udstyr').textContent = data.length

  const tbody = document.getElementById('udstyr-body')
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">INGEN UDSTYR REGISTRERET</td></tr>'
    return
  }

  tbody.innerHTML = data.map(u => `
    <tr>
      <td><strong>${u.navn}</strong></td>
      <td><span class="badge badge-dim">${u.type || '—'}</span></td>
      <td>
        <span class="badge ${u.lejet ? 'badge-red' : 'badge-green'}">
          ${u.lejet ? 'LEJET UD' : 'TILGÆNGELIGT'}
        </span>
      </td>
      <td>
        <span class="badge ${u.tilstand === 'Defekt' ? 'badge-red' : u.tilstand === 'God' ? 'badge-green' : 'badge-dim'}">
          ${u.tilstand || '—'}
        </span>
      </td>
      <td>${u.lejet_af ? u.lejet_af : '—'}</td>
      <td>
        <button class="btn btn-sm" onclick="toggleLejet(${u.id}, ${u.lejet})">
          ${u.lejet ? 'Returner' : 'Udlej'}
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteUdstyr(${u.id})">Slet</button>
      </td>
    </tr>
  `).join('')
}

window.gemUdstyr = async function() {
  const navn     = document.getElementById('u-navn').value.trim()
  const type     = document.getElementById('u-type').value
  const lejet    = document.getElementById('u-lejet').value === 'true'
  const tilstand = document.getElementById('u-tilstand').value

  if (!navn) { toast('FEJL: Indtast et navn'); return }

  const { error } = await supabase.from('udstyr').insert({ navn, type, lejet, tilstand })
  if (error) { toast('FEJL: ' + error.message); return }

  toast('✓ UDSTYR TILFØJET')
  togglePanel('udstyr-form')
  document.getElementById('u-navn').value = ''
  loadUdstyr()
}

window.toggleLejet = async function(id, nuværende) {
  const opdatering = nuværende
    ? { lejet: false, lejet_af: null }
    : { lejet: true }
  const { error } = await supabase.from('udstyr').update(opdatering).eq('id', id)
  if (error) { toast('FEJL: ' + error.message); return }
  toast(nuværende ? '✓ RETURNERET' : '✓ UDLEJET')
  loadUdstyr()
}

window.deleteUdstyr = async function(id) {
  if (!confirm('Slet dette udstyr?')) return
  const { error } = await supabase.from('udstyr').delete().eq('id', id)
  if (error) { toast('FEJL: ' + error.message); return }
  toast('✓ UDSTYR SLETTET')
  loadUdstyr()
}

// ══════════════════════════════════════════════════════
//  BRUGERE
// ══════════════════════════════════════════════════════
async function loadBrugere() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('navn')

  if (error) { console.error(error); return }

  const tbody = document.getElementById('brugere-body')
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty">INGEN BRUGERE REGISTRERET</td></tr>'
    return
  }

  tbody.innerHTML = data.map(b => `
    <tr>
      <td><strong>${b.navn || '—'}</strong></td>
      <td style="font-size:0.75rem; color:var(--text-dim)">${b.id}</td>
      <td>
        <span class="badge ${b.rolle === 'admin' ? 'badge-green' : 'badge-dim'}">
          ${(b.rolle || 'kunde').toUpperCase()}
        </span>
      </td>
      <td>
        ${b.rolle !== 'admin'
          ? `<button class="btn btn-sm" onclick="gørAdmin('${b.id}')">Gør admin</button>`
          : '—'
        }
      </td>
    </tr>
  `).join('')
}

window.gørAdmin = async function(id) {
  if (!confirm('Gør denne bruger til admin?')) return
  const { error } = await supabase.from('profiles').update({ rolle: 'admin' }).eq('id', id)
  if (error) { toast('FEJL: ' + error.message); return }
  toast('✓ BRUGER ER NU ADMIN')
  loadBrugere()
}

// ── INIT ───────────────────────────────────────────────
loadEvents()
loadSpillere()
loadUdstyr()
