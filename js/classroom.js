const MODULE_COLORS = ['#2D2AE8','#E8602D','#1D9E75','#E83D7A','#7A4FE8','#0EA5C4','#D9A012','#5B6CF0'];
const MODULE_ICONS  = ['🎯','🔥','🎤','📚','🗣️','✨','🎧','📝'];

function renderClassroomGrid() {
  const grid = document.getElementById('classroom-modules-grid'); if (!grid) return;
  if (!currentUser) { grid.innerHTML = '<div style="color:var(--text-light);font-size:14px;grid-column:1/-1;text-align:center;padding:3rem 0">Log in to access the classroom.</div>'; return; }
  const profile = dbProfiles.find(p => p.id === currentUser.id);
  if (profile && profile.approved === false) { grid.innerHTML = '<div style="color:var(--text-light);font-size:14px;grid-column:1/-1;text-align:center;padding:3rem 1rem">⏳ Your account is pending approval. Camila will activate your access shortly.</div>'; return; }
  if (!dbModules.length) { grid.innerHTML = '<div style="color:var(--text-light);font-size:14px;grid-column:1/-1;text-align:center;padding:3rem 0">No content yet!</div>'; return; }
  grid.innerHTML = dbModules.map((m, i) => {
    const color = MODULE_COLORS[i % MODULE_COLORS.length]; const icon = MODULE_ICONS[i % MODULE_ICONS.length];
    const modLessons = dbLessons.filter(l => l.module_id === m.id); const total = modLessons.length; const done = modLessons.filter(l => dbProgress.some(p => p.lesson_id === l.id)).length; const pct = total === 0 ? 0 : Math.round(done / total * 100);
    return `<div class="course-card" onclick="openModule('${m.id}')" style="--accent:${color}">${m.is_private ? `<span class="private-badge">Private</span>` : ''}<div class="course-card-icon">${icon}</div><div class="course-card-title">${esc(m.title)}</div><div class="course-card-desc">${done} of ${total} lesson${total !== 1 ? 's' : ''} completed</div><div class="course-card-progress-wrap"><div class="course-card-progress-bar"><div class="course-card-progress-fill" style="width:${pct}%"></div></div><span class="course-card-pct">${pct}%</span></div><div class="course-card-arrow">→</div></div>`;
  }).join('');
}
function openModule(moduleId) {
  activeModuleId = moduleId; document.getElementById('classroom-grid-view').style.display = 'none'; document.getElementById('classroom-player-view').style.display = 'block'; document.getElementById('sidebar-mod-title').textContent = dbModules.find(m => m.id === moduleId)?.title || '';
  // Default-open: first submodule with an incomplete lesson, else the first submodule
  const subs = dbSubmodules.filter(s => s.module_id === moduleId);
  sidebarOpenSubs = new Set();
  let target = subs.find(sub => dbLessons.some(l => l.module_id === moduleId && l.submodule_id === sub.id && !dbProgress.some(p => p.lesson_id === l.id)));
  if (!target) target = subs[0];
  if (target) sidebarOpenSubs.add(target.id);
  renderSidebar(moduleId); hideAllViews(); document.getElementById('view-welcome').style.display = 'block';
}
function backToClassroomGrid() { document.getElementById('classroom-grid-view').style.display = 'block'; document.getElementById('classroom-player-view').style.display = 'none'; hideAllViews(); activeModuleId = null; }
function renderSidebar(moduleId) {
  const sidebar = document.getElementById('sidebar-render'); const subs = dbSubmodules.filter(s => s.module_id === moduleId); const iconMap = { video:'📺', text:'📄', task:'📝', embed:'🌐' }; let html = '';
  subs.forEach(sub => {
    const subLessons = dbLessons.filter(l => l.module_id === moduleId && l.submodule_id === sub.id); if (!subLessons.length) return;
    const doneCount = subLessons.filter(l => dbProgress.some(p => p.lesson_id === l.id)).length; const pct = Math.round(doneCount / subLessons.length * 100);
    const isOpen = sidebarOpenSubs.has(sub.id);
    html += `<div class="c-subfolder-group"><div class="c-subfolder-header" onclick="toggleSidebarFolder('${sub.id}')"><span class="c-chevron ${isOpen?'open':''}">▸</span><span class="c-subfolder-title">${esc(sub.title)}</span><span class="c-subfolder-prog ${pct===100?'done':''}">${pct}%</span></div><div class="c-subfolder-body ${isOpen?'open':''}">`;
    subLessons.forEach(l => { const isDone = dbProgress.some(p => p.lesson_id === l.id); html += `<div class="c-item" id="item-${l.id}" onclick="showLesson('${l.id}')"><div style="display:flex;align-items:center;gap:8px;overflow:hidden"><span>${iconMap[l.type]||'📄'}</span><span class="c-item-title">${esc(l.title)}</span></div>${isDone?'<span>✅</span>':'<span style="font-size:10px">⚪</span>'}</div>`; });
    html += '</div></div>';
  });
  const orphans = dbLessons.filter(l => l.module_id === moduleId && !l.submodule_id);
  if (orphans.length) { html += '<div class="c-subfolder-group"><div class="c-subfolder-body open">'; orphans.forEach(l => { const isDone = dbProgress.some(p => p.lesson_id === l.id); html += `<div class="c-item" id="item-${l.id}" onclick="showLesson('${l.id}')"><div style="display:flex;align-items:center;gap:8px;overflow:hidden"><span>${iconMap[l.type]||'📄'}</span><span class="c-item-title">${esc(l.title)}</span></div>${isDone?'<span>✅</span>':'<span style="font-size:10px">⚪</span>'}</div>`; }); html += '</div></div>'; }
  sidebar.innerHTML = html || '<div style="font-size:12px;color:var(--text-light);text-align:center;margin-top:1rem">Empty folder</div>';
  if (currentLesson) setActiveSidebarItem('item-' + currentLesson.id);
}
function toggleSidebarFolder(subId) {
  if (sidebarOpenSubs.has(subId)) sidebarOpenSubs.delete(subId); else sidebarOpenSubs.add(subId);
  if (activeModuleId) renderSidebar(activeModuleId);
}
function setActiveSidebarItem(id) { document.querySelectorAll('.c-item').forEach(el => el.classList.remove('active')); document.getElementById(id)?.classList.add('active'); }
function hideAllViews() { ['view-welcome','view-video','view-text','view-exercise','view-embed'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; }); const vp = document.getElementById('cv-video-player'); if (vp) vp.innerHTML = ''; const rp = document.getElementById('recording-panel'); if (rp) rp.style.display = 'none'; const bc = document.getElementById('lesson-breadcrumb-row'); if (bc) bc.style.display = 'none'; const sp = document.getElementById('soundboard-panel'); if (sp) sp.style.display = 'none'; stopSoundboardAudio(); }
/* ══════════════════════════════════════════
   SOUNDBOARD — embedded per-subfolder word/phrase practice
══════════════════════════════════════════ */
let soundboardAudioEl = null;

