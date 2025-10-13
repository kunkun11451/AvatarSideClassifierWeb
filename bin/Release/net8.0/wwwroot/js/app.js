// 可选：拼音库（CDN），加载失败则退化到中文名包含搜索
(function(){
  var s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/npm/pinyin-pro@3.19.8/dist/index.iife.min.js';
  s.defer=true; document.head.appendChild(s);
})();

const fileEl = document.getElementById('file');
const out = document.getElementById('out');
const canvasWrap = document.getElementById('canvasWrap');
const imgPrev = document.getElementById('imgPrev');
// Settings modal controls
const myPSelect = document.getElementById('myPSelect');
const resetRecords = document.getElementById('resetRecords');
const settingsModal = document.getElementById('settingsModal');
const saveSettings = document.getElementById('saveSettings');
const closeSettings = document.getElementById('closeSettings');
// Calibration modal controls
const openCalibrate = document.getElementById('openCalibrate');
const calibModal = document.getElementById('calibModal');
const calibFile = document.getElementById('calibFile');
const saveCalib = document.getElementById('saveCalib');
const clearCalib = document.getElementById('clearCalib');
const closeCalib = document.getElementById('closeCalib');
const roundSlots = document.getElementById('roundSlots');
const roundTip = document.getElementById('roundTip');
const picker = document.getElementById('picker');
const pickerGrid = document.getElementById('pickerGrid');
const closePicker = document.getElementById('closePicker');
const searchInput = document.getElementById('searchInput');
const eleChips = document.getElementById('eleChips');
const wpnChips = document.getElementById('wpnChips');

// 4 个矩形的归一化配置 [0..1]
let rects = [
  { x: 0.79, y: 0.13, w: 0.115, h: 0.205 },
  { x: 0.79, y: 0.34, w: 0.115, h: 0.205 },
  { x: 0.79, y: 0.55, w: 0.115, h: 0.205 },
  { x: 0.79, y: 0.76, w: 0.115, h: 0.205 },
];

function loadRects() {
  const s = localStorage.getItem('avatarSideRects');
  if (s) { try { const r = JSON.parse(s); if (Array.isArray(r) && r.length === 4) rects = r; } catch {} }
}
function saveRects() { localStorage.setItem('avatarSideRects', JSON.stringify(rects)); }
function clearRects() { localStorage.removeItem('avatarSideRects'); loadRects(); }
loadRects();

// 会话状态（不持久化）
let myP = '';
let bpMode = '';
let rounds = [];
let usedBy = { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set() };
let usedGlobal = new Set();

function canRunRecognition() {
  const hasRects = !!localStorage.getItem('avatarSideRects');
  return hasRects && myP && bpMode;
}
function resetSession(showSettings=true) {
  rounds = [];
  usedBy = { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set() };
  usedGlobal = new Set();
  myP = '';
  bpMode = '';
  renderRoundPanel([]);
  roundTip.textContent = '请先选择“我是谁(P)”与“BP模式”，并完成校准。';
  if (showSettings) openSettingsModal();
}
resetRecords.addEventListener('click', ()=> resetSession(true));

function openSettingsModal(){
  settingsModal.style.display = 'flex';
}
function closeSettingsModal(){
  settingsModal.style.display = 'none';
}
saveSettings.addEventListener('click', ()=>{
  const mp = myPSelect.value;
  const bm = document.querySelector('input[name="bpMode"]:checked')?.value || '';
  if (!mp || !bm){ roundTip.textContent = '请完整选择 我是谁(P) 与 BP 模式'; return; }
  myP = mp; bpMode = bm; roundTip.textContent = '';
  closeSettingsModal();
});
closeSettings.addEventListener('click', closeSettingsModal);
settingsModal.addEventListener('click', (e)=>{ if (e.target===settingsModal) closeSettingsModal(); });

let currentFile = null;

function showImageInEditor(url) {
  imgPrev.src = url;
  canvasWrap.classList.remove('hidden');
  imgPrev.onload = () => positionRects();
}

function positionRects() {
  const W = canvasWrap.clientWidth;
  const H = canvasWrap.clientHeight;
  const els = canvasWrap.querySelectorAll('.rect');
  els.forEach(el => {
    const idx = parseInt(el.getAttribute('data-idx'));
    const r = rects[idx];
    el.style.left = (r.x * W) + 'px';
    el.style.top = (r.y * H) + 'px';
    el.style.width = (r.w * W) + 'px';
    el.style.height = (r.h * H) + 'px';
    el.style.display = editing ? 'block' : 'none';
  });
}

