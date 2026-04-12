// CareFlow Dashboard – all logic in this file
// The code is grouped by feature for clarity.

// SECTION: Simple state management
const state = {
  mode: 'work', // 'work' | 'home'
  copyHistory: [],
  favorites: [],
  medication: [],
  followups: [],
  today: { open: [], done: [] },
  groceries: [],
  fridge: [],
  freeNotes: [],
  freePhoto: null,
};

// Use localStorage only as small demo persistence
const STORAGE_KEYS = {
  favorites: 'careflow_favorites',
  copyHistory: 'careflow_copy_history',
  followups: 'careflow_followups',
  today: 'careflow_today',
  medication: 'careflow_medication',
  groceries: 'careflow_groceries',
  fridge: 'careflow_fridge',
  freeNotes: 'careflow_free_notes',
  freePhoto: 'careflow_free_photo',
};

function loadFromStorage() {
  try {
    const fav = localStorage.getItem(STORAGE_KEYS.favorites);
    const hist = localStorage.getItem(STORAGE_KEYS.copyHistory);
    const follow = localStorage.getItem(STORAGE_KEYS.followups);
    const today = localStorage.getItem(STORAGE_KEYS.today);
    const meds = localStorage.getItem(STORAGE_KEYS.medication);
    const groceries = localStorage.getItem(STORAGE_KEYS.groceries);
    const fridge = localStorage.getItem(STORAGE_KEYS.fridge);
    const freeNotes = localStorage.getItem(STORAGE_KEYS.freeNotes);
    const freePhoto = localStorage.getItem(STORAGE_KEYS.freePhoto);

    state.favorites = fav ? JSON.parse(fav) : [];
    state.copyHistory = hist ? JSON.parse(hist) : [];
    state.followups = follow ? JSON.parse(follow) : [];
    state.today = today ? JSON.parse(today) : { open: [], done: [] };
    state.medication = meds ? JSON.parse(meds) : [];
    state.groceries = groceries ? JSON.parse(groceries) : [];
    state.fridge = fridge
      ? JSON.parse(fridge)
      : [
          { name: 'Cherrytomaten', status: 'must-use' },
          { name: 'Spinazie', status: 'nearly-out' },
          { name: 'Griekse yoghurt', status: 'ok' },
        ];
    state.freeNotes = freeNotes ? JSON.parse(freeNotes) : [];
    state.freePhoto = freePhoto || null;
  } catch (e) {
    console.warn('LocalStorage not beschikbaar of ongeldig JSON. Gebruik standaardwaarden.', e);
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // In deze demo negeren we fouten
  }
}

// SECTION: Utility helpers
function $(selector) {
  return document.querySelector(selector);
}

function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

function copyToClipboard(text) {
  if (!text) return;
  navigator.clipboard?.writeText(text).catch(() => {
    // Silent fallback in demo
  });
}

// SECTION: Navigation & views
const views = {};

function initViews() {
  document.querySelectorAll('.view').forEach((v) => {
    views[v.id] = v;
  });
}

function showView(sectionName) {
  Object.values(views).forEach((view) => {
    view.classList.toggle('view--active', view.id === `view-${sectionName}`);
  });

  document.querySelectorAll('.nav-link').forEach((btn) => {
    const s = btn.getAttribute('data-section');
    if (!s) return;
    btn.classList.toggle('nav-link--active', s === sectionName);
  });
}

function initNavigation() {
  // Sidebar, dashboard cards en link-buttons
  document.body.addEventListener('click', (e) => {
    const target = e.target.closest('[data-section]');
    if (!target) return;
    const section = target.getAttribute('data-section');
    if (!section) return;
    showView(section);
  });
}

// SECTION: Mode switching (work / home)
function setMode(mode) {
  state.mode = mode;

  const workBtn = document.getElementById('modeWorkBtn');
  const homeBtn = document.getElementById('modeHomeBtn');
  const toggleBtn = document.getElementById('modeToggleBtn');

  const isWork = mode === 'work';
  if (workBtn && homeBtn && toggleBtn) {
    workBtn.classList.toggle('chip--active', isWork);
    homeBtn.classList.toggle('chip--active', !isWork);
    toggleBtn.textContent = isWork ? 'Naar avondmodus' : 'Naar werkmodus';
  }
}