/* ══════════════════════════════════════════
   PLAYBACK SPEED — applies to soundboard + lesson audio
══════════════════════════════════════════ */
const PLAYBACK_RATES = [1, 0.75, 1.25];
function cyclePlaybackRate() {
  const idx = PLAYBACK_RATES.indexOf(playbackRate);
  playbackRate = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length];
  localStorage.setItem('au_playback_rate', playbackRate);
  updateSpeedToggleLabel();
  if (soundboardAudioEl) soundboardAudioEl.playbackRate = playbackRate;
  document.querySelectorAll('#cv-video-audios audio, #cv-text-audios audio, #cv-embed-audios audio, .ex-question-block audio').forEach(a => a.playbackRate = playbackRate);
}
function updateSpeedToggleLabel() {
  const btn = document.getElementById('speed-toggle-btn'); if (!btn) return;
  btn.textContent = `⚡ ${playbackRate}x`; btn.classList.toggle('active', playbackRate !== 1);
}

function injectSoundboardTokens(html) {
  if (!html || !html.includes('{{sound:')) return html || '';
  return html.replace(/\{\{sound:([a-zA-Z0-9-]+)\}\}/g, (match, id) => {
    const item = dbSoundboard.find(s => s.id === id); if (!item) return '';
    return `<button class="soundboard-inline-play" id="sb-play-${item.id}" onclick="playSoundboardAudio('${item.id}')" ${!item.audio_url ? 'disabled' : ''}>▶ ${esc(item.text)}</button>`;
  });
}

function playSoundboardAudio(itemId) {
  const item = dbSoundboard.find(s => s.id === itemId); if (!item || !item.audio_url) return;
  if (soundboardAudioEl && soundboardAudioEl._itemId === itemId && !soundboardAudioEl.paused) { stopSoundboardAudio(); return; }
  stopSoundboardAudio();
  soundboardAudioEl = new Audio(item.audio_url); soundboardAudioEl._itemId = itemId; soundboardAudioEl.playbackRate = playbackRate;
  const btn = document.getElementById('sb-play-' + itemId); if (btn) btn.classList.add('playing');
  soundboardAudioEl.play().catch(()=>{});
  soundboardAudioEl.onended = () => { if (btn) btn.classList.remove('playing'); soundboardAudioEl = null; };
}

function stopSoundboardAudio() {
  if (soundboardAudioEl) { soundboardAudioEl.pause(); const prevBtn = document.getElementById('sb-play-' + soundboardAudioEl._itemId); if (prevBtn) prevBtn.classList.remove('playing'); soundboardAudioEl = null; }
}

