/* ══════════════════════════════════════════
   TEACHER — MODULES / SUBMODULES / LESSONS
══════════════════════════════════════════ */
async function saveModule() { const title = document.getElementById('t-mod-title').value.trim(); const editId = document.getElementById('edit-mod-id').value; const isPrivate = document.getElementById('t-mod-private').checked; const allowedEmails = document.getElementById('t-mod-emails').value.trim(); if (!title) { alert('Add a module name.'); return; } const payload = editId ? { title, is_private: isPrivate, allowed_emails: allowedEmails } : { title, order_index: dbModules.length, is_private: isPrivate, allowed_emails: allowedEmails }; const res = editId ? await sb.from('modules').update(payload).eq('id', editId) : await sb.from('modules').insert([payload]); if (res.error) { alert('Error: ' + res.error.message); return; } await fetchData(); alert(editId ? 'Module updated!' : 'Module created!'); cancelEditMod(); }
function editModule(id) { const m = dbModules.find(x => x.id === id); if (!m) return; document.getElementById('t-mod-title').value = m.title; document.getElementById('edit-mod-id').value = m.id; document.getElementById('t-mod-private').checked = m.is_private; document.getElementById('t-mod-emails-wrap').style.display = m.is_private ? 'block' : 'none'; document.getElementById('t-mod-emails').value = m.allowed_emails || ''; document.getElementById('panel-title-mod').textContent = '✏️ Edit module'; document.getElementById('btn-cancel-mod').style.display = 'inline-block'; window.scrollTo(0, 0); }
function cancelEditMod() { document.getElementById('t-mod-title').value = ''; document.getElementById('edit-mod-id').value = ''; document.getElementById('t-mod-private').checked = false; document.getElementById('t-mod-emails-wrap').style.display = 'none'; document.getElementById('t-mod-emails').value = ''; document.getElementById('panel-title-mod').textContent = '📂 Create Module'; document.getElementById('btn-cancel-mod').style.display = 'none'; }
async function deleteModule(id) { if (!confirm('Delete this module and ALL its content?')) return; await sb.from('lessons').delete().eq('module_id', id); await sb.from('submodules').delete().eq('module_id', id); await sb.from('modules').delete().eq('id', id); fetchData(); }
async function moveModule(id, dir) { const idx = dbModules.findIndex(m => m.id === id); const t = dbModules[idx + dir]; if (!t) return; await sb.from('modules').update({ order_index: t.order_index }).eq('id', id); await sb.from('modules').update({ order_index: dbModules[idx].order_index }).eq('id', t.id); fetchData(); }

async function saveSubmodule() { const title = document.getElementById('t-sub-title').value.trim(); const modId = document.getElementById('t-sub-parent').value; const editId = document.getElementById('edit-sub-id').value; if (!title || !modId) { alert('Select a module and add a name.'); return; } const orderIdx = dbSubmodules.filter(s => s.module_id === modId).length; const payload = editId ? { title, module_id: modId } : { title, module_id: modId, order_index: orderIdx }; const res = editId ? await sb.from('submodules').update(payload).eq('id', editId) : await sb.from('submodules').insert([payload]); if (res.error) { alert('Error: ' + res.error.message); return; } await fetchData(); alert(editId ? 'Subfolder updated!' : 'Subfolder created!'); cancelEditSub(); }
function editSubmodule(id) { const s = dbSubmodules.find(x => x.id === id); if (!s) return; document.getElementById('t-sub-title').value = s.title; document.getElementById('t-sub-parent').value = s.module_id; document.getElementById('edit-sub-id').value = s.id; document.getElementById('panel-title-sub').textContent = '✏️ Edit subfolder'; document.getElementById('btn-cancel-sub').style.display = 'inline-block'; window.scrollTo(0, 0); }
function cancelEditSub() { document.getElementById('t-sub-title').value = ''; document.getElementById('edit-sub-id').value = ''; document.getElementById('panel-title-sub').textContent = '📁 Create Subfolder'; document.getElementById('btn-cancel-sub').style.display = 'none'; }
async function deleteSubmodule(id) { if (!confirm('Delete this subfolder? Lessons inside will stay in the main module.')) return; await sb.from('submodules').delete().eq('id', id); fetchData(); }
async function moveSubmodule(id, dir) { const sub = dbSubmodules.find(s => s.id === id); if (!sub) return; const siblings = dbSubmodules.filter(s => s.module_id === sub.module_id); const idx = siblings.findIndex(s => s.id === id); const t = siblings[idx + dir]; if (!t) return; await sb.from('submodules').update({ order_index: t.order_index }).eq('id', id); await sb.from('submodules').update({ order_index: sub.order_index }).eq('id', t.id); fetchData(); }

function toggleLessonFields() {
  const type = document.getElementById('t-les-type').value;
  document.getElementById('fields-video').style.display  = type === 'video'  ? 'block' : 'none';
  document.getElementById('fields-embed').style.display  = type === 'embed'  ? 'block' : 'none';
  document.getElementById('fields-task').style.display   = type === 'task'   ? 'block' : 'none';
  document.getElementById('fields-text').style.display   = 'block'; // always visible
  const lbl = document.getElementById('text-field-label');
  if (lbl) lbl.textContent = type === 'text' ? 'Content' : 'Introduction / Instructions (optional — shown above the lesson)';
}
function updateModuleSelect() { const modSelect = document.getElementById('t-les-module'); const subParentSelect = document.getElementById('t-sub-parent'); const currentMod = modSelect.value; const currentParent = subParentSelect.value; const mHtml = dbModules.map(m => `<option value="${esc(m.id)}">${esc(m.title)}</option>`).join(''); modSelect.innerHTML = mHtml; subParentSelect.innerHTML = mHtml; if (currentMod && dbModules.some(m => m.id === currentMod)) modSelect.value = currentMod; if (currentParent && dbModules.some(m => m.id === currentParent)) subParentSelect.value = currentParent; updateSubfolderSelect(); }
function updateSubfolderSelect() { const modId = document.getElementById('t-les-module').value; const subSelect = document.getElementById('t-les-submodule'); const currentSub = subSelect.value; const subs = dbSubmodules.filter(s => s.module_id === modId); subSelect.innerHTML = `<option value="">-- No subfolder (main module) --</option>` + subs.map(s => `<option value="${esc(s.id)}">${esc(s.title)}</option>`).join(''); if (currentSub && subs.some(s => s.id === currentSub)) subSelect.value = currentSub; }