function initModeSwitch() {
  const workBtn = document.getElementById('modeWorkBtn');
  const homeBtn = document.getElementById('modeHomeBtn');
  const toggleBtn = document.getElementById('modeToggleBtn');

  workBtn?.addEventListener('click', () => setMode('work'));
  homeBtn?.addEventListener('click', () => setMode('home'));

  toggleBtn?.addEventListener('click', () => {
    setMode(state.mode === 'work' ? 'home' : 'work');
  });
}

// SECTION: Report generator & smart autofill & speech-to-text
const autofillMap = {
  slaap:
    'Patiënt ervaart al langere tijd slaapproblemen, met name problemen met inslapen en doorslapen.',
  pijn:
    'Patiënt geeft aan wisselende pijnklachten te ervaren, waarbij belasting en rustmomenten invloed lijken te hebben.',
  angst: 'Patiënt benoemt gevoelens van onrust en angst, vooral in de avonduren.',
};

function applyTemplate(name) {
  const consultType = $('#consultType');
  const complaint = $('#complaint');
  const observations = $('#observations');
  const policy = $('#policy');
  const notes = $('#notes');

  if (!consultType || !complaint || !observations || !policy || !notes) return;

  if (name === 'followup') {
    consultType.value = 'Poliklinisch follow-up consult';
    complaint.value =
      'Bespreken van het beloop sinds het vorige contact en evaluatie van huidige klachten.';
    observations.value =
      'Patiënt vertelt over het beloop sinds het vorige consult. Geen acute verslechtering, wel nog wisselende dagen.';
    policy.value =
      'We vervolgen het huidige beleid, lichten adviezen nogmaals toe en plannen een nieuw contactmoment in.';
    notes.value = 'Demo-voorbeeld, geen echte patiëntinformatie.';
  } else if (name === 'phone') {
    consultType.value = 'Telefonisch consult';
    complaint.value = 'Korte evaluatie van klachten en beantwoording van praktische vragen.';
    observations.value =
      'Gesprek vindt telefonisch plaats; geen lichamelijk onderzoek verricht. Patiënt klinkt rustig aan de lijn.';
    policy.value =
      'Adviezen zijn herhaald en er is afgesproken dat patiënt contact opneemt bij toename van klachten.';
    notes.value = 'Telefonisch contact ter ondersteuning; dit is een fictief voorbeeld.';
  } else if (name === 'medication') {
    consultType.value = 'Consult medicatie-evaluatie';
    complaint.value = 'Bespreken van effect en eventuele bijwerkingen van huidige medicatie.';
    observations.value =
      'Patiënt beschrijft wisselende respons. Geen alarmsymptomen, wel hinderlijke bijwerkingen.';
    policy.value =
      'Samen is afgesproken het schema aan te passen en een controle-afspraak te plannen.';
    notes.value = 'In dit demo-dashboard worden geen echte medicatiegegevens opgeslagen.';
  } else if (name === 'crisis') {
    consultType.value = 'Crisisbeoordeling';
    complaint.value =
      'Acute beoordeling in verband met zorgen over veiligheid, stemming of functioneren.';
    observations.value =
      'Patiënt wordt beoordeeld op actuele stemming, suïcidaliteit, impulscontrole, steunend netwerk en beschermende factoren. Er worden concrete voorbeelden uit de afgelopen dagen uitgevraagd.';
    policy.value =
      'Samen wordt gekeken welke ondersteuning nu passend is (bijv. intensivering ambulante zorg, opname-indicatie, veiligheidsafspraken). Er worden duidelijke afspraken gemaakt over bereikbaarheid en vervolgstappen.';
    notes.value =
      'Dit is een generiek crisis-voorbeeld voor deze demo. In de praktijk hoort hier altijd een uitgebreide, individuele beoordeling bij.';
  }
}