let editing = false;
let active = null; // { idx, type, startX, startY, startRect, W, H }
function bindEditorEvents() {
  canvasWrap.addEventListener('mousedown', (e) => {
    if (!editing) return;
    const target = e.target;
    const rectEl = target.closest('.rect');
    if (!rectEl) return;
    const idx = parseInt(rectEl.getAttribute('data-idx'));
    let type = 'move';
    if (target.classList.contains('handle')) {
      if (target.classList.contains('nw')) type = 'nw';
      else if (target.classList.contains('ne')) type = 'ne';
      else if (target.classList.contains('sw')) type = 'sw';
      else if (target.classList.contains('se')) type = 'se';
    }
    const W = canvasWrap.clientWidth, H = canvasWrap.clientHeight;
    active = { idx, type, startX: e.clientX, startY: e.clientY, startRect: { ...rects[idx] }, W, H };
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!active) return;
    const dx = (e.clientX - active.startX) / active.W;
    const dy = (e.clientY - active.startY) / active.H;
    let r = { ...active.startRect };
    if (active.type === 'move') { r.x += dx; r.y += dy; }
    else if (active.type === 'nw') { r.x += dx; r.y += dy; r.w -= dx; r.h -= dy; }
    else if (active.type === 'ne') { r.y += dy; r.w += dx; r.h -= dy; }
    else if (active.type === 'sw') { r.x += dx; r.w -= dx; r.h += dy; }
    else if (active.type === 'se') { r.w += dx; r.h += dy; }
    r.w = Math.max(0.02, Math.min(1 - r.x, r.w));
    r.h = Math.max(0.02, Math.min(1 - r.y, r.h));
    r.x = Math.max(0, Math.min(1 - r.w, r.x));
    r.y = Math.max(0, Math.min(1 - r.h, r.y));
    rects[active.idx] = r;
    positionRects();
  });
  window.addEventListener('mouseup', () => { active = null; });
  window.addEventListener('resize', () => positionRects());
}
bindEditorEvents();

fileEl.addEventListener('change', async () => {
  const f = fileEl.files?.[0];
  if (!f) return;
  currentFile = f;
  await startRecognition(f);
});

window.addEventListener('paste', async (e) => {
  const items = e.clipboardData?.items || [];
  for (const it of items) {
    if (it.kind === 'file' && it.type.startsWith('image/')) {
      const blob = it.getAsFile();
      if (blob) {
        currentFile = new File([blob], 'pasted.png', { type: blob.type || 'image/png' });
        fileEl.value = '';
        await startRecognition(currentFile);
        break;
      }
    }
  }
});

function setEditing(v) {
  editing = v; positionRects();
  if (editing) out.textContent = '校准模式：拖动/缩放 4 个框到头像处，完成后点击“保存校准”。';
}
// Calibration modal open/close and actions
openCalibrate.addEventListener('click', ()=>{ calibModal.style.display='flex'; setEditing(true); out.textContent = '请在校准弹窗中操作。'; });
calibModal.addEventListener('click', (e)=>{ if (e.target===calibModal) { calibModal.style.display='none'; setEditing(false); }});
closeCalib.addEventListener('click', ()=>{ calibModal.style.display='none'; setEditing(false); });
calibFile.addEventListener('change', ()=>{
  const f = calibFile.files?.[0]; if (!f) return; const url = URL.createObjectURL(f); showImageInEditor(url);
});
saveCalib.addEventListener('click', () => { saveRects(); setEditing(false); out.textContent = '已保存校准。'; calibModal.style.display='none'; });
clearCalib.addEventListener('click', () => { clearRects(); setEditing(false); out.textContent = '已清除校准。'; positionRects(); });

async function fileToImage(fileOrBlob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(fileOrBlob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = reject; img.src = url;
  });
}

async function cropByRects(fileOrBlob) {
  const img = await fileToImage(fileOrBlob);
  const W = img.naturalWidth, H = img.naturalHeight;
  const result = [];
  for (let i = 0; i < 4; i++) {
    const r = rects[i];
    const sx = Math.round(r.x * W), sy = Math.round(r.y * H);
    const sw = Math.round(r.w * W), sh = Math.round(r.h * H);
    const c = document.createElement('canvas');
    c.width = sw; c.height = sh;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    const blob = await new Promise(res => c.toBlob(res, 'image/png', 0.95));
    result.push({ blob, canvas: c });
  }
  return result.map(r => r.blob);
}

