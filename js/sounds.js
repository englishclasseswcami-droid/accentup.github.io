const USE_REAL_AUDIO = false;
function playWord(word) {
  if (USE_REAL_AUDIO) { const a = new Audio('audio/' + word.toLowerCase() + '.mp3'); a.play().catch(() => speakWord(word)); }
  else speakWord(word);
}
function speakWord(word) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word); u.lang = 'en-US'; u.rate = 0.85;
  window.speechSynthesis.speak(u);
}

/* ══════════════════════════════════════════
   WEEKLY ROUTINE
══════════════════════════════════════════ */
function getWeekStart() {
  const d = new Date(); const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.getFullYear(), d.getMonth(), diff);
  return mon.toISOString().slice(0, 10);
}

function formatWeekRange(weekStart) {
  const mon = new Date(weekStart + 'T00:00:00');
  const sat = new Date(mon); sat.setDate(mon.getDate() + 5);
  const opts = { month: 'long', day: 'numeric' };
  return mon.toLocaleDateString('en-US', opts) + ' – ' + sat.toLocaleDateString('en-US', opts);
}

function renderRoutine() {
  const page = document.getElementById('page-routine');
  if (!page) return;
  if (!currentUser) return;
  const isTeacher = currentUser?.email?.toLowerCase() === TEACHER_EMAIL.toLowerCase();
  if (isTeacher) { page.innerHTML = '<div style="padding:2rem;color:var(--text-muted);font-size:14px;text-align:center">Routines are managed in the Teacher Dashboard → 📅 Routines tab.</div>'; return; }
  if (!dbRoutine || !dbRoutineItems.length) {
    page.innerHTML = `<div class="section-intro"><h2>📅 Weekly Routine</h2></div><div style="text-align:center;padding:3rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius)"><div style="font-size:48px;margin-bottom:12px">📅</div><div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:6px">No routine yet</div><div style="font-size:13px;color:var(--text-muted)">Your teacher will set up your weekly routine soon.</div></div>`;
    return;
  }
  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const weekStart = getWeekStart();
  const completedIds = new Set(dbRoutineCompletions.map(c => c.item_id));
  const total = dbRoutineItems.length;
  const done = dbRoutineItems.filter(item => completedIds.has(item.id)).length;
  const pct = total ? Math.round(done/total*100) : 0;
  const mon = new Date(weekStart + 'T00:00:00');
  let html = `<div class="section-intro"><h2>📅 Weekly Routine</h2><p>Week of ${formatWeekRange(weekStart)}</p></div>
    <div class="routine-progress-wrap">
      <div class="routine-progress-label"><span>${done} / ${total} activities done</span><span style="font-size:12px;color:var(--brand);font-weight:800">${pct}%</span></div>
      <div class="routine-progress-bar-wrap"><div class="routine-progress-bar" style="width:${pct}%"></div></div>
    </div>`;
  for (let d = 0; d <= 5; d++) {
    const dayItems = dbRoutineItems.filter(i => i.day_of_week === d).sort((a,b) => a.order_index - b.order_index);
    if (!dayItems.length) continue;
    const dayDate = new Date(mon); dayDate.setDate(mon.getDate() + d);
    const dayLabel = dayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    html += `<div class="routine-day-block"><div class="routine-day-header">${dayLabel}</div>`;
    dayItems.forEach(item => {
      const isDone = completedIds.has(item.id);
      const lessonBtn = item.lesson_id ? `<button class="outline-btn" onclick="event.stopPropagation();openRoutineLesson('${item.lesson_id}')" style="font-size:11px;padding:4px 10px;margin-top:5px">→ Open in Classroom</button>` : '';
      html += `<div class="routine-item ${isDone?'done':''}" onclick="toggleRoutineCompletion('${item.id}')">
        <div class="routine-check">${isDone ? '✅' : '<div class="routine-uncheck"></div>'}</div>
        <div class="routine-item-body"><div class="routine-item-title">${esc(item.title)}</div>${item.description?`<div class="routine-item-desc">${esc(item.description)}</div>`:''}${lessonBtn}</div>
      </div>`;
    });
    html += '</div>';
  }
  page.innerHTML = html;
}

async function toggleRoutineCompletion(itemId) {
  if (!currentUser) return;
  const weekStart = getWeekStart();
  const idx = dbRoutineCompletions.findIndex(c => c.item_id === itemId);
  if (idx > -1) {
    await sb.from('routine_completions').delete().eq('student_id', currentUser.id).eq('item_id', itemId).eq('week_start', weekStart);
    dbRoutineCompletions.splice(idx, 1);
  } else {
    const { data } = await sb.from('routine_completions').insert({ student_id: currentUser.id, item_id: itemId, week_start: weekStart }).select().maybeSingle();
    if (data) dbRoutineCompletions.push(data);
    else dbRoutineCompletions.push({ item_id: itemId, student_id: currentUser.id, week_start: weekStart });
  }
  renderRoutine();
}

function openRoutineLesson(lessonId) {
  const lesson = dbLessons.find(l => l.id === lessonId);
  if (!lesson) return;
  goToPage('classroom');
  setTimeout(() => { openModule(lesson.module_id); setTimeout(() => showLesson(lessonId), 350); }, 150);
}