function hookAutofillToField(field) {
  field.addEventListener('input', () => {
    const value = field.value.toLowerCase();
    Object.entries(autofillMap).forEach(([key, sentence]) => {
      if (value.includes(key) && !value.includes(sentence.toLowerCase())) {
        field.value = `${field.value.trim()} ${sentence}`.trim();
      }
    });
  });
}

function generateReport() {
  const consultType = $('#consultType')?.value.trim() || '[consulttype]';
  const complaint = $('#complaint')?.value.trim() || '[hoofdklacht]';
  const observations = $('#observations')?.value.trim() || '[observaties]';
  const policy = $('#policy')?.value.trim() || '[beleid / plan]';
  const notes = $('#notes')?.value.trim() || '';

  const text = `Consulttype: ${consultType}.

Hoofdklacht:
${complaint}

Observaties:
${observations}

Beleid / plan:
${policy}

Notities:
${notes || 'Geen aanvullende notities genoteerd.'}

Dit verslag is gegenereerd in een lokale demo-omgeving en bevat geen echte patiëntgegevens.`;

  const output = $('#reportOutput');
  if (output) {
    output.textContent = text;
  }
  pushCopyHistory(text);
}

function pushCopyHistory(text) {
  if (!text) return;
  state.copyHistory.unshift(text);
  state.copyHistory = state.copyHistory.slice(0, 5);
  saveToStorage(STORAGE_KEYS.copyHistory, state.copyHistory);
  renderCopyHistory();
}

function renderCopyHistory() {
  const list = $('#copyHistoryList');
  if (!list) return;
  list.innerHTML = '';
  state.copyHistory.forEach((snippet, index) => {
    const li = createEl('li', 'history-item');
    li.textContent = snippet.length > 180 ? `${snippet.slice(0, 180)}…` : snippet;
    li.setAttribute('data-index', String(index));
    list.appendChild(li);
  });
}

// Speech-to-text (Web Speech API) for notes
let recognition = null;
let isListening = false;

function initSpeech() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition || null;
  if (!SpeechRecognition) {
    return; // Browser ondersteunt het niet, we tonen geen fout.
  }
  recognition = new SpeechRecognition();
  recognition.lang = 'nl-NL';
  recognition.interimResults = false;

  recognition.addEventListener('result', (event) => {
    const transcript = Array.from(event.results)
      .map((r) => r[0].transcript)
      .join(' ');
    const notesField = $('#notes');
    if (notesField) {
      notesField.value = `${notesField.value.trim()} ${transcript}`.trim();
    }
  });

  recognition.addEventListener('end', () => {
    isListening = false;
    const btn = $('#notesMicBtn');
    if (btn) btn.classList.remove('icon-btn--active');
  });

  const micBtn = $('#notesMicBtn');
  if (micBtn) {
    micBtn.addEventListener('click', () => {
      if (!recognition) return;
      if (!isListening) {
        isListening = true;
        micBtn.classList.add('icon-btn--active');
        recognition.start();
      } else {
        recognition.stop();
      }
    });
  }
}

function initReportFeature() {
  // Template chips
  document.querySelectorAll('[data-template]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-template');
      if (name) applyTemplate(name);
    });
  });

  // Smart autofill
  ['#complaint', '#observations', '#policy', '#notes'].forEach((sel) => {
    const field = $(sel);
    if (field) hookAutofillToField(field);
  });

  $('#generateReportBtn')?.addEventListener('click', generateReport);

  $('#copyReportBtn')?.addEventListener('click', () => {
    const text = $('#reportOutput')?.textContent || '';
    copyToClipboard(text);
    pushCopyHistory(text);
  });

  $('#copyHistoryList')?.addEventListener('click', (e) => {
    const item = e.target.closest('.history-item');
    if (!item) return;
    const index = Number(item.getAttribute('data-index'));
    const snippet = state.copyHistory[index];
    if (snippet) {
      copyToClipboard(snippet);
    }
  });

  // Quick action: copy last
  document.getElementById('quickCopyLastBtn')?.addEventListener('click', () => {
    const last = state.copyHistory[0];
    if (last) copyToClipboard(last);
  });

  renderCopyHistory();
  initSpeech();
}