async function startRecognition(file){
  if (!file) { out.textContent = '请选择图片，或直接 Ctrl+V 粘贴图片'; return; }
  const saved = localStorage.getItem('avatarSideRects');
  if (!saved) { out.textContent = '未找到校准数据，请先完成校准。'; calibModal.style.display='flex'; setEditing(true); return; }
  if (!myP || !bpMode) { out.textContent = '请先选择“我是谁(P)”与“BP模式”。'; openSettingsModal(); return; }
  out.textContent = '本地裁剪中...';
  try {
    const blobs = await cropByRects(file);
    const fd = new FormData();
    blobs.forEach((b, i) => fd.append('file' + (i+1), b, `crop_${i+1}.png`));
    out.textContent = '上传识别中...';
    const res = await fetch('/api/classify-batch', { method: 'POST', body: fd });
    const json = await res.json();
    out.textContent = JSON.stringify(json, null, 2);
    const mapped = mapResultsToP(json);
    const enriched = checkConflictsAndComposeRound(mapped);
    renderRoundPanel(enriched);
    commitUsage(enriched);
  } catch (e) {
    out.textContent = '裁剪/识别失败: ' + e;
  }
}

function mapResultsToP(batchJson) {
  const centers = rects.map((r, i)=>({ i, yc: r.y + r.h/2 }));
  centers.sort((a,b)=> a.yc - b.yc);
  const my = parseInt(myP,10);
  const remainP = [1,2,3,4].filter(x=>x!==my);
  const mapIdxToP = new Map();
  mapIdxToP.set(centers[3].i, my);
  for (let k=0;k<3;k++) mapIdxToP.set(centers[k].i, remainP[k]);
  const resultsByP = {1:null,2:null,3:null,4:null};
  (batchJson.results||[]).forEach((item, idx)=>{
    const p = mapIdxToP.get(idx);
    if (!p) return; resultsByP[p] = item.result;
  });
  return resultsByP;
}

function checkConflictsAndComposeRound(resultsByP){
  const round = [];
  for (let p=1; p<=4; p++){
    const r = resultsByP[p];
    if (!r || !r.success){
      round.push({ p, name:'', avatarUrl:'', from:'auto', confidence: r?.confidence ?? 0, conflict:false, reason:'未识别', editable:true });
      continue;
    }
    const name = r.nameCn || r.display || r.predicted || '';
    const conflict = (bpMode==='personal') ? usedBy[p].has(name) : usedGlobal.has(name);
    const reason = conflict ? (bpMode==='personal' ? `P${p} 已使用过 ${name}` : `${name} 已被使用（全局BP）`) : '';
    const avatar = (window.characterData && window.characterData[name]?.头像) || '';
    round.push({ p, name, avatarUrl: avatar, from:'auto', confidence: r.confidence, conflict, reason, editable: true });
  }
  return round;
}

function commitUsage(round){
  for (const e of round){
    if (!e.name || e.conflict) continue;
    if (bpMode==='personal') usedBy[e.p].add(e.name);
    else usedGlobal.add(e.name);
  }
  rounds.push({ at: new Date().toISOString(), entries: round.map(({p,name,from,confidence})=>({p,name,from,confidence})) });
}

function renderRoundPanel(round){
  roundSlots.innerHTML = '';
  for (let p=1;p<=4;p++){
    const e = round.find(x=>x.p===p) || { p, name:'', conflict:false, reason:'待识别', avatarUrl:'' };
    const div = document.createElement('div');
    div.className = 'slot' + (e.conflict? ' conflict' : '');
    div.innerHTML = `
      <h4>P${p}</h4>
      <div style="display:flex; gap:10px; align-items:center;">
        ${e.avatarUrl? `<img class="avatar" src="${e.avatarUrl}" alt="${e.name}" />` : `<div class="avatar" style="display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.06);border:1px dashed rgba(255,255,255,0.2);color:#aaa;">无</div>`}
        <div>
          <div class="name">${e.name || '——'}</div>
          ${e.conflict? `<div class="conflict">⚠ ${e.reason}</div>`: ''}
          ${!e.name? `<div class="muted">${e.reason||''}</div>`: ''}
        </div>
      </div>
      <div class="actions">
        <button data-p="${p}" class="pickBtn">选择</button>
        ${e.name? `<button data-p="${p}" class="clearBtn">清空</button>`: ''}
      </div>
    `;
    roundSlots.appendChild(div);
  }
  roundSlots.querySelectorAll('.pickBtn').forEach(btn=> btn.addEventListener('click', ()=> openPicker(parseInt(btn.dataset.p,10))));
  roundSlots.querySelectorAll('.clearBtn').forEach(btn=> btn.addEventListener('click', ()=> applyManual(parseInt(btn.dataset.p,10), '')));
  if (!myP || !bpMode) roundTip.textContent = '提示：先选择“我是谁(P)”与“BP模式”。'; else roundTip.textContent = '';
}