function renderAudios(panelId, list) { const el = document.getElementById(panelId); if (!el) return; const arr = safeParseJSON(list); if (!arr.length) { el.style.display = 'none'; return; } el.style.display = 'block'; el.innerHTML = arr.map(a => `<div class="lesson-audio-row"><span class="lesson-audio-label">🔊 ${esc(a.label)}</span><audio controls src="${esc(a.url)}"></audio></div>`).join(''); el.querySelectorAll('audio').forEach(aEl => aEl.playbackRate = playbackRate); }
function renderResources(panelId, list) { const el = document.getElementById(panelId); if (!el) return; const arr = safeParseJSON(list); if (!arr.length) { el.style.display = 'none'; return; } el.style.display = 'block'; el.innerHTML = `<div class="resources-heading">Resources</div><div class="resources-list">${arr.map(r => `<a href="${esc(r.url)}" target="_blank" class="resource-link">📎 ${esc(r.name)}</a>`).join('')}</div>`; }
function updateCompleteButton(btnId, isDone) { const btn = document.getElementById(btnId); if (!btn) return; btn.textContent = isDone ? 'Completed ✅' : 'Mark as complete'; btn.style.background = isDone ? 'var(--green)' : 'var(--brand)'; btn.disabled = isDone; }
async function markCurrentLessonComplete() {
  if (!currentUser || !currentLesson) return;
  ['btn-complete-video','btn-complete-text','btn-complete-embed'].forEach(id => updateCompleteButton(id, true));
  await sb.from('student_progress').upsert({ user_id: currentUser.id, lesson_id: currentLesson.id, score: 100, total_questions: 1 }, { onConflict: 'user_id,lesson_id' });
  await fetchData();
  if (activeModuleId) renderSidebar(activeModuleId);
  showLessonComplete();
}

function showLessonComplete() {
  const dates = dbProgress.map(p => p.created_at?.slice(0,10)).filter(Boolean);
  const { current: streak } = calcStreak(dates);
  const name = (dbProfiles.find(p => p.id === currentUser?.id)?.username || '').split(' ')[0];
  const bd = document.createElement('div'); bd.className = 'toast-backdrop'; bd.onclick = dismissToast;
  const toast = document.createElement('div'); toast.className = 'lesson-toast';
  toast.innerHTML = `
    <div class="toast-emoji">✅</div>
    <div class="toast-title">Lesson complete!</div>
    <div class="toast-sub">🔥 ${streak} day streak${name ? ` · Great work, ${esc(name)}!` : ' · Keep it up!'}</div>
    <div class="toast-actions">
      <button class="primary-btn" style="padding:10px 24px" onclick="dismissToast()">Continue</button>
    </div>`;
  document.body.appendChild(bd);
  document.body.appendChild(toast);
  window._toastBd = bd; window._toastEl = toast;
}

function dismissToast() {
  window._toastBd?.remove(); window._toastEl?.remove();
  window._toastBd = null; window._toastEl = null;
}