// SECTION: Medication board
function createMedicationCard(item) {
  const card = createEl('article', 'med-card');

  const rowTop = createEl('div', 'med-card__row');
  const name = createEl('div', 'med-card__name', item.name);
  const date = createEl('div', 'med-card__meta', item.date);
  rowTop.append(name, date);

  const note = createEl('div', 'med-card__note', item.note || 'Geen notitie');

  const tags = createEl('div', 'med-card__tags');
  const alertTag = createEl('span', 'tag');
  if (item.alert === 'urgent') {
    alertTag.classList.add('tag--urgent');
    alertTag.textContent = '🔴 urgent';
  } else if (item.alert === 'later') {
    alertTag.classList.add('tag--later');
    alertTag.textContent = '🟡 later controleren';
  } else {
    alertTag.classList.add('tag--ok');
    alertTag.textContent = '🟢 ok';
  }
  tags.appendChild(alertTag);

  if (item.repeatNeeded) {
    const repeatTag = createEl('span', 'tag tag--later', 'Herhalen nodig');
    tags.appendChild(repeatTag);
  }

  const actions = createEl('div', 'med-card__actions');
  const stages = ['toPrescribe', 'prescribed', 'repeat', 'done'];
  const currentIndex = stages.indexOf(item.status);
  const next = stages[currentIndex + 1];
  const prev = stages[currentIndex - 1];

  if (prev) {
    const btnPrev = createEl('button', 'med-move-btn', '◀');
    btnPrev.addEventListener('click', () => moveMedication(item.id, prev));
    actions.appendChild(btnPrev);
  }
  if (next) {
    const btnNext = createEl('button', 'med-move-btn', '▶');
    btnNext.addEventListener('click', () => moveMedication(item.id, next));
    actions.appendChild(btnNext);
  }

  card.append(rowTop, note, tags, actions);
  return card;
}

function moveMedication(id, newStatus) {
  const med = state.medication.find((m) => m.id === id);
  if (!med) return;
  med.status = newStatus;
  saveToStorage(STORAGE_KEYS.medication, state.medication);
  renderMedicationBoard();
}

function renderMedicationBoard() {
  const columns = {
    toPrescribe: document.getElementById('col-toPrescribe'),
    prescribed: document.getElementById('col-prescribed'),
    repeat: document.getElementById('col-repeat'),
    done: document.getElementById('col-done'),
  };

  Object.values(columns).forEach((col) => {
    if (col) col.innerHTML = '';
  });

  let toPrescribeCount = 0;
  let repeatCount = 0;
  let doneCount = 0;

  state.medication.forEach((item) => {
    const col = columns[item.status];
    if (!col) return;
    col.appendChild(createMedicationCard(item));

    if (item.status === 'toPrescribe') toPrescribeCount += 1;
    if (item.status === 'repeat') repeatCount += 1;
    if (item.status === 'done') doneCount += 1;
  });

  // Update dashboard status card & repeat badge
  const badge = document.getElementById('repeatBadge');
  if (badge) {
    badge.textContent = `${repeatCount} herhaalacties`;
  }
  const sToPrescribe = document.getElementById('statusToPrescribe');
  const sRepeat = document.getElementById('statusRepeat');
  const sDone = document.getElementById('statusDone');
  if (sToPrescribe) sToPrescribe.textContent = String(toPrescribeCount);
  if (sRepeat) sRepeat.textContent = String(repeatCount);
  if (sDone) sDone.textContent = String(doneCount);
}

