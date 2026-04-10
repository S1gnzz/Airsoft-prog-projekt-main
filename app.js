import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// ── OPRET FORBINDELSE TIL SUPABASE ─────────────────────
const SUPABASE_URL = 'https://tndnbeuzulxbsiyrwtea.supabase.co'
const SUPABASE_KEY = 'sb_publishable_Temis8liudKBnUVCoifUCA_nVRNmNDs'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)


// ── TJEK OM BRUGEREN ER LOGGET IND ─────────────────────
const { data: sessionData } = await supabase.auth.getSession()
const session = sessionData.session

if (session === null) {
  window.location.href = 'login.html'
}

// Hent brugerens profil fra databasen
const { data: profil } = await supabase
  .from('profiles')
  .select('rolle, navn')
  .eq('id', session.user.id)
  .single()

// Hvis ikke admin, send til kundesiden
if (profil.rolle !== 'admin') {
  window.location.href = 'kunde.html'
}

// Vis navn i navigationen
document.getElementById('nav-bruger').textContent = '// ' + profil.navn.toUpperCase()


// ── LOG UD ─────────────────────────────────────────────
window.logUd = async function() {
  await supabase.auth.signOut()
  window.location.href = 'login.html'
}


// ── BANE-SUGGESTION ────────────────────────────────────
// Array med regler for hvilken bane der anbefales
const baneRegler = [
  { max: 10,   navn: 'CQB — Tæt Kamp',  desc: '1-10 spillere · Lille bane med tæt kamp' },
  { max: 20,   navn: 'Blandet Terræn',   desc: '11-20 spillere · Mellem bane' },
  { max: 40,   navn: 'Åbent Terræn',     desc: '21-40 spillere · Stor bane' },
  { max: 9999, navn: 'Scenarie-bane',    desc: '40+ spillere · Multi-zone bane' },
]

// Find den rigtige bane ud fra antal spillere
function getBane(antal) {
  var i = 0
  while (i < baneRegler.length) {
    if (antal <= baneRegler[i].max) {
      return baneRegler[i]
    }
    i++
  }
}

// Vis bane-forslaget i UI'en når arrangøren skriver antal spillere
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


// ── NAVIGATION MELLEM FANER ────────────────────────────
// Når man klikker på en fane i navigationen, skiftes side
var navLinks = document.querySelectorAll('nav a[data-page]')
var i = 0
while (i < navLinks.length) {
  navLinks[i].addEventListener('click', function(e) {
    e.preventDefault()
    var page = this.dataset.page

    // Fjern aktiv-markering fra alle links og sider
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

    // Tilføj aktiv-markering til det valgte link og side
    this.classList.add('active')
    document.getElementById('page-' + page).classList.add('active')

    // Indlæs data for den valgte fane
    if (page === 'events')      loadEvents()
    if (page === 'spillere')    loadSpillere()
    if (page === 'udstyr')      loadUdstyr()
    if (page === 'udlejninger') loadUdlejninger()
    if (page === 'brugere')     loadBrugere()
  })
  i++
}


// ── VIS/SKJUL FORMULAR ─────────────────────────────────
window.togglePanel = function(id) {
  document.getElementById(id).classList.toggle('open')
}


// ── TOAST — KORT BESKED TIL BRUGEREN ──────────────────
// Viser en besked i hjørnet der forsvinder efter 2,5 sekunder
function toast(besked) {
  var t = document.getElementById('toast')
  t.textContent = besked
  t.classList.add('show')
  setTimeout(function() {
    t.classList.remove('show')
  }, 2500)
}


// ══════════════════════════════════════════════════════
//  EVENTS
// ══════════════════════════════════════════════════════

// Hent alle events fra databasen og vis dem i tabellen
async function loadEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('dato')

  if (error) {
    console.error(error)
    return
  }

  // Opdater statistik-tæller
  document.getElementById('stat-events').textContent = data.length

  var tbody = document.getElementById('events-body')

  // Vis besked hvis der ingen events er
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">INGEN EVENTS OPRETTET</td></tr>'
    return
  }

  // Byg HTML for hver event og indsæt i tabellen
  var html = ''
  var i = 0
  while (i < data.length) {
    var ev = data[i]
    var dato = '—'
    if (ev.dato) {
      dato = new Date(ev.dato).toLocaleDateString('da-DK')
    }
    html += '<tr>'
    html += '<td><strong>' + (ev.titel || '—') + '</strong></td>'
    html += '<td>' + dato + '</td>'
    html += '<td>' + (ev.lokation || '—') + '</td>'
    html += '<td>' + (ev.antal_spillere || '—') + '</td>'
    html += '<td>' + (ev.bane || '—') + '</td>'
    html += '<td><button class="btn btn-sm btn-danger" onclick="deleteEvent(' + ev.id + ')">Slet</button></td>'
    html += '</tr>'
    i++
  }
  tbody.innerHTML = html
}