const ELEMENTS = ['冰','火','水','雷','草','风','岩'];
const WEAPONS = ['单手剑','大剑','长枪','弓','法器'];
let pickTargetP = null;
let activeEle = '';
let activeWpn = '';

function buildChips(){
  eleChips.innerHTML = '<span class="muted">元素：</span>' + ELEMENTS.map(e=>`<span class="chip${activeEle===e?' active':''}" data-ele="${e}">${e}</span>`).join('') + `<span class="chip${activeEle===''?' active':''}" data-ele="">全部</span>`;
  wpnChips.innerHTML = '<span class="muted">武器：</span>' + WEAPONS.map(w=>`<span class="chip${activeWpn===w?' active':''}" data-wpn="${w}">${w}</span>`).join('') + `<span class="chip${activeWpn===''?' active':''}" data-wpn="">全部</span>`;
  eleChips.querySelectorAll('.chip').forEach(c=> c.addEventListener('click', ()=>{ activeEle = c.dataset.ele ?? ''; buildChips(); renderPickerGrid(); }));
  wpnChips.querySelectorAll('.chip').forEach(c=> c.addEventListener('click', ()=>{ activeWpn = c.dataset.wpn ?? ''; buildChips(); renderPickerGrid(); }));
}
buildChips();

function openPicker(p){ pickTargetP = p; picker.style.display='flex'; renderPickerGrid(); }
closePicker.addEventListener('click', ()=> picker.style.display='none');
picker.addEventListener('click', (e)=> { if (e.target===picker) picker.style.display='none'; });
searchInput.addEventListener('input', renderPickerGrid);

function matchBySearch(name){
  const term = (searchInput.value||'').trim().toLowerCase();
  if (!term) return true;
  if (name.toLowerCase().includes(term)) return true;
  const p = window.pinyinPro?.pinyin?.(name, { pattern:'first', toneType:'none', multiple:true });
  if (p){
    const initials = p.split(' ').map(s=> s[0]||'').join('');
    if (initials.includes(term)) return true;
  }
  return false;
}

function renderPickerGrid(){
  const data = window.characterData || {};
  const entries = Object.entries(data);
  pickerGrid.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (const [name, info] of entries){
    if (activeEle && info['元素类型']!==activeEle) continue;
    if (activeWpn && info['武器类型']!==activeWpn) continue;
    if (!matchBySearch(name)) continue;
    const card = document.createElement('div');
    card.className='cardc';
    card.innerHTML = `<img src="${info['头像']||''}" alt="${name}"><div class="nm">${name}</div>`;
    card.addEventListener('click', ()=> { applyManual(pickTargetP, name); picker.style.display='none'; });
    frag.appendChild(card);
  }
  pickerGrid.appendChild(frag);
}

function applyManual(p, name){
  let round = [];
  for (let i=1;i<=4;i++){
    const slot = roundSlots.children[i-1];
    const nm = (i===p? name : (slot?.querySelector('.name')?.textContent||'').trim());
    const isEmpty = nm==='' || nm==='——';
    round.push({ p:i, name: isEmpty? '' : nm, avatarUrl:(isEmpty? '' : (window.characterData[nm]?.头像||'')), from: (i===p? 'manual':'auto'), confidence: undefined });
  }
  const validated = round.map(e=>{
    if (!e.name) return { ...e, conflict:false, reason:'未选择', editable:true };
    const conflict = (bpMode==='personal') ? usedBy[e.p].has(e.name) : usedGlobal.has(e.name);
    const reason = conflict ? (bpMode==='personal' ? `P${e.p} 已使用过 ${e.name}` : `${e.name} 已被使用（全局BP）`) : '';
    return { ...e, conflict, reason };
  });
  renderRoundPanel(validated);
}

// 初始进入时弹出设置
resetSession(true);