function addMedication() {
  const nameInput = document.getElementById('medName');
  const noteInput = document.getElementById('medNote');
  const alertSelect = document.getElementById('medAlert');
  const repeatCheckbox = document.getElementById('medRepeatNeeded');

  if (!nameInput || !noteInput || !alertSelect || !repeatCheckbox) return;

  const name = nameInput.value.trim();
  if (!name) return;

  const note = noteInput.value.trim();
  const alert = alertSelect.value;
  const repeatNeeded = repeatCheckbox.checked;

  const item = {
    id: Date.now().toString(),
    name,
    note,
    alert,
    repeatNeeded,
    status: 'toPrescribe',
    date: new Date().toLocaleDateString('nl-NL'),
  };

  state.medication.push(item);
  saveToStorage(STORAGE_KEYS.medication, state.medication);
  renderMedicationBoard();

  nameInput.value = '';
  noteInput.value = '';
  repeatCheckbox.checked = false;
}

function initMedicationFeature() {
  if (!state.medication.length) {
    // Starter demo data
    state.medication = [
      {
        id: 'm1',
        name: 'Voorbeeld inhalator',
        note: 'Techniek bespreken en herhaalrecept klaarzetten.',
        alert: 'later',
        repeatNeeded: true,
        status: 'repeat',
        date: '10-04-2026',
      },
      {
        id: 'm2',
        name: 'Voorbeeld antihypertensivum',
        note: 'Bloeddruk stabiel, beleid continueren.',
        alert: 'ok',
        repeatNeeded: false,
        status: 'prescribed',
        date: '09-04-2026',
      },
    ];
  }

  document.getElementById('addMedicationBtn')?.addEventListener('click', addMedication);
  renderMedicationBoard();
}

// SECTION: Follow-up list & Today overview
function renderFollowups() {
  const list = document.getElementById('followupList');
  if (!list) return;
  list.innerHTML = '';

  state.followups.forEach((item, index) => {
    const li = createEl('li', 'task-item');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.done;
    checkbox.addEventListener('change', () => {
      item.done = checkbox.checked;
      saveToStorage(STORAGE_KEYS.followups, state.followups);
      renderFollowups();
    });

    const label = createEl('span', 'task-item__label', item.text);
    const badge = createEl('span', 'task-item__badge', item.category);

    const removeBtn = createEl('button', 'icon-btn', '✕');
    removeBtn.addEventListener('click', () => {
      state.followups.splice(index, 1);
      saveToStorage(STORAGE_KEYS.followups, state.followups);
      renderFollowups();
    });

    li.append(checkbox, label, badge, removeBtn);
    list.appendChild(li);
  });
}

function initFollowups() {
  document.getElementById('addFollowupBtn')?.addEventListener('click', () => {
    const textInput = document.getElementById('followupText');
    const catSelect = document.getElementById('followupCategory');
    if (!textInput || !catSelect) return;

    const text = textInput.value.trim();
    if (!text) return;

    state.followups.push({ text, category: catSelect.value, done: false });
    saveToStorage(STORAGE_KEYS.followups, state.followups);
    textInput.value = '';
    renderFollowups();
  });

  renderFollowups();
}

function renderToday() {
  const openList = document.getElementById('todayOpenList');
  const doneList = document.getElementById('todayDoneList');
  if (!openList || !doneList) return;

  openList.innerHTML = '';
  doneList.innerHTML = '';

  state.today.open.forEach((task, index) => {
    const li = createEl('li', 'task-item');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.addEventListener('change', () => {
      state.today.open.splice(index, 1);
      state.today.done.push(task);
      saveToStorage(STORAGE_KEYS.today, state.today);
      renderToday();
      updateTodaySummary();
    });
    const label = createEl('span', 'task-item__label', task.text);
    li.append(checkbox, label);
    openList.appendChild(li);
  });

  state.today.done.forEach((task, index) => {
    const li = createEl('li', 'task-item task-item--done');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.addEventListener('change', () => {
      state.today.done.splice(index, 1);
      state.today.open.push(task);
      saveToStorage(STORAGE_KEYS.today, state.today);
      renderToday();
      updateTodaySummary();
    });
    const label = createEl('span', 'task-item__label', task.text);
    li.append(checkbox, label);
    doneList.appendChild(li);
  });
}

