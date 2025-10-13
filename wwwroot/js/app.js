// 可选：拼音库（CDN），加载失败则退化到中文名包含搜索
(function(){
  var s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/npm/pinyin-pro@3.19.8/dist/index.iife.min.js';
  s.defer=true; document.head.appendChild(s);
})();

const fileEl = document.getElementById('file');
// no direct API log output now
const canvasWrap = document.getElementById('canvasWrap');
const imgPrev = document.getElementById('imgPrev');
const calibLayer = document.getElementById('calibLayer');
// Onboarding modal controls
const resetRecords = document.getElementById('resetRecords');
const onboardingModal = document.getElementById('onboardingModal');
const calibStatus = document.getElementById('calibStatus');
const btnStartCalib = document.getElementById('btnStartCalib');
const btnRecalib = document.getElementById('btnRecalib');
const pButtons = document.getElementById('pButtons');
const modeButtons = document.getElementById('modeButtons');
const btnStartApp = document.getElementById('btnStartApp');
// Calibration modal controls
const openCalibrate = document.getElementById('openCalibrate');
const calibModal = document.getElementById('calibModal');
const calibFile = document.getElementById('calibFile');
const saveCalib = document.getElementById('saveCalib');
const clearCalib = document.getElementById('clearCalib');
const closeCalib = document.getElementById('closeCalib');
const openCalibVideo = document.getElementById('openCalibVideo');
// two-step calibration containers
const calibStep1 = document.getElementById('calibStep1');
const calibStep2 = document.getElementById('calibStep2');
const roundSlots = document.getElementById('roundSlots');
const roundTip = document.getElementById('roundTip');
const calibSlots = document.getElementById('calibSlots');
const picker = document.getElementById('picker');
const pickerGrid = document.getElementById('pickerGrid');
const closePicker = document.getElementById('closePicker');
const searchInput = document.getElementById('searchInput');
const eleChips = document.getElementById('eleChips');
const wpnChips = document.getElementById('wpnChips');
// catalog and history
const catalogGrid = document.getElementById('catalogGrid');
const openHistory = document.getElementById('openHistory');
const pasteImageTop = document.getElementById('pasteImageTop');
const pasteImageCalib = document.getElementById('pasteImageCalib');

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
let clearedBefore = {}; // name -> lastClearedRoundIdx

// 初始进入时弹出入门引导
resetSession(true);

function canRunRecognition() {
  const hasRects = !!localStorage.getItem('avatarSideRects');
  return hasRects && myP && bpMode;
}
function resetSession(showOnboarding=true) {
  rounds = [];
  usedBy = { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set() };
  usedGlobal = new Set();
  myP = '';
  bpMode = '';
  clearedBefore = {};
  renderRoundPanel([]);
  roundTip.textContent = '请先选择“我是谁(P)”与“BP模式”，并完成校准。';
  if (showOnboarding) openOnboarding();
  renderCatalog();
}
resetRecords.addEventListener('click', ()=> resetSession(true));

// 通用：模态框显示/隐藏与页面滚动状态控制
function anyModalOpen(){
  return Array.from(document.querySelectorAll('.modal')).some(m => getComputedStyle(m).display === 'flex');
}
function refreshModalOpenClass(){
  if (anyModalOpen()) document.body.classList.add('modal-open');
  else document.body.classList.remove('modal-open');
}
function showModal(el){ if (!el) return; el.style.display = 'flex'; refreshModalOpenClass(); }
function hideModal(el){ if (!el) return; el.style.display = 'none'; refreshModalOpenClass(); }