function showLesson(lessonId) {
  hideAllViews(); currentLesson = dbLessons.find(l => l.id === lessonId); if (!currentLesson) return;
  const audios = safeParseJSON(currentLesson.content); const resources = safeParseJSON(currentLesson.resources); const isDone = dbProgress.some(p => p.lesson_id === lessonId);

  // Ensure this lesson's subfolder is expanded, then highlight it
  if (currentLesson.submodule_id && !sidebarOpenSubs.has(currentLesson.submodule_id)) { sidebarOpenSubs.add(currentLesson.submodule_id); if (activeModuleId) renderSidebar(activeModuleId); }
  setActiveSidebarItem('item-' + lessonId);

  // Breadcrumb + speed toggle row
  const breadcrumb = document.getElementById('lesson-breadcrumb'); const breadcrumbRow = document.getElementById('lesson-breadcrumb-row');
  if (breadcrumb && breadcrumbRow) {
    const sub = dbSubmodules.find(s => s.id === currentLesson.submodule_id);
    const mod = dbModules.find(m => m.id === currentLesson.module_id);
    breadcrumb.innerHTML = sub ? `${esc(mod?.title||'')} <span style="opacity:.4">›</span> ${esc(sub.title)}` : '';
    breadcrumb.style.display = sub ? 'flex' : 'none';
    breadcrumbRow.style.display = 'flex';
  }
  updateSpeedToggleLabel();

  if (currentLesson.type === 'video') {
    document.getElementById('view-video').style.display = 'block'; document.getElementById('cv-video-title').textContent = currentLesson.title;
    document.getElementById('cv-video-player').innerHTML = currentLesson.video_url ? `<iframe src="${esc(currentLesson.video_url)}" allowfullscreen allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"></iframe>` : '<div style="color:#fff;padding:2rem;text-align:center">No video</div>';
    document.getElementById('cv-video-text').innerHTML = injectSoundboardTokens(currentLesson.text_content); renderAudios('cv-video-audios', audios); renderResources('cv-video-resources', resources); updateCompleteButton('btn-complete-video', isDone);
  } else if (currentLesson.type === 'text') {
    document.getElementById('view-text').style.display = 'block'; document.getElementById('cv-text-title').textContent = currentLesson.title; document.getElementById('cv-text-content').innerHTML = injectSoundboardTokens(currentLesson.text_content); renderAudios('cv-text-audios', audios); renderResources('cv-text-resources', resources); updateCompleteButton('btn-complete-text', isDone);
  } else if (currentLesson.type === 'embed') {
    document.getElementById('view-embed').style.display = 'block'; document.getElementById('cv-embed-title').textContent = currentLesson.title; document.getElementById('cv-embed-text').innerHTML = injectSoundboardTokens(currentLesson.text_content); document.getElementById('cv-embed-container').innerHTML = currentLesson.video_url || ''; renderAudios('cv-embed-audios', audios); renderResources('cv-embed-resources', resources); updateCompleteButton('btn-complete-embed', isDone);
  } else if (currentLesson.type === 'task') {
    studentAnswers = {}; selectedDragChips = {}; document.getElementById('view-exercise').style.display = 'block'; document.getElementById('player-title').textContent = currentLesson.title;
    const taskTextEl = document.getElementById('cv-task-text'); if (taskTextEl) { const hasContent = currentLesson.text_content && currentLesson.text_content !== '<p><br></p>'; taskTextEl.innerHTML = hasContent ? injectSoundboardTokens(currentLesson.text_content) : ''; taskTextEl.style.display = hasContent ? 'block' : 'none'; }
    document.getElementById('submit-btn').disabled = isDone; document.getElementById('submit-btn').style.display = isDone ? 'none' : 'inline-block'; document.getElementById('retry-btn').style.display = isDone ? 'inline-block' : 'none'; document.getElementById('score-area').innerHTML = '';
    renderAudios('cv-task-audios', audios); renderPlayerQuestions(isDone); renderResources('cv-task-resources', resources);
    if (isDone) { const prev = dbProgress.find(p => p.lesson_id === lessonId); if (prev) showScore(prev.score, prev.total_questions, [], true); }
  }

  stopSoundboardAudio();

  // Recording panel — position before complete/submit button
  const recPanel = document.getElementById('recording-panel');
  if (recPanel) {
    const viewMap = { video:'view-video', text:'view-text', embed:'view-embed', task:'view-exercise' };
    const viewEl = document.getElementById(viewMap[currentLesson.type]);
    if (viewEl) {
      const anchor = viewEl.querySelector('.lesson-complete-wrap') || viewEl.querySelector('.player-footer');
      if (anchor) anchor.parentNode.insertBefore(recPanel, anchor);
      else viewEl.appendChild(recPanel);
    }
    recPanel.style.display = 'block'; recPanel.classList.add('collapsed');
  }
  initRecordingPanel(lessonId);

  // Fluid fade-in transition
  const main = document.querySelector('.c-main');
  if (main) { main.classList.remove('fade-in'); void main.offsetWidth; main.classList.add('fade-in'); }
}