function updateTodaySummary() {
  const openCount = state.today.open.length;
  const doneCount = state.today.done.length;
  const openEl = document.getElementById('todayOpenCount');
  const doneEl = document.getElementById('todayDoneCount');
  if (openEl) openEl.textContent = String(openCount);
  if (doneEl) doneEl.textContent = String(doneCount);
}

function initToday() {
  document.getElementById('addTodayTaskBtn')?.addEventListener('click', () => {
    const input = document.getElementById('todayTaskText');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    state.today.open.push({ text });
    input.value = '';
    saveToStorage(STORAGE_KEYS.today, state.today);
    renderToday();
    updateTodaySummary();
  });

  renderToday();
  updateTodaySummary();
}

// SECTION: Quick sentences & favorites
const SENTENCES = {
  intake: [
    'Patiënt komt op de polikliniek voor een intakegesprek in het kader van dit zorgpad.',
    'We bespreken vandaag de hulpvraag, medische voorgeschiedenis en huidige situatie.',
  ],
  followup: [
    'We evalueren het beloop sinds het vorige consult en stemmen vervolgstappen af.',
    'Patiënt ervaart overwegend stabiel beloop met wisselende dagen.',
  ],
  policy: [
    'Er is afgesproken het huidige beleid voort te zetten en een controle-afspraak te plannen.',
    'We spreken af dat patiënt contact opneemt bij toename van klachten of onzekerheid.',
  ],
  medication: [
    'We evalueren effectiviteit en bijwerkingen van de huidige medicatie en passen zo nodig aan.',
    'Er wordt geen wijziging in medicatie doorgevoerd; beleid wordt voortgezet.',
  ],
};

function renderSentenceCategory(category, containerId) {
  const list = document.getElementById(containerId);
  if (!list) return;
  list.innerHTML = '';

  SENTENCES[category].forEach((text) => {
    const li = createEl('li', 'sentence-item');
    const span = createEl('span', '', text);

    const actions = createEl('span', 'sentence-item__actions');
    const copyBtn = createEl('button', 'icon-btn', 'Kopieer');
    const favBtn = createEl('button', 'icon-btn', '☆');

    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      copyToClipboard(text);
      pushCopyHistory(text);
    });

    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      addFavorite(text);
    });

    li.addEventListener('click', () => {
      copyToClipboard(text);
      pushCopyHistory(text);
    });

    actions.append(copyBtn, favBtn);
    li.append(span, actions);
    list.appendChild(li);
  });
}

function addFavorite(text) {
  if (!state.favorites.includes(text)) {
    state.favorites.unshift(text);
    state.favorites = state.favorites.slice(0, 20);
    saveToStorage(STORAGE_KEYS.favorites, state.favorites);
    renderFavorites();
  }
}

function renderFavorites() {
  const list = document.getElementById('favoritesList');
  const preview = document.getElementById('favoritesPreviewList');
  if (!list || !preview) return;

  list.innerHTML = '';
  preview.innerHTML = '';

  state.favorites.forEach((text) => {
    const li = createEl('li', 'favorite-item');
    li.textContent = text;
    li.addEventListener('click', () => {
      copyToClipboard(text);
      pushCopyHistory(text);
    });
    list.appendChild(li);
  });

  state.favorites.slice(0, 3).forEach((text) => {
    const li = createEl('li', 'favorite-item');
    li.textContent = text;
    li.addEventListener('click', () => {
      copyToClipboard(text);
      pushCopyHistory(text);
    });
    preview.appendChild(li);
  });
}

function initSentences() {
  renderSentenceCategory('intake', 'sentences-intake');
  renderSentenceCategory('followup', 'sentences-followup');
  renderSentenceCategory('policy', 'sentences-policy');
  renderSentenceCategory('medication', 'sentences-medication');

  document.getElementById('clearFavoritesBtn')?.addEventListener('click', () => {
    state.favorites = [];
    saveToStorage(STORAGE_KEYS.favorites, state.favorites);
    renderFavorites();
  });

  renderFavorites();
}