function updateOnboardingUI(){
  const hasRects = !!localStorage.getItem('avatarSideRects');
  if (hasRects){
    calibStatus.textContent = '已完成，可以重新校准';
    calibStatus.classList.remove('muted');
    btnStartCalib.style.display = 'none';
    btnRecalib.style.display = '';
  } else {
    calibStatus.textContent = '未完成，请先进行位置矫正';
    calibStatus.classList.add('muted');
    btnStartCalib.style.display = '';
    btnRecalib.style.display = 'none';
  }
  // highlight selected P
  if (pButtons){
    pButtons.querySelectorAll('button').forEach(b=>{
      const sel = (myP && parseInt(b.dataset.p,10)===parseInt(myP,10));
      b.classList.toggle('primary', sel);
    });
  }
  // highlight selected mode
  if (modeButtons){
    modeButtons.querySelectorAll('button').forEach(b=>{
      const sel = (bpMode && b.dataset.mode===bpMode);
      b.classList.toggle('primary', sel);
    });
  }
  // 使用 aria-disabled 控制视觉状态，但保持按钮可点击以便给出反馈
  const disabled = !canRunRecognition();
  btnStartApp.setAttribute('aria-disabled', disabled ? 'true' : 'false');
}

function openOnboarding(){
  updateOnboardingUI();
  showModal(onboardingModal);
}
function closeOnboarding(){ hideModal(onboardingModal); }

// P select
if (pButtons){
  pButtons.querySelectorAll('button').forEach(b=>{
    b.addEventListener('click', ()=>{ myP = String(parseInt(b.dataset.p,10)); updateOnboardingUI(); renderCatalog(); });
  });
}
// mode select
if (modeButtons){
  modeButtons.querySelectorAll('button').forEach(b=>{
    b.addEventListener('click', ()=>{ bpMode = b.dataset.mode || ''; rebuildUsageSetsFromRounds(); updateOnboardingUI(); renderCatalog(); });
  });
}
// calib start/recalib
btnStartCalib?.addEventListener('click', ()=>{
  hideModal(onboardingModal);
  openCalibrationWizard();
});
btnRecalib?.addEventListener('click', ()=>{
  hideModal(onboardingModal);
  openCalibrationWizard();
});
// enter app
btnStartApp?.addEventListener('click', (e)=>{
  const disabled = btnStartApp.getAttribute('aria-disabled') === 'true';
  if (disabled || !canRunRecognition()){
    // 定位未完成的块进行闪烁：校准、P、模式
    const needs = [];
    const hasRects = !!localStorage.getItem('avatarSideRects');
    if (!hasRects) needs.push(document.getElementById('calibBlock'));
    if (!myP) needs.push(document.getElementById('pBlock'));
    if (!bpMode) needs.push(document.getElementById('modeBlock'));
    needs.forEach(el=>{
      if (!el) return;
      el.classList.add('shake-error');
      // 动画结束后移除
      setTimeout(()=> el.classList.remove('shake-error'), 900);
    });
    e.preventDefault();
    return;
  }
  roundTip.textContent='';
  closeOnboarding();
});

let currentFile = null;

function showImageInEditor(url) {
  if (!url) return;
  imgPrev.onload = () => {
    setupCalibLayerSize();
    positionRects();
    // 图片加载完成后，确保切换到第2步
    try { gotoCalibStep(2); } catch {}
  };
  imgPrev.src = url;
  canvasWrap.classList.remove('hidden');
}

function setupCalibLayerSize(){
  const W = imgPrev.naturalWidth || imgPrev.width;
  const H = imgPrev.naturalHeight || imgPrev.height;
  if (!W || !H) return;
  if (calibLayer){
    // 将预览固定为合适大小，适应容器
    const wrapRect = canvasWrap.getBoundingClientRect();
    const availW = Math.max(200, wrapRect.width - 16);
    const availH = Math.max(200, wrapRect.height - 16);
    const s = Math.min(availW / W, availH / H);
    const dispW = Math.max(100, Math.round(W * s));
    const dispH = Math.max(100, Math.round(H * s));
    calibLayer.style.width = dispW + 'px';
    calibLayer.style.height = dispH + 'px';
  }
}

