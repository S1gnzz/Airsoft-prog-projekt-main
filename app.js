import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://tndnbeuzulxbsiyrwtea.supabase.co'
const SUPABASE_KEY = 'sb_publishable_Temis8liudKBnUVCoifUCA_nVRNmNDs'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const { data: sessionData } = await supabase.auth.getSession()
const session = sessionData.session

if (session === null) {
  window.location.href = 'login.html'
}

const { data: profil } = await supabase
  .from('profiles')
  .select('rolle, navn')
  .eq('id', session.user.id)
  .single()

if (profil.rolle !== 'admin') {
  window.location.href = 'kunde.html'
}

document.getElementById('nav-bruger').textContent = '// ' + profil.navn.toUpperCase()

window.logUd = async function() {
  await supabase.auth.signOut()
  window.location.href = 'login.html'
}

const baneRegler = [
  { max: 10,   navn: 'CQB — Tæt Kamp',  desc: '1-10 spillere · Lille bane med tæt kamp' },
  { max: 20,   navn: 'Blandet Terræn',   desc: '11-20 spillere · Mellem bane' },
  { max: 40,   navn: 'Åbent Terræn',     desc: '21-40 spillere · Stor bane' },
  { max: 9999, navn: 'Scenarie-bane',    desc: '40+ spillere · Multi-zone bane' },
]

function getBane(antal) {
  var i = 0
  while (i < baneRegler.length) {
    if (antal <= baneRegler[i].max) {
      return baneRegler[i]
    }
    i++
  }
}

window.suggestBane = function(antal) {
  var boks = document.getElementById('bane-box')
  if (antal < 1 || antal === '') {
    boks.classList.remove('visible')
    return
  }
  var bane = getBane(parseInt(antal))
  document.getElementById('bane-name').textContent = bane.navn
  document.getElementById('bane-desc').textContent = bane.desc
  boks.classList.add('visible')
}

var navLinks = document.querySelectorAll('nav a[data-page]')
var i = 0
while (i < navLinks.length) {
  navLinks[i].addEventListener('click', function(e) {
    e.preventDefault()
    var page = this.dataset.page

    var alleLinks = document.querySelectorAll('nav a[data-page]')
    var j = 0
    while (j < alleLinks.length) {
      alleLinks[j].classList.remove('active')
      j++
    }

    var alleSider = document.querySelectorAll('.page')
    var k = 0
    while (k < alleSider.length) {
      alleSider[k].classList.remove('active')
      k++
    }

    this.classList.add('active')
    document.getElementById('page-' + page).classList.add('active')

    if (page === 'events')      loadEvents()
    if (page === 'spillere')    loadSpillere()
    if (page === 'udstyr')      loadUdstyr()
    if (page === 'udlejninger') loadUdlejninger()
    if (page === 'brugere')     loadBrugere()
  })
  i++
}

window.togglePanel = function(id) {
  document.getElementById(id).classList.toggle('open')
}

function toast(besked) {
  var t = document.getElementById('toast')
  t.textContent = besked
  t.classList.add('show')
  setTimeout(function() {
    t.classList.remove('show')
  }, 2500)
}

let alleEvents   = []
let alleSpillere = []
let alleUdstyr   = []

function opdaterStatistik() {
  const idag = new Date()
  idag.setHours(0, 0, 0, 0)
  const kommendeEvents = alleEvents.filter(ev => new Date(ev.dato) >= idag)
  document.getElementById('stat-events').textContent = kommendeEvents.length

  const antalSpillere  = alleSpillere.length
  const antalMedlemmer = alleSpillere.filter(s => s.medlem === true).length
  document.getElementById('stat-spillere').textContent = antalSpillere

  const statSpillereSub = document.getElementById('stat-spillere-sub')
  if (statSpillereSub) {
    const pct = antalSpillere > 0 ? Math.round((antalMedlemmer / antalSpillere) * 100) : 0
    statSpillereSub.textContent = antalMedlemmer + ' medlemmer (' + pct + '%)'
  }

  const samletAntal  = alleUdstyr.reduce((sum, u) => sum + (u.antal || 1), 0)
  const samletLejet  = alleUdstyr.reduce((sum, u) => sum + (u.antal_lejet || 0), 0)
  const tilgængeligt = samletAntal - samletLejet
  document.getElementById('stat-udstyr').textContent = tilgængeligt

  const statUdstyrSub = document.getElementById('stat-udstyr-sub')
  if (statUdstyrSub) {
    statUdstyrSub.textContent = samletLejet + ' lejet ud · ' + samletAntal + ' i alt'
  }
}

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
  var titel       = document.getElementById('e-titel').value.trim()
  var dato        = document.getElementById('e-dato').value
  var lokation    = document.getElementById('e-lokation').value.trim()
  var antal       = parseInt(document.getElementById('e-spillere').value)
  var beskrivelse = document.getElementById('e-beskrivelse').value.trim()

  if (!titel || !dato) { toast('FEJL: Udfyld titel og dato'); return }

  const bane = antal ? getBane(antal).navn : null

  const { error } = await supabase.from('events').insert({
    titel: titel,
    dato: dato,
    lokation: lokation,
    beskrivelse: beskrivelse,
    antal_spillere: antal || null,
    bane: bane
  })

  if (error) { toast('FEJL: ' + error.message); return }

  toast('✓ EVENT OPRETTET')
  togglePanel('event-form')

  document.getElementById('e-titel').value = ''
  document.getElementById('e-dato').value = ''
  document.getElementById('e-lokation').value = ''
  document.getElementById('e-spillere').value = ''
  document.getElementById('e-beskrivelse').value = ''
  document.getElementById('bane-box').classList.remove('visible')

  loadEvents()
}