// SECTION: Meals and groceries
const MEALS = [
  {
    id: 'm-wraps',
    title: 'Snelle groente-wraps',
    energy: 'tired',
    who: ['alone', 'partner', 'family'],
    budget: 'low',
    ingredients: ['tortilla', 'spinazie', 'hummus', 'komkommer'],
  },
  {
    id: 'm-soup',
    title: 'Tomatensoep met toast',
    energy: 'tired',
    who: ['alone', 'partner'],
    budget: 'low',
    ingredients: ['tomaten uit blik', 'ui', 'knoflook', 'brood'],
  },
  {
    id: 'm-omelet',
    title: 'Eenvoudige groente-omelet',
    energy: 'tired',
    who: ['alone', 'partner'],
    budget: 'low',
    ingredients: ['eieren', 'paprika', 'kaas'],
  },
  {
    id: 'm-oven-pasta',
    title: 'Ovenpasta met groenten',
    energy: 'normal',
    who: ['partner', 'family'],
    budget: 'normal',
    ingredients: ['pasta', 'courgette', 'kaas', 'tomatensaus'],
  },
  {
    id: 'm-stirfry',
    title: 'Roerbak met rijst',
    energy: 'normal',
    who: ['alone', 'partner', 'family'],
    budget: 'low',
    ingredients: ['rijst', 'diepvriesgroenten', 'sojasaus'],
  },
  {
    id: 'm-traybake',
    title: 'Ovenschaal met aardappel en groenten',
    energy: 'normal',
    who: ['family'],
    budget: 'normal',
    ingredients: ['aardappelen', 'wortel', 'broccoli', 'olijfolie'],
  },
];

let lastSuggestedMeals = [];

function suggestMeals() {
  const energy = document.getElementById('energyLevel')?.value || 'tired';
  const who = document.getElementById('whoIsEating')?.value || 'alone';
  const budget = document.getElementById('budgetLevel')?.value || 'low';
  const people = Number(document.getElementById('peopleCount')?.value || '1');

  const filtered = MEALS.filter(
    (m) => m.energy === energy && m.budget === budget && m.who.includes(who)
  );

  const suggestions = filtered.slice(0, 3);
  lastSuggestedMeals = suggestions;

  const list = document.getElementById('mealSuggestions');
  if (!list) return;
  list.innerHTML = '';

  suggestions.forEach((meal) => {
    const li = createEl('li', 'meal-item');
    const title = createEl('div', 'meal-item__title', meal.title);
    const meta = createEl(
      'div',
      'meal-item__meta',
      `Voor ~${people} personen · ${meal.ingredients.length} hoofdingrediënten`
    );

    const addBtn = createEl('button', 'btn btn--ghost btn--small', 'Gebruik voor boodschappen');
    addBtn.type = 'button';
    addBtn.addEventListener('click', () => applyMealToGroceries(meal));

    li.append(title, meta, addBtn);
    list.appendChild(li);
  });
}

function applyMealToGroceries(meal) {
  const fridgeNames = state.fridge.map((f) => f.name.toLowerCase());
  const missing = meal.ingredients.filter(
    (ing) => !fridgeNames.some((n) => n.includes(ing.split(' ')[0].toLowerCase()))
  );

  const missingList = document.getElementById('missingList');
  if (!missingList) return;
  missingList.innerHTML = '';

  missing.forEach((item) => {
    const li = createEl('li', 'task-item');
    const label = createEl('span', 'task-item__label', item);
    const addBtn = createEl('button', 'icon-btn', '➕');
    addBtn.addEventListener('click', () => {
      state.groceries.push({ text: item, done: false });
      saveToStorage(STORAGE_KEYS.groceries, state.groceries);
      renderGroceries();
    });
    li.append(label, addBtn);
    missingList.appendChild(li);
  });
}