function positionRects() {
  // 使用显示尺寸放置CSS，但 rects 始终是相对自然尺寸的归一化值
  const dispW = (calibLayer?.clientWidth) || (imgPrev?.clientWidth) || 0;
  const dispH = (calibLayer?.clientHeight) || (imgPrev?.clientHeight) || 0;
  const root = calibLayer || canvasWrap;
  const els = root.querySelectorAll('.rect');
  els.forEach(el => {
    const idx = parseInt(el.getAttribute('data-idx'));
    const r = rects[idx];
    el.style.position = 'absolute';
    el.style.left = (r.x * dispW) + 'px';
    el.style.top = (r.y * dispH) + 'px';
    el.style.width = (r.w * dispW) + 'px';
    el.style.height = (r.h * dispH) + 'px';
    el.style.display = editing ? 'block' : 'none';
  });
  renderCalibSlots();
}

let editing = false;
let activeRectIndex = 0; // 当前可调的矫正框索引（全局）
const SCALE_MIN = 0.2, SCALE_MAX = 5.0, SCALE_STEP = 0.1;

function bindEditorEvents() {
  // 点击放置 100×100 的矫正框
  const root = calibLayer || canvasWrap;

  // 点击背景：若尚未设置该活动框则创建，否则移动该活动框（不再生成新的框）
  root.addEventListener('click', (e)=>{
    if (!editing) return;
    const W = imgPrev.naturalWidth || 0;
    const H = imgPrev.naturalHeight || 0;
    if (!W || !H) return;
    const box = (calibLayer || canvasWrap).getBoundingClientRect();
    const xCss = e.clientX - box.left;
    const yCss = e.clientY - box.top;
    // 将显示坐标转换为自然像素坐标
    const dispW = (calibLayer?.clientWidth)||0;
    const dispH = (calibLayer?.clientHeight)||0;
    const sX = dispW > 0 ? (W / dispW) : 1;
    const sY = dispH > 0 ? (H / dispH) : 1;
    const x = xCss * sX;
    const y = yCss * sY;
    const half = 50; // 100px 方框半径
    let nx = (x - half) / W;
    let ny = (y - half) / H;
    const nw = 100 / W;
    const nh = 100 / H;
    // 约束到范围内
    nx = Math.max(0, Math.min(1 - nw, nx));
    ny = Math.max(0, Math.min(1 - nh, ny));
    // 仅操作活动框：若未设置则创建，否则移动，不生成新的框
    rects[activeRectIndex] = { x: nx, y: ny, w: nw, h: nh };
    positionRects();
  });

  window.addEventListener('resize', ()=>{ if (editing){ setupCalibLayerSize(); positionRects(); } });
}
bindEditorEvents();

function findNextRectIndex(){
  for (let i=0;i<4;i++){
    const r = rects[i];
    if (!r || !isFinite(r.x) || r.w<=0 || r.h<=0) return i;
  }
  return -1;
}

function findNearestRectIndex(px, py, W, H){
  let best=-1, bestD=1e18;
  for (let i=0;i<4;i++){
    const r = rects[i];
    const cx = (r.x + r.w/2) * W;
    const cy = (r.y + r.h/2) * H;
    const d = (cx-px)*(cx-px) + (cy-py)*(cy-py);
    if (d < bestD){ bestD = d; best = i; }
  }
  return best>=0?best:0;
}