// Gem et nyt event i databasen
window.gemEvent = async function() {
  var titel       = document.getElementById('e-titel').value.trim()
  var dato        = document.getElementById('e-dato').value
  var lokation    = document.getElementById('e-lokation').value.trim()
  var antal       = parseInt(document.getElementById('e-spillere').value)
  var beskrivelse = document.getElementById('e-beskrivelse').value.trim()

  // Validering — tjek at titel og dato er udfyldt
  if (titel === '' || dato === '') {
    toast('FEJL: Udfyld titel og dato')
    return
  }

  // Validering — dato må ikke være i fortiden
  var valgtDato = new Date(dato)
  var idag = new Date()
  idag.setHours(0, 0, 0, 0)
  if (valgtDato < idag) {
    toast('FEJL: Dato kan ikke være i fortiden')
    return
  }

  // Find anbefalet bane ud fra antal spillere
  var bane = null
  if (antal) {
    bane = getBane(antal).navn
  }

  // Indsæt event i databasen
  const { error } = await supabase.from('events').insert({
    titel: titel,
    dato: dato,
    lokation: lokation,
    beskrivelse: beskrivelse,
    antal_spillere: antal || null,
    bane: bane
  })

  if (error) {
    toast('FEJL: ' + error.message)
    return
  }

  toast('✓ EVENT OPRETTET')
  togglePanel('event-form')

  // Nulstil formular
  document.getElementById('e-titel').value = ''
  document.getElementById('e-dato').value = ''
  document.getElementById('e-lokation').value = ''
  document.getElementById('e-spillere').value = ''
  document.getElementById('e-beskrivelse').value = ''
  document.getElementById('bane-box').classList.remove('visible')

  loadEvents()
}

// Slet et event fra databasen
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


// ══════════════════════════════════════════════════════
//  SPILLERE
// ══════════════════════════════════════════════════════

// Hent alle spillere fra databasen og vis dem i tabellen
async function loadSpillere() {
  const { data, error } = await supabase
    .from('spillere')
    .select('*')
    .order('navn')

  if (error) {
    console.error(error)
    return
  }

  document.getElementById('stat-spillere').textContent = data.length

  var tbody = document.getElementById('spillere-body')

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty">INGEN SPILLERE REGISTRERET</td></tr>'
    return
  }

  var html = ''
  var i = 0
  while (i < data.length) {
    var s = data[i]

    // Sæt badge-farve for medlemskab
    var medlemBadge = 'badge-dim'
    var medlemTekst = 'IKKE-MEDLEM'
    if (s.medlem) {
      medlemBadge = 'badge-green'
      medlemTekst = 'MEDLEM'
    }

    // Sæt badge for ansøgning
    var ansøgtBadge = ''
    if (s.ansøgt && !s.medlem) {
      ansøgtBadge = '<span class="badge badge-red" style="margin-left:6px">ANSØGT</span>'
    }

    // Sæt badge-farve for tilmelding
    var tilmeldtBadge = 'badge-dim'
    var tilmeldtTekst = 'IKKE TILMELDT'
    if (s.tilmeldt) {
      tilmeldtBadge = 'badge-green'
      tilmeldtTekst = 'TILMELDT'
    }

    // Godkend-knap vises kun hvis spilleren har ansøgt
    var godkendKnap = ''
    if (s.ansøgt && !s.medlem) {
      godkendKnap = '<button class="btn btn-sm" onclick="godkendMedlem(' + s.id + ')">Godkend</button>'
    }

    // Tekst på tilmeld-knap afhænger af nuværende status
    var tilmeldKnapTekst = 'Tilmeld'
    if (s.tilmeldt) {
      tilmeldKnapTekst = 'Frameld'
    }

    html += '<tr>'
    html += '<td><strong>' + s.navn + '</strong></td>'
    html += '<td><span class="badge ' + medlemBadge + '">' + medlemTekst + '</span>' + ansøgtBadge + '</td>'
    html += '<td><span class="badge ' + tilmeldtBadge + '">' + tilmeldtTekst + '</span></td>'
    html += '<td>'
    html += godkendKnap
    html += '<button class="btn btn-sm" onclick="toggleTilmeldt(' + s.id + ', ' + s.tilmeldt + ')">' + tilmeldKnapTekst + '</button>'
    html += '<button class="btn btn-sm btn-danger" onclick="deleteSpiller(' + s.id + ')">Slet</button>'
    html += '</td>'
    html += '</tr>'
    i++
  }
  tbody.innerHTML = html
}