function renderTeacherRoutineTab() {
  const sel = document.getElementById('routine-student-select');
  if (!sel) return;
  const students = dbProfiles.filter(p => p.id !== currentUser?.id);
  const prev = sel.value;
  sel.innerHTML = '<option value="">— Select a student —</option>' +
    students.map(s => `<option value="${s.id}" ${prev===s.id?'selected':''}>${esc(s.username||'Student')}</option>`).join('');
  if (prev && students.some(s => s.id === prev)) loadStudentRoutineForEdit(prev);
}

async function loadStudentRoutineForEdit(studentId) {
  const area = document.getElementById('routine-edit-area');
  if (!studentId) { if(area) area.style.display='none'; return; }
  editingRoutineStudentId = studentId;
  const { data: routine } = await sb.from('student_routines').select('*').eq('student_id', studentId).maybeSingle();
  if (routine) {
    const { data: items } = await sb.from('routine_items').select('*').eq('routine_id', routine.id).order('day_of_week').order('order_index');
    editRoutineRows = (items||[]).map(r => ({ ...r, tempId: r.id }));
  } else { editRoutineRows = []; }
  renderRoutineEditor();
}

function renderRoutineEditor() {
  const area = document.getElementById('routine-edit-area');
  if (!area) return;
  area.style.display = 'block';
  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  let html = '';
  for (let d = 0; d <= 5; d++) {
    const dayItems = editRoutineRows.filter(r => r.day_of_week === d);
    html += `<div style="margin-bottom:1.5rem"><div class="routine-day-header-edit">${DAYS[d]}</div>`;
    dayItems.forEach(item => {
      const tid = item.tempId || item.id;
      const lessonOpts = dbModules.map(m => {
        const ml = dbLessons.filter(l => l.module_id === m.id);
        if (!ml.length) return '';
        return `<optgroup label="${esc(m.title)}">${ml.map(l=>`<option value="${l.id}" ${item.lesson_id===l.id?'selected':''}>${esc(l.title)}</option>`).join('')}</optgroup>`;
      }).join('');
      html += `<div class="routine-edit-item">
        <div style="flex:1">
          <input type="text" placeholder="Activity title *" value="${esc(item.title||'')}" onchange="updateRoutineItemField('${tid}','title',this.value)" style="margin-bottom:4px"/>
          <input type="text" placeholder="Short description (optional)" value="${esc(item.description||'')}" onchange="updateRoutineItemField('${tid}','description',this.value)" style="margin-bottom:4px;font-size:12px"/>
          <select onchange="updateRoutineItemField('${tid}','lesson_id',this.value)" style="font-size:12px;margin-bottom:0">
            <option value="">🔗 Link to a platform lesson (optional)</option>${lessonOpts}
          </select>
        </div>
        <button class="q-card-delete" onclick="removeRoutineItemRow('${tid}')" style="align-self:flex-start;margin-top:2px">×</button>
      </div>`;
    });
    html += `<button class="secondary-btn" onclick="addRoutineItemRow(${d})" style="font-size:12px;padding:5px 10px;margin-top:4px">+ Add activity</button></div>`;
  }
  html += `<button class="primary-btn" id="save-routine-btn" onclick="saveStudentRoutine()" style="margin-top:.5rem">Save routine</button>`;
  area.innerHTML = html;
}

function addRoutineItemRow(day) {
  editRoutineRows.push({ tempId:'tmp_'+Date.now()+'_'+Math.random(), day_of_week:day, title:'', description:'', lesson_id:null });
  renderRoutineEditor();
}
function removeRoutineItemRow(tid) {
  editRoutineRows = editRoutineRows.filter(r => (r.tempId||r.id) !== tid);
  renderRoutineEditor();
}
function updateRoutineItemField(tid, field, value) {
  const row = editRoutineRows.find(r => (r.tempId||r.id) === tid);
  if (row) row[field] = value || null;
}

async function saveStudentRoutine() {
  if (!editingRoutineStudentId) return;
  const btn = document.getElementById('save-routine-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving...'; }
  try {
    const { data: routine, error: rErr } = await sb.from('student_routines')
      .upsert({ student_id: editingRoutineStudentId, updated_at: new Date().toISOString() }, { onConflict: 'student_id' })
      .select().maybeSingle();
    if (rErr) throw rErr;
    await sb.from('routine_items').delete().eq('routine_id', routine.id);
    const valid = editRoutineRows.filter(r => r.title && r.title.trim());
    if (valid.length) {
      const { error: iErr } = await sb.from('routine_items').insert(
        valid.map((r, idx) => ({ routine_id: routine.id, day_of_week: r.day_of_week, title: r.title.trim(), description: r.description||'', lesson_id: r.lesson_id||null, order_index: idx }))
      );
      if (iErr) throw iErr;
    }
    if (btn) { btn.disabled=false; btn.textContent='✅ Saved!'; setTimeout(()=>{ if(btn) btn.textContent='Save routine'; }, 2500); }
  } catch(err) {
    alert('Error saving routine: ' + err.message);
    if (btn) { btn.disabled=false; btn.textContent='Save routine'; }
  }
}