function renderCalibSlots(){
  if (!calibSlots) return;
  const W = imgPrev.naturalWidth || 0;
  const H = imgPrev.naturalHeight || 0;
  calibSlots.innerHTML = '';
  for (let i=0;i<4;i++){
    const r = rects[i];
    const sw = Math.max(1, Math.round((r.w||0) * W));
    const sh = Math.max(1, Math.round((r.h||0) * H));
    const sx = Math.max(0, Math.round((r.x||0) * W));
    const sy = Math.max(0, Math.round((r.y||0) * H));
    const canvas = document.createElement('canvas');
    canvas.width = 100; canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (W>0 && H>0 && sw>0 && sh>0){
      ctx.drawImage(imgPrev, sx, sy, sw, sh, 0, 0, 100, 100);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(0,0,100,100);
      ctx.fillStyle = '#999';
      ctx.fillText('未设置', 20, 55);
    }
    const btn = document.createElement('button');
    btn.style.display = 'flex';
    btn.style.flexDirection = 'column';
    btn.style.alignItems = 'center';
    btn.style.gap = '4px';
    btn.className = 'ghost';
    btn.appendChild(canvas);
    const label = document.createElement('span');
    label.textContent = `${i+1}`;
    label.style.fontSize = '12px';
    btn.appendChild(label);
    if (i===activeRectIndex) btn.style.outline = '2px solid var(--primary)';
    btn.addEventListener('click', ()=>{
      activeRectIndex = i;
      highlightActiveRect(activeRectIndex);
      renderCalibSlots();
    });
    calibSlots.appendChild(btn);
  }
}

function highlightActiveRect(idx){
  const els = (calibLayer||canvasWrap).querySelectorAll('.rect');
  els.forEach((el)=>{
    if ((parseInt(el.getAttribute('data-idx'))||0)===idx){
      el.style.boxShadow = '0 0 0 2px var(--primary) inset';
      el.style.border = '2px solid var(--primary)';
    } else {
      el.style.boxShadow = '';
      el.style.border = '1px dashed rgba(255,255,255,0.35)';
    }
  });
}

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

async function getClipboardImage(){
  // 首选异步 Clipboard API（需 HTTPS/用户手势），回退到 navigator.clipboard.readText 无法包含图像
  if (navigator.clipboard && navigator.clipboard.read){
    try{
      const items = await navigator.clipboard.read();
      for (const item of items){
        for (const type of item.types){
          if (type.startsWith('image/')){
            const blob = await item.getType(type);
            return new File([blob], 'pasted.png', { type: blob.type || 'image/png' });
          }
        }
      }
    }catch{}
  }
  // 不可用时返回 null，让调用方提示用户使用 Ctrl+V
  return null;
}

// 顶栏：从剪贴板粘贴并直接走识别
pasteImageTop?.addEventListener('click', async ()=>{
  const f = await getClipboardImage();
  if (!f){ roundTip.textContent = '无法读取剪贴板图像，请先复制图片后再试。'; return; }
  currentFile = f; fileEl.value=''; await startRecognition(currentFile);
});

// 校准步骤1：从剪贴板粘贴并进入步骤2
pasteImageCalib?.addEventListener('click', async ()=>{
  const f = await getClipboardImage();
  if (!f){ try{ alert('无法读取剪贴板图像，请先复制图片（或使用浏览器允许读取剪贴板权限）。'); }catch{} return; }
  const url = URL.createObjectURL(f);
  showImageInEditor(url);
  gotoCalibStep(2);
});

function setEditing(v) {
  editing = v; positionRects();
  // hint shown via UI; no log area now
}
// Calibration modal open/close and actions
if (openCalibrate){
  openCalibrate.addEventListener('click', ()=>{ 
    openCalibrationWizard();
  });
}
calibModal.addEventListener('click', (e)=>{ if (e.target===calibModal) { closeCalibrationWizard(true); } });
closeCalib.addEventListener('click', ()=>{ closeCalibrationWizard(true); });
calibFile.addEventListener('change', ()=>{
  const f = calibFile.files?.[0]; if (!f) return; 
  const url = URL.createObjectURL(f); 
  showImageInEditor(url);
  // 选图后自动进入第2步
  gotoCalibStep(2);
});
saveCalib.addEventListener('click', () => { saveRects(); closeCalibrationWizard(true); });
clearCalib.addEventListener('click', () => { clearRects(); setEditing(false); positionRects(); try{ updateOnboardingUI(); openOnboarding(); }catch{} });