// Gem en ny spiller i databasen
window.gemSpiller = async function() {
  var navn   = document.getElementById('s-navn').value.trim()
  var medlem = document.getElementById('s-medlem').value === 'true'

  if (navn === '') {
    toast('FEJL: Indtast et navn')
    return
  }

  const { error } = await supabase.from('spillere').insert({
    navn: navn,
    medlem: medlem,
    tilmeldt: false
  })

  if (error) {
    toast('FEJL: ' + error.message)
    return
  }

  toast('✓ SPILLER TILFØJET')
  togglePanel('spiller-form')
  document.getElementById('s-navn').value = ''
  loadSpillere()
}

// Skift en spillers tilmeldingsstatus
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

// Godkend en spillers medlemskabsansøgning
window.godkendMedlem = async function(id) {
  const { error } = await supabase
    .from('spillere')
    .update({ medlem: true, ansøgt: false })
    .eq('id', id)

  if (error) {
    toast('FEJL: ' + error.message)
    return
  }

  toast('✓ MEDLEMSKAB GODKENDT')
  loadSpillere()
}

// Slet en spiller fra databasen
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


// ══════════════════════════════════════════════════════
//  UDSTYR
// ══════════════════════════════════════════════════════

// Hent alt udstyr fra databasen og vis det i tabellen
async function loadUdstyr() {
  const { data, error } = await supabase
    .from('udstyr')
    .select('*')
    .order('navn')

  if (error) {
    console.error(error)
    return
  }

  document.getElementById('stat-udstyr').textContent = data.length

  var tbody = document.getElementById('udstyr-body')

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">INGEN UDSTYR REGISTRERET</td></tr>'
    return
  }

  var html = ''
  var i = 0
  while (i < data.length) {
    var u = data[i]
    var samlet      = u.antal || 1
    var lejet       = u.antal_lejet || 0
    var tilgængelig = samlet - lejet

    // Vis rød badge hvis alt er udlejet, grøn ellers
    var statusBadge = ''
    if (tilgængelig <= 0) {
      statusBadge = '<span class="badge badge-red">UDLEJET</span>'
    } else {
      statusBadge = '<span class="badge badge-green">TILGÆNGELIGT</span>'
    }

    // Vis farvet badge for tilstand
    var tilstandFarve = 'badge-dim'
    if (u.tilstand === 'Defekt') tilstandFarve = 'badge-red'
    if (u.tilstand === 'God')    tilstandFarve = 'badge-green'

    // Deaktiver knapper hvis der ikke er noget at udleje/returnere
    var udlejDisabled = ''
    var returnerDisabled = ''
    var minusDisabled = ''
    if (tilgængelig <= 0) udlejDisabled    = 'disabled'
    if (lejet <= 0)       returnerDisabled = 'disabled'
    if (samlet <= 1)      minusDisabled    = 'disabled'

    html += '<tr>'
    html += '<td><strong>' + u.navn + '</strong></td>'
    html += '<td><span class="badge badge-dim">' + (u.type || '—') + '</span></td>'
    html += '<td>' + statusBadge + '</td>'
    html += '<td><span class="badge ' + tilstandFarve + '">' + (u.tilstand || '—') + '</span></td>'
    html += '<td>'
    html += '<button class="btn btn-sm" onclick="justerAntal(' + u.id + ', ' + lejet + ', ' + samlet + ', -1)" ' + minusDisabled + '>−</button>'
    html += ' ' + tilgængelig + '/' + samlet + ' '
    html += '<button class="btn btn-sm" onclick="justerAntal(' + u.id + ', ' + lejet + ', ' + samlet + ', +1)">+</button>'
    html += '</td>'
    html += '<td>'
    html += '<button class="btn btn-sm" onclick="udlejEt(' + u.id + ', ' + lejet + ', ' + samlet + ')" ' + udlejDisabled + '>Udlej</button>'
    html += '<button class="btn btn-sm" onclick="returnerEt(' + u.id + ', ' + lejet + ')" ' + returnerDisabled + '>Returner</button>'
    html += '<button class="btn btn-sm btn-danger" onclick="deleteUdstyr(' + u.id + ')">Slet</button>'
    html += '</td>'
    html += '</tr>'
    i++
  }
  tbody.innerHTML = html
}

// Juster det samlede antal styk op eller ned
window.justerAntal = async function(id, antalLejet, nuværendeAntal, retning) {
  var nytAntal = nuværendeAntal + retning

  if (nytAntal < antalLejet) {
    toast('FEJL: Kan ikke sætte under antal udlejet (' + antalLejet + ')')
    return
  }
  if (nytAntal < 1) {
    toast('FEJL: Antal kan ikke være under 1')
    return
  }

  const { error } = await supabase
    .from('udstyr')
    .update({ antal: nytAntal })
    .eq('id', id)

  if (error) {
    toast('FEJL: ' + error.message)
    return
  }

  loadUdstyr()
}