async function saveLesson() {
  if (isUploadingAudio) { alert('Wait for media uploads to finish.'); return; }
  const editId = document.getElementById('edit-les-id').value; const moduleId = document.getElementById('t-les-module').value; const submodId = document.getElementById('t-les-submodule').value; const type = document.getElementById('t-les-type').value; const title = document.getElementById('t-les-title').value.trim();
  if (!moduleId || !title) { alert('Fill in module and title.'); return; }
  const btn = document.getElementById('btn-save-les'); btn.disabled = true; btn.textContent = 'Saving...';

  const tablesHtml = document.getElementById('quill-tables-html')?.value || '';
  const combinedContent = quillEditor.root.innerHTML + (tablesHtml ? tablesHtml : '');
  let payload = { module_id: moduleId, submodule_id: submodId || null, type, title, content: tempAudios, text_content: combinedContent };
  if (type === 'video') { payload.video_url = buildYtUrl(document.getElementById('t-les-video-url').value.trim()); } 
  else if (type === 'embed') { payload.video_url = document.getElementById('t-les-embed-code').value.trim(); } 
  else if (type === 'task') { payload.task_type = 'mixed'; payload.task_content = questionRows; }

  const resFiles = document.getElementById('t-les-resources').files; let resources = editId ? safeParseJSON(dbLessons.find(l => l.id === editId)?.resources) : [];
  for (const f of resFiles) { const fn = `res_${Date.now()}_${f.name.replace(/\s+/g,'_')}`; const { error } = await sb.storage.from('audios').upload(fn, f); if (!error) resources.push({ name: f.name, url: sb.storage.from('audios').getPublicUrl(fn).data.publicUrl }); }
  payload.resources = resources; if (!editId) payload.order_index = dbLessons.filter(l => l.module_id === moduleId && l.submodule_id === (submodId || null)).length;

  const res = editId ? await sb.from('lessons').update(payload).eq('id', editId) : await sb.from('lessons').insert([payload]);
  btn.disabled = false; btn.textContent = 'Save lesson';
  if (res.error) { alert('Error: ' + res.error.message); return; } alert('Lesson saved!'); cancelEditLes(); await fetchData();
}

function editLesson(id) {
  const l = dbLessons.find(x => x.id === id); if (!l) return;
  document.getElementById('edit-les-id').value = l.id; document.getElementById('t-les-module').value = l.module_id; updateSubfolderSelect(); document.getElementById('t-les-submodule').value = l.submodule_id || ''; document.getElementById('t-les-type').value = l.type; document.getElementById('t-les-title').value = l.title; toggleLessonFields();
  // Separate table HTML from Quill content
  const fullHtml = l.text_content || '';
  const tempDiv = document.createElement('div'); tempDiv.innerHTML = fullHtml;
  const tables = tempDiv.querySelectorAll('table');
  let tablesHtml = ''; tables.forEach(t => { tablesHtml += t.outerHTML; t.remove(); });
  quillEditor.root.innerHTML = tempDiv.innerHTML;
  const tablesField = document.getElementById('quill-tables-html');
  if (tablesField) tablesField.value = tablesHtml;
  refreshTablesPreview();
  if (l.type === 'video') { document.getElementById('t-les-video-url').value = parseYtDisplayUrl(l.video_url); }
  if (l.type === 'embed') { document.getElementById('t-les-embed-code').value = l.video_url || ''; }
  if (l.type === 'task') {
    let raw = safeParseJSON(l.task_content);
    if (l.task_type && l.task_type !== 'mixed') { if (l.task_type === 'drag_drop') { if(raw[0]) raw[0].type = 'drag_drop'; questionRows = raw; } else { raw.forEach(r => r.type = l.task_type); questionRows = raw; } } else { questionRows = raw; }
    questionRows.forEach(q => { if(q.type === 'multiple_choice' && !q.correctIndices) { q.correctIndices = typeof q.correctIndex === 'number' ? [q.correctIndex] : [0]; } });
    openQStates = {}; if(questionRows.length > 0) openQStates[0] = true; renderQFields();
  }
  tempAudios = safeParseJSON(l.content); renderTempAudios(); const resArr = safeParseJSON(l.resources); document.getElementById('t-les-resources-current').textContent = resArr.length ? `${resArr.length} file(s) already attached` : ''; document.getElementById('panel-title-les').textContent = '✏️ Edit lesson'; document.getElementById('btn-cancel-les').style.display = 'inline-block'; window.scrollTo(0, 0);
}
function cancelEditLes() { document.getElementById('edit-les-id').value = ''; document.getElementById('t-les-title').value = ''; document.getElementById('t-les-video-url').value = ''; document.getElementById('t-les-embed-code').value = ''; document.getElementById('t-les-resources').value = ''; document.getElementById('t-les-resources-current').textContent = ''; quillEditor.root.innerHTML = ''; const tf = document.getElementById('quill-tables-html'); if (tf) tf.value = ''; refreshTablesPreview(); questionRows = []; tempAudios = []; openQStates = {}; renderQFields(); renderTempAudios(); document.getElementById('panel-title-les').textContent = '📝 Add Lesson'; document.getElementById('btn-cancel-les').style.display = 'none'; }

let sbInsertCursorIndex = null;

/* ── TABLE INSERT ── */
/* ── TABLE BUILDER ── */
let tableData = { rows: 3, cols: 3, cells: [] };

function insertQuillTable() {
  const rows = parseInt(prompt('Number of rows (including header):', '3'), 10);
  const cols = parseInt(prompt('Number of columns:', '3'), 10);
  if (!rows || !cols || rows < 1 || cols < 1 || isNaN(rows) || isNaN(cols)) return;
  tableData = { rows, cols, cells: Array.from({length: rows}, () => Array(cols).fill('')) };
  document.getElementById('table-builder-area').style.display = 'block';
  renderTableBuilder();
}