// 校准视频弹窗：打开/关闭与播放控制（动态查询，避免脚本早于DOM渲染）
openCalibVideo?.addEventListener('click', ()=>{
  const modal = document.getElementById('calibVideoModal');
  const video = document.getElementById('calibVideo');
  if (modal){
    showModal(modal);
    try{ video?.play(); }catch{}
  }
});
document.addEventListener('click', (e)=>{
  const target = e.target;
  // 点击遮罩关闭
  if (target && target.id === 'calibVideoModal'){
    const modal = document.getElementById('calibVideoModal');
    const video = document.getElementById('calibVideo');
    try{ video?.pause(); if (video) video.currentTime = 0; }catch{}
  if (modal) hideModal(modal);
  }
  // 点击关闭按钮
  if (target && target.id === 'closeCalibVideo'){
    const modal = document.getElementById('calibVideoModal');
    const video = document.getElementById('calibVideo');
    try{ video?.pause(); if (video) video.currentTime = 0; }catch{}
  if (modal) hideModal(modal);
  }
});

function openCalibrationWizard(){
  showModal(calibModal);
  // 默认进入第1步
  gotoCalibStep(1);
  setEditing(false); // 第1步不允许编辑
  // 从现在起不再保留或自动加载校准图片缓存
  try { localStorage.removeItem('avatarCalibImage'); } catch {}
}

function closeCalibrationWizard(backToOnboarding){
  hideModal(calibModal);
  setEditing(false);
  if (backToOnboarding){ try{ updateOnboardingUI(); openOnboarding(); }catch{} }
}

function gotoCalibStep(n){
  if (!calibStep1 || !calibStep2) return;
  if (n===1){
    calibStep1.style.display='block';
    calibStep2.style.display='none';
  } else {
    calibStep1.style.display='none';
    calibStep2.style.display='block';
    setEditing(true); // 进入第2步启用编辑
    // 确保尺寸/位置刷新
    requestAnimationFrame(()=>{ setupCalibLayerSize(); positionRects(); });
  }
}

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
  if (!file) { roundTip.textContent = '请选择图片，或直接 Ctrl+V 粘贴图片'; return; }
  const saved = localStorage.getItem('avatarSideRects');
  if (!saved) { roundTip.textContent = '未找到校准数据，请先完成校准。'; calibModal.style.display='flex'; setEditing(true); return; }
  if (!myP || !bpMode) { roundTip.textContent = '请先选择“我是谁(P)”与“BP模式”。'; openOnboarding(); return; }
  showLoading(true);
  try {
    const blobs = await cropByRects(file);
    const fd = new FormData();
    blobs.forEach((b, i) => fd.append('file' + (i+1), b, `crop_${i+1}.png`));
    const res = await fetch('/api/classify-batch', { method: 'POST', body: fd });
    const json = await res.json();
    const mapped = mapResultsToP(json);
    const enriched = checkConflictsAndComposeRound(mapped);
    renderRoundPanel(enriched);
    commitUsage(enriched);
    rebuildUsageSetsFromRounds();
    renderCatalog();
    // 若历史弹窗打开，刷新
    if (typeof renderHistory==='function' && document.querySelector('.history-modal')?.style.display==='flex') {
      renderHistory();
    }
  } catch (e) {
    roundTip.textContent = '裁剪/识别失败: ' + e;
  } finally {
    showLoading(false);
  }
}