/* ── SOUNDS ENGINE ── */
function badgeClass(t){ return t==="vowel"?"badge-vowel":t==="diphthong"?"badge-diphthong":t==="rcolored"?"badge-rcolored":"badge-consonant"; }
function badgeLabel(t){ return t==="rcolored"?"r-colored":(t||"consonant"); }

function renderCard(s, isActive, onClick){
  const d = document.createElement("div");
  d.className = "sound-card"+(isActive?" active":"");
  d.innerHTML = `<div class="sound-ipa">${s.ipa}</div><div class="sound-mw">${s.mw}</div><div class="sound-example">as in "<strong>${s.keyword}</strong>"</div><span class="sound-type-badge ${badgeClass(s.type||"consonant")}">${badgeLabel(s.type)}</span>`;
  d.onclick = onClick;
  return d;
}

function renderDetail(panelId, s, isConsonant){
  const el = document.getElementById(panelId);
  if (!el) return;
  el.innerHTML = `
    <div class="detail-header">
      <div><div class="detail-big-ipa">${s.ipa}</div><div class="detail-big-mw">${s.mw}</div></div>
      <div><div class="detail-name">${s.name}</div><div class="detail-keyword">as in "<strong>${s.keyword}</strong>"</div>
        <span class="sound-type-badge ${isConsonant?"badge-consonant":badgeClass(s.type)}" style="margin-top:6px;display:inline-block">${isConsonant?"consonant":badgeLabel(s.type)}</span>
      </div>
    </div>
    <div class="detail-body">
      <div class="detail-section"><div class="detail-section-label">${isConsonant?"Example words":"Practice words"}</div>
        <div class="words-wrap">${(s.words||[]).map((w,i)=>`<span class="word-pill${i===0?" highlight":""}" onclick="playWord('${escapeJSArg(w)}')">${w}</span>`).join("")}</div>
      </div>
      <div class="detail-section"><div class="detail-section-label">${isConsonant?"All spellings for this sound":"How it\u2019s spelled"}</div>
        <div class="words-wrap">${(s.spellings||[]).map(sp=>`<span class="word-pill">${sp}</span>`).join("")}</div>
      </div>
    </div>
    <div class="tip-box"><div class="tip-label">💡 For Spanish speakers</div><div class="tip-text">${s.tip||""}</div></div>`;
}

function buildSoundGrid(containerId, list, isConsonant, rebuildFn){
  const c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML = "";
  list.forEach(function(sound){
    c.appendChild(renderCard(sound, activeSound === sound.ipa, (function(snd, isCon){
      return function(){
        activeSound = snd.ipa;
        renderDetail("sound-detail", snd, isCon);
        rebuildFn();
      };
    })(sound, isConsonant)));
  });
}

function buildAllSoundsGrids(){
  [
    ["pure-vowel-grid",    vowels.pure,          false],
    ["diphthong-grid",     vowels.diphthongs,     false],
    ["rcolored-grid",      vowels.rcolored,       false],
    ["stops-grid",         consonants.stops,      true],
    ["fricatives-grid",    consonants.fricatives,  true],
    ["affricates-grid",    consonants.affricates,  true],
    ["nasals-grid",        consonants.nasals,      true],
    ["liquids-grid",       consonants.liquids,     true]
  ].forEach(function(entry){ buildSoundGrid(entry[0], entry[1], entry[2], buildAllSoundsGrids); });
}

function filterSounds(query) {
  const q = (query || '').toLowerCase().trim();
  if (!q) { buildAllSoundsGrids(); return; }
  const matches = s =>
    s.ipa.toLowerCase().includes(q) ||
    s.mw.toLowerCase().includes(q) ||
    s.name.toLowerCase().includes(q) ||
    s.keyword.toLowerCase().includes(q) ||
    (s.words || []).some(w => w.toLowerCase().includes(q)) ||
    (s.spellings || []).some(sp => sp.toLowerCase().includes(q));
  const rebuild = () => filterSounds(document.getElementById('sounds-search')?.value || '');
  [
    ["pure-vowel-grid",    vowels.pure,          false],
    ["diphthong-grid",     vowels.diphthongs,     false],
    ["rcolored-grid",      vowels.rcolored,       false],
    ["stops-grid",         consonants.stops,      true],
    ["fricatives-grid",    consonants.fricatives,  true],
    ["affricates-grid",    consonants.affricates,  true],
    ["nasals-grid",        consonants.nasals,      true],
    ["liquids-grid",       consonants.liquids,     true]
  ].forEach(function(entry) {
    const filtered = entry[1].filter(matches);
    buildSoundGrid(entry[0], filtered, entry[2], rebuild);
    // Show/hide section heading
    const grid = document.getElementById(entry[0]);
    if (grid) {
      let el = grid.previousElementSibling;
      while (el && !el.classList.contains('sub-heading')) el = el.previousElementSibling;
      if (el) el.style.display = filtered.length ? '' : 'none';
    }
  });
}
