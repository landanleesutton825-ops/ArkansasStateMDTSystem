/* ═══════════════════════════════════════════════════
   POLICE MDT — APP.JS
   Full application logic, data management, UI control
═══════════════════════════════════════════════════ */

'use strict';

// ═══════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════
let currentUser = null;
let currentProfileId = null;
let sessionStart = null;
let recentSearches = [];

const ACCOUNTS = {
  'H-21': '1234',
  'CPL_GARREN': '12345',
  'CPT_BARRALAGA': '123456',
  'ADMIN': 'admin'
};

// ═══════════════════════════════════════════════
// LOCAL STORAGE HELPERS
// ═══════════════════════════════════════════════
function getStore(key) {
  try { return JSON.parse(localStorage.getItem('mdt_' + key)) || []; }
  catch { return []; }
}
function setStore(key, val) {
  localStorage.setItem('mdt_' + key, JSON.stringify(val));
}
function getObj(key) {
  try { return JSON.parse(localStorage.getItem('mdt_' + key)) || {}; }
  catch { return {}; }
}

// ═══════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase();
}

function nowStr() {
  return new Date().toLocaleString('en-US', {
    month: '2-digit', day: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function setVal(id, v) {
  const el = document.getElementById(id);
  if (el) el.value = v;
}

function show(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function hide(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

// ═══════════════════════════════════════════════
// CLOCK
// ═══════════════════════════════════════════════
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const el = document.getElementById('clock');
  if (el) el.textContent = `${h}:${m}:${s}`;

  const days = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const dl = document.getElementById('dateline');
  if (dl) {
    dl.textContent = `${days[now.getDay()]} ${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')}/${now.getFullYear()}`;
  }

  if (sessionStart) {
    const diff = Math.floor((now - sessionStart) / 1000);
    const sm = String(Math.floor(diff / 60)).padStart(2, '0');
    const ss = String(diff % 60).padStart(2, '0');
    const st = document.getElementById('sessionTimer');
    if (st) st.textContent = `${sm}:${ss}`;
  }
}
setInterval(updateClock, 1000);
updateClock();

// ═══════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════
function doLogin() {
  const user = val('loginUser').toUpperCase();
  const pass = val('loginPass');

  if (ACCOUNTS[user] && ACCOUNTS[user] === pass) {
    currentUser = user;
    sessionStart = new Date();
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mdt').classList.remove('hidden');
    document.getElementById('officerName').textContent = user;
    updateDbCount();
    renderAllRecords();
    renderCitations();
    renderReports();
    renderWarrants();
    renderBOLOs();
    renderCalls();
    updateStatus();
  } else {
    show('loginError');
    setTimeout(() => hide('loginError'), 3000);
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    if (!document.getElementById('loginScreen').classList.contains('hidden')) doLogin();
  }
});

function logout() {
  currentUser = null; sessionStart = null;
  document.getElementById('mdt').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
  setVal('loginUser', ''); setVal('loginPass', '');
  hide('loginError');
}

// ═══════════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════════
function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.getElementById('panel-' + name).classList.add('active');
}

function switchSearchTab(name) {
  document.querySelectorAll('.stab').forEach(b => b.classList.remove('active'));
  document.getElementById('stab-' + name).classList.add('active');
  document.getElementById('search-person').classList.toggle('hidden', name !== 'person');
  document.getElementById('search-plate').classList.toggle('hidden', name !== 'plate');
}

// ═══════════════════════════════════════════════
// UNIT STATUS
// ═══════════════════════════════════════════════
const STATUS_MAP = {
  available: { text: '10-8 AVAILABLE', dot: '', cls: '' },
  busy:      { text: '10-6 BUSY', dot: 'busy', cls: '' },
  enroute:   { text: '10-76 EN ROUTE', dot: 'busy', cls: '' },
  traffic:   { text: '10-24 TRAFFIC STOP', dot: 'busy', cls: '' },
  scene:     { text: '10-23 AT SCENE', dot: 'busy', cls: '' },
  offduty:   { text: '10-7 OFF DUTY', dot: 'gray', cls: '' }
};

function updateStatus() {
  const v = val('unitStatus');
  const s = STATUS_MAP[v] || STATUS_MAP.available;
  const dot = document.getElementById('statusDot');
  const txt = document.getElementById('statusText');
  if (dot) { dot.className = 'status-dot ' + s.dot; }
  if (txt) txt.textContent = s.text;
}

// ═══════════════════════════════════════════════
// DB COUNT
// ═══════════════════════════════════════════════
function updateDbCount() {
  const records = getStore('records');
  const el = document.getElementById('dbCount');
  if (el) el.textContent = records.length;
}

// ═══════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════
function searchPerson() {
  const first = val('searchFirst').toLowerCase();
  const last = val('searchLast').toLowerCase();
  const dob = val('searchDOB');

  if (!first && !last) { toast('⚠ Enter at least a first or last name', 'error'); return; }

  const records = getStore('records');
  const results = records.filter(r => {
    const fMatch = !first || r.firstName.toLowerCase().includes(first);
    const lMatch = !last || r.lastName.toLowerCase().includes(last);
    const dMatch = !dob || r.dob === dob;
    return fMatch && lMatch && dMatch;
  });

  const query = [first, last].filter(Boolean).join(' ').toUpperCase();
  addRecentSearch(query, 'PERSON');
  showResults(results);
}

function searchPlate() {
  const plate = val('searchPlate').toUpperCase();
  if (!plate) { toast('⚠ Enter a license plate', 'error'); return; }

  const records = getStore('records');
  const results = records.filter(r => r.plate && r.plate.toUpperCase().includes(plate));

  addRecentSearch(plate, 'PLATE');
  showResults(results);
}

function showResults(results) {
  const container = document.getElementById('resultsList');
  const box = document.getElementById('searchResults');
  hide('profileView');
  show('searchResults');

  if (results.length === 0) {
    container.innerHTML = '<div class="empty-state">NO RECORDS FOUND IN DATABASE</div>';
    return;
  }

  container.innerHTML = results.map(r => `
    <div class="record-item ${r.warrantStatus !== 'none' ? 'wanted' : ''}" onclick="viewProfile('${r.id}')">
      ${r.warrantStatus !== 'none' ? '<div class="wanted-banner">⚠ WARRANT — ' + r.warrantStatus.toUpperCase() + '</div>' : ''}
      <div class="record-name">${r.lastName.toUpperCase()}, ${r.firstName.toUpperCase()}</div>
      <div class="record-meta">
        <span>DOB: ${r.dob || '--'}</span>
        <span>PLATE: ${r.plate || '--'}</span>
        <span>${licTag(r.licenseStatus)}</span>
        ${r.warrantStatus !== 'none' ? '<span class="tag tag-red">⚠ WANTED</span>' : ''}
      </div>
    </div>
  `).join('');
}

function addRecentSearch(query, type) {
  recentSearches.unshift({ query, type, time: nowStr() });
  if (recentSearches.length > 10) recentSearches.pop();
  renderRecentSearches();
}

function renderRecentSearches() {
  const el = document.getElementById('recentSearches');
  if (!el) return;
  if (recentSearches.length === 0) {
    el.innerHTML = '<div class="empty-state">No recent queries</div>';
    return;
  }
  el.innerHTML = recentSearches.map(s => `
    <div class="recent-item">
      <span>[${s.type}] ${s.query}</span>
      <span>${s.time.split(',')[1] || s.time}</span>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════
// PROFILE VIEW
// ═══════════════════════════════════════════════
function viewProfile(id) {
  const records = getStore('records');
  const r = records.find(x => x.id === id);
  if (!r) return;
  currentProfileId = id;

  const isWanted = r.warrantStatus !== 'none';
  const content = document.getElementById('profileContent');
  content.innerHTML = `
    ${isWanted ? '<div class="wanted-banner">⚠ WARRANT ACTIVE — ' + r.warrantStatus.toUpperCase() + ' — APPROACH WITH CAUTION</div>' : ''}
    <div class="profile-section">
      <div class="profile-section-title">— PERSONAL INFORMATION —</div>
      <div class="profile-grid">
        <div class="profile-label">FULL NAME</div><div class="profile-value">${r.lastName.toUpperCase()}, ${r.firstName.toUpperCase()}</div>
        <div class="profile-label">DATE OF BIRTH</div><div class="profile-value">${r.dob || '--'}</div>
        <div class="profile-label">GENDER</div><div class="profile-value">${r.gender || '--'}</div>
        <div class="profile-label">ADDRESS</div><div class="profile-value">${r.address || '--'}</div>
        <div class="profile-label">ASSOCIATES</div><div class="profile-value">${r.associates || '--'}</div>
      </div>
    </div>
    <div class="profile-section">
      <div class="profile-section-title">— VEHICLE &amp; LICENSE —</div>
      <div class="profile-grid">
        <div class="profile-label">LICENSE PLATE</div><div class="profile-value">${r.plate || '--'}</div>
        <div class="profile-label">LICENSE STATUS</div><div class="profile-value">${licTag(r.licenseStatus)}</div>
        <div class="profile-label">VEHICLE</div><div class="profile-value">${r.vehicle || '--'}</div>
        <div class="profile-label">COLOR</div><div class="profile-value">${r.vehicleColor || '--'}</div>
      </div>
    </div>
    <div class="profile-section">
      <div class="profile-section-title">— WARRANT STATUS —</div>
      <div class="profile-grid">
        <div class="profile-label">STATUS</div>
        <div class="profile-value">${isWanted ? '<span class="tag tag-red">⚠ ' + r.warrantStatus.toUpperCase() + '</span>' : '<span class="tag tag-green">CLEAR</span>'}</div>
        ${isWanted ? '<div class="profile-label">DESCRIPTION</div><div class="profile-value">' + (r.warrantDesc || '--') + '</div>' : ''}
      </div>
    </div>
    <div class="profile-section">
      <div class="profile-section-title">— OFFICER NOTES —</div>
      <div style="padding: 6px 0; font-family: var(--font-mono); font-size: 12px; color: var(--text-primary); white-space: pre-wrap;">${r.notes || 'No notes on file.'}</div>
    </div>
    <div class="profile-section">
      <div class="profile-section-title">— RECORD INFO —</div>
      <div class="profile-grid">
        <div class="profile-label">RECORD ID</div><div class="profile-value" style="font-size:10px">${r.id}</div>
        <div class="profile-label">CREATED</div><div class="profile-value" style="font-size:10px">${r.created || '--'}</div>
        <div class="profile-label">MODIFIED</div><div class="profile-value" style="font-size:10px">${r.modified || '--'}</div>
      </div>
    </div>
  `;

  hide('searchResults');
  show('profileView');
}

function licTag(status) {
  const map = {
    'VALID': '<span class="tag tag-green">VALID</span>',
    'SUSPENDED': '<span class="tag tag-orange">SUSPENDED</span>',
    'REVOKED': '<span class="tag tag-red">REVOKED</span>',
    'EXPIRED': '<span class="tag tag-yellow">EXPIRED</span>',
    'NO LICENSE': '<span class="tag tag-red">NO LICENSE</span>'
  };
  return map[status] || status;
}

// ═══════════════════════════════════════════════
// RECORDS — ADD / EDIT / DELETE
// ═══════════════════════════════════════════════
function toggleWarrantDesc() {
  const v = val('rWarrantStatus');
  document.getElementById('warrantDescGroup').style.display = v !== 'none' ? 'block' : 'none';
}

function saveRecord() {
  const first = val('rFirst');
  const last = val('rLast');
  const dob = val('rDOB');
  if (!first || !last || !dob) { toast('⚠ First name, last name, and DOB required', 'error'); return; }

  const records = getStore('records');
  const editId = val('editId');
  const now = nowStr();

  const record = {
    id: editId || uid(),
    firstName: first,
    lastName: last,
    dob: dob,
    gender: val('rGender'),
    address: val('rAddress'),
    plate: val('rPlate').toUpperCase(),
    licenseStatus: val('rLicenseStatus'),
    vehicle: val('rVehicle'),
    vehicleColor: val('rVehicleColor'),
    associates: val('rAssociates'),
    warrantStatus: val('rWarrantStatus'),
    warrantDesc: val('rWarrantDesc'),
    notes: val('rNotes'),
    created: editId ? (records.find(r => r.id === editId) || {}).created || now : now,
    modified: now
  };

  if (editId) {
    const idx = records.findIndex(r => r.id === editId);
    if (idx >= 0) records[idx] = record;
  } else {
    records.push(record);
  }

  setStore('records', records);
  clearRecordForm();
  renderAllRecords();
  updateDbCount();
  toast(editId ? '✓ Record updated' : '✓ Record created', 'success');
}

function clearRecordForm() {
  ['rFirst','rLast','rDOB','rAddress','rPlate','rVehicle','rVehicleColor','rAssociates','rWarrantDesc','rNotes','editId'].forEach(id => setVal(id, ''));
  setVal('rGender', 'MALE');
  setVal('rLicenseStatus', 'VALID');
  setVal('rWarrantStatus', 'none');
  toggleWarrantDesc();
  document.getElementById('recordFormHeader').textContent = '➕ NEW CIVILIAN RECORD';
}

function editRecord() {
  if (!currentProfileId) return;
  const records = getStore('records');
  const r = records.find(x => x.id === currentProfileId);
  if (!r) return;

  switchTab('records');
  setVal('editId', r.id);
  setVal('rFirst', r.firstName);
  setVal('rLast', r.lastName);
  setVal('rDOB', r.dob);
  setVal('rGender', r.gender);
  setVal('rAddress', r.address);
  setVal('rPlate', r.plate);
  setVal('rLicenseStatus', r.licenseStatus);
  setVal('rVehicle', r.vehicle);
  setVal('rVehicleColor', r.vehicleColor);
  setVal('rAssociates', r.associates);
  setVal('rWarrantStatus', r.warrantStatus);
  setVal('rWarrantDesc', r.warrantDesc);
  setVal('rNotes', r.notes);
  toggleWarrantDesc();
  document.getElementById('recordFormHeader').textContent = '✏ EDITING RECORD — ' + r.lastName.toUpperCase();
}

function deleteRecord() {
  if (!currentProfileId) return;
  if (!confirm('DELETE this record? This cannot be undone.')) return;
  let records = getStore('records');
  records = records.filter(r => r.id !== currentProfileId);
  setStore('records', records);
  currentProfileId = null;
  hide('profileView');
  renderAllRecords();
  updateDbCount();
  toast('🗑 Record deleted', 'error');
}

function renderAllRecords(filter = '') {
  const records = getStore('records');
  const el = document.getElementById('allRecordsList');
  if (!el) return;

  document.getElementById('recordCount').textContent = records.length;

  const filtered = filter
    ? records.filter(r =>
        (r.firstName + ' ' + r.lastName).toLowerCase().includes(filter.toLowerCase()) ||
        (r.plate || '').toLowerCase().includes(filter.toLowerCase())
      )
    : records;

  if (filtered.length === 0) {
    el.innerHTML = '<div class="empty-state">NO RECORDS FOUND</div>';
    return;
  }

  el.innerHTML = [...filtered].reverse().map(r => `
    <div class="record-item ${r.warrantStatus !== 'none' ? 'wanted' : ''}" onclick="viewProfileFromRecords('${r.id}')">
      ${r.warrantStatus !== 'none' ? '<span class="tag tag-red">⚠ WARRANT</span> ' : ''}
      <div class="record-name">${r.lastName.toUpperCase()}, ${r.firstName.toUpperCase()}</div>
      <div class="record-meta">
        <span>DOB: ${r.dob || '--'}</span>
        <span>PLATE: ${r.plate || '--'}</span>
        <span>${r.licenseStatus}</span>
      </div>
    </div>
  `).join('');
}

function viewProfileFromRecords(id) {
  currentProfileId = id;
  switchTab('search');
  viewProfile(id);
}

function filterRecords() {
  renderAllRecords(val('recordsFilter'));
}

// ═══════════════════════════════════════════════
// CALL LOG
// ═══════════════════════════════════════════════
function addCall() {
  const location = val('callLocation');
  if (!location) { toast('⚠ Location required', 'error'); return; }

  const calls = getStore('calls');
  calls.unshift({
    id: uid(),
    type: val('callType'),
    priority: val('callPriority'),
    location,
    desc: val('callDesc'),
    units: val('callUnits'),
    time: nowStr(),
    status: 'ACTIVE'
  });
  setStore('calls', calls);

  ['callLocation','callDesc','callUnits'].forEach(id => setVal(id, ''));
  renderCalls();
  toast('✓ Call logged', 'success');
}

function renderCalls() {
  const calls = getStore('calls');
  const el = document.getElementById('callsList');
  if (!el) return;
  if (calls.length === 0) { el.innerHTML = '<div class="empty-state">No calls logged</div>'; return; }

  const prioColors = { '1': 'p1', '2': 'p2', '3': 'p3' };
  el.innerHTML = calls.map(c => `
    <div class="call-item ${prioColors[c.priority] || 'p3'}">
      <div class="call-header">
        <span class="call-type">${c.type}</span>
        <span class="call-time">${c.time}</span>
      </div>
      <div class="call-loc">📍 ${c.location}</div>
      ${c.desc ? `<div class="call-desc">${c.desc}</div>` : ''}
      <div class="record-meta" style="margin-top:4px">
        ${c.units ? '<span>UNIT(S): ' + c.units + '</span>' : ''}
        <span class="tag ${c.priority === '1' ? 'tag-red' : c.priority === '2' ? 'tag-orange' : 'tag-blue'}">P${c.priority}</span>
        <button class="btn-sm btn-danger" onclick="closeCall('${c.id}')">CLOSE</button>
      </div>
    </div>
  `).join('');
}

function closeCall(id) {
  let calls = getStore('calls');
  calls = calls.filter(c => c.id !== id);
  setStore('calls', calls);
  renderCalls();
  toast('✓ Call closed', 'success');
}

// ═══════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════
function submitReport() {
  const narrative = val('reportNarrative');
  const subject = val('reportSubject');
  if (!narrative) { toast('⚠ Narrative required', 'error'); return; }

  const reports = getStore('reports');
  reports.unshift({
    id: uid(),
    type: val('reportType'),
    date: val('reportDate'),
    time: val('reportTime'),
    location: val('reportLocation'),
    subject,
    charges: val('reportCharges'),
    narrative,
    officers: val('reportOfficers'),
    disposition: val('reportDisposition'),
    filed: nowStr(),
    filedBy: currentUser
  });
  setStore('reports', reports);

  ['reportDate','reportTime','reportLocation','reportSubject','reportCharges','reportNarrative','reportOfficers'].forEach(id => setVal(id, ''));
  renderReports();
  toast('✓ Report filed', 'success');
}

function renderReports() {
  const reports = getStore('reports');
  const el = document.getElementById('reportsList');
  const countEl = document.getElementById('reportCount');
  if (countEl) countEl.textContent = reports.length;
  if (!el) return;
  if (reports.length === 0) { el.innerHTML = '<div class="empty-state">No reports filed</div>'; return; }

  el.innerHTML = reports.map(r => `
    <div class="report-item">
      <div class="report-type-badge">${r.type}</div>
      <div class="report-subject">${r.subject || 'UNKNOWN SUBJECT'}</div>
      <div class="report-meta">
        📅 ${r.date || '--'} ${r.time || ''} &nbsp;|&nbsp;
        📍 ${r.location || '--'} &nbsp;|&nbsp;
        ${r.disposition}
      </div>
      ${r.charges ? `<div class="report-meta">⚖ ${r.charges}</div>` : ''}
      <div class="report-narrative-preview">${r.narrative}</div>
      <div style="margin-top:4px">
        <button class="btn-sm btn-danger" onclick="deleteReport('${r.id}')">DELETE</button>
      </div>
    </div>
  `).join('');
}

function deleteReport(id) {
  if (!confirm('Delete this report?')) return;
  let reports = getStore('reports');
  reports = reports.filter(r => r.id !== id);
  setStore('reports', reports);
  renderReports();
  toast('🗑 Report deleted', 'error');
}

// ═══════════════════════════════════════════════
// CITATIONS
// ═══════════════════════════════════════════════
function issueCitation() {
  const name = val('citName');
  if (!name) { toast('⚠ Subject name required', 'error'); return; }

  const citations = getStore('citations');
  citations.unshift({
    id: uid(),
    name,
    plate: val('citPlate').toUpperCase(),
    date: val('citDate'),
    time: val('citTime'),
    location: val('citLocation'),
    violation: val('citViolation'),
    speed: val('citSpeed'),
    fine: val('citFine'),
    officer: val('citOfficer'),
    notes: val('citNotes'),
    issued: nowStr()
  });
  setStore('citations', citations);

  ['citName','citPlate','citDate','citTime','citLocation','citSpeed','citFine','citOfficer','citNotes'].forEach(id => setVal(id, ''));
  renderCitations();
  toast('✓ Citation issued', 'success');
}

function renderCitations() {
  const citations = getStore('citations');
  const el = document.getElementById('citationsList');
  const countEl = document.getElementById('citCount');
  if (countEl) countEl.textContent = citations.length;
  if (!el) return;
  if (citations.length === 0) { el.innerHTML = '<div class="empty-state">No citations issued</div>'; return; }

  el.innerHTML = citations.map(c => `
    <div class="citation-item">
      <div class="citation-name">${c.name.toUpperCase()}</div>
      <div class="citation-meta">
        🎫 ${c.violation}<br>
        📍 ${c.location || '--'} &nbsp;|&nbsp; 📅 ${c.date || '--'} ${c.time || ''}<br>
        🚗 PLATE: ${c.plate || '--'}
        ${c.speed ? ' &nbsp;|&nbsp; SPEED: ' + c.speed : ''}
        ${c.fine ? ' &nbsp;|&nbsp; FINE: $' + c.fine : ''}
        <br>OFFICER: ${c.officer || '--'}
        ${c.notes ? '<br>NOTES: ' + c.notes : ''}
      </div>
      <div style="margin-top:4px">
        <button class="btn-sm btn-danger" onclick="deleteCitation('${c.id}')">VOID</button>
      </div>
    </div>
  `).join('');
}

function deleteCitation(id) {
  if (!confirm('Void this citation?')) return;
  let cits = getStore('citations');
  cits = cits.filter(c => c.id !== id);
  setStore('citations', cits);
  renderCitations();
  toast('🗑 Citation voided', 'error');
}

// ═══════════════════════════════════════════════
// WARRANTS
// ═══════════════════════════════════════════════
function issueWarrant() {
  const name = val('wName');
  if (!name) { toast('⚠ Subject name required', 'error'); return; }

  const warrants = getStore('warrants');
  warrants.unshift({
    id: uid(),
    name,
    dob: val('wDOB'),
    type: val('wType'),
    charges: val('wCharges'),
    desc: val('wDesc'),
    judge: val('wJudge'),
    date: val('wDate'),
    issued: nowStr(),
    issuedBy: currentUser
  });
  setStore('warrants', warrants);

  ['wName','wDOB','wCharges','wDesc','wJudge','wDate'].forEach(id => setVal(id, ''));
  renderWarrants();
  toast('⚠ Warrant issued', 'error');
}

function renderWarrants() {
  const warrants = getStore('warrants');
  const el = document.getElementById('warrantsList');
  const countEl = document.getElementById('warrantCount');
  if (countEl) countEl.textContent = warrants.length;
  if (!el) return;
  if (warrants.length === 0) { el.innerHTML = '<div class="empty-state">No active warrants</div>'; return; }

  el.innerHTML = warrants.map(w => `
    <div class="warrant-item">
      <div class="warrant-name">⚠ ${w.name.toUpperCase()}</div>
      <div class="warrant-meta">
        TYPE: <span class="tag tag-red">${w.type.toUpperCase()}</span><br>
        DOB: ${w.dob || '--'}<br>
        CHARGES: ${w.charges || '--'}<br>
        ${w.desc ? 'DESC: ' + w.desc + '<br>' : ''}
        JUDGE: ${w.judge || '--'} &nbsp;|&nbsp; DATE: ${w.date || '--'}<br>
        ISSUED: ${w.issued} BY: ${w.issuedBy}
      </div>
      <div class="item-actions">
        <button class="btn-sm btn-green" onclick="clearWarrant('${w.id}')">✓ CLEAR WARRANT</button>
      </div>
    </div>
  `).join('');
}

function clearWarrant(id) {
  if (!confirm('Mark this warrant as cleared?')) return;
  let warrants = getStore('warrants');
  warrants = warrants.filter(w => w.id !== id);
  setStore('warrants', warrants);
  renderWarrants();
  toast('✓ Warrant cleared', 'success');
}

// ═══════════════════════════════════════════════
// BOLO
// ═══════════════════════════════════════════════
function issueBOLO() {
  const subject = val('boloSubject');
  if (!subject) { toast('⚠ Subject description required', 'error'); return; }

  const bolos = getStore('bolos');
  bolos.unshift({
    id: uid(),
    subject,
    type: val('boloType'),
    location: val('boloLocation'),
    desc: val('boloDesc'),
    danger: val('boloDanger'),
    officer: val('boloOfficer'),
    issued: nowStr(),
    issuedBy: currentUser
  });
  setStore('bolos', bolos);

  ['boloSubject','boloLocation','boloDesc','boloOfficer'].forEach(id => setVal(id, ''));
  renderBOLOs();
  toast('🚨 BOLO broadcast', 'error');
}

function renderBOLOs() {
  const bolos = getStore('bolos');
  const el = document.getElementById('boloList');
  const countEl = document.getElementById('boloCount');
  if (countEl) countEl.textContent = bolos.length;
  if (!el) return;
  if (bolos.length === 0) { el.innerHTML = '<div class="empty-state">No active BOLOs</div>'; return; }

  const dangerTag = {
    low: '<span class="tag tag-blue">LOW RISK</span>',
    medium: '<span class="tag tag-orange">MAY BE ARMED</span>',
    high: '<span class="tag tag-red">⚠ ARMED &amp; DANGEROUS</span>'
  };

  el.innerHTML = bolos.map(b => `
    <div class="bolo-item">
      <div class="bolo-subject">🚨 ${b.subject.toUpperCase()}</div>
      <div class="bolo-meta">
        TYPE: <span class="tag tag-red">${b.type}</span> ${dangerTag[b.danger] || ''}<br>
        LAST SEEN: ${b.location || '--'}<br>
        ${b.desc ? 'DESC: ' + b.desc + '<br>' : ''}
        OFFICER: ${b.officer || '--'} &nbsp;|&nbsp; ${b.issued}
      </div>
      <div class="item-actions">
        <button class="btn-sm btn-green" onclick="clearBOLO('${b.id}')">✓ CANCEL BOLO</button>
      </div>
    </div>
  `).join('');
}

function clearBOLO(id) {
  if (!confirm('Cancel this BOLO?')) return;
  let bolos = getStore('bolos');
  bolos = bolos.filter(b => b.id !== id);
  setStore('bolos', bolos);
  renderBOLOs();
  toast('✓ BOLO cancelled', 'success');
}

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
updateClock();
