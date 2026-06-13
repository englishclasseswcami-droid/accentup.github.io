function showRecView(state) {
  ['idle','active','done','saved'].forEach(s => {
    const el = document.getElementById(`rec-${s}-view`);
    if (el) el.style.display = s === state ? 'block' : 'none';
  });
}

function initRecordingPanel(lessonId) {
  currentRecordingLessonId = lessonId;
  recordingBlob = null; recordingDuration = 0;
  clearInterval(recordingTimer); clearTimeout(recordingMaxTimer);
  const existing = dbRecordings.find(r => r.lesson_id === lessonId);
  const prevLbl = document.getElementById('rec-prev-label');
  const totalSecs = dbRecordings.reduce((a, r) => a + (r.duration_seconds || 0), 0);
  const totalLbl = document.getElementById('rec-total-label');
  if (existing) {
    const savedAudio = document.getElementById('rec-saved-audio');
    if (savedAudio) savedAudio.src = existing.url;
    if (prevLbl) prevLbl.textContent = `Last: ${fmtDur(existing.duration_seconds)}`;
    if (totalLbl && totalSecs > 0) totalLbl.textContent = `🎙 ${fmtDur(totalSecs)} total`;
    showRecView('saved');
  } else {
    if (prevLbl) prevLbl.textContent = '';
    if (totalLbl) totalLbl.textContent = '';
    showRecView('idle');
  }
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = ['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/mp4']
      .find(t => { try { return MediaRecorder.isTypeSupported(t); } catch(e) { return false; } }) || '';
    mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    recordingChunks = [];
    mediaRecorder.ondataavailable = e => { if (e.data && e.data.size > 0) recordingChunks.push(e.data); };
    mediaRecorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      const type = mediaRecorder.mimeType || 'audio/webm';
      recordingBlob = new Blob(recordingChunks, { type });
      const url = URL.createObjectURL(recordingBlob);
      const pb = document.getElementById('rec-playback');
      if (pb) pb.src = url;
      showRecView('done');
    };
    mediaRecorder.start(100);
    const startTime = Date.now();
    recordingDuration = 0;
    const timerEl = document.getElementById('rec-timer');
    if (timerEl) timerEl.textContent = '0:00';
    clearInterval(recordingTimer);
    clearTimeout(recordingMaxTimer);
    recordingTimer = setInterval(() => {
      recordingDuration = Math.floor((Date.now() - startTime) / 1000);
      if (timerEl) timerEl.textContent = fmtDur(recordingDuration);
    }, 500);
    recordingMaxTimer = setTimeout(() => stopRecording(), 5 * 60 * 1000); // 5-min max
    showRecView('active');
  } catch(err) {
    alert('Could not access microphone. Please allow microphone permission in your browser and try again.');
  }
}

function stopRecording() {
  clearInterval(recordingTimer);
  clearTimeout(recordingMaxTimer);
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
}

function retakeRecording() {
  clearInterval(recordingTimer);
  clearTimeout(recordingMaxTimer);
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  recordingBlob = null; recordingDuration = 0;
  const pb = document.getElementById('rec-playback');
  if (pb) pb.src = '';
  showRecView('idle');
}

async function saveRecording() {
  if (!recordingBlob || !currentRecordingLessonId || !currentUser) return;
  const btn = document.getElementById('rec-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving...'; }
  try {
    const mType = recordingBlob.type || '';
    const ext = mType.includes('mp4') ? 'mp4' : mType.includes('ogg') ? 'ogg' : 'webm';
    const filename = `rec_${currentUser.id}_${currentRecordingLessonId}.${ext}`;
    const { error: upErr } = await sb.storage.from('audios').upload(filename, recordingBlob, {
      upsert: true, contentType: recordingBlob.type
    });
    if (upErr) throw upErr;
    const url = sb.storage.from('audios').getPublicUrl(filename).data.publicUrl;
    const { error: dbErr } = await sb.from('recordings').upsert({
      user_id: currentUser.id, lesson_id: currentRecordingLessonId,
      url, duration_seconds: recordingDuration
    }, { onConflict: 'user_id,lesson_id' });
    if (dbErr) throw dbErr;
    // Update local cache
    const rec = { user_id: currentUser.id, lesson_id: currentRecordingLessonId, url, duration_seconds: recordingDuration, created_at: new Date().toISOString() };
    const idx = dbRecordings.findIndex(r => r.lesson_id === currentRecordingLessonId);
    if (idx > -1) dbRecordings[idx] = rec; else dbRecordings.push(rec);
    const savedAudio = document.getElementById('rec-saved-audio');
    if (savedAudio) savedAudio.src = url;
    const prevLbl = document.getElementById('rec-prev-label');
    if (prevLbl) prevLbl.textContent = `Last: ${fmtDur(recordingDuration)}`;
    const totalSecs = dbRecordings.reduce((a, r) => a + (r.duration_seconds || 0), 0);
    const totalLbl = document.getElementById('rec-total-label');
    if (totalLbl) totalLbl.textContent = `🎙 ${fmtDur(totalSecs)} total`;
    showRecView('saved');
  } catch(err) {
    alert('Error saving recording: ' + err.message);
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save recording'; }
  }
}


function toggleRecPanel() {
  document.getElementById('recording-panel')?.classList.toggle('collapsed');
}