function renderPlayerQuestions(isDone = false) {
  const wrap = document.getElementById('player-questions'); const content = safeParseJSON(currentLesson.task_content);
  const prevAnswers = (isDone ? dbProgress.find(p => p.lesson_id === currentLesson.id)?.answers : {}) || {}; 

  wrap.innerHTML = content.map((q, i) => {
    let qType = q.type || currentLesson.task_type;
    const qAudio = q.audio_url ? `<audio controls src="${esc(q.audio_url)}" style="width:100%;height:36px;margin-bottom:10px;border-radius:20px"></audio>` : '';
    let qVideo = '';
    if (q.video_url) {
      if (q.video_url.includes('youtube.com/embed/')) qVideo = `<div class="video-container" style="margin-bottom:12px; border-radius:8px; overflow:hidden;"><iframe src="${esc(q.video_url)}" allowfullscreen></iframe></div>`;
      else qVideo = `<video controls src="${esc(q.video_url)}" style="width:100%;border-radius:var(--radius-sm);margin-bottom:12px;background:#000;max-height:400px"></video>`;
    }
    const qMedia = qVideo + qAudio; let disabledAttr = isDone ? 'disabled' : '';

    if (qType === 'drag_drop') {
      const words = shuffle([...(q.items||[])]); const cats = q.categories || [];
      return `<div class="ex-question-block">${qMedia}<div class="ex-q-text">${esc(q.prompt)}</div><div class="dnd-instruction">☝️ Tap a word, then tap a box below to sort it.</div><div class="dnd-bank" id="dnd-bank-${i}" onclick="dndZoneClick(this, ${i})">${words.map((w,wIdx)=>`<div class="dnd-chip" id="dnd-chip-${i}-${wIdx}" onclick="event.stopPropagation();dndChipClick(this, ${i})">${esc(w.word)}</div>`).join('')}</div><div class="dnd-cols">${cats.map(c=>`<div class="dnd-col" onclick="dndZoneClick(this, ${i})" data-cat="${escapeJSArg(c)}"><div class="dnd-col-header">${esc(c)}</div><div class="dnd-col-body"></div></div>`).join('')}</div></div>`;
    }
    if (qType === 'drag_drop_text') {
      let parts = (q.prompt || '').split(/\[.*?\]/g); let matches = [...(q.prompt || '').matchAll(/\[(.*?)\]/g)].map(m => m[1]); let words = shuffle([...matches]); 
      let sentenceHtml = parts.map((part, pIdx) => { let out = esc(part); if (pIdx < matches.length) out += `<span class="dnd-inline-dropzone" id="dnd-drop-${i}-${pIdx}" onclick="dndInlineDrop(this, ${i}, ${pIdx})" data-expected="${esc(matches[pIdx])}"></span>`; return out; }).join('');
      let bankHtml = `<div class="dnd-bank" id="dnd-bank-inline-${i}" onclick="dndInlineReturn(this, ${i})">` + words.map((w, wIdx) => `<div class="dnd-chip" id="dnd-chip-inline-${i}-${wIdx}" onclick="event.stopPropagation(); dndInlineSelect(this, ${i})">${esc(w)}</div>`).join('') + `</div>`;
      return `<div class="ex-question-block">${qMedia}<div class="dnd-instruction">☝️ Tap a word, then tap a blank line to fill it.</div><div class="ex-q-text dnd-text-wrap" style="line-height:2.5; font-size:16px">${sentenceHtml}</div>${bankHtml}</div>`;
    }
    if (qType === 'fill_in_blank') {
      if ((q.prompt || '').includes('[')) {
         let html = `<div class="ex-question-block"><div class="ex-q-num">Question ${i+1}</div>${qMedia}<div class="ex-q-text" style="line-height:2.5">`;
         let parts = q.prompt.split(/\[.*?\]/g); let matches = [...q.prompt.matchAll(/\[(.*?)\]/g)]; let givenArr = prevAnswers[i] || [];
         parts.forEach((part, pIdx) => { html += esc(part); if (pIdx < matches.length) { html += `<input class="fitb-input inline-input" id="fitb-${i}-${pIdx}" type="text" value="${esc((Array.isArray(givenArr) ? givenArr[pIdx] : givenArr) || '')}" autocomplete="off" oninput="updateMultiBlank(${i}, ${pIdx}, this.value, ${matches.length})" ${disabledAttr} style="display:inline-block; width:120px; padding:6px; margin:0 4px; border-bottom:2px solid var(--brand); border-top:none; border-left:none; border-right:none; border-radius:0; background:var(--brand-light); text-align:center" />`; } });
         return html + `</div></div>`;
      } else {
        return `<div class="ex-question-block"><div class="ex-q-num">Question ${i+1}</div>${qMedia}<div class="ex-q-text">${esc(q.prompt)}</div><input class="fitb-input" id="fitb-${i}" type="text" placeholder="Your answer…" value="${esc(prevAnswers[i] || '')}" autocomplete="off" oninput="studentAnswers[${i}]=this.value" ${disabledAttr}/></div>`;
      }
    }
    if (qType === 'dictation') return `<div class="ex-question-block"><div class="ex-q-num">Question ${i+1}</div>${qMedia}<div class="ex-q-text">${esc(q.prompt)}</div><textarea class="dictation-input" id="dict-${i}" placeholder="Write what you hear…" oninput="studentAnswers[${i}]=this.value" ${disabledAttr}>${esc(prevAnswers[i] || '')}</textarea>${isDone && q.teacher_note ? `<div class="teacher-note visible">${esc(q.teacher_note)}</div>` : `<div class="teacher-note" id="note-${i}">${esc(q.teacher_note||'')}</div>`}</div>`;
    if (qType === 'open_answer') return `<div class="ex-question-block"><div class="ex-q-num">Question ${i+1}</div>${qMedia}<div class="ex-q-text">${esc(q.prompt)}</div><textarea class="dictation-input" id="oa-${i}" placeholder="Type your answer here..." oninput="studentAnswers[${i}]=this.value" ${disabledAttr}>${esc(prevAnswers[i] || '')}</textarea>${q.answer ? `<div class="open-answer-reveal ${isDone?'visible':''}" id="reveal-${i}"><strong>Expected answer:</strong> ${esc(q.answer)}</div>` : ''}${isDone && q.teacher_note ? `<div class="teacher-note visible">${esc(q.teacher_note)}</div>` : `<div class="teacher-note" id="note-${i}">${esc(q.teacher_note||'')}</div>`}</div>`;
    if (qType === 'short_answer') return `<div class="ex-question-block"><div class="ex-q-num">Question ${i+1}</div>${qMedia}<div class="ex-q-text">${esc(q.prompt)}</div><input class="fitb-input" id="sa-${i}" type="text" placeholder="Write your answer here…" value="${esc(prevAnswers[i] || '')}" autocomplete="off" oninput="studentAnswers[${i}]=this.value" ${disabledAttr}/>${isDone && q.answer ? `<div class="open-answer-reveal visible"><strong>Expected answer:</strong> ${esc(q.answer)}</div>` : ''}${isDone && q.teacher_note ? `<div class="teacher-note visible">${esc(q.teacher_note)}</div>` : `<div class="teacher-note" id="note-${i}">${esc(q.teacher_note||'')}</div>`}</div>`;
    
    const opts = (Array.isArray(q.options) ? q.options : []).filter(o => o && String(o).trim() !== ''); const shuffled = [...opts];
    const correctAnsArr = q.correctIndices ? q.correctIndices.map(idx => q.options[idx]) : [q.options[q.correctIndex ?? 0]];
    let isMulti = correctAnsArr.length > 1;
    let givenRaw = prevAnswers[i];
    let givenArr = Array.isArray(givenRaw) ? givenRaw : (givenRaw ? [givenRaw] : []);
    return `<div class="ex-question-block"><div class="ex-q-num">Question ${i+1}</div>${qMedia}<div class="ex-q-text">${esc(q.prompt)}</div>${isMulti ? '<div style="font-size:11px;color:var(--brand-mid);font-weight:600;margin-bottom:8px">✔ Select all correct answers</div>' : ''}<div class="options-grid">${shuffled.map((o,j)=>{ return `<button class="opt-btn ${givenArr.includes(o) ? 'selected' : ''}" id="opt-${i}-${j}" data-qi="${i}" data-oi="${j}" data-val="${esc(o)}" data-multi="${isMulti}" data-total="${shuffled.length}" onclick="handleOptClick(this)" ${disabledAttr}>${esc(o)}</button>`; }).join('')}</div>${isDone && q.teacher_note ? `<div class="teacher-note visible">${esc(q.teacher_note)}</div>` : `<div class="teacher-note" id="note-${i}">${esc(q.teacher_note||'')}</div>`}</div>`;
  }).join('');
  wrap.querySelectorAll('audio').forEach(a => a.playbackRate = playbackRate);
}

