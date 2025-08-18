
/* wrap everything so it doesn't leak to global */
(() => {
  // key for localStorage
  const STORAGE_KEY = 'quickcopy.cards.v1';

  // grab elements from DOM
  const grid = document.getElementById('grid');           // container for notes
  const addBtn = document.getElementById('addBtn');       // add new note button
  const clearAllBtn = document.getElementById('clearAllBtn'); // clear all notes
  const copyAllBtn = document.getElementById('copyAllBtn');
    copyAllBtn.addEventListener('click', ()=>{
    const allText = notes.map(n => n.text).join('\n\n'); // blank line between notes
    doCopy(allText);
    }); 
  const statusEl = document.getElementById('saveStatus'); // shows "Saved" / "Saving…"
  const lastSavedEl = document.getElementById('lastSaved'); // shows last saved time
  const toast = document.getElementById('toast');         // tiny popup text
  const oneClick = document.getElementById('oneClick');   // checkbox: click card to copy

  // timers + data
  let saveTimer = null; // debounce timer for saves
  let notes = [];       // list of {id, text}

  // make small id (not perfect unique but ok for this)
  function uid(){ return Math.random().toString(36).slice(2,9); }

  // load notes from localStorage at start
  function load(){
    try{
      const saved = localStorage.getItem(STORAGE_KEY);
      if(saved){
        const parsed = JSON.parse(saved);
        // support old format: array only
        if(Array.isArray(parsed)) notes = parsed;
        // new format: { notes: [...], when: number }
        else if(parsed && Array.isArray(parsed.notes)) { 
          notes = parsed.notes; 
          if(parsed.when){ 
            // show when it was saved last time
            lastSavedEl.textContent = 'Last saved: ' + new Date(parsed.when).toLocaleString(); 
          }
        }
      }
    }catch(e){ 
      // if bad json or storage blocked, just warn
      console.warn('Load failed', e); 
    }
    // if nothing there, create one empty note so UI not blank
    if(notes.length === 0) addNote('');
    // draw UI
    render();
  }

  // write to localStorage right now (no delay)
  function saveNow(){
    try{
      // save list + timestamp
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ notes, when: Date.now() }));
      statusEl.textContent = 'Saved';
      lastSavedEl.textContent = 'Last saved: ' + new Date().toLocaleString();
    }catch(e){ 
      statusEl.textContent = 'Save failed'; 
      console.error('Save failed', e); 
    }
  }

  // schedule a save a bit later (reduces spam writes)
  function scheduleSave(){
    statusEl.textContent = 'Saving…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 250); // save after 250ms idle
  }

  // add a new note at top
  function addNote(text){
    notes.unshift({ id: uid(), text: text || '' });
    scheduleSave();
    render();
  }

  // delete one note by id
  function removeNote(id){
    notes = notes.filter(n => n.id !== id);
    scheduleSave();
    render();
  }

  // move note up/down (dir = -1 or +1)
  function moveNote(id, dir){
    const i = notes.findIndex(n => n.id === id);
    if(i < 0) return;                 // not found
    const j = i + dir;
    if(j < 0 || j >= notes.length) return; // out of bounds
    const tmp = notes[i];
    notes[i] = notes[j];
    notes[j] = tmp;
    scheduleSave();
    render();
  }

  // redraw all notes
  function render(){
    grid.innerHTML = ''; // clear container
    for(const n of notes){
      // make a card for each note
      const card = document.createElement('div');
      card.className = 'note';
      card.dataset.id = n.id;
      // small header with actions + textarea body
      card.innerHTML = `
        <header>
          <div class="meta">Box</div>
          <div class="actions">
            <button class="iconbtn no-copy" data-act="copy" title="Copy">Copy</button>
            <button class="iconbtn no-copy" data-act="up" title="Move up">▲</button>
            <button class="iconbtn no-copy" data-act="down" title="Move down">▼</button>
            <button class="iconbtn no-copy" data-act="delete" title="Delete">✕</button>
          </div>
        </header>
        <textarea placeholder="Paste 1–2 sentences..." aria-label="Note">${escapeHtml(n.text)}</textarea>
        <div class="hint">Click the card to copy • Edits are auto-saved</div>
      `;
      grid.appendChild(card);
    }
  }

  // prevent HTML from breaking the page when put into textarea innerHTML
  function escapeHtml(s){
    return (s||'').replace(/[&<>"']/g, c => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      '\'':'&#39;'
    }[c]));
  }

  // --- events ---

  // typing into any textarea updates note text
  grid.addEventListener('input', (e)=>{
    if(e.target.tagName === 'TEXTAREA'){
      const id = e.target.closest('.note').dataset.id;
      const n = notes.find(n=>n.id===id);
      if(n){ 
        n.text = e.target.value; // store new value
        scheduleSave();          // save later
      }
    }
  });

  // clicks inside grid: buttons, textarea, or card
  grid.addEventListener('click', (e)=>{
    const card = e.target.closest('.note');
    if(!card) return; // clicked outside any note
    const id = card.dataset.id;

    // action buttons (copy / up / down / delete)
    if(e.target.matches('button[data-act]')){
      const act = e.target.getAttribute('data-act');
      if(act === 'copy') return copyText(id);
      if(act === 'delete') return (removeNote(id), void 0);
      if(act === 'up') return moveNote(id, -1);
      if(act === 'down') return moveNote(id, +1);
      return;
    }

    // if user clicked inside textarea, do nothing (no copy)
    if(e.target.tagName === 'TEXTAREA') return;

    // one-click copy: click anywhere on card
    if(oneClick.checked) copyText(id);
  });

  // get text by id then copy
  function copyText(id){
    const n = notes.find(x=>x.id===id);
    if(!n) return;
    doCopy(n.text);
  }

  // use clipboard API if available, fallback to execCommand
  async function doCopy(text){
    try{
      if(navigator.clipboard && window.isSecureContext){
        await navigator.clipboard.writeText(text||'');
      }else{
        // fallback: temporary textarea trick
        const ta = document.createElement('textarea');
        ta.value = text||''; 
        document.body.appendChild(ta); 
        ta.select();
        document.execCommand('copy'); 
        document.body.removeChild(ta);
      }
      showToast('Copied');
    }catch(err){ 
      console.error(err); 
      showToast('Copy failed'); 
    }
  }

  // small popup message (auto hides)
  function showToast(msg){
    toast.textContent = msg; 
    toast.classList.add('show');
    setTimeout(()=>toast.classList.remove('show'), 1100);
  }

  // add new empty note
  addBtn.addEventListener('click', ()=> addNote(''));

  // remove all notes after confirm
  clearAllBtn.addEventListener('click', ()=>{
    if(confirm('Remove all boxes? This also clears the saved copy.')){
      notes = []; 
      scheduleSave(); 
      render();
    }
  });

  // keyboard shortcut: Alt+N -> new note
  window.addEventListener('keydown', (e)=>{
    if(e.altKey && (e.key==='n' || e.key==='N')){ 
      e.preventDefault(); 
      addNote(''); 
    }
  });

  // if tab hidden or page leaving, force save now
  document.addEventListener('visibilitychange', ()=>{
    if(document.visibilityState==='hidden') saveNow(); 
  });
  window.addEventListener('beforeunload', saveNow);

  // start app
  load();
})();