function renderGroceries() {
  const list = document.getElementById('groceryList');
  if (!list) return;

  list.innerHTML = '';
  state.groceries.forEach((item, index) => {
    const li = createEl('li', 'task-item');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.done;
    checkbox.addEventListener('change', () => {
      item.done = checkbox.checked;
      saveToStorage(STORAGE_KEYS.groceries, state.groceries);
      renderGroceries();
    });

    const label = createEl('span', 'task-item__label', item.text);
    const removeBtn = createEl('button', 'icon-btn', '✕');
    removeBtn.addEventListener('click', () => {
      state.groceries.splice(index, 1);
      saveToStorage(STORAGE_KEYS.groceries, state.groceries);
      renderGroceries();
    });

    li.append(checkbox, label, removeBtn);
    list.appendChild(li);
  });
}

function renderFridge() {
  const list = document.getElementById('fridgeList');
  if (!list) return;

  list.innerHTML = '';
  state.fridge.forEach((item) => {
    const li = createEl('li', 'inventory-item');
    const name = createEl('span', '', item.name);
    let statusLabel = 'ok';
    if (item.status === 'must-use') statusLabel = 'eerst opmaken';
    if (item.status === 'nearly-out') statusLabel = 'bijna op';
    const status = createEl('span', 'inventory-item__status', statusLabel);
    li.append(name, status);
    list.appendChild(li);
  });
}

function initGroceries() {
  document.getElementById('addGroceryBtn')?.addEventListener('click', () => {
    const input = document.getElementById('groceryText');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    state.groceries.push({ text, done: false });
    input.value = '';
    saveToStorage(STORAGE_KEYS.groceries, state.groceries);
    renderGroceries();
  });

  renderGroceries();
  renderFridge();
}

function initMeals() {
  document.getElementById('suggestMealsBtn')?.addEventListener('click', suggestMeals);
}

// SECTION: Free time (notes + photo)
function renderFreeNotes() {
  const list = document.getElementById('freeNotesList');
  if (!list) return;
  list.innerHTML = '';

  state.freeNotes.forEach((note, index) => {
    const li = createEl('li', 'task-item');
    const label = createEl('span', 'task-item__label', note.text);
    const removeBtn = createEl('button', 'icon-btn', '✕');
    removeBtn.addEventListener('click', () => {
      state.freeNotes.splice(index, 1);
      saveToStorage(STORAGE_KEYS.freeNotes, state.freeNotes);
      renderFreeNotes();
    });
    li.append(label, removeBtn);
    list.appendChild(li);
  });
}

function renderFreePhoto() {
  const container = document.getElementById('freePhotoPreview');
  if (!container) return;
  container.innerHTML = '';
  if (!state.freePhoto) return;
  const img = document.createElement('img');
  img.src = state.freePhoto;
  img.alt = 'Vrije tijd foto';
  container.appendChild(img);
}

function initFreeTime() {
  const saveBtn = document.getElementById('saveFreeNoteBtn');
  const noteField = document.getElementById('freeNote');
  const fileInput = document.getElementById('freePhotoInput');

  saveBtn?.addEventListener('click', () => {
    if (!noteField) return;
    const text = noteField.value.trim();
    if (!text) return;
    state.freeNotes.unshift({ text, createdAt: Date.now() });
    state.freeNotes = state.freeNotes.slice(0, 20);
    noteField.value = '';
    saveToStorage(STORAGE_KEYS.freeNotes, state.freeNotes);
    renderFreeNotes();
  });

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.freePhoto = reader.result;
      try {
        localStorage.setItem(STORAGE_KEYS.freePhoto, state.freePhoto);
      } catch (err) {
        // als opslag niet lukt, negeren we dat in deze demo
      }
      renderFreePhoto();
    };
    reader.readAsDataURL(file);
  });

  renderFreeNotes();
  renderFreePhoto();
}

// SECTION: App init
function init() {
  loadFromStorage();
  initViews();
  initNavigation();
  initModeSwitch();
  setMode('work');

  initReportFeature();
  initMedicationFeature();
  initFollowups();
  initToday();
  initSentences();
  initMeals();
  initGroceries();
  initFreeTime();

  // Default view
  showView('dashboard');
}

window.addEventListener('DOMContentLoaded', init);