function updateMultiBlank(i, pIdx, val, total) { if (!Array.isArray(studentAnswers[i])) studentAnswers[i] = new Array(total).fill(''); studentAnswers[i][pIdx] = val; }
function handleOptClick(btn) {
  if (!btn || btn.disabled) return;
  const qi = parseInt(btn.dataset.qi);
  const oi = parseInt(btn.dataset.oi);
  if (isNaN(qi) || isNaN(oi)) return;
  toggleOpt(qi, oi, btn.dataset.val, btn.dataset.multi === 'true', parseInt(btn.dataset.total));
}

function toggleOpt(qi, oi, val, isMulti, totalOpts) {
  if (!isMulti) {
    // Single choice — store plain string, highlight one button
    studentAnswers[qi] = val;
    for (let j = 0; j < totalOpts; j++) {
      const b = document.getElementById(`opt-${qi}-${j}`);
      if (b) b.classList.remove('selected');
    }
    const btn = document.getElementById(`opt-${qi}-${oi}`);
    if (btn) btn.classList.add('selected');
  } else {
    // Multiple choice — store array, toggle each button
    if (!Array.isArray(studentAnswers[qi])) studentAnswers[qi] = [];
    const idx = studentAnswers[qi].indexOf(val);
    const btn = document.getElementById(`opt-${qi}-${oi}`);
    if (idx > -1) {
      studentAnswers[qi].splice(idx, 1);
      if (btn) btn.classList.remove('selected');
    } else {
      studentAnswers[qi].push(val);
      if (btn) btn.classList.add('selected');
    }
  }
}
function dndChipClick(chipEl, i) { document.querySelectorAll(`#player-questions .dnd-chip[id^="dnd-chip-${i}-"]`).forEach(c => c.classList.remove('selected')); document.querySelectorAll(`#player-questions .dnd-bank[id="dnd-bank-${i}"], #player-questions .dnd-col[onclick="dndZoneClick(this, ${i})"]`).forEach(c => c.classList.add('active-drop')); selectedDragChips[i] = chipEl; chipEl.classList.add('selected'); }
function dndZoneClick(zoneEl, i) { if (!selectedDragChips[i]) return; const body = zoneEl.classList.contains('dnd-bank') ? zoneEl : zoneEl.querySelector('.dnd-col-body'); if (body) { body.appendChild(selectedDragChips[i]); selectedDragChips[i].classList.remove('selected'); selectedDragChips[i] = null; document.querySelectorAll(`#player-questions .dnd-col, #player-questions .dnd-bank`).forEach(c => c.classList.remove('active-drop')); } }
function dndInlineSelect(chipEl, i) { document.querySelectorAll(`#player-questions .dnd-chip[id^="dnd-chip-inline-${i}-"]`).forEach(c => c.classList.remove('selected')); document.querySelectorAll(`#player-questions .dnd-inline-dropzone[id^="dnd-drop-${i}-"], #player-questions .dnd-bank[id="dnd-bank-inline-${i}"]`).forEach(c => c.classList.add('active-drop')); selectedDragChips[i] = chipEl; chipEl.classList.add('selected'); }
function dndInlineDrop(zoneEl, i, pIdx) { if (!selectedDragChips[i]) return; if (zoneEl.children.length > 0) document.getElementById(`dnd-bank-inline-${i}`).appendChild(zoneEl.children[0]); zoneEl.appendChild(selectedDragChips[i]); selectedDragChips[i].classList.remove('selected'); selectedDragChips[i] = null; document.querySelectorAll(`#player-questions .dnd-inline-dropzone, #player-questions .dnd-bank`).forEach(c => c.classList.remove('active-drop')); }
function dndInlineReturn(zoneEl, i) { if (!selectedDragChips[i]) return; zoneEl.appendChild(selectedDragChips[i]); selectedDragChips[i].classList.remove('selected'); selectedDragChips[i] = null; document.querySelectorAll(`#player-questions .dnd-inline-dropzone, #player-questions .dnd-bank`).forEach(c => c.classList.remove('active-drop')); }