function showLoading(show){
  const el = document.getElementById('loadingOverlay');
  if (!el) return;
  if (show) el.classList.add('show');
  else el.classList.remove('show');
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
  // 仅追加历史；usedBy/usedGlobal 由 rebuildUsageSetsFromRounds 基于 clearedBefore 自动重建
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
        <button data-p="${p}" class="pickBtn">调整</button>
      </div>
    `;
    roundSlots.appendChild(div);
  }
  roundSlots.querySelectorAll('.pickBtn').forEach(btn=> btn.addEventListener('click', ()=> openPicker(parseInt(btn.dataset.p,10))));
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

function openPicker(p){ pickTargetP = p; showModal(picker); renderPickerGrid(); }
closePicker.addEventListener('click', ()=> hideModal(picker));
picker.addEventListener('click', (e)=> { if (e.target===picker) hideModal(picker); });
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

function aggregateUsedBy(excludeLast=false){
  const sets = {1:new Set(),2:new Set(),3:new Set(),4:new Set()};
  const end = rounds.length - (excludeLast? 1 : 0);
  for (let idx=0; idx<end; idx++){
    const r = rounds[idx];
    for (const e of (r.entries||[])){
      if (!e || !e.name || !e.p) continue;
      const cutoff = (clearedBefore[e.name] ?? -1);
      if (idx <= cutoff) continue;
      sets[e.p].add(e.name);
    }
  }
  return sets;
}

function rebuildUsageSetsFromRounds(){
  // 重建 usedBy 与 usedGlobal 与 rounds 对齐
  usedBy = aggregateUsedBy(false);
  usedGlobal = new Set();
  if (bpMode==='global'){
    for (const p of [1,2,3,4]){
      for (const nm of usedBy[p]) usedGlobal.add(nm);
    }
  }
}

function applyManual(p, name){
  // 1) 读取当前面板的四个名并应用手动修改
  const currentNames = [];
  for (let i=1;i<=4;i++){
    const slot = roundSlots.children[i-1];
    const nmText = (slot?.querySelector('.name')?.textContent||'').trim();
    const nm = (i===p? name : (nmText===''||nmText==='——'? '' : nmText));
    currentNames.push({ p:i, name:nm });
  }

  // 2) 写入历史：若已有当轮，更新最后一轮；否则创建新一轮
  if (rounds.length===0){
    rounds.push({ at:new Date().toISOString(), entries: currentNames.map(e=>({ p:e.p, name:e.name, from:(e.p===p?'manual':'auto') })) });
  } else {
    const last = rounds[rounds.length-1];
    const newEntries = (last.entries||[]).slice();
    // 确保长度为4
    for (let i=1;i<=4;i++){
      const prev = newEntries.find(x=>x.p===i) || { p:i, name:'' };
      const nm = currentNames[i-1].name;
      newEntries[i-1] = { p:i, name:nm, from:(i===p?'manual':(prev.from||'auto')) };
    }
    last.entries = newEntries;
  }

  // 3) 基于“之前轮次”计算冲突（不含当前轮）
  const priorUsedBy = aggregateUsedBy(true);
  const usedAnyPrev = new Set([...priorUsedBy[1], ...priorUsedBy[2], ...priorUsedBy[3], ...priorUsedBy[4]]);
  const validated = currentNames.map(e=>{
    const avatarUrl = e.name? (window.characterData[e.name]?.头像||'') : '';
    if (!e.name) return { p:e.p, name:'', avatarUrl:'', from: (e.p===p?'manual':'auto'), conflict:false, reason:'未选择', editable:true };
    const conflict = (bpMode==='personal') ? priorUsedBy[e.p].has(e.name) : usedAnyPrev.has(e.name);
    const reason = conflict ? (bpMode==='personal' ? `P${e.p} 已使用过 ${e.name}` : `${e.name} 已被使用（全局BP）`) : '';
    return { p:e.p, name:e.name, avatarUrl, from:(e.p===p?'manual':'auto'), conflict, reason, editable:true };
  });

  // 4) 重建 usedBy（用于图鉴展示），并刷新 UI：本轮面板、图鉴、历史
  rebuildUsageSetsFromRounds();
  renderRoundPanel(validated);
  renderCatalog();
  if (typeof renderHistory==='function' && document.querySelector('.history-modal')?.style.display==='flex') {
    renderHistory();
  }
}

// （已在文件顶部初始化时调用 resetSession(true)）

// 渲染角色图鉴
function buildUsageByName(){
  const map = new Map(); // name -> Set of P
  for (const r of rounds){
    for (const e of (r.entries||[])){
      if (!e || !e.name) continue;
      if (!map.has(e.name)) map.set(e.name, new Set());
      if (e.p) map.get(e.name).add(e.p);
    }
  }
  return map;
}

// 返回按 BP 统计维度计算的使用者（考虑 clearedBefore 截止）
function getUsedPsForBP(name){
  const cutoff = (clearedBefore[name] ?? -1);
  const ps = new Set();
  for (let idx=0; idx<rounds.length; idx++){
    if (idx <= cutoff) continue;
    const r = rounds[idx];
    for (const e of (r.entries||[])){
      if (e && e.name===name && e.p) ps.add(e.p);
    }
  }
  return Array.from(ps).sort((a,b)=>a-b);
}

function renderCatalog(){
  const data = window.characterData || {};
  const entries = Object.entries(data);
  catalogGrid.innerHTML = '';
  const frag = document.createDocumentFragment();
  const usageMap = buildUsageByName();
  for (const [name, info] of entries){
    const div = document.createElement('div');
    div.className = 'citem';
    const usedSet = usageMap.get(name) || new Set();
    const usedPs = getUsedPsForBP(name);
    const isGlobalBlocked = (bpMode==='global' && usedPs.length>0);
    if (isGlobalBlocked) div.classList.add('disabled');
    const tags = usedPs.length>0
      ? (bpMode==='global'
          ? `<div class="tags"><span class="tag"> ${usedPs.map(p=>`P${p}`).join(' / ')} </span></div>`
          : `<div class="tags">${usedPs.map(p=>`<span class="tag">P${p}</span>`).join('')}</div>`)
      : '';
    div.innerHTML = `<img src="${info['头像']||''}" alt="${name}"><div class="nm">${name}</div>${tags}`;
    div.addEventListener('click', ()=> openRoleDetail(name));
    frag.appendChild(div);
  }
  catalogGrid.appendChild(frag);
}
if (catalogGrid) renderCatalog();

// 历史弹窗
const historyModal = document.createElement('div');
historyModal.className = 'modal history-modal';
historyModal.innerHTML = `
  <div class="dialog">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
      <h3 style="margin:0">历史记录</h3>
      <button id="closeHistory" class="ghost">关闭</button>
    </div>
    <div id="historyContent" style="margin-top:10px"></div>
  </div>`;
document.body.appendChild(historyModal);

function renderHistory(){
  const host = historyModal.querySelector('#historyContent');
  if (!rounds.length){ host.innerHTML = '<div class="muted">暂无数据</div>'; return; }
  const header = ['轮次','P1','P2','P3','P4'];
  let html = '<table class="history-table"><thead><tr>' + header.map(h=>`<th>${h}</th>`).join('') + '</tr></thead><tbody>';
  rounds.forEach((r, idx)=>{
    const row = new Array(5).fill('');
    row[0] = `第${idx+1}轮`;
    const names = {1:'',2:'',3:'',4:''};
    (r.entries||[]).forEach(e=>{ if (e && e.p) names[e.p] = e.name || ''; });
    row[1] = names[1]||'——'; row[2] = names[2]||'——'; row[3] = names[3]||'——'; row[4] = names[4]||'——';
    html += '<tr>' + row.map(c=>`<td>${c}</td>`).join('') + '</tr>';
  });
  html += '</tbody></table>';
  host.innerHTML = html;
}

openHistory?.addEventListener('click', ()=>{ renderHistory(); showModal(historyModal); });
historyModal.addEventListener('click', (e)=>{ if (e.target===historyModal) hideModal(historyModal); });
historyModal.querySelector('#closeHistory').addEventListener('click', ()=> hideModal(historyModal));

// 角色详情弹窗（图鉴点击）
const roleModal = document.createElement('div');
roleModal.className = 'modal role-modal';
roleModal.innerHTML = `
  <div class="dialog">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:10px">
        <img id="roleAvatar" src="" alt="" style="width:40px;height:40px;border-radius:8px;border:1px solid var(--border)" />
        <h3 id="roleTitle" style="margin:0"></h3>
      </div>
      <div style="display:flex;gap:8px">
  <button id="removeRoleUsage" class="danger">将此角色设为可用</button>
        <button id="closeRole" class="ghost">关闭</button>
      </div>
    </div>
    <div id="roleUsageList" style="margin-top:10px"></div>
  </div>`;
document.body.appendChild(roleModal);

let roleModalCurrentName = '';
function openRoleDetail(name){
  roleModalCurrentName = name;
  const info = (window.characterData||{})[name] || {};
  roleModal.querySelector('#roleTitle').textContent = name;
  roleModal.querySelector('#roleAvatar').src = info['头像']||'';
  renderRoleUsageList(name);
  showModal(roleModal);
}
function closeRoleDetail(){ hideModal(roleModal); roleModalCurrentName=''; }
roleModal.addEventListener('click', (e)=>{ if (e.target===roleModal) closeRoleDetail(); });
roleModal.querySelector('#closeRole').addEventListener('click', closeRoleDetail);

function renderRoleUsageList(name){
  const host = roleModal.querySelector('#roleUsageList');
  let has = false;
  let html = '<div class="list">';
  rounds.forEach((r, idx)=>{
    const matches = (r.entries||[]).filter(e=> e && e.name===name);
    if (matches.length){
      has = true;
      const ps = matches.map(e=> `P${e.p}`).join(' / ');
      html += `<div class="row" style="padding:8px;border-bottom:1px solid var(--border)">第${idx+1}轮：${ps} 使用</div>`;
    }
  });
  if (!has) html += '<div class="muted" style="padding:8px">暂无使用记录</div>';
  html += '</div>';
  host.innerHTML = html;
  const btn = roleModal.querySelector('#removeRoleUsage');
  btn.disabled = !has;
}

function clearRoleBPUpToCurrent(name){
  // 将该角色的 BP 统计清除截止到“当前轮”（即最后一轮的索引）
  if (!rounds.length){ return; }
  const lastIdx = rounds.length - 1; // 第 N 轮的索引为 N-1
  clearedBefore[name] = Math.max(clearedBefore[name] ?? -1, lastIdx);
  rebuildUsageSetsFromRounds();
  refreshCurrentPanelFromLastRound();
  renderCatalog();
  if (document.querySelector('.history-modal')?.style.display==='flex') renderHistory();
  renderRoleUsageList(name);
}

function refreshCurrentPanelFromLastRound(){
  if (!rounds.length){ renderRoundPanel([]); return; }
  const last = rounds[rounds.length-1];
  const priorUsedBy = aggregateUsedBy(true);
  const usedAnyPrev = new Set([...priorUsedBy[1], ...priorUsedBy[2], ...priorUsedBy[3], ...priorUsedBy[4]]);
  const entries = [];
  for (let p=1;p<=4;p++){
    const e = (last.entries||[]).find(x=>x.p===p) || { p, name:'' };
    const nm = e.name||'';
    const avatarUrl = nm? (window.characterData[nm]?.头像||'') : '';
    if (!nm) entries.push({ p, name:'', avatarUrl:'', from:e.from||'auto', conflict:false, reason:'未选择', editable:true });
    else {
      const conflict = (bpMode==='personal') ? priorUsedBy[p].has(nm) : usedAnyPrev.has(nm);
      const reason = conflict ? (bpMode==='personal' ? `P${p} 已使用过 ${nm}` : `${nm} 已被使用（全局BP）`) : '';
      entries.push({ p, name:nm, avatarUrl, from:e.from||'auto', conflict, reason, editable:true });
    }
  }
  renderRoundPanel(entries);
}

roleModal.querySelector('#removeRoleUsage').addEventListener('click', ()=>{
  if (!roleModalCurrentName) return;
  clearRoleBPUpToCurrent(roleModalCurrentName);
});
