import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// CONFIG
const SUPABASE_URL = 'https://tndnbeuzulxbsiyrwtea.supabase.co'
const SUPABASE_KEY = 'sb_publishable_Temis8liudKBnUVCoifUCA_nVRNmNDs'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// AUTH GUARD
const { data: { session } } = await supabase.auth.getSession()
if (!session) window.location.href = 'login.html'

const { data: profil } = await supabase
  .from('profiles')
  .select('rolle, navn')
  .eq('id', session.user.id)
  .single()

if (profil?.rolle !== 'admin') window.location.href = 'kunde.html'

document.getElementById('nav-bruger').textContent = '// ' + (profil?.navn || session.user.email).toUpperCase()

window.logUd = async function() {
  await supabase.auth.signOut()
  window.location.href = 'login.html'
}

// BANE
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

// NAVIGATION
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
    if (page === 'udlejninger') loadUdlejninger()
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

<<<<<<< HEAD
// EVENTS
=======
// ══════════════════════════════════════════════════════
//  LOKALE ARRAYS — data gemmes her efter hentning fra databasen.
//  Søgning, filtrering og statistik arbejder på disse arrays
//  uden at lave nye database-kald hver gang.
// ══════════════════════════════════════════════════════
let alleEvents   = []
let alleSpillere = []
let alleUdstyr   = []

// ══════════════════════════════════════════════════════
//  STATISTIK
//
//  Udregner nøgletal fra de lokale arrays og opdaterer
//  dashboard-boksene. Kører automatisk efter hvert load.
// ══════════════════════════════════════════════════════
function opdaterStatistik() {
  // ── Events: tæl kun fremtidige events ──
  const idag = new Date()
  idag.setHours(0, 0, 0, 0)
  const kommendeEvents = alleEvents.filter(ev => new Date(ev.dato) >= idag)
  document.getElementById('stat-events').textContent = kommendeEvents.length

  // ── Spillere: vis antal + procent der er medlemmer ──
  const antalSpillere  = alleSpillere.length
  const antalMedlemmer = alleSpillere.filter(s => s.medlem === true).length
  document.getElementById('stat-spillere').textContent = antalSpillere

  const statSpillereSub = document.getElementById('stat-spillere-sub')
  if (statSpillereSub) {
    const pct = antalSpillere > 0 ? Math.round((antalMedlemmer / antalSpillere) * 100) : 0
    statSpillereSub.textContent = antalMedlemmer + ' medlemmer (' + pct + '%)'
  }

  // ── Udstyr: tilgængeligt = samlet antal minus udlejet ──
  const samletAntal  = alleUdstyr.reduce((sum, u) => sum + (u.antal || 1), 0)
  const samletLejet  = alleUdstyr.reduce((sum, u) => sum + (u.antal_lejet || 0), 0)
  const tilgængeligt = samletAntal - samletLejet
  document.getElementById('stat-udstyr').textContent = tilgængeligt

  const statUdstyrSub = document.getElementById('stat-udstyr-sub')
  if (statUdstyrSub) {
    statUdstyrSub.textContent = samletLejet + ' lejet ud · ' + samletAntal + ' i alt'
  }
}

// ══════════════════════════════════════════════════════
//  SØGNING & FILTRERING
// ══════════════════════════════════════════════════════
function filterEvents(søgeTekst) {
  const tekst = søgeTekst.toLowerCase()
  const filtrerede = alleEvents.filter(ev =>
    (ev.titel    || '').toLowerCase().includes(tekst) ||
    (ev.lokation || '').toLowerCase().includes(tekst) ||
    (ev.bane     || '').toLowerCase().includes(tekst)
  )
  renderEvents(filtrerede)
}

function filterSpillere() {
  const tekst  = document.getElementById('spillere-søg').value.toLowerCase()
  const status = document.getElementById('spillere-filter').value
  const filtrerede = alleSpillere.filter(s => {
    const navnMatcher  = (s.navn || '').toLowerCase().includes(tekst)
    let statusMatcher  = true
    if (status === 'medlem')      statusMatcher = s.medlem === true
    if (status === 'ikke-medlem') statusMatcher = s.medlem === false
    return navnMatcher && statusMatcher
  })
  renderSpillere(filtrerede)
}

function filterUdstyr() {
  const tekst = document.getElementById('udstyr-søg').value.toLowerCase()
  const type  = document.getElementById('udstyr-filter').value
  const filtrerede = alleUdstyr.filter(u => {
    const navnMatcher = (u.navn || '').toLowerCase().includes(tekst)
    const typeMatcher = type === 'alle' || u.type === type
    return navnMatcher && typeMatcher
  })
  renderUdstyr(filtrerede)
}