async function submitExercise() {
  const content = safeParseJSON(currentLesson.task_content); let correct = 0, totalQ = 0; const results = []; let hasOpenAnswer = false;

  content.forEach((q, i) => {
    let qType = q.type || currentLesson.task_type;
    if (qType === 'open_answer') {
      hasOpenAnswer = true; totalQ++; const el = document.getElementById('oa-' + i); if (el) { el.style.borderColor = 'var(--brand)'; el.disabled = true; studentAnswers[i] = el.value; }
      const revealEl = document.getElementById('reveal-' + i); if (revealEl) revealEl.classList.add('visible');
    }
    else if (qType === 'drag_drop') {
      totalQ += q.items.length;
      document.querySelectorAll(`[id^="dnd-chip-${i}-"]`).forEach(chip => {
        if (chip.id.includes('inline')) return;
        const word = chip.textContent.trim(); const expectedCat = q.items.find(x => x.word === word)?.category; const parentCol = chip.closest('.dnd-col'); const actualCat = parentCol ? parentCol.dataset.cat : null;
        chip.onclick = null; let ok = actualCat === expectedCat; if (ok) { correct++; chip.classList.add('correct'); } else chip.classList.add('wrong');
        results.push({ prompt: word, answer: expectedCat || '?', given: actualCat || 'Unassigned', ok });
      }); document.querySelectorAll('.dnd-col,.dnd-bank').forEach(c => c.onclick = null);
    }
    else if (qType === 'drag_drop_text') {
      let matches = [...q.prompt.matchAll(/\[(.*?)\]/g)].map(m => m[1]); totalQ += matches.length; let allCorrect = true;
      document.querySelectorAll(`#player-questions .dnd-inline-dropzone[id^="dnd-drop-${i}-"]`).forEach(dz => {
          let expected = dz.dataset.expected; let chip = dz.querySelector('.dnd-chip'); let given = chip ? chip.textContent.trim() : ''; let isOk = given === expected;
          if (isOk) { correct++; } else { allCorrect = false; } if (chip) { chip.classList.add(isOk ? 'correct' : 'wrong'); chip.onclick = null; }
      }); const bankInline = document.getElementById(`dnd-bank-inline-${i}`); if (bankInline) bankInline.onclick = null; results.push({ prompt: 'Fill in blanks text', answer: 'Check visually above', given: '', ok: allCorrect });
    }
    else if (qType === 'fill_in_blank') {
      if ((q.prompt || '').includes('[')) {
          let matches = [...q.prompt.matchAll(/\[(.*?)\]/g)].map(m => m[1]); totalQ += matches.length; let allCorrect = true; let givenArr = Array.isArray(studentAnswers[i]) ? studentAnswers[i] : [];
          matches.forEach((ans, pIdx) => {
              let el = document.getElementById(`fitb-${i}-${pIdx}`); let given = el ? el.value.trim() : (givenArr[pIdx] || ''); let isOk = given.toLowerCase() === ans.toLowerCase().trim();
              if (isOk) { correct++; } else { allCorrect = false; }
              if(el) { el.disabled = true; el.style.borderBottomColor = isOk ? 'var(--green)' : 'var(--red)'; el.style.background = isOk ? 'var(--green-light)' : 'var(--red-light)'; el.style.color = isOk ? 'var(--green-dark)' : 'var(--red-dark)'; }
          }); results.push({ prompt: q.prompt.replace(/\[.*?\]/g, '___'), answer: matches.join(', '), given: givenArr.join(', '), ok: allCorrect });
      } else {
          totalQ++; let correctAns = q.answer || ''; let given = document.getElementById('fitb-'+i)?.value.trim() || ''; studentAnswers[i] = given; let ok = String(given).toLowerCase().trim() === String(correctAns).toLowerCase().trim();
          if (ok) correct++; const el = document.getElementById('fitb-'+i); if(el){ el.classList.add(ok?'correct':'wrong'); el.disabled = true; } results.push({ prompt: q.prompt, answer: correctAns, given, ok });
      }
    }
    else {
      totalQ++;
      if (qType === 'short_answer') {
         const el = document.getElementById('sa-'+i);
         let given = el ? el.value.trim() : (studentAnswers[i] || '');
         studentAnswers[i] = given;
         if (q.answer) {
           let ok = String(given).toLowerCase().trim() === String(q.answer).toLowerCase().trim();
           if (ok) correct++;
           if (el) { el.classList.add(ok ? 'correct' : 'wrong'); el.disabled = true; }
           results.push({ prompt: q.prompt, answer: q.answer, given, ok });
         } else {
           hasOpenAnswer = true;
           if (el) { el.style.borderColor = 'var(--brand)'; el.disabled = true; }
         }
      } else if (qType === 'dictation') {
         let given = document.getElementById('dict-'+i)?.value.trim() || ''; studentAnswers[i] = given; let ok = String(given).toLowerCase().trim() === String(q.answer).toLowerCase().trim();
         if(ok) correct++; results.push({ prompt: q.prompt, answer: q.answer, given, ok });
      } else {
         // Build correct answers array from correctIndices
         const correctAnsArray = q.correctIndices
           ? q.correctIndices.map(idx => q.options[idx])
           : [q.options[q.correctIndex ?? 0]];
         const isMulti = correctAnsArray.length > 1;

         // Normalize student answer to array
         let givenArr = Array.isArray(studentAnswers[i])
           ? studentAnswers[i]
           : (studentAnswers[i] ? [studentAnswers[i]] : []);

         let isOk = false;
         if (isMulti) {
           // All correct answers must be selected, no wrong ones
           isOk = givenArr.length === correctAnsArray.length &&
                  givenArr.every(v => correctAnsArray.includes(v));
         } else {
           // Single choice — compare directly
           isOk = givenArr.length === 1 &&
                  String(givenArr[0]).toLowerCase().trim() === String(correctAnsArray[0]).toLowerCase().trim();
         }
         if (isOk) correct++;

         document.querySelectorAll(`[id^="opt-${i}-"]`).forEach((b) => {
           b.disabled = true;
           const optText = b.textContent.trim();
           if (correctAnsArray.includes(optText)) b.classList.add('correct');
           else if (givenArr.includes(optText)) b.classList.add('wrong');
         });
         results.push({ prompt: q.prompt, answer: correctAnsArray.join(', '), given: givenArr.join(', '), ok: isOk });
      }
    }
  });

  document.getElementById('submit-btn').disabled = true; document.getElementById('submit-btn').style.display = 'none'; document.getElementById('retry-btn').style.display = 'inline-block';
  // Reveal teacher notes for all questions
  safeParseJSON(currentLesson.task_content).forEach((q, i) => { if (q.teacher_note && q.teacher_note.trim()) { const n = document.getElementById('note-'+i); if (n) n.classList.add('visible'); } });
  if(hasOpenAnswer && results.length === 0) showOpenAnswerCompleted(); else showScore(correct, totalQ, results, false);
  if (currentUser && currentLesson) { await sb.from('student_progress').upsert({ user_id: currentUser.id, lesson_id: currentLesson.id, score: correct, total_questions: totalQ, answers: studentAnswers }, { onConflict: 'user_id,lesson_id' }); await fetchData(); if (activeModuleId) renderSidebar(activeModuleId); }
}

function retryExercise() { 
  if (!currentLesson) return;
  dbProgress = dbProgress.filter(p => p.lesson_id !== currentLesson.id); 
  showLesson(currentLesson.id); 
}

/* ══════════════════════════════════════════
   RECORDING
══════════════════════════════════════════ */