function renderTableBuilder() {
  const grid = document.getElementById('table-builder-grid'); if (!grid) return;
  let html = '<table class="tbl-builder-table"><tbody>';
  for (let r = 0; r < tableData.rows; r++) {
    html += '<tr>';
    for (let c = 0; c < tableData.cols; c++) {
      const val = (tableData.cells[r]?.[c] || '').replace(/"/g, '&quot;');
      const tag = r === 0 ? 'th' : 'td';
      html += `<${tag}><input type="text" placeholder="${r===0?'Header':'Cell'} ${c+1}" value="${val}" data-r="${r}" data-c="${c}"/></${tag}>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  grid.innerHTML = html;
  grid.querySelectorAll('input[data-r]').forEach(input => {
    input.addEventListener('input', function() {
      const r = parseInt(this.dataset.r); const c = parseInt(this.dataset.c);
      if (!tableData.cells[r]) tableData.cells[r] = [];
      tableData.cells[r][c] = this.value;
    });
  });
}

function addTableRow() {
  tableData.rows++;
  tableData.cells.push(Array(tableData.cols).fill(''));
  renderTableBuilder();
}

function addTableCol() {
  tableData.cols++;
  tableData.cells.forEach(row => row.push(''));
  renderTableBuilder();
}

function confirmTable() {
  let html = '<table><tbody>';
  for (let r = 0; r < tableData.rows; r++) {
    html += '<tr>';
    for (let c = 0; c < tableData.cols; c++) {
      const val = tableData.cells[r]?.[c] || '';
      html += r === 0 ? `<th>${val}</th>` : `<td>${val}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  const field = document.getElementById('quill-tables-html');
  field.value = (field.value || '') + html;
  document.getElementById('table-builder-area').style.display = 'none';
  refreshTablesPreview();
}

function cancelTableBuilder() {
  document.getElementById('table-builder-area').style.display = 'none';
  tableData = { rows: 3, cols: 3, cells: [] };
}

function refreshTablesPreview() {
  const field = document.getElementById('quill-tables-html');
  const preview = document.getElementById('quill-tables-preview');
  const list = document.getElementById('quill-tables-list');
  const html = field?.value || '';
  if (!html) { if (preview) preview.style.display = 'none'; return; }
  if (preview) preview.style.display = 'block';
  if (list) list.innerHTML = html;
}

function clearAllTables() {
  const field = document.getElementById('quill-tables-html');
  if (field) field.value = '';
  refreshTablesPreview();
}

function toggleSoundInsertPicker() {
  const picker = document.getElementById('sb-insert-picker');
  const isHidden = picker.style.display === 'none' || !picker.style.display;
  if (isHidden) {
    const sel = quillEditor.getSelection(); sbInsertCursorIndex = sel ? sel.index : quillEditor.getLength();
    const subId = document.getElementById('t-les-submodule').value;
    const items = dbSoundboard.filter(s => s.submodule_id === subId);
    const select = document.getElementById('sb-insert-select');
    select.innerHTML = items.length ? items.map(it => `<option value="${it.id}">${esc(it.text)}${it.ipa ? ' '+esc(it.ipa) : ''}</option>`).join('') : '<option value="">No items in this subfolder yet</option>';
    picker.style.display = 'flex';
  } else { picker.style.display = 'none'; }
}

function confirmInsertSound() {
  const select = document.getElementById('sb-insert-select'); const itemId = select.value; if (!itemId) return;
  const index = sbInsertCursorIndex ?? quillEditor.getLength();
  const token = `{{sound:${itemId}}} `;
  quillEditor.insertText(index, token); quillEditor.setSelection(index + token.length);
  document.getElementById('sb-insert-picker').style.display = 'none';
}
async function deleteLesson(id) { if (!confirm('Delete this lesson?')) return; await sb.from('lessons').delete().eq('id', id); fetchData(); }
async function moveLesson(id, dir) { const les = dbLessons.find(l => l.id === id); if (!les) return; const siblings = dbLessons.filter(l => l.module_id === les.module_id && l.submodule_id === les.submodule_id); const idx = siblings.findIndex(l => l.id === id); const t = siblings[idx + dir]; if (!t) return; await sb.from('lessons').update({ order_index: t.order_index }).eq('id', id); await sb.from('lessons').update({ order_index: les.order_index }).eq('id', t.id); fetchData(); }

/* ── SHARED AUDIOS ── */
async function addSharedAudio() { 
  const label = document.getElementById('t-audio-label').value.trim(); 
  const file = document.getElementById('t-audio-file').files[0]; 
  if (!label || !file) { alert('Add a label and choose an audio file.'); return; } 
  isUploadingAudio = true; 
  const btn = document.querySelector('button[onclick="addSharedAudio()"]') || document.getElementById('btn-add-audio');
  if (btn) { btn.disabled = true; btn.textContent = 'Uploading...'; }
  try {
    const fn = `aud_${Date.now()}_${Math.floor(Math.random()*1000)}.${file.name.split('.').pop()}`; 
    const { error } = await sb.storage.from('audios').upload(fn, file); 
    if (error) throw error;
    const url = sb.storage.from('audios').getPublicUrl(fn).data.publicUrl; 
    tempAudios.push({ label, url }); 
    document.getElementById('t-audio-label').value = ''; document.getElementById('t-audio-file').value = ''; 
    renderTempAudios(); 
  } catch(err) {
    alert('Upload error: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '+ Add'; }
    isUploadingAudio = false;
  }
}
function renderTempAudios() { document.getElementById('t-shared-audios-render').innerHTML = tempAudios.map((a,i) => `<div class="audio-saved-item"><span>🔊 ${esc(a.label)}</span><button class="danger-btn" style="padding:2px 8px;font-size:10px" onclick="tempAudios.splice(${i},1);renderTempAudios()">Remove</button></div>`).join(''); }

/* ── QUESTION BUILDER ── */
function toggleQCard(i, event) { if(event) { event.stopPropagation(); } openQStates[i] = !openQStates[i]; renderQFields(); }
function updateQVideoUrl(i, val) { if (questionRows[i]) { questionRows[i].video_url = buildYtUrl(val); } }

async function uploadQAudio(event, i) {
  const file = event.target.files[0]; if (!file) return; 
  isUploadingAudio = true;
  const el = document.getElementById('q-audio-' + i);
  if (el) el.textContent = '⏳ Uploading...';
  try {
    const fn = `qa_${Date.now()}_${Math.floor(Math.random()*1000)}.${file.name.split('.').pop()}`;
    const { error } = await sb.storage.from('audios').upload(fn, file, { upsert: false });
    if (error) throw error;
    if (questionRows[i]) questionRows[i].audio_url = sb.storage.from('audios').getPublicUrl(fn).data.publicUrl;
    if (el) el.textContent = '✅ Audio saved';
    renderQFields(); 
  } catch (err) {
    alert('Audio upload error: ' + err.message);
    if (el) el.textContent = '❌ Error';
  } finally {
    isUploadingAudio = false;
  }
}

async function uploadQVideo(event, i) {
  const file = event.target.files[0]; if (!file) return;
  isUploadingAudio = true;
  const btn = event.target; const originalOpacity = btn.style.opacity; btn.style.opacity = '0.5';
  try {
    const fn = `qv_${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await sb.storage.from('audios').upload(fn, file);
    if (error) { alert('Upload error: ' + error.message); return; }
    if (questionRows[i]) questionRows[i].video_url = sb.storage.from('audios').getPublicUrl(fn).data.publicUrl;
    const urlInput = document.getElementById(`q-vid-url-${i}`); if (urlInput) urlInput.value = '';
    renderQFields();
  } catch(err) {
    alert('Upload error: ' + err.message);
  } finally {
    isUploadingAudio = false; btn.style.opacity = originalOpacity;
  }
}

function renderQFields() { const wrap = document.getElementById('q-builder'); if (!wrap) return; wrap.innerHTML = questionRows.map((q, i) => buildQRow(q.type || 'multiple_choice', q, i)).join(''); }

function updateDndCats(i, val) { if (questionRows[i]) { questionRows[i].categories = val.split(',').map(s=>s.trim()).filter(Boolean); renderQFields(); } }
function addDndItem(i) { if (questionRows[i]) { let q = questionRows[i]; if (!q.items) q.items = []; q.items.push({ word:'', category: q.categories[0]||'' }); renderQFields(); } }
function removeDndItem(i, idx) { if (questionRows[i]) { questionRows[i].items.splice(idx,1); renderQFields(); } }
function duplicateQ(i) { const cloned = JSON.parse(JSON.stringify(questionRows[i])); questionRows.splice(i + 1, 0, cloned); openQStates[i+1] = true; renderQFields(); }
function removeQ(i) { questionRows.splice(i,1); renderQFields(); }
function updateQOption(i, j, v) { if (questionRows[i]) { questionRows[i].options[j] = v; } }
function addQOption(i) { if (questionRows[i]) { questionRows[i].options.push(''); renderQFields(); } }
function removeQOption(i, j) { if (!questionRows[i] || questionRows[i].options.length <= 2) { alert('You need at least 2 options.'); return; } questionRows[i].options.splice(j, 1); if(questionRows[i].correctIndices) { const idx = questionRows[i].correctIndices.indexOf(j); if (idx > -1) questionRows[i].correctIndices.splice(idx, 1); for(let k=0; k<questionRows[i].correctIndices.length; k++){ if(questionRows[i].correctIndices[k] > j) questionRows[i].correctIndices[k]--; } } renderQFields(); }
function toggleCorrectIndex(i, j) { if(!questionRows[i].correctIndices) questionRows[i].correctIndices = []; const idx = questionRows[i].correctIndices.indexOf(j); if (idx > -1) questionRows[i].correctIndices.splice(idx, 1); else questionRows[i].correctIndices.push(j); questionRows[i].answer = questionRows[i].correctIndices.map(index => questionRows[i].options[index]).join(' | '); }

function buildQRow(qType, q, i) {
  q = q || {};
  if (qType === 'multiple_choice') { if (!Array.isArray(q.options)) q.options = ['', '']; if (!q.correctIndices) q.correctIndices = typeof q.correctIndex === 'number' ? [q.correctIndex] : [0]; }
  const isOpen = openQStates[i] !== false; const dState = isOpen ? 'open' : ''; const toggleText = isOpen ? 'Hide' : 'Edit';
  let typeLabel = ''; let summary = '';
  
  if (qType === 'drag_drop') { typeLabel = 'Drag & Drop'; summary = q.prompt ? esc(q.prompt).substring(0, 30) + '...' : '(Empty)'; }
  else if (qType === 'drag_drop_text') { typeLabel = 'Drag & Drop (Text)'; summary = q.prompt ? esc(q.prompt).substring(0, 30) + '...' : '(Empty)'; }
  else if (qType === 'fill_in_blank') { typeLabel = 'Fill in Blank'; summary = q.prompt ? esc(q.prompt).substring(0, 30) + '...' : '(Empty)'; }
  else if (qType === 'open_answer') { typeLabel = 'Open Answer'; summary = q.prompt ? esc(q.prompt).substring(0, 30) + '...' : '(Empty)'; }
  else if (qType === 'dictation') { typeLabel = 'Dictation'; summary = q.prompt ? esc(q.prompt).substring(0, 30) + '...' : '(Empty)'; }
  else if (qType === 'short_answer') { typeLabel = 'Short Text Answer'; summary = q.prompt ? esc(q.prompt).substring(0, 30) + '...' : '(Empty)'; }
  else { typeLabel = 'Multiple Choice'; summary = q.prompt ? esc(q.prompt).substring(0, 30) + '...' : '(Empty)'; }

  let html = `<div class="q-card"><div class="q-card-header ${dState}" onclick="toggleQCard(${i})"><div><span class="q-card-title">${typeLabel}</span> <span class="q-card-summary">${summary}</span></div><div class="q-card-actions"><button class="q-card-btn-action" onclick="event.stopPropagation(); duplicateQ(${i})" title="Duplicate">📄</button><button class="q-card-btn-action delete" onclick="event.stopPropagation(); removeQ(${i})" title="Delete item">🗑️</button><button class="q-card-toggle" onclick="toggleQCard(${i}, event)">${toggleText}</button></div></div><div class="q-card-body ${dState}">`;

  if (qType === 'drag_drop') {
      const catsStr = (q.categories || []).join(', ');
      html += `<span class="field-label" style="margin-top:0">Instruction text</span><input type="text" placeholder="e.g. Sort the past tense sounds" value="${esc(q.prompt||'')}" oninput="questionRows[${i}].prompt=this.value"/><span class="field-label">Categories (comma-separated)</span><input type="text" placeholder="e.g. /t/, /d/, /id/" value="${esc(catsStr)}" onchange="updateDndCats(${i}, this.value)"/><span class="field-label">Words to sort</span><div id="dnd-items-wrap-${i}">`;
      (q.items || []).forEach((item, idx) => { html += `<div style="display:flex;gap:8px;margin-bottom:8px"><input type="text" placeholder="Word" value="${esc(item.word)}" oninput="questionRows[${i}].items[${idx}].word=this.value" style="flex:2;margin:0"/><select style="flex:1;margin:0" onchange="questionRows[${i}].items[${idx}].category=this.value">`; (q.categories || []).forEach(c => { html += `<option value="${esc(c)}" ${item.category===c?'selected':''}>${esc(c)}</option>`; }); html += `</select><button class="q-card-delete" style="background:var(--bg); border-radius:4px; padding:0 8px;" onclick="removeDndItem(${i}, ${idx})">×</button></div>`; });
      html += `</div><button class="secondary-btn" style="padding:6px;font-size:12px;margin-top:8px" onclick="addDndItem(${i})">+ Add word</button>`;
  }
  else if (qType === 'drag_drop_text') {
      html += `<span class="field-label" style="margin-top:0">Text/Sentence (Use brackets [ ] for draggable words)</span><textarea placeholder="e.g. She [works] at the hospital every Sunday." oninput="questionRows[${i}].prompt=this.value" style="min-height:90px">${esc(q.prompt||'')}</textarea><span class="field-label" style="color:var(--text-muted); font-weight:normal; text-transform:none">The blank boxes and draggable buttons will be created automatically where you put the brackets.</span>`;
  }
  else if (qType === 'fill_in_blank') {
    html += `<span class="field-label" style="margin-top:0">Text/Sentence (Use brackets [ ] for the correct answers)</span><textarea placeholder="e.g. She [works] (work) at the hospital every Sunday and [has] (have) free days." oninput="questionRows[${i}].prompt=this.value">${esc(q.prompt||'')}</textarea><span class="field-label" style="color:var(--text-muted); font-weight:normal; text-transform:none">The blank inputs will be created automatically where you put the brackets.</span><span class="field-label" style="margin-top:10px">Hint (optional)</span><input type="text" placeholder="e.g. Simple present tense" value="${esc(q.hint||'')}" oninput="questionRows[${i}].hint=this.value"/>`;
    if (!(q.prompt || '').includes('[') && q.answer) { html += `<span class="field-label" style="color:var(--red)">Legacy format detected: Please update this question to use brackets [answer] inside the text above.</span><input type="text" placeholder="Correct answer" value="${esc(q.answer||'')}" oninput="questionRows[${i}].answer=this.value"/>`; }
  } 
  else if (qType === 'dictation' || qType === 'open_answer') {
    const label = qType === 'open_answer' ? 'Expected answer / keywords (shown to student after submitting)' : 'Expected answer (for correction)';
    html += `<span class="field-label" style="margin-top:0">Instruction for student</span><textarea placeholder="Write the instruction or question here..." oninput="questionRows[${i}].prompt=this.value">${esc(q.prompt||'')}</textarea><span class="field-label">${label}</span><textarea placeholder="e.g. /ɪ/ — the vowel is short and relaxed" oninput="questionRows[${i}].answer=this.value">${esc(q.answer||'')}</textarea>`;
  }
  else if (qType === 'short_answer') {
    html += `<span class="field-label" style="margin-top:0">Question prompt</span><textarea placeholder="e.g. Write the word that contains the short /ɪ/ sound." oninput="questionRows[${i}].prompt=this.value">${esc(q.prompt||'')}</textarea><span class="field-label">Expected answer (optional — leave blank for free writing)</span><input type="text" placeholder="e.g. bit" value="${esc(q.answer||'')}" oninput="questionRows[${i}].answer=this.value"/>`;
  } 
  else {
    const opts = q.options || ['', '']; const correctIndices = q.correctIndices || [0];
    html += `<span class="field-label" style="margin-top:0">Question prompt</span><textarea placeholder="Write the question here..." oninput="questionRows[${i}].prompt=this.value" style="margin-bottom:12px">${esc(q.prompt||'')}</textarea><span class="field-label">Options (Check the boxes for the correct answers)</span>`;
    opts.forEach((o, j) => {
      const isCorrect = correctIndices.includes(j); const borderCol = isCorrect ? 'var(--green)' : 'var(--border)';
      html += `<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;background:var(--bg);padding:6px 10px;border-radius:var(--radius-sm);border:1px solid ${borderCol}"><input type="checkbox" value="${j}" ${isCorrect?'checked':''} onchange="toggleCorrectIndex(${i}, ${j})" title="Mark as correct" style="margin:0;width:16px;height:16px;accent-color:var(--green);cursor:pointer"><input type="text" placeholder="Answer option ${j+1}" value="${esc(o)}" oninput="updateQOption(${i},${j},this.value)" style="margin:0;flex:1;border:none;background:transparent"><button class="q-card-delete" onclick="removeQOption(${i},${j})">×</button></div>`;
    });
    html += `<button class="secondary-btn" style="font-size:11px;padding:6px 10px;margin-bottom:8px" onclick="addQOption(${i})">+ Add option</button>`;
  }
  
  let parts = { url: q.video_url && !q.video_url.includes('supabase.co') ? parseYtDisplayUrl(q.video_url) : '' };
  let mediaHtml = `<div style="background:var(--skool-hover); border-radius:var(--radius-sm); padding:12px; margin-top:16px; border:1px dashed var(--border)"><span class="field-label" style="margin-top:0; margin-bottom:10px;">Media for this question (optional)</span><div style="margin-bottom:12px"><span style="font-size:12px; font-weight:600; color:var(--text); display:block; margin-bottom:4px;">🎧 Audio (Upload MP3)</span><input type="file" accept="audio/*" onchange="uploadQAudio(event,${i})" style="margin-bottom:4px; padding:6px; font-size:12px;"/><div id="q-audio-${i}" style="font-size:11px;color:var(--brand-mid); font-weight:600;">${q.audio_url?`✅ Audio saved <br><audio controls src="${esc(q.audio_url)}" style="height:30px; margin-top:5px;"></audio>`:''}</div></div><div><span style="font-size:12px; font-weight:600; color:var(--text); display:block; margin-bottom:4px;">📺 Video (YouTube Link OR Upload MP4)</span><div style="display:flex;gap:8px;align-items:center;margin-bottom:4px;flex-wrap:wrap"><input type="url" id="q-vid-url-${i}" placeholder="YouTube URL..." value="${parts.url ? esc(parts.url) : ''}" oninput="updateQVideoUrl(${i}, this.value)" style="margin:0;flex:2;min-width:180px; padding:6px; font-size:12px;"/><span style="font-size:11px;color:var(--text-muted);font-weight:700">OR</span><input type="file" accept="video/*" onchange="uploadQVideo(event,${i})" style="margin:0;flex:2;min-width:180px; padding:6px; font-size:12px"/></div><div id="q-video-${i}" style="font-size:11px;color:var(--brand-mid); font-weight:600;">${q.video_url?'✅ Video saved':''}</div></div></div>`;
  const noteHtml = `<div style="background:#FFFDF0;border:1px dashed #F5A623;border-radius:var(--radius-sm);padding:10px;margin-top:12px"><span class="field-label" style="margin-top:0;color:#8a6500">💬 Teacher's note (shown to student after submitting)</span><textarea placeholder="Optional: explain why the answer is correct, give a pronunciation tip, etc." oninput="questionRows[${i}].teacher_note=this.value" style="min-height:60px;font-size:13px;margin:0;background:#fff">${esc(q.teacher_note||'')}</textarea></div>`;
  html += mediaHtml + noteHtml + `</div></div>`; return html;
}

function addQuestion(type) {
  let newQ;
  if (type === 'drag_drop') newQ = { type: 'drag_drop', prompt: '', categories: [], items: [], audio_url: '', video_url: '' };
  else if (type === 'fill_in_blank') newQ = { type: 'fill_in_blank', prompt: '', answer: '', hint: '', audio_url: '', video_url: '' };
  else if (type === 'short_answer') newQ = { type: 'short_answer', prompt: '', answer: '', audio_url: '', video_url: '' };
  else if (type === 'dictation' || type === 'open_answer') newQ = { type: type, prompt: '', answer: '', audio_url: '', video_url: '' };
  else if (type === 'drag_drop_text') newQ = { type: 'drag_drop_text', prompt: '', audio_url: '', video_url: '' };
  else newQ = { type: 'multiple_choice', prompt: '', options: ['', ''], correctIndices: [0], answer: '', audio_url: '', video_url: '' };
  questionRows.push(newQ); Object.keys(openQStates).forEach(k => openQStates[k] = false); openQStates[questionRows.length - 1] = true; renderQFields();
}

function switchTTab(name, btn) {
  document.querySelectorAll('.t-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.t-tab-panel').forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.getElementById('t-tab-' + name)?.classList.add('active');
  if (name === 'les') { updateModuleSelect(); updateSubfolderSelect(); }
  if (name === 'routine') renderTeacherRoutineTab();
  if (name === 'students') renderStudentsTab();
  if (name === 'soundboard') renderSoundboardTab();
}

/* ══════════════════════════════════════════
   STUDENT APPROVAL
══════════════════════════════════════════ */
function renderStudentsTab() {
  const pendingEl  = document.getElementById('students-pending-list');
  const approvedEl = document.getElementById('students-approved-list');
  if (!pendingEl || !approvedEl) return;
  const students = dbProfiles.filter(p => p.id !== currentUser?.id);
  const pending  = students.filter(s => s.approved === false);
  const approved = students.filter(s => s.approved !== false);

  pendingEl.innerHTML = pending.length
    ? pending.map(s => `
      <div class="streak-stu-row" style="cursor:default">
        <div class="post-avatar" style="width:30px;height:30px;font-size:12px;flex-shrink:0">${renderAvatarHTML(s.id, s.username||'Student')}</div>
        <span class="streak-stu-name">${esc(s.username||'Unnamed')}</span>
        <button class="primary-btn" style="margin:0;padding:6px 16px;width:auto;font-size:12px" onclick="approveStudent('${s.id}')">✅ Approve</button>
      </div>`).join('')
    : `<div style="color:var(--text-light);font-size:13px;padding:.5rem 0">No pending sign-ups.</div>`;

  approvedEl.innerHTML = approved.length
    ? approved.map(s => `
      <div class="streak-stu-row" style="cursor:default">
        <div class="post-avatar" style="width:30px;height:30px;font-size:12px;flex-shrink:0">${renderAvatarHTML(s.id, s.username||'Student')}</div>
        <span class="streak-stu-name">${esc(s.username||'Unnamed')}</span>
        <button class="outline-btn" style="margin:0;padding:5px 14px;font-size:11px" onclick="revokeStudent('${s.id}')">Revoke access</button>
      </div>`).join('')
    : `<div style="color:var(--text-light);font-size:13px;padding:.5rem 0">No approved students yet.</div>`;

  updatePendingBadge();
}

function updatePendingBadge() {
  const badge = document.getElementById('pending-badge');
  if (!badge) return;
  const count = dbProfiles.filter(p => p.id !== currentUser?.id && p.approved === false).length;
  if (count > 0) { badge.textContent = count; badge.style.display = 'inline-block'; }
  else { badge.style.display = 'none'; }
}

async function approveStudent(studentId) {
  const { error } = await sb.from('user_profiles').update({ approved: true }).eq('id', studentId);
  if (error) { alert('Error: ' + error.message); return; }
  const p = dbProfiles.find(x => x.id === studentId); if (p) p.approved = true;
  renderStudentsTab();
}

async function revokeStudent(studentId) {
  if (!confirm('This student will lose access to lessons until approved again. Continue?')) return;
  const { error } = await sb.from('user_profiles').update({ approved: false }).eq('id', studentId);
  if (error) { alert('Error: ' + error.message); return; }
  const p = dbProfiles.find(x => x.id === studentId); if (p) p.approved = false;
  renderStudentsTab();
}

function toggleAcc(bodyId, chevronId) {
  const body = document.getElementById(bodyId);
  const chev = document.getElementById(chevronId);
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  chev.classList.toggle('open', !isOpen);
}

function renderManageList() {
  const list = document.getElementById('t-manage-list');
  if (!list) return;
  if (!dbModules.length) {
    list.innerHTML = '<div style="color:var(--text-light);font-size:13px;padding:1rem 0;text-align:center">No content yet.</div>';
    return;
  }
  const iconMap = { video:'📺', text:'📄', task:'📝', embed:'🌐' };
  const btnS = 'background:none;border:1px solid var(--border);border-radius:4px;padding:2px 7px;font-size:11px;cursor:pointer;color:var(--text-muted)';
  const delS = 'background:none;border:1px solid #ffb3b3;border-radius:4px;padding:2px 7px;font-size:11px;cursor:pointer;color:#e05252';

  let html = '';
  dbModules.forEach((m) => {
    const mLessons  = dbLessons.filter(l => l.module_id === m.id);
    const mSubs     = dbSubmodules.filter(s => s.module_id === m.id);
    const privBadge = m.is_private ? ' <span style="font-size:10px;background:var(--brand);color:#fff;padding:1px 6px;border-radius:99px">Private</span>' : '';
    const bodyId  = `acc-mod-body-${m.id}`;
    const chevId  = `acc-mod-chev-${m.id}`;
    const lesCount = mLessons.length;

    html += `
    <div style="border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:8px;overflow:hidden">
      <div class="acc-header" onclick="toggleAcc('${bodyId}','${chevId}')">
        <span class="acc-header-label">📂 ${esc(m.title)}${privBadge} <span style="font-size:11px;font-weight:400;color:var(--text-muted)">${lesCount} lesson${lesCount!==1?'s':''}</span></span>
        <div style="display:flex;align-items:center;gap:5px" onclick="event.stopPropagation()">
          <button style="${btnS}" onclick="moveModule('${esc(m.id)}',-1)">▲</button>
          <button style="${btnS}" onclick="moveModule('${esc(m.id)}',1)">▼</button>
          <button style="${btnS}" onclick="editModule('${esc(m.id)}');switchTTab('mod',document.querySelector('.t-tab-btn'))">✏️</button>
          <button style="${delS}" onclick="deleteModule('${esc(m.id)}')">🗑</button>
          <span class="acc-chevron" id="${chevId}">▼</span>
        </div>
      </div>
      <div class="acc-body" id="${bodyId}">`;

    mSubs.forEach(s => {
      const subLessons = mLessons.filter(l => l.submodule_id === s.id);
      const sBodyId = `acc-sub-body-${s.id}`;
      const sChevId = `acc-sub-chev-${s.id}`;
      html += `
        <div style="border-top:1px solid var(--border)">
          <div class="acc-header" style="border-radius:0;background:var(--surface);padding:7px 12px 7px 20px" onclick="toggleAcc('${sBodyId}','${sChevId}')">
            <span class="acc-header-label" style="font-size:12px;font-weight:600;color:var(--text-muted)">📁 ${esc(s.title)} <span style="font-weight:400">${subLessons.length} lesson${subLessons.length!==1?'s':''}</span></span>
            <div style="display:flex;align-items:center;gap:5px" onclick="event.stopPropagation()">
              <button style="${btnS}" onclick="moveSubmodule('${esc(s.id)}',-1)">▲</button>
              <button style="${btnS}" onclick="moveSubmodule('${esc(s.id)}',1)">▼</button>
              <button style="${btnS}" onclick="editSubmodule('${esc(s.id)}');switchTTab('sub',document.querySelectorAll('.t-tab-btn')[1])">✏️</button>
              <button style="${delS}" onclick="deleteSubmodule('${esc(s.id)}')">🗑</button>
              <span class="acc-chevron" id="${sChevId}">▼</span>
            </div>
          </div>
          <div class="acc-body" id="${sBodyId}">`;
      subLessons.forEach(l => {
        html += `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:5px 12px 5px 32px;border-top:1px dashed var(--border);background:var(--surface)">
          <span style="font-size:12px;color:var(--text)">${iconMap[l.type]||'📄'} ${esc(l.title)}</span>
          <div style="display:flex;gap:4px">
            <button style="${btnS}" onclick="moveLesson('${esc(l.id)}',-1)">▲</button>
            <button style="${btnS}" onclick="moveLesson('${esc(l.id)}',1)">▼</button>
            <button style="${btnS}" onclick="editLesson('${esc(l.id)}');switchTTab('les',document.querySelectorAll('.t-tab-btn')[2])">✏️</button>
            <button style="${delS}" onclick="deleteLesson('${esc(l.id)}')">🗑</button>
          </div></div>`;
      });
      html += `</div></div>`;
    });

    const orphans = mLessons.filter(l => !l.submodule_id);
    orphans.forEach(l => {
      html += `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:5px 12px 5px 20px;border-top:1px dashed var(--border);background:var(--surface)">
        <span style="font-size:12px;color:var(--text)">${iconMap[l.type]||'📄'} ${esc(l.title)}</span>
        <div style="display:flex;gap:4px">
          <button style="${btnS}" onclick="moveLesson('${esc(l.id)}',-1)">▲</button>
          <button style="${btnS}" onclick="moveLesson('${esc(l.id)}',1)">▼</button>
          <button style="${btnS}" onclick="editLesson('${esc(l.id)}');switchTTab('les',document.querySelectorAll('.t-tab-btn')[2])">✏️</button>
          <button style="${delS}" onclick="deleteLesson('${esc(l.id)}')">🗑</button>
        </div></div>`;
    });

    if (!mSubs.length && !mLessons.length) {
      html += `<div style="padding:8px 20px;font-size:12px;color:var(--text-muted);border-top:1px solid var(--border)">No lessons yet.</div>`;
    }

    html += `</div></div>`;
  });

  list.innerHTML = html;
}


/* ══════════════════════════════════════════
   SOUNDBOARD MANAGER (Teacher)
══════════════════════════════════════════ */
function renderSoundboardTab() {
  const modSel = document.getElementById('sb-module-select'); if (!modSel) return;
  const prevMod = modSel.value;
  modSel.innerHTML = '<option value="">— Select a module —</option>' + dbModules.map(m => `<option value="${esc(m.id)}">${esc(m.title)}</option>`).join('');
  if (prevMod && dbModules.some(m => m.id === prevMod)) modSel.value = prevMod;
  updateSoundboardSubfolderSelect();
}

function updateSoundboardSubfolderSelect() {
  const modId = document.getElementById('sb-module-select').value;
  const subSel = document.getElementById('sb-submodule-select');
  const prevSub = subSel.value;
  const subs = dbSubmodules.filter(s => s.module_id === modId);
  subSel.innerHTML = '<option value="">— Select a subfolder —</option>' + subs.map(s => `<option value="${esc(s.id)}">${esc(s.title)}</option>`).join('');
  if (prevSub && subs.some(s => s.id === prevSub)) subSel.value = prevSub;
  renderSoundboardManager();
}

function renderSoundboardManager() {
  const subId = document.getElementById('sb-submodule-select').value;
  const area = document.getElementById('soundboard-manager-area');
  if (!subId) { area.style.display = 'none'; return; }
  area.style.display = 'block';
  const list = document.getElementById('soundboard-items-list');
  const items = dbSoundboard.filter(s => s.submodule_id === subId);
  list.innerHTML = items.length ? items.map(item => `
    <div class="sb-manage-row" id="sb-row-${item.id}">
      <input type="text" id="sb-text-${item.id}" value="${esc(item.text)}" placeholder="word / phrase" oninput="markSoundboardDirty('${item.id}')"/>
      <input type="text" id="sb-ipa-${item.id}" class="sb-ipa-input" value="${esc(item.ipa||'')}" placeholder="/ipa/" oninput="markSoundboardDirty('${item.id}')"/>
      ${item.audio_url ? `<audio controls src="${esc(item.audio_url)}"></audio>` : `<span class="sb-audio-label">No audio yet</span>`}
      <input type="file" accept="audio/*" style="font-size:11px;max-width:130px" onchange="uploadSoundboardAudio(event,'${item.id}')"/>
      <button class="primary-btn" id="sb-save-${item.id}" onclick="saveSoundboardItem('${item.id}')" style="margin:0;padding:7px 14px;font-size:12px;width:auto;opacity:.4" disabled>💾 Save</button>
      <button class="q-card-delete" onclick="deleteSoundboardItem('${item.id}')">×</button>
    </div>`).join('') : `<div style="color:var(--text-light);font-size:13px;padding:.5rem 0">No items yet. Paste rows above to get started.</div>`;
}

function markSoundboardDirty(itemId) {
  const btn = document.getElementById('sb-save-' + itemId);
  if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.textContent = '💾 Save'; }
}

async function saveSoundboardItem(itemId) {
  const text = document.getElementById('sb-text-' + itemId).value.trim();
  const ipa = document.getElementById('sb-ipa-' + itemId).value.trim();
  const btn = document.getElementById('sb-save-' + itemId);
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving...'; }
  const { error } = await sb.from('soundboard_items').update({ text, ipa }).eq('id', itemId);
  if (error) { alert('Error saving: ' + error.message); if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.textContent = '💾 Save'; } return; }
  const item = dbSoundboard.find(s => s.id === itemId); if (item) { item.text = text; item.ipa = ipa; }
  if (btn) { btn.textContent = '✅ Saved!'; btn.style.opacity = '.4'; setTimeout(() => { if (btn) btn.textContent = '💾 Save'; }, 1800); }
}