window.deleteEvent = async function(id) {
  if (!confirm('Slet dette event?')) return

  const { error } = await supabase.from('events').delete().eq('id', id)

  if (error) {
    toast('FEJL: ' + error.message)
    return
  }

  toast('✓ EVENT SLETTET')
  loadEvents()
}

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
  var nyStatus = !nuværende

  const { error } = await supabase
    .from('spillere')
    .update({ tilmeldt: nyStatus })
    .eq('id', id)

  if (error) {
    toast('FEJL: ' + error.message)
    return
  }

  if (nuværende) {
    toast('✓ FRAMELDT')
  } else {
    toast('✓ TILMELDT')
  }
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

  if (error) {
    toast('FEJL: ' + error.message)
    return
  }

  toast('✓ SPILLER SLETTET')
  loadSpillere()
}

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

window.returnerEt = async function(id, antalLejet) {
  if (antalLejet <= 0) {
    toast('FEJL: Ingen udlejede at returnere')
    return
  }

  const { error } = await supabase
    .from('udstyr')
    .update({ antal_lejet: antalLejet - 1 })
    .eq('id', id)

  if (error) {
    toast('FEJL: ' + error.message)
    return
  }

  toast('✓ RETURNERET')
  loadUdstyr()
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

  if (error) {
    toast('FEJL: ' + error.message)
    return
  }

  toast('✓ UDSTYR SLETTET')
  loadUdstyr()
}

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

  const { error } = await supabase
    .from('profiles')
    .update({ rolle: 'admin' })
    .eq('id', id)

  if (error) {
    toast('FEJL: ' + error.message)
    return
  }

  toast('✓ BRUGER ER NU ADMIN')
  loadBrugere()
}

loadEvents()
loadSpillere()
loadUdstyr()

async function loadUdlejninger() {
  const { data, error } = await supabase
    .from('udlejninger')
    .select('*')
    .order('dato', { ascending: false })

  if (error) { console.error(error); return }

  const tbody = document.getElementById('udlejninger-body')

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">INTET UDSTYR ER AKTUELT LEJET UD</td></tr>'
    return
  }

  tbody.innerHTML = data.map(l => {
    const dato = new Date(l.dato).toLocaleDateString('da-DK', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
    return `
      <tr>
        <td><strong>${l.udstyr_navn}</strong></td>
        <td><span class="badge badge-red">LEJET UD</span></td>
        <td>${l.bruger_navn || '—'}</td>
        <td style="font-size:0.78rem; color:var(--text-dim)">${dato}</td>
        <td>
          <button class="btn btn-sm" onclick="adminReturner(${l.udstyr_id}, ${l.id})">
            Returner
          </button>
        </td>
      </tr>
    `
  }).join('')
}

window.adminReturner = async function(udstyrId, udlejningId) {
  const { data: udstyr } = await supabase
    .from('udstyr')
    .select('antal_lejet')
    .eq('id', udstyrId)
    .single()

  await supabase
    .from('udstyr')
    .update({ antal_lejet: Math.max(0, (udstyr?.antal_lejet || 1) - 1) })
    .eq('id', udstyrId)

  await supabase.from('udlejninger').delete().eq('id', udlejningId)

  toast('✓ RETURNERET')
  loadUdlejninger()
  loadUdstyr()
}