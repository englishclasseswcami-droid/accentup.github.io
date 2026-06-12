/* ── STATE VARIABLES ── */
let currentUser=null, isLoginMode=true;
let dbModules=[], dbSubmodules=[], dbLessons=[], dbProgress=[];
let dbProfiles=[], dbRecordings=[];
let currentLesson=null, activeModuleId=null, currentViewedPostId=null;

let studentAnswers={}; let selectedDragChips={}; 
let questionRows=[], tempAudios=[], isUploadingAudio=false;
let quillEditor=null, communityQuill=null, editPostQuill=null;
let activeSound=null, openQStates={};
let mediaRecorder=null, recordingChunks=[], recordingBlob=null;
let recordingDuration=0, recordingTimer=null, recordingMaxTimer=null, currentRecordingLessonId=null;
let dbRoutine=null, dbRoutineItems=[], dbRoutineCompletions=[];
let editingRoutineStudentId=null, editRoutineRows=[];

/* ── UTILITY FUNCTIONS ── */
function safeParseJSON(d){if(Array.isArray(d))return d;if(typeof d==='string'){try{return JSON.parse(d)}catch(e){return[]}}return[]}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/'/g,'&#39;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function escapeJSArg(s){return String(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;').replace(/\n/g,'\\n').replace(/\r/g,'\\r')}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function timeAgo(d){const s=Math.floor((new Date()-new Date(d))/1000);if(s<60)return'Just now';if(s<3600)return Math.floor(s/60)+'m';if(s<86400)return Math.floor(s/3600)+'h';if(s<2592000)return Math.floor(s/86400)+'d';if(s<31536000)return Math.floor(s/2592000)+'mo';return Math.floor(s/31536000)+'y'}

function parseYtTime(tStr) {
  if(!tStr) return '';
  let t = tStr.replace('s','');
  if(t.includes('m')) { let p = t.split('m'); return ((parseInt(p[0])||0)*60 + (parseInt(p[1])||0)).toString(); }
  return t;
}
function buildYtUrl(url) {
  if (!url || !url.trim()) return '';
  let finalUrl = url.trim(); let videoId = ''; let startTime = '';
  try { 
    let u = new URL(finalUrl); 
    if (u.searchParams.has('t')) {
      let tStr = u.searchParams.get('t').replace('s','');
      if (tStr.includes('m')) { 
        let p = tStr.split('m'); 
        startTime = ((parseInt(p[0])||0)*60 + (parseInt(p[1])||0)).toString(); 
      } else { startTime = tStr; }
    }
  } catch(e){}
  if (finalUrl.includes('youtu.be/')) {
    const parts = finalUrl.split('youtu.be/')[1].split('?'); videoId = parts[0].split('&')[0];
    if (parts[1] && parts[1].includes('t=')) { const match = parts[1].match(/t=([^&]+)/); if (match) startTime = parseYtTime(match[1]); }
    finalUrl = `https://www.youtube.com/embed/${videoId}`;
  } else if (finalUrl.includes('youtube.com/watch')) {
    try { videoId = new URL(finalUrl).searchParams.get('v'); finalUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : finalUrl; } catch(e) {}
  }
  if (finalUrl.includes('youtube.com/embed/')) {
    try { const u = new URL(finalUrl); u.searchParams.delete('start'); u.searchParams.delete('end'); if (startTime) u.searchParams.set('start', startTime); return u.toString(); } catch(e) { return finalUrl; }
  }
  return finalUrl;
}
function parseYtDisplayUrl(url) {
  if (!url) return '';
  try { if (url.includes('youtube.com/embed/')) { const id = url.split('youtube.com/embed/')[1].split('?')[0]; return `https://www.youtube.com/watch?v=${id}`; } } catch(e) {}
  return url;
}

function fmtDur(s) {
  s = Math.round(s || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}


function renderAvatarHTML(userId, email) { const p = dbProfiles.find(x => x.id === userId); if (p?.avatar_url) return `<img src="${p.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`; return esc((email || '?').split('@')[0].charAt(0).toUpperCase()); }
function getDisplayName(userId, email) { const p = dbProfiles.find(x => x.id === userId); if (p?.username) return esc(p.username); if (email && email.includes('@')) return esc(email.split('@')[0]); return 'Student'; }
function calcStreak(dates) {
  if (!dates.length) return { current: 0, best: 0, activeDays: 0 };
  const unique = [...new Set(dates)].sort();
  const today = new Date(); today.setHours(0,0,0,0);
  const todayStr = today.toISOString().slice(0,10);
  const yest = new Date(today); yest.setDate(yest.getDate()-1);
  const yesterdayStr = yest.toISOString().slice(0,10);
  let current = 0;
  const lastDay = unique[unique.length-1];
  if (lastDay === todayStr || lastDay === yesterdayStr) {
    let check = lastDay === todayStr ? todayStr : yesterdayStr;
    for (let i = unique.length-1; i >= 0; i--) {
      if (unique[i] === check) { current++; const d = new Date(check); d.setDate(d.getDate()-1); check = d.toISOString().slice(0,10); }
      else if (unique[i] < check) break;
    }
  }
  let best = 1, run = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i-1]); prev.setDate(prev.getDate()+1);
    if (prev.toISOString().slice(0,10) === unique[i]) { run++; if (run > best) best = run; }
    else run = 1;
  }
  return { current, best: Math.max(best, current), activeDays: unique.length };
}

/* Sanitize rich-text HTML (e.g. Community posts) before rendering with innerHTML.
   Allows safe formatting tags from Quill (headers, bold, links, images, iframes for video)
   but strips <script>, event handlers (onclick, onerror...), and javascript: URLs. */
function sanitizeHtml(html) {
  if (typeof DOMPurify === 'undefined') return esc(html); // fail-safe: if library didn't load, escape everything
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p','br','strong','b','em','i','u','s','h1','h2','h3','ul','ol','li','a','img','iframe','blockquote','span','div'],
    ALLOWED_ATTR: ['href','src','alt','target','rel','class','width','height','frameborder','allowfullscreen','allow'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
  });
}