// Udlej ét styk udstyr
window.udlejEt = async function(id, antalLejet, samlet) {
  if (antalLejet >= samlet) {
    toast('FEJL: Ingen ledige tilbage')
    return
  }

  const { error } = await supabase
    .from('udstyr')
    .update({ antal_lejet: antalLejet + 1 })
    .eq('id', id)

  if (error) {
    toast('FEJL: ' + error.message)
    return
  }

  toast('✓ UDLEJET')
  loadUdstyr()
}

// Returner ét styk udstyr
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

// Gem nyt udstyr i databasen
window.gemUdstyr = async function() {
  var navn     = document.getElementById('u-navn').value.trim()
  var type     = document.getElementById('u-type').value
  var antal    = parseInt(document.getElementById('u-antal').value) || 1
  var tilstand = document.getElementById('u-tilstand').value

  if (navn === '') {
    toast('FEJL: Indtast et navn')
    return
  }
  if (antal < 1) {
    toast('FEJL: Antal skal være mindst 1')
    return
  }

  const { error } = await supabase.from('udstyr').insert({
    navn: navn,
    type: type,
    tilstand: tilstand,
    antal: antal,
    antal_lejet: 0
  })

  if (error) {
    toast('FEJL: ' + error.message)
    return
  }

  toast('✓ UDSTYR TILFØJET')
  togglePanel('udstyr-form')
  document.getElementById('u-navn').value = ''
  loadUdstyr()
}

// Slet udstyr fra databasen
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


// ══════════════════════════════════════════════════════
//  UDLEJNINGER
// ══════════════════════════════════════════════════════

// Hent kun udstyr der er udlejet og vis i tabellen
async function loadUdlejninger() {
  const { data, error } = await supabase
    .from('udstyr')
    .select('*')
    .gt('antal_lejet', 0)
    .order('navn')

  if (error) {
    console.error(error)
    return
  }

  var tbody = document.getElementById('udlejninger-body')

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">INTET UDSTYR ER AKTUELT LEJET UD</td></tr>'
    return
  }

  var html = ''
  var i = 0
  while (i < data.length) {
    var u = data[i]
    var tilstandFarve = 'badge-dim'
    if (u.tilstand === 'Defekt') tilstandFarve = 'badge-red'
    if (u.tilstand === 'God')    tilstandFarve = 'badge-green'

    html += '<tr>'
    html += '<td><strong>' + u.navn + '</strong></td>'
    html += '<td><span class="badge badge-dim">' + (u.type || '—') + '</span></td>'
    html += '<td>' + (u.lejet_af || '—') + '</td>'
    html += '<td><span class="badge badge-red">' + u.antal_lejet + ' lejet ud</span></td>'
    html += '<td><span class="badge ' + tilstandFarve + '">' + (u.tilstand || '—') + '</span></td>'
    html += '<td><button class="btn btn-sm" onclick="returnerEt(' + u.id + ', ' + u.antal_lejet + '); loadUdlejninger()">Returner én</button></td>'
    html += '</tr>'
    i++
  }
  tbody.innerHTML = html
}


// ══════════════════════════════════════════════════════
//  BRUGERE
// ══════════════════════════════════════════════════════

// Hent alle brugerprofiler og vis dem i tabellen
async function loadBrugere() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('navn')

  if (error) {
    console.error(error)
    return
  }

  var tbody = document.getElementById('brugere-body')

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty">INGEN BRUGERE REGISTRERET</td></tr>'
    return
  }

  var html = ''
  var i = 0
  while (i < data.length) {
    var b = data[i]

    var rolleFarve = 'badge-dim'
    if (b.rolle === 'admin') rolleFarve = 'badge-green'

    var rolle = b.rolle || 'kunde'

    // Vis kun "Gør admin"-knap hvis brugeren ikke allerede er admin
    var adminKnap = '—'
    if (b.rolle !== 'admin') {
      adminKnap = '<button class="btn btn-sm" onclick="gørAdmin(\'' + b.id + '\')">Gør admin</button>'
    }

    html += '<tr>'
    html += '<td><strong>' + (b.navn || '—') + '</strong></td>'
    html += '<td style="font-size:0.75rem; color:var(--text-dim)">' + b.id + '</td>'
    html += '<td><span class="badge ' + rolleFarve + '">' + rolle.toUpperCase() + '</span></td>'
    html += '<td>' + adminKnap + '</td>'
    html += '</tr>'
    i++
  }
  tbody.innerHTML = html
}

// Giv en bruger admin-rolle
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


// ── INDLÆS DATA VED START ──────────────────────────────
loadEvents()
loadSpillere()
loadUdstyr()
