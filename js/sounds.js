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