window.filterEvents   = filterEvents
window.filterSpillere = filterSpillere
window.filterUdstyr   = filterUdstyr

// ══════════════════════════════════════════════════════
//  EVENTS
// ══════════════════════════════════════════════════════
>>>>>>> 67456c50a9a5fe2f65a3a189b3da8c081977de60
async function loadEvents() {
  const { data, error } = await supabase.from('events').select('*').order('dato')
  if (error) { console.error(error); return }
  alleEvents = data
  opdaterStatistik()
  const søgefelt = document.getElementById('events-søg')
  if (søgefelt) søgefelt.value = ''
  renderEvents(data)
}

function renderEvents(data) {
  const tbody = document.getElementById('events-body')
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">INGEN EVENTS FUNDET</td></tr>'
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

  // Validering: dato må ikke være i fortiden
  const valgtDato = new Date(dato)
  const idag      = new Date()
  idag.setHours(0, 0, 0, 0)
  if (valgtDato < idag) { toast('FEJL: Dato kan ikke være i fortiden'); return }

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

// SPILLERE
async function loadSpillere() {
  const { data, error } = await supabase.from('spillere').select('*').order('navn')
  if (error) { console.error(error); return }
  alleSpillere = data
  opdaterStatistik()
  const søgefelt = document.getElementById('spillere-søg')
  const filter   = document.getElementById('spillere-filter')
  if (søgefelt) søgefelt.value = ''
  if (filter)   filter.value  = 'alle'
  renderSpillere(data)
}

function renderSpillere(data) {
  const tbody = document.getElementById('spillere-body')
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty">INGEN SPILLERE FUNDET</td></tr>'
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
  const { error } = await supabase.from('spillere').update({ medlem: true, ansøgt: false }).eq('id', id)
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

//  UDSTYR
<<<<<<< HEAD
=======
//
//  Hvert udstyr har et samlet antal og antal_lejet.
//  Tilgængeligt = antal - antal_lejet
//  Admin justerer antal med + og − knapper direkte i tabellen.
// ══════════════════════════════════════════════════════
>>>>>>> 67456c50a9a5fe2f65a3a189b3da8c081977de60
async function loadUdstyr() {
  const { data, error } = await supabase.from('udstyr').select('*').order('navn')
  if (error) { console.error(error); return }
  alleUdstyr = data
  opdaterStatistik()
  const søgefelt = document.getElementById('udstyr-søg')
  const filter   = document.getElementById('udstyr-filter')
  if (søgefelt) søgefelt.value = ''
  if (filter)   filter.value  = 'alle'
  renderUdstyr(data)
}

function renderUdstyr(data) {
  const tbody = document.getElementById('udstyr-body')
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">INGEN UDSTYR FUNDET</td></tr>'
    return
  }
  tbody.innerHTML = data.map(u => {
    const samlet      = u.antal || 1
    const lejet       = u.antal_lejet || 0
    const tilgængelig = samlet - lejet

    const statusBadge = tilgængelig <= 0
      ? '<span class="badge badge-red">UDLEJET</span>'
      : `<span class="badge badge-green">TILGÆNGELIGT</span>`

    return `
      <tr>
        <td><strong>${u.navn}</strong></td>
        <td><span class="badge badge-dim">${u.type || '—'}</span></td>
        <td>${statusBadge}</td>
        <td>
          <span class="badge ${u.tilstand === 'Defekt' ? 'badge-red' : u.tilstand === 'God' ? 'badge-green' : 'badge-dim'}">
            ${u.tilstand || '—'}
          </span>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:8px">
            <button class="btn btn-sm" onclick="justerAntal(${u.id}, ${lejet}, ${samlet}, -1)" ${samlet <= 1 ? 'disabled' : ''}>−</button>
            <span style="font-family:'Share Tech Mono',monospace; font-size:0.85rem">${tilgængelig}/${samlet}</span>
            <button class="btn btn-sm" onclick="justerAntal(${u.id}, ${lejet}, ${samlet}, +1)">+</button>
          </div>
        </td>
        <td>
          <button class="btn btn-sm" onclick="udlejEt(${u.id}, ${lejet}, ${samlet})" ${tilgængelig <= 0 ? 'disabled' : ''}>Udlej</button>
          <button class="btn btn-sm" onclick="returnerEt(${u.id}, ${lejet})" ${lejet <= 0 ? 'disabled' : ''}>Returner</button>
          <button class="btn btn-sm btn-danger" onclick="deleteUdstyr(${u.id})">Slet</button>
        </td>
      </tr>
    `
  }).join('')
}

// Justerer det samlede antal op eller ned
window.justerAntal = async function(id, antalLejet, nuværendeAntal, retning) {
  const nytAntal = nuværendeAntal + retning
  if (nytAntal < antalLejet) {
    toast('FEJL: Kan ikke sætte under antal udlejet (' + antalLejet + ')')
    return
  }
  if (nytAntal < 1) { toast('FEJL: Antal kan ikke være under 1'); return }
  const { error } = await supabase.from('udstyr').update({ antal: nytAntal }).eq('id', id)
  if (error) { toast('FEJL: ' + error.message); return }
  loadUdstyr()
}

// Udlej ét styk
window.udlejEt = async function(id, antalLejet, samlet) {
  if (antalLejet >= samlet) { toast('FEJL: Ingen ledige tilbage'); return }
  const { error } = await supabase.from('udstyr').update({ antal_lejet: antalLejet + 1, lejet_af: (profil?.navn || session.user.email) }).eq('id', id)
  if (error) { toast('FEJL: ' + error.message); return }
  toast('✓ UDLEJET')
  loadUdstyr()
}

// Returner ét styk
window.returnerEt = async function(id, antalLejet) {
  if (antalLejet <= 0) { toast('FEJL: Ingen udlejede at returnere'); return }
  const { error } = await supabase.from('udstyr').update({ antal_lejet: antalLejet - 1 }).eq('id', id)
  if (error) { toast('FEJL: ' + error.message); return }
  toast('✓ RETURNERET')
  loadUdstyr()
}

window.gemUdstyr = async function() {
  const navn     = document.getElementById('u-navn').value.trim()
  const type     = document.getElementById('u-type').value
  const antal    = parseInt(document.getElementById('u-antal').value) || 1
  const tilstand = document.getElementById('u-tilstand').value
  if (!navn) { toast('FEJL: Indtast et navn'); return }
  if (antal < 1) { toast('FEJL: Antal skal være mindst 1'); return }
  const { error } = await supabase.from('udstyr').insert({ navn, type, tilstand, antal, antal_lejet: 0 })
  if (error) { toast('FEJL: ' + error.message); return }
  toast('✓ UDSTYR TILFØJET')
  togglePanel('udstyr-form')
  document.getElementById('u-navn').value = ''
  loadUdstyr()
}

window.deleteUdstyr = async function(id) {
  if (!confirm('Slet dette udstyr?')) return
  const { error } = await supabase.from('udstyr').delete().eq('id', id)
  if (error) { toast('FEJL: ' + error.message); return }
  toast('✓ UDSTYR SLETTET')
  loadUdstyr()
}

//  BRUGERE
async function loadBrugere() {
  const { data, error } = await supabase.from('profiles').select('*').order('navn')
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

// ══════════════════════════════════════════════════════
//  UDLEJNINGER
//
//  Viser en oversigt over alt udstyr der aktuelt er lejet ud,
//  inkl. hvem der har lejet det. Admin kan returnere herfra.
// ══════════════════════════════════════════════════════
async function loadUdlejninger() {
  const { data, error } = await supabase
    .from('udstyr')
    .select('*')
    .gt('antal_lejet', 0)  // kun udstyr hvor mindst 1 er lejet ud
    .order('navn')

  if (error) { console.error(error); return }

  const tbody = document.getElementById('udlejninger-body')

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">INTET UDSTYR ER AKTUELT LEJET UD</td></tr>'
    return
  }

  tbody.innerHTML = data.map(u => `
    <tr>
      <td><strong>${u.navn}</strong></td>
      <td><span class="badge badge-dim">${u.type || '—'}</span></td>
      <td>${u.lejet_af || '—'}</td>
      <td>
        <span class="badge badge-red">${u.antal_lejet} lejet ud</span>
      </td>
      <td>
        <span class="badge ${u.tilstand === 'Defekt' ? 'badge-red' : u.tilstand === 'God' ? 'badge-green' : 'badge-dim'}">
          ${u.tilstand || '—'}
        </span>
      </td>
      <td>
        <button class="btn btn-sm" onclick="returnerEt(${u.id}, ${u.antal_lejet}); loadUdlejninger()">
          Returner én
        </button>
      </td>
    </tr>
  `).join('')
}