async function bulkAddSoundboardItems() {
  const subId = document.getElementById('sb-submodule-select').value; if (!subId) return;
  const raw = document.getElementById('sb-bulk-paste').value;
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return;
  const maxOrder = dbSoundboard.filter(s => s.submodule_id === subId).reduce((max, s) => Math.max(max, s.order_index || 0), -1);
  const rows = lines.map((line, idx) => {
    const cols = line.split('\t');
    return { submodule_id: subId, text: (cols[0]||'').trim(), ipa: (cols[1]||'').trim(), order_index: maxOrder + 1 + idx };
  }).filter(r => r.text);
  if (!rows.length) return;
  const { data, error } = await sb.from('soundboard_items').insert(rows).select();
  if (error) { alert('Error adding items: ' + error.message); return; }
  dbSoundboard.push(...(data || []));
  document.getElementById('sb-bulk-paste').value = '';
  renderSoundboardManager();
}

async function uploadSoundboardAudio(event, itemId) {
  const file = event.target.files[0]; if (!file) return;
  const fn = `sb_${itemId}_${Date.now()}.${file.name.split('.').pop()}`;
  const { error: upErr } = await sb.storage.from('audios').upload(fn, file);
  if (upErr) { alert('Upload error: ' + upErr.message); return; }
  const url = sb.storage.from('audios').getPublicUrl(fn).data.publicUrl;
  const { error } = await sb.from('soundboard_items').update({ audio_url: url }).eq('id', itemId);
  if (error) { alert('Error saving: ' + error.message); return; }
  const item = dbSoundboard.find(s => s.id === itemId); if (item) item.audio_url = url;
  renderSoundboardManager();
}

async function deleteSoundboardItem(itemId) {
  if (!confirm('Delete this item?')) return;
  const { error } = await sb.from('soundboard_items').delete().eq('id', itemId);
  if (error) { alert('Error: ' + error.message); return; }
  dbSoundboard = dbSoundboard.filter(s => s.id !== itemId);
  renderSoundboardManager();
}
