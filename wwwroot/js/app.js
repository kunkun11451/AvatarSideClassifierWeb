const fileEl = document.getElementById('file');
const btnSelectImage = document.getElementById('btnSelectImage');
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
// clearCalib & closeCalib 按钮已从新版布局中移除
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
const closePickerX = document.getElementById('closePickerX');
const searchInput = document.getElementById('searchInput');
// Picker filters (icon-based)
const eleFilters = document.getElementById('eleFilters');
const wpnFilters = document.getElementById('wpnFilters');
// Catalog controls
const catalogSearchInput = document.getElementById('catalogSearchInput');
const catalogEleFilters = document.getElementById('catalogEleFilters');
const catalogWpnFilters = document.getElementById('catalogWpnFilters');
// catalog and history
const catalogGrid = document.getElementById('catalogGrid');
const openHistory = document.getElementById('openHistory');
const pasteImageTop = document.getElementById('pasteImageTop');
const pasteImageCalib = document.getElementById('pasteImageCalib');
const btnSelectCalib = document.getElementById('btnSelectCalib');
const roundNoEl = document.getElementById('roundNo');

// Catalog filter states should be initialized before any call to renderCatalog
let catalogActiveEle = '';
let catalogActiveWpn = '';

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

const EMPTY_STATE_IMAGES = [
  'https://upload-bbs.miyoushe.com/upload/2025/02/06/407777514/8ebf44386bf85cf59162bef464e38308_4367846965199814690.png',
  'https://upload-bbs.miyoushe.com/upload/2025/04/02/279632390/a91d2a14fee7fc8d50bf5d9e8b53d2c7_577996957060696080.png',
  'https://upload-bbs.miyoushe.com/upload/2024/02/03/273489775/c0f03c3359399144b71afadf3c83522d_3893341309840482073.png',
  'https://upload-bbs.miyoushe.com/upload/2024/02/05/273489775/6c68e7a7ab120f83aec478fce34d81cf_1010412239053042832.png',
  'https://upload-bbs.miyoushe.com/upload/2024/02/06/273489775/a976d21cda8da45d945694bf85da10cc_5199651072507289644.png',
  'https://upload-bbs.miyoushe.com/upload/2024/06/25/273489775/e87873362bc409f65c6ab586c4e364f6_5290621343385855642.png',
  'https://upload-bbs.miyoushe.com/upload/2024/11/09/273489775/705cbdf9088a9dc7a2ca252f8813c0f6_4437823511807979011.png',
  'https://upload-bbs.miyoushe.com/upload/2024/11/09/273489775/4c3aac12039a5a05b3ed284fe3704629_3655797959705379199.png',
  'https://upload-bbs.miyoushe.com/upload/2024/11/09/273489775/697ab650d4ef45a8b7b641f328219949_267729926758616386.png',
  'https://upload-bbs.miyoushe.com/upload/2024/11/09/273489775/3fc37a9cf1d1290e8953e4552fc975c7_7620722366369667699.png',
  'https://upload-bbs.miyoushe.com/upload/2024/11/03/273489775/ac8cc89729e6bbf48f68e52f6c0d4020_8006937065318554054.png',
  'https://upload-bbs.miyoushe.com/upload/2024/11/09/273489775/ceb4acae51995eb8189fabeff82cca55_1025240340820937590.png',
  'https://upload-bbs.miyoushe.com/upload/2024/11/08/273489775/4426228777a7e2ebd0048727370a376a_7951741384908377540.png',
  'https://upload-bbs.miyoushe.com/upload/2024/11/03/273489775/dfe68fe72b88b6c039cc31bc7b7f7806_818843631555829688.png'
];
function pickEmptyImage(){
  if (!EMPTY_STATE_IMAGES.length) return '';
  const i = Math.floor(Math.random() * EMPTY_STATE_IMAGES.length);
  return EMPTY_STATE_IMAGES[i];
}

// 初始进入时弹出入门引导
resetSession(true);
// 统一名称：将“空”“荧”（及常见写法）都视为“旅行者”
function normalizeName(name){
  const n = (name||'').trim();
  if (!n) return '';
  // 去除中间空白，便于匹配“旅行者 · 空”等写法
  const t = n.replace(/\s+/g,'');
  // 直接是空/荧
  if (/^(空|荧)$/.test(t)) return '旅行者';
  // 旅行者·空 / 旅行者·荧（不同点号/中点变体）
  if (/^旅行者[·・\.·]?(空|荧)$/.test(t)) return '旅行者';
  // 可选：英文名（防御性处理）
  if (/^(Aether|Lumine|Traveler)$/i.test(t)) return '旅行者';
  return n;
}


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
  renderRoundNo();
  if (showOnboarding) openOnboarding();
  renderCatalog();
}
resetRecords.addEventListener('click', async ()=>{
  const ok = await showConfirm('此操作将清空所有记录，重新选择P数与BP模式。确定继续？');
  if (!ok) return;
  resetSession(true);
  // 若当前位于“历史记录”视图，立即刷新为空态
  try{
    if (document.getElementById('historySection')?.style.display === 'block'){
      renderHistory();
    }
  }catch{}
});

// 通用：模态框显示/隐藏与页面滚动状态控制
function anyModalOpen(){
  return Array.from(document.querySelectorAll('.modal.open')).length > 0;
}
function refreshModalOpenClass(){
  if (anyModalOpen()) document.body.classList.add('modal-open');
  else document.body.classList.remove('modal-open');
}
function showModal(el){
  if (!el) return;
  el.style.display = 'flex';
  requestAnimationFrame(()=>{
    el.classList.add('open');
    refreshModalOpenClass();
  });
}
function hideModal(el){
  if (!el) return;
  el.classList.remove('open');
  setTimeout(()=>{
    if (!el.classList.contains('open')){
      el.style.display='none';
      refreshModalOpenClass();
    }
  }, 280);
  refreshModalOpenClass();
}

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
document.getElementById('closeOnboardingX')?.addEventListener('click', closeOnboarding);

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
  canvas.width = 72; canvas.height = 72;
    const ctx = canvas.getContext('2d');
    if (W>0 && H>0 && sw>0 && sh>0){
      ctx.drawImage(imgPrev, sx, sy, sw, sh, 0, 0, 72, 72);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(0,0,72,72);
      ctx.fillStyle = '#999';
      ctx.fillText('未设置', 10, 40);
    }
    const btn = document.createElement('button');
    btn.className = 'ghost';
    btn.appendChild(canvas);
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
  if (!f){ showAlert('无法读取剪贴板图像，请先复制图片后再试。'); return; }
  currentFile = f; fileEl.value=''; await startRecognition(currentFile);
});
btnSelectImage?.addEventListener('click', ()=> fileEl?.click());

// 校准步骤1：从剪贴板粘贴并进入步骤2
pasteImageCalib?.addEventListener('click', async ()=>{
  const f = await getClipboardImage();
  if (!f){ try{ showAlert('无法读取剪贴板图像，请先复制图片（或允许浏览器读取剪贴板）。'); }catch{} return; }
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
document.getElementById('closeCalibX')?.addEventListener('click', ()=>{ closeCalibrationWizard(true); });
calibFile.addEventListener('change', ()=>{
  const f = calibFile.files?.[0]; if (!f) return; 
  const url = URL.createObjectURL(f); 
  showImageInEditor(url);
  // 选图后自动进入第2步
  gotoCalibStep(2);
});
btnSelectCalib?.addEventListener('click', ()=>{ calibFile?.click(); });
saveCalib.addEventListener('click', () => { saveRects(); closeCalibrationWizard(true); });

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
  if (target && target.id === 'closeCalibVideoX'){
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
    if (document.getElementById('historySection')?.style.display === 'block') {
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

// 简单 HTML 转义，避免插入文本造成 XSS
function escapeHtml(str){
  return String(str||'')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function copyToClipboard(text){
  try{
    if (navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(text);
      return true;
    }
  }catch{}
  // 回退方案
  try{
    const ta = document.createElement('textarea');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  }catch{
    return false;
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
    const raw = r.nameCn || r.display || r.predicted || '';
    const name = normalizeName(raw);
    const conflict = (bpMode==='personal') ? usedBy[p].has(name) : usedGlobal.has(name);
    let reason = '';
    if (conflict){
      if (bpMode==='personal'){
        reason = `P${p} 已使用过 ${name}`;
      } else {
        const info = getLastUsageInfo(name, false);
        if (info){
          const psTxt = info.ps.map(x=>`${x}P`).join(' / ');
          reason = `${name} 在第${info.round}轮 已被 ${psTxt} 使用`;
        } else {
          reason = `${name} 已被使用（全局BP）`;
        }
      }
    }
    const avatar = (window.characterData && window.characterData[name]?.头像) || '';
    round.push({ p, name, avatarUrl: avatar, from:'auto', confidence: r.confidence, conflict, reason, editable: true });
  }
  return round;
}

function commitUsage(round){
  // 仅追加历史；usedBy/usedGlobal 由 rebuildUsageSetsFromRounds 基于 clearedBefore 自动重建
  rounds.push({ at: new Date().toISOString(), entries: round.map(({p,name,from,confidence})=>({p,name,from,confidence})) });
  renderRoundNo();
}

function renderRoundPanel(round){
  roundSlots.innerHTML = '';
  for (let p=1;p<=4;p++){
    const e = round.find(x=>x.p===p) || { p, name:'', conflict:false, reason:'待识别', avatarUrl:'' };
    const div = document.createElement('div');
    div.className = 'slot' + (e.conflict? ' conflict' : '');
    const reasonText = e.reason || '';
    const safeReason = escapeHtml(reasonText);
    const copyable = e.conflict && reasonText;
    div.innerHTML = `
      <h4>P${p}</h4>
      <div style="display:flex; gap:10px; align-items:center;">
        ${e.avatarUrl? `<img class="avatar" src="${e.avatarUrl}" alt="${e.name}" />` : `<div class="avatar" style="display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.06);border:1px dashed rgba(255,255,255,0.2);color:#aaa;">无</div>`}
        <div>
          <div class="name">${e.name || '——'}</div>
          ${e.conflict? `<div class="conflict">⚠ <span class="reason-text">${safeReason}</span>${copyable? ` <button class="copy-reason" data-text="${escapeHtml(reasonText)}" title="复制" style="border:none;background:transparent;cursor:pointer;line-height:1;display:inline-flex;align-items:center;">`+
          `<svg class="icon" style="width: 1em;height: 1em;vertical-align: middle;fill: currentColor;overflow: hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2282"><path d="M704 202.666667a96 96 0 0 1 96 96v554.666666a96 96 0 0 1-96 96H213.333333A96 96 0 0 1 117.333333 853.333333V298.666667A96 96 0 0 1 213.333333 202.666667h490.666667z m0 64H213.333333A32 32 0 0 0 181.333333 298.666667v554.666666a32 32 0 0 0 32 32h490.666667a32 32 0 0 0 32-32V298.666667a32 32 0 0 0-32-32z" fill="#FFFFFF" p-id="2283"></path><path d="M277.333333 362.666667m32 0l298.666667 0q32 0 32 32l0 0q0 32-32 32l-298.666667 0q-32 0-32-32l0 0q0-32 32-32Z" fill="#FFFFFF" p-id="2284"></path><path d="M277.333333 512m32 0l298.666667 0q32 0 32 32l0 0q0 32-32 32l-298.666667 0q-32 0-32-32l0 0q0-32 32-32Z" fill="#FFFFFF" p-id="2285"></path><path d="M277.333333 661.333333m32 0l170.666667 0q32 0 32 32l0 0q0 32-32 32l-170.666667 0q-32 0-32-32l0 0q0-32 32-32Z" fill="#FFFFFF" p-id="2286"></path><path d="M320 138.666667h512A32 32 0 0 1 864 170.666667v576a32 32 0 0 0 64 0V170.666667A96 96 0 0 0 832 74.666667H320a32 32 0 0 0 0 64z" fill="#FFFFFF" p-id="2287"></path></svg>`+
          `</button>` : ''}</div>`: ''}
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
  // 绑定复制按钮
  roundSlots.querySelectorAll('.copy-reason').forEach(btn => {
    btn.addEventListener('click', async ()=>{
      const t = btn.getAttribute('data-text') || '';
      const ok = await copyToClipboard(t);
      if (ok){
        const old = btn.innerHTML;
        // 切换为勾 SVG
        btn.innerHTML = '<svg class="icon" style="width: 1em;height: 1em;vertical-align: middle;fill: currentColor;overflow: hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2607"><path d="M384 768c-12.8 0-21.333333-4.266667-29.866667-12.8l-213.333333-213.333333c-17.066667-17.066667-17.066667-42.666667 0-59.733334s42.666667-17.066667 59.733333 0L384 665.6 823.466667 226.133333c17.066667-17.066667 42.666667-17.066667 59.733333 0s17.066667 42.666667 0 59.733334l-469.333333 469.333333c-8.533333 8.533333-17.066667 12.8-29.866667 12.8z" fill="#FFFFFF" p-id="2608"></path></svg>';
        btn.setAttribute('title', '已复制');
        setTimeout(()=>{
          // 还原为复制 SVG
          btn.innerHTML = old;
          btn.setAttribute('title','复制');
        }, 1200);
      }
    });
  });
  if (!myP || !bpMode) roundTip.textContent = '提示：先选择“我是谁(P)”与“BP模式”。'; else roundTip.textContent = '';
}

function renderRoundNo(){
  if (!roundNoEl) return;
  const n = rounds.length;
  if (n<=0){ roundNoEl.textContent = '(第1轮)'; return; }
  roundNoEl.textContent = `(第${n}轮)`;
}

const ELEMENTS = ['冰','火','水','雷','草','风','岩'];
const WEAPONS = ['单手剑','大剑','长枪','弓','法器'];
let pickTargetP = null;
let activeEle = '';
let activeWpn = '';

// Catalog filter states are declared above (before resetSession)

function createFilterButtons(container, items, type, {size=40}={}){
  if (!container) return;
  container.innerHTML = '';
  items.forEach(label=>{
    const img = document.createElement('img');
    // base class first to avoid overwriting 'active' later
    img.className = 'filter-button';
    if (type==='ele'){
      img.src = `https://unhappycar.games/SVG/${encodeURIComponent(label)}.svg`;
      img.alt = label;
      img.title = label;
      const isActive = (container===eleFilters && activeEle===label) || (container===catalogEleFilters && catalogActiveEle===label);
      if (isActive) img.classList.add('active');
    } else {
      // 武器图标外链
      const mapping = {
        '弓': 'https://homdgcat.wiki/homdgcat-res/AvatarSkill/Skill_A_02.png',
        '长枪': 'https://homdgcat.wiki/homdgcat-res/AvatarSkill/Skill_A_03.png',
        '法器': 'https://homdgcat.wiki/homdgcat-res/AvatarSkill/Skill_A_Catalyst_MD.png',
        '大剑': 'https://homdgcat.wiki/homdgcat-res/AvatarSkill/Skill_A_04.png',
        '单手剑': 'https://homdgcat.wiki/homdgcat-res/AvatarSkill/Skill_A_01.png'
      };
      img.src = mapping[label];
      img.alt = label; img.title = label;
      const isActive = (container===wpnFilters && activeWpn===label) || (container===catalogWpnFilters && catalogActiveWpn===label);
      if (isActive) img.classList.add('active');
    }
    img.style.width = `${size}px`; img.style.height = `${size}px`;
    img.dataset[type] = label;
    img.addEventListener('click', ()=>{
      // 点击切换选中；并清空对应的搜索框
      if (container===eleFilters){
        const searchTerm = (searchInput.value||'').trim();
        if (searchTerm) { searchInput.value=''; }
        activeEle = (activeEle===label? '' : label);
        createAllFiltersUI();
        renderPickerGrid();
      } else if (container===wpnFilters){
        const searchTerm = (searchInput.value||'').trim();
        if (searchTerm) { searchInput.value=''; }
        activeWpn = (activeWpn===label? '' : label);
        createAllFiltersUI();
        renderPickerGrid();
      } else if (container===catalogEleFilters){
        const term = (catalogSearchInput?.value||'').trim();
        if (term) { catalogSearchInput.value=''; }
        catalogActiveEle = (catalogActiveEle===label? '' : label);
        createAllFiltersUI();
        renderCatalog();
      } else if (container===catalogWpnFilters){
        const term = (catalogSearchInput?.value||'').trim();
        if (term) { catalogSearchInput.value=''; }
        catalogActiveWpn = (catalogActiveWpn===label? '' : label);
        createAllFiltersUI();
        renderCatalog();
      }
    });
    container.appendChild(img);
  });
}

function createAllFiltersUI(){
  // 放大筛选按钮尺寸：弹窗 48px，图鉴 40px
  createFilterButtons(eleFilters, ELEMENTS, 'ele', {size:36});
  createFilterButtons(wpnFilters, WEAPONS, 'wpn', {size:36});
  createFilterButtons(catalogEleFilters, ELEMENTS, 'ele', {size:40});
  createFilterButtons(catalogWpnFilters, WEAPONS, 'wpn', {size:40});
}
createAllFiltersUI();

function openPicker(p){ pickTargetP = p; showModal(picker); renderPickerGrid(); }
closePicker.addEventListener('click', ()=> hideModal(picker));
closePickerX?.addEventListener('click', ()=> hideModal(picker));
picker.addEventListener('click', (e)=> { if (e.target===picker) hideModal(picker); });
searchInput.addEventListener('input', ()=>{
  // 输入时清空筛选
  if ((searchInput.value||'').trim()!==''){
    activeEle=''; activeWpn=''; createAllFiltersUI();
  }
  renderPickerGrid();
});

function escapeRegExp(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function matchPinyinInitials(name, searchTerm, pinyinFunc){
  if (!pinyinFunc) return { match:false, matchedPositions:[] };
  const lowerTerm = (searchTerm||'').toLowerCase();
  const { initialsMatrix } = getAllPossibleInitials(name, lowerTerm, pinyinFunc);
  const matchedPositions = [];
  const match = initialsMatrix.some(initials => {
    const combinedInitials = initials.join('');
    const startIndex = combinedInitials.indexOf(lowerTerm);
    if (startIndex !== -1){
      for (let i=0; i<lowerTerm.length; i++) matchedPositions.push(startIndex + i);
      return true;
    }
    return false;
  });
  return { match, matchedPositions };
}
// 生成名字中每个字符可能的首字母组合矩阵
function getAllPossibleInitials(name, searchTerm, pinyinFunc){
  const perCharInitialOptions = [];
  const isChinese = ch => /[\u4e00-\u9fff]/.test(ch);
  for (let i=0;i<name.length;i++){
    const ch = name[i];
    let initials = [];
    try {
      if (isChinese(ch)) {
        // multiple:true 返回多音字所有读音；使用 type:'array' 便于遍历
        let pys = pinyinFunc(ch, {multiple:true, toneType:'none', type:'array'});
        if (!Array.isArray(pys)) pys = [pys].filter(Boolean);
        initials = Array.from(new Set(
          pys.filter(Boolean).map(p=> (p[0]||'').toLowerCase()).filter(Boolean)
        ));
      } else {
        const c = ch.toLowerCase();
        if (/^[a-z]$/.test(c)) initials = [c];
        else initials = [c]; // 非字母也占位，保持长度一致
      }
    } catch {
      initials = [ch.toLowerCase()];
    }
    if (!initials.length) initials = [ch.toLowerCase()];
    perCharInitialOptions.push(initials);
  }
  const initialsMatrix = generateInitialsMatrix(perCharInitialOptions);
  return { initialsMatrix };
}

function generateInitialsMatrix(list){
  // list: [ ['d','t'], ['y'], ['l','n'] ] => 笛卡尔积 => 每个元素是一条首字母序列
  let acc = [[]];
  for (const opts of list){
    const next = [];
    for (const seq of acc){
      for (const o of opts){
        next.push(seq.concat(o));
      }
    }
    acc = next;
  }
  return acc;
}

function matchAndHighlight(name, term){
  const lowerTerm = (term||'').toLowerCase();
  if (!lowerTerm) return { match:true, html: escapeHtml(name) };
  // 1) 中文直匹配
  if (name.toLowerCase().includes(lowerTerm)){
    const reg = new RegExp(escapeRegExp(lowerTerm), 'gi');
    const html = escapeHtml(name).replace(reg, m=>`<span class="hl">${escapeHtml(m)}</span>`);
    return { match:true, html };
  }
  // 2) 拼音匹配
  try{
    const pinyin = window.pinyinPro?.pinyin;
    if (typeof pinyin==='function'){
      const r = matchPinyinInitials(name, lowerTerm, pinyin);
      if (r.match){
        // 逐字高亮（仅高亮命中的字符）
        let html = '';
        for (let i=0;i<name.length;i++){
          if (r.matchedPositions.includes(i)) html += `<span class="hl">${escapeHtml(name[i])}</span>`;
          else html += escapeHtml(name[i]);
        }
        return { match:true, html };
      }
    }
  }catch{}
  return { match:false, html: escapeHtml(name) };
}

function renderPickerGrid(){
  const data = window.characterData || {};
  const entries = Object.entries(data);
  pickerGrid.innerHTML = '';
  const frag = document.createDocumentFragment();
  let idx = 0;
  for (const [name, info] of entries){
    if (activeEle && info['元素类型']!==activeEle) continue;
    if (activeWpn && info['武器类型']!==activeWpn) continue;
    const term = (searchInput.value||'').trim();
    const { match, html } = matchAndHighlight(name, term);
    if (!match) continue;
  const card = document.createElement('div');
    card.className='cardc stagger-in';
    card.style.animationDelay = `${Math.min(idx, 30) * 0.02}s`;
    card.innerHTML = `<img src="${info['头像']||''}" alt="${name}"><div class="nm">${html}</div>`;
  card.addEventListener('click', ()=> { applyManual(pickTargetP, name); hideModal(picker); });
    frag.appendChild(card);
    idx++;
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
  const selNameNorm = normalizeName(name);
  // 1) 读取当前面板的四个名并应用手动修改
  const currentNames = [];
  for (let i=1;i<=4;i++){
    const slot = roundSlots.children[i-1];
    const nmText = (slot?.querySelector('.name')?.textContent||'').trim();
    const nmRaw = (i===p? selNameNorm : (nmText===''||nmText==='——'? '' : nmText));
    const nm = normalizeName(nmRaw);
    currentNames.push({ p:i, name:nm });
  }

  // 2) 写入历史：若已有当轮，更新最后一轮；否则创建新一轮
  if (rounds.length===0){
    rounds.push({ at:new Date().toISOString(), entries: currentNames.map(e=>({ p:e.p, name: normalizeName(e.name), from:(e.p===p?'manual':'auto') })) });
  } else {
    const last = rounds[rounds.length-1];
    const newEntries = (last.entries||[]).slice();
    // 确保长度为4
    for (let i=1;i<=4;i++){
      const prev = newEntries.find(x=>x.p===i) || { p:i, name:'' };
      const nm = normalizeName(currentNames[i-1].name);
      newEntries[i-1] = { p:i, name:nm, from:(i===p?'manual':(prev.from||'auto')) };
    }
    last.entries = newEntries;
  }

  // 3) 基于“之前轮次”计算冲突（不含当前轮）
  const priorUsedBy = aggregateUsedBy(true);
  const usedAnyPrev = new Set([...priorUsedBy[1], ...priorUsedBy[2], ...priorUsedBy[3], ...priorUsedBy[4]]);
  const validated = currentNames.map(e=>{
    const nm = normalizeName(e.name);
    const avatarUrl = nm? (window.characterData[nm]?.头像||'') : '';
    if (!nm) return { p:e.p, name:'', avatarUrl:'', from: (e.p===p?'manual':'auto'), conflict:false, reason:'未选择', editable:true };
    const conflict = (bpMode==='personal') ? priorUsedBy[e.p].has(nm) : usedAnyPrev.has(nm);
    let reason = '';
    if (conflict){
      if (bpMode==='personal'){
        reason = `P${e.p} 已使用过 ${nm}`;
      } else {
        const info = getLastUsageInfo(nm, true);
        if (info){
          const psTxt = info.ps.map(x=>`${x}P`).join(' / ');
          reason = `${nm} 在第${info.round}轮已被 ${psTxt} 使用`;
        } else {
          reason = `${nm} 已被使用（全局BP）`;
        }
      }
    }
    return { p:e.p, name:nm, avatarUrl, from:(e.p===p?'manual':'auto'), conflict, reason, editable:true };
  });

  // 4) 重建 usedBy（用于图鉴展示），并刷新 UI：本轮面板、图鉴、历史
  rebuildUsageSetsFromRounds();
  renderRoundPanel(validated);
  renderCatalog();
  if (document.getElementById('historySection')?.style.display==='block') renderHistory();
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

// 获取最近一次（不含被清除前的）使用信息：返回 { round: 最近轮次号(1-based), ps: [P...] }
function getLastUsageInfo(name, excludeLast=false){
  if (!name) return null;
  const cutoff = (clearedBefore[name] ?? -1);
  const end = rounds.length - (excludeLast? 1 : 0);
  for (let idx = end - 1; idx >= 0; idx--){
    if (idx <= cutoff) break;
    const r = rounds[idx];
    const ps = [];
    for (const e of (r.entries||[])){
      if (e && e.name===name && e.p) ps.push(e.p);
    }
    if (ps.length){
      return { round: idx + 1, ps: ps.sort((a,b)=>a-b) };
    }
  }
  return null;
}

function renderCatalog(){
  const data = window.characterData || {};
  const entries = Object.entries(data);
  catalogGrid.innerHTML = '';
  const frag = document.createDocumentFragment();
  const usageMap = buildUsageByName();
  let idx = 0;
  for (const [name, info] of entries){
    if (catalogActiveEle && info['元素类型']!==catalogActiveEle) continue;
    if (catalogActiveWpn && info['武器类型']!==catalogActiveWpn) continue;
    const term = (catalogSearchInput?.value||'').trim();
    const { match, html } = matchAndHighlight(name, term);
    if (!match) continue;
    const div = document.createElement('div');
    div.className = 'citem stagger-in';
    div.style.animationDelay = `${Math.min(idx, 30) * 0.035}s`;
    // base content
    div.innerHTML = `<img src="${info['头像']||''}" alt="${name}"><div class="nm">${html}</div>`;

    const usedPs = getUsedPsForBP(name);
    if (bpMode==='global' && usedPs.length>0){
      // 全局BP：红边 + 灰头像/名字 + 底部中间使用者P数
      div.classList.add('used-global');
      const badge = document.createElement('div');
      badge.className = 'bp-badge';
      badge.textContent = usedPs.map(p=>`P${p}`).join(' / ');
      div.appendChild(badge);
    } else if (bpMode==='personal' && usedPs.length>0){
      // 个人BP：四角分区边框，按 P 显示
      usedPs.forEach(p=>{
        const corner = document.createElement('div');
        corner.className = `corner p${p}`;
        const label = document.createElement('span');
        label.className = 'corner-label';
        label.textContent = `${p}P`;
        corner.appendChild(label);
        div.appendChild(corner);
      });
      // 如果四个 P 都使用过，整体灰化（与全局BP一致）
      if (usedPs.length === 4) {
        div.classList.add('used-personal-all');
      } else {
        // 任意一个人使用则浅蓝边框
        div.classList.add('used-personal-some');
      }
    }

    div.addEventListener('click', ()=> openRoleDetail(name));
    frag.appendChild(div);
    idx++;
  }
  catalogGrid.appendChild(frag);
}
if (catalogGrid) renderCatalog();

// Catalog search behavior: clear filters when typing and re-render
catalogSearchInput?.addEventListener('input', ()=>{
  if ((catalogSearchInput.value||'').trim()!==''){
    catalogActiveEle=''; catalogActiveWpn=''; createAllFiltersUI();
  }
  renderCatalog();
});

// 内嵌历史视图渲染
function renderHistory(){
  const host = document.getElementById('historyContent');
  if (!host) return;
  if (!rounds.length){
    const img = pickEmptyImage();
    host.innerHTML = `<div class="empty-state"><img src="${img}" alt="empty"/><div class="txt">暂无数据</div></div>`;
    return;
  }
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

function switchMainView(mode){
  // 先隐藏所有 data-view section
  document.querySelectorAll('[data-view]')
    .forEach(sec => sec.style.display = 'none');
  const overview = document.getElementById('overviewSection');
  const history = document.getElementById('historySection');
  const randomSec = document.getElementById('randomSection');
  if (mode==='history'){
    history && (history.style.display='block');
    renderHistory();
  } else if (mode==='random'){
    randomSec && (randomSec.style.display='block');
    renderRandomTools();
  } else {
    overview && (overview.style.display='block');
  }
}

document.getElementById('viewSwitcher')?.addEventListener('change', (e)=>{
  const target = e.target;
  if (target && target.name==='viewmode') switchMainView(target.value);
});

// 初始默认停留在“历史记录”
(function ensureDefaultView(){
  try{
    const sw = document.getElementById('viewSwitcher');
    const checked = sw?.querySelector('input[name="viewmode"]:checked');
    const val = checked?.value || 'history';
    switchMainView(val);
  }catch{}
})();

// ===== 随机工具 =====
const LS_TOOLS_KEY = 'randomTools_v1';
const LS_TOOLS_BUILTINS_KEY = 'randomTools_builtins_v1';
// 特殊：随机数卡片的独立存储
const LS_NUM_TOOLS_KEY = 'randomNumTools_v1';
const LS_NUM_TEMPLATE_KEY = 'randomNumTemplate_v1';
const ICONS = {
  del: '<svg class="icon" style="width:1em;height:1em;vertical-align:middle;fill:currentColor;overflow:hidden;" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M799.2 874.4c0 34.4-28.001 62.4-62.4 62.4H287.2c-34.4 0-62.4-28-62.4-62.4V212h574.4v662.4zM349.6 100c0-7.2 5.6-12.8 12.8-12.8h300c7.2 0 12.8 5.6 12.8 12.8v37.6H349.6V100z m636.8 37.6H749.6V100c0-48.001-39.2-87.2-87.2-87.2h-300c-48 0-87.2 39.199-87.2 87.2v37.6H37.6C16.8 137.6 0 154.4 0 175.2s16.8 37.6 37.6 37.6h112v661.6c0 76 61.6 137.6 137.6 137.6h449.6c76 0 137.6-61.6 137.6-137.6V212h112c20.8 0 37.6-16.8 37.6-37.6s-16.8-36.8-37.6-36.8zM512 824c20.8 0 37.6-16.8 37.6-37.6v-400c0-20.8-16.8-37.6-37.6-37.6s-37.6 16.8-37.6 37.6v400c0 20.8 16.8 37.6 37.6 37.6m-175.2 0c20.8 0 37.6-16.8 37.6-37.6v-400c0-20.8-16.8-37.6-37.6-37.6s-37.6 16.8-37.6 37.6v400c0.8 20.8 17.6 37.6 37.6 37.6m350.4 0c20.8 0 37.6-16.8 37.6-37.6v-400c0-20.8-16.8-37.6-37.6-37.6s-37.6 16.8-37.6 37.6" fill="#FFFFFF"></path></svg>',
  edit: '<svg class="icon" style="width:1em;height:1em;vertical-align:middle;fill:currentColor;overflow:hidden;" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M832.161 351.79c-17.673 0-32 14.327-32 32v479.85H224.037V223.784h414.605c17.673 0 32-14.327 32-32 0-17.673-14.327-32-32-32H192.037c-17.673 0-32 14.327-32 32V895.64c0 17.673 14.327 32 32 32h640.124c17.673 0 32-14.327 32-32V383.79c0-17.673-14.327-32-32-32z" fill="#FFFFFF"></path><path d="M485.612 534.222c6.249 6.248 14.438 9.372 22.627 9.372s16.379-3.124 22.627-9.372l321.407-321.406c12.496-12.497 12.496-32.758 0-45.255-12.498-12.497-32.759-12.497-45.255 0L485.612 488.967c-12.497 12.496-12.497 32.758 0 45.255zM736 627c0-17.673-14.327-32-32-32H322c-17.673 0-32 14.327-32 32s14.327 32 32 32h382c17.673 0 32-14.327 32-32zM322 725c-17.673 0-32 14.327-32 32s14.327 32 32 32h251c17.673 0 32-14.327 32-32s-14.327-32-32-32H322z" fill="#FFFFFF"></path></svg>'
  ,draw: '<svg class="icon" style="width:1em;height:1em;vertical-align:middle;fill:currentColor;overflow:hidden;" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M500.6 599.8c19.7 24.5 41.5 47.7 67.1 67.9 56.4 44.5 122.9 67.1 203.1 69.1L744 763.5c-14.1 14.1-14.1 36.9 0 50.9 7 7 16.2 10.5 25.5 10.5s18.4-3.5 25.5-10.5l84-84c7.4-7.4 10.9-17.2 10.5-26.9 2.9-11.8-0.3-24.8-9.5-34l-84-84c-14.1-14.1-36.9-14.1-50.9 0s-14.1 36.9 0 50.9l28.4 28.4c-117.4-2.6-177.1-56.5-230-127.1-7.2 10.2-14.4 20.8-21.9 31.6-6.9 10.2-13.9 20.3-21 30.5zM382.8 339.6C323.4 292.8 252.6 270 166.5 270c-19.9 0-36 16.1-36 36s16.1 36 36 36c145.4 0 205.2 75 267.8 165.5 14.2-20.7 28.7-41.8 44.3-62.2-27.2-38.1-57.2-75.3-95.8-105.7zM891.5 338.4c0.4-9.7-3.1-19.5-10.5-26.9l-84-84c-14.1-14.1-36.9-14.1-50.9 0-14.1 14.1-14.1 36.9 0 50.9l26.7 26.7c-80.2 2-146.7 24.7-203.1 69.1-51.1 40.3-87.1 92.7-121.8 143.4C380.7 615.5 322.8 700 168.5 700c-19.9 0-36 16.1-36 36s16.1 36 36 36c86.1 0 156.9-22.8 216.3-69.6 51.4-40.5 87.5-93.1 122.4-144 65.5-95.4 122.2-178.1 268.2-181.3L747 405.5c-14.1 14.1-14.1 36.9 0 50.9 7 7 16.2 10.5 25.5 10.5s18.4-3.5 25.5-10.5l84-84c9.2-9.2 12.4-22.2 9.5-34z" fill="#FFFFFF"></path></svg>'
  ,copy: '<svg class="icon" style="width:1em;height:1em;vertical-align:middle;fill:currentColor;overflow:hidden;" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M720 192h-544A80.096 80.096 0 0 0 96 272v608C96 924.128 131.904 960 176 960h544c44.128 0 80-35.872 80-80v-608C800 227.904 764.128 192 720 192z m16 688c0 8.8-7.2 16-16 16h-544a16 16 0 0 1-16-16v-608a16 16 0 0 1 16-16h544a16 16 0 0 1 16 16v608zM848 64h-544a32 32 0 0 0 0 64h544a16 16 0 0 1 16 16v608a32 32 0 1 0 64 0v-608C928 99.904 892.128 64 848 64zM608 360H288a32 32 0 0 0 0 64h320a32 32 0 1 0 0-64zM608 520H288a32 32 0 1 0 0 64h320a32 32 0 1 0 0-64zM480 678.656H288a32 32 0 1 0 0 64h192a32 32 0 1 0 0-64z" fill="#FFFFFF"></path></svg>'
  ,check: '<svg class="icon" style="width:1em;height:1em;vertical-align:middle;fill:currentColor;overflow:hidden;" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M512 32C246.92 32 32 246.92 32 512s214.92 480 480 480 480-214.92 480-480S777.08 32 512 32z m-64 672L224 480l64-64 160 160 288-288 64 64-352 352z" fill="#FFFFFF"></path></svg>'
  ,plus: '<svg class="icon" style="width:1em;height:1em;vertical-align:middle;fill:currentColor;overflow:hidden;" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M480 160h64v704h-64z" fill="#FFFFFF"></path><path d="M160 480h704v64H160z" fill="#FFFFFF"></path></svg>'
};

// 随机数卡片：存储与工具函数
function loadNumCards(){
  try{
    const s = localStorage.getItem(LS_NUM_TOOLS_KEY);
    const arr = s ? JSON.parse(s) : [];
    return Array.isArray(arr) ? arr : [];
  }catch{ return []; }
}
function saveNumCards(list){
  try{ localStorage.setItem(LS_NUM_TOOLS_KEY, JSON.stringify(list||[])); }catch{}
}
function newNumCard(count=1, min=1, max=100){
  return { id: crypto.randomUUID?.() || String(Date.now()+Math.random()), count, min, max };
}
// 模板设置持久化：数量/最小值/最大值
function loadNumTemplate(){
  try{
    const s = localStorage.getItem(LS_NUM_TEMPLATE_KEY);
    const obj = s ? JSON.parse(s) : null;
    if (!obj || typeof obj !== 'object') return { count:1, min:1, max:6 };
    const count = Math.max(1, Math.min(10, parseInt(obj.count ?? 1, 10)));
    const min = Number.isFinite(parseInt(obj.min ?? 1, 10)) ? parseInt(obj.min, 10) : 1;
    const max = Number.isFinite(parseInt(obj.max ?? 6, 10)) ? parseInt(obj.max, 10) : 6;
    return { count, min, max };
  }catch{ return { count:1, min:1, max:6 }; }
}
function saveNumTemplate(obj){
  try{
    const count = Math.max(1, Math.min(10, parseInt(obj.count ?? 1, 10)));
    const min = Number.isFinite(parseInt(obj.min ?? 1, 10)) ? parseInt(obj.min, 10) : 1;
    const max = Number.isFinite(parseInt(obj.max ?? 6, 10)) ? parseInt(obj.max, 10) : 6;
    localStorage.setItem(LS_NUM_TEMPLATE_KEY, JSON.stringify({ count, min, max }));
  }catch{}
}
function randomInt(min, max){
  const a = Math.floor(min), b = Math.floor(max);
  return Math.floor(Math.random() * (b - a + 1)) + a;
}
function generateNumbers(count, min, max){
  const res = [];
  for (let i=0;i<count;i++) res.push(randomInt(min,max));
  return res;
}

// 通用确认弹窗
let confirmModal = null;
let confirmResolve = null;
function ensureConfirmModal(){
  if (confirmModal) return confirmModal;
  const m = document.createElement('div');
  m.className = 'modal';
  m.id = 'confirmModal';
  m.innerHTML = `
    <div class="dialog onboarding-dialog" style="max-width:440px">
      <button class="modal-x" id="closeConfirmX" aria-label="关闭" title="关闭">×</button>
      <h3 style="margin:0 0 8px; text-align:center; color:#2B90FF">提示</h3>
      <div id="confirmMsg" style="margin:8px 0 14px; color:#d0d3d8; text-align:center"></div>
      <div style="display:flex; gap:10px; justify-content:center">
        <button class="btn-glass btn-glass-secondary" id="confirmCancel">取消</button>
        <button class="btn-glass btn-glass-danger" id="confirmOk">确定</button>
      </div>
    </div>`;
  document.body.appendChild(m);
  // 确保置于最上层
  m.style.zIndex = '9999';
  confirmModal = m;
  m.addEventListener('click', (e)=>{ if (e.target===m){ hideModal(confirmModal); if (confirmResolve) confirmResolve(false); } });
  m.querySelector('#closeConfirmX').addEventListener('click', ()=>{ hideModal(confirmModal); if (confirmResolve) confirmResolve(false); });
  m.querySelector('#confirmCancel').addEventListener('click', ()=>{ hideModal(confirmModal); if (confirmResolve) confirmResolve(false); });
  m.querySelector('#confirmOk').addEventListener('click', ()=>{ hideModal(confirmModal); if (confirmResolve) confirmResolve(true); });
  return m;
}
function showConfirm(message){
  ensureConfirmModal();
  confirmModal.querySelector('#confirmMsg').textContent = message || '确认执行该操作吗？';
  const btnCancel = confirmModal.querySelector('#confirmCancel');
  const btnOk = confirmModal.querySelector('#confirmOk');
  btnCancel.style.display = '';
  btnOk.textContent = '确定';
  btnOk.className = 'btn-glass btn-glass-danger';
  showModal(confirmModal);
  return new Promise((resolve)=>{ confirmResolve = resolve; });
}

// 简单提示弹窗（仅一个按钮）
function showAlert(message){
  ensureConfirmModal();
  confirmModal.querySelector('#confirmMsg').textContent = message || '';
  const btnCancel = confirmModal.querySelector('#confirmCancel');
  const btnOk = confirmModal.querySelector('#confirmOk');
  btnCancel.style.display = 'none';
  btnOk.textContent = '知道了';
  btnOk.className = 'btn-glass btn-glass-primary';
  showModal(confirmModal);
  return new Promise((resolve)=>{ confirmResolve = resolve; });
}
function loadTools(){
  try{ 
    const s = localStorage.getItem(LS_TOOLS_KEY); 
    const arr = s? JSON.parse(s) : []; 
    return Array.isArray(arr)? arr.map(migrateToolShape) : [];
  }catch{ return []; }
}
function saveTools(list){ try{ localStorage.setItem(LS_TOOLS_KEY, JSON.stringify(list)); }catch{} }

function defaultTool(){
  return { 
    id: crypto.randomUUID?.() || String(Date.now()+Math.random()), 
    title:'',
    content:'',
    entries:[]
  };
}

function migrateToolShape(t){
  // 旧版本：{title, desc, items[]} -> 转换为含 content + entries 的新结构
  if (t && !t.entries){
    const items = Array.isArray(t.items)? t.items : [];
    const title = t.title || '自定义随机';
    const content = (t.desc && typeof t.desc==='string' && t.desc.trim())? t.desc.trim() : '';
    return { id: t.id || (crypto.randomUUID?.()||String(Date.now()+Math.random())), title, content, entries: items.length? [{name:'项', values: items}] : [] };
  }
  return t;
}

// 注入内置随机工具（只在本地没有同名时添加）
function ensureBuiltInTools(){
  // 若已完成种子注入，则不再重复
  try{ if (localStorage.getItem(LS_TOOLS_BUILTINS_KEY)) return; }catch{}
  const tools = loadTools();
  const hasTitle = new Set(tools.map(t=> (t.title||'').trim()));
  let changed = false;

  // 内置 1：方位
  if (!hasTitle.has('方位')){
    tools.push({
      id: crypto.randomUUID?.() || String(Date.now()+Math.random()),
      title: '方位',
      content: '[类型][方位]',
      entries: [
        { name: '类型', values: ['等级','命座','生命','防御','精通','攻击'] },
        { name: '方位', values: ['上','下','左','右','左上','左下','右上','右下'] }
      ]
    });
    changed = true;
  }

  // 组合生成：从 arr 中选 k 个（不排列，仅组合），按原顺序输出
  function getCombinations(arr, k){
    const res = [];
    const n = arr.length;
    const path = [];
    function dfs(start, depth){
      if (depth === k){ res.push(path.slice()); return; }
      for (let i=start; i<n; i++){
        path.push(arr[i]);
        dfs(i+1, depth+1);
        path.pop();
      }
    }
    if (k>0 && k<=n) dfs(0, 0); else if (k===0) res.push([]);
    return res;
  }

  // 内置 2：三元素抽取（七选三的所有组合）
  if (!hasTitle.has('三元素抽取')){
    const base = ['水','草','火','雷','冰','岩','风'];
    const combos = getCombinations(base, 3).map(c=> c.join('，'));
    tools.push({
      id: crypto.randomUUID?.() || String(Date.now()+Math.random()),
      title: '三元素抽取',
      content: '[元素]',
      entries: [ { name: '元素', values: combos } ]
    });
    changed = true;
  }

  if (changed) saveTools(tools);
  // 标记已完成内置种子注入
  try{ localStorage.setItem(LS_TOOLS_BUILTINS_KEY, '1'); }catch{}
}

function renderRandomTools(){
  const grid = document.getElementById('toolsGrid');
  if (!grid) return;
  // 确保内置工具已注入
  ensureBuiltInTools();
  const numCards = loadNumCards();
  const tools = loadTools();
  const frag = document.createDocumentFragment();

  // 先渲染“随机数”模板卡片
  (function renderRandomNumberTemplate(){
    const card = document.createElement('div');
    card.className = 'tool-card';
    card.innerHTML = `
      <div class="title">
        <div style="display:flex;align-items:center;gap:8px;flex:1 1 auto">
          <strong>随机数</strong>
        </div>
        <div style="display:flex;gap:6px">
          <button class="ghost btn-dup-template" title="复制卡片">${ICONS.copy}</button>
        </div>
      </div>
  <div class="desc num-inline">生成 <input class="num-input num-count" type="number" min="1" max="10" value="1"> 个 <input class="num-input num-min" type="number" value="1"> - <input class="num-input num-max" type="number" value="6"> 随机数</div>
      <div class="actions-line">
        <div class="result" aria-live="polite">...</div>
        <div class="actions">
          <button class="btn-glass btn-glass-primary btn-gen">${ICONS.draw||'生成'}</button>
          <button class="btn-glass btn-glass-secondary btn-copy">${ICONS.copy||'复制'}</button>
        </div>
      </div>
    `;
    const elCount = card.querySelector('.num-count');
    const elMin = card.querySelector('.num-min');
    const elMax = card.querySelector('.num-max');
    const btnGen = card.querySelector('.btn-gen');
    const btnCopy = card.querySelector('.btn-copy');
    const btnDup = card.querySelector('.btn-dup-template');
    const resultEl = card.querySelector('.result');

    // 从本地缓存载入模板设置
    const tpl = loadNumTemplate();
    elCount.value = String(tpl.count);
    elMin.value = String(tpl.min);
    elMax.value = String(tpl.max);

    function readVals(){
      const c = Math.max(1, Math.min(10, parseInt(elCount.value||'1',10)));
      const mi = parseInt(elMin.value||'1',10);
      const ma = parseInt(elMax.value||'100',10);
      return { c, mi, ma };
    }
    function persistTpl(){
      const c = parseInt(elCount.value||'1',10);
      const mi = parseInt(elMin.value||'1',10);
      const ma = parseInt(elMax.value||'6',10);
      saveNumTemplate({ count: Number.isFinite(c)? c : tpl.count, min: Number.isFinite(mi)? mi : tpl.min, max: Number.isFinite(ma)? ma : tpl.max });
    }
    elCount.addEventListener('input', persistTpl);
    elMin.addEventListener('input', persistTpl);
    elMax.addEventListener('input', persistTpl);
    btnGen.addEventListener('click', ()=>{
      const {c, mi, ma} = readVals();
      if (!Number.isFinite(mi) || !Number.isFinite(ma)) { showAlert('请输入有效的整数区间'); return; }
      if (mi > ma){ showAlert('最小值不能大于最大值'); return; }
      const arr = generateNumbers(c, mi, ma);
      resultEl.textContent = arr.join(' ');
      resultEl.classList.remove('flash'); void resultEl.offsetWidth; resultEl.classList.add('flash');
      setTimeout(()=> resultEl.classList.remove('flash'), 700);
    });
    btnCopy.addEventListener('click', ()=>{
      const txt = (resultEl.textContent||'').trim();
      if (!txt || txt==='...') return;
      copyToClipboard(txt);
      const prev = btnCopy.innerHTML; const prevClass = btnCopy.className;
      btnCopy.className = prevClass.replace('btn-glass-secondary','btn-glass-success');
      btnCopy.innerHTML = ICONS.check || '已复制';
      setTimeout(()=>{ btnCopy.className = prevClass; btnCopy.innerHTML = ICONS.copy || '复制'; }, 1400);
    });
    btnDup.addEventListener('click', ()=>{
      const {c, mi, ma} = readVals();
      const list = loadNumCards();
      list.push(newNumCard(c, mi, ma));
      saveNumCards(list);
      renderRandomTools();
    });
    frag.appendChild(card);
  })();

  // 渲染“随机数”的实例卡片
  numCards.forEach((nc, i)=>{
    const card = document.createElement('div');
    card.className = 'tool-card';
    card.innerHTML = `
      <div class="title">
        <div style="display:flex;align-items:center;gap:8px;flex:1 1 auto">
          <strong>随机数</strong>
        </div>
        <div style="display:flex;gap:6px">
          <button class="ghost btn-dup" title="复制卡片">${ICONS.copy}</button>
          <button class="ghost btn-del" title="删除">${ICONS.del}</button>
        </div>
      </div>
      <div class="desc num-inline">生成 <input class="num-input num-count" type="number" min="1" max="10" value="${escapeHtml(String(nc.count??1))}"> 个 <input class="num-input num-min" type="number" value="${escapeHtml(String(nc.min??1))}"> - <input class="num-input num-max" type="number" value="${escapeHtml(String(nc.max??100))}"> 随机数</div>
      <div class="actions-line">
        <div class="result" aria-live="polite">...</div>
        <div class="actions">
          <button class="btn-glass btn-glass-primary btn-gen">${ICONS.draw||'生成'}</button>
          <button class="btn-glass btn-glass-secondary btn-copy">${ICONS.copy||'复制'}</button>
        </div>
      </div>
    `;
    const elCount = card.querySelector('.num-count');
    const elMin = card.querySelector('.num-min');
    const elMax = card.querySelector('.num-max');
    const btnGen = card.querySelector('.btn-gen');
    const btnCopy = card.querySelector('.btn-copy');
    const btnDup = card.querySelector('.btn-dup');
    const btnDel = card.querySelector('.btn-del');
    const resultEl = card.querySelector('.result');

    function persist(){
      const list = loadNumCards();
      const it = list[i];
      if (!it) return;
      const c = Math.max(1, Math.min(10, parseInt(elCount.value||'1',10)));
      const mi = parseInt(elMin.value||'1',10);
      const ma = parseInt(elMax.value||'100',10);
      it.count = Number.isFinite(c)? c : 1;
      it.min = Number.isFinite(mi)? mi : 1;
      it.max = Number.isFinite(ma)? ma : 100;
      saveNumCards(list);
    }
    elCount.addEventListener('input', persist);
    elMin.addEventListener('input', persist);
    elMax.addEventListener('input', persist);

    btnGen.addEventListener('click', ()=>{
      const c = Math.max(1, Math.min(10, parseInt(elCount.value||'1',10)));
      const mi = parseInt(elMin.value||'1',10);
      const ma = parseInt(elMax.value||'100',10);
      if (!Number.isFinite(mi) || !Number.isFinite(ma)) { showAlert('请输入有效的整数区间'); return; }
      if (mi > ma){ showAlert('最小值不能大于最大值'); return; }
      const arr = generateNumbers(c, mi, ma);
      resultEl.textContent = arr.join(' ');
      resultEl.classList.remove('flash'); void resultEl.offsetWidth; resultEl.classList.add('flash');
      setTimeout(()=> resultEl.classList.remove('flash'), 700);
    });
    btnCopy.addEventListener('click', ()=>{
      const txt = (resultEl.textContent||'').trim();
      if (!txt || txt==='...') return;
      copyToClipboard(txt);
      const prev = btnCopy.innerHTML; const prevClass = btnCopy.className;
      btnCopy.className = prevClass.replace('btn-glass-secondary','btn-glass-success');
      btnCopy.innerHTML = ICONS.check || '已复制';
      setTimeout(()=>{ btnCopy.className = prevClass; btnCopy.innerHTML = ICONS.copy || '复制'; }, 1400);
    });
    btnDup.addEventListener('click', ()=>{
      const list = loadNumCards();
      const it = list[i]; if (!it) return;
      list.push(newNumCard(it.count, it.min, it.max));
      saveNumCards(list);
      renderRandomTools();
    });
    btnDel.addEventListener('click', async ()=>{
      const ok = await showConfirm('删除该随机数卡片？');
      if (!ok) return;
      const list = loadNumCards();
      list.splice(i,1);
      saveNumCards(list);
      renderRandomTools();
    });

    frag.appendChild(card);
  });
  // 再渲染用户自定义的随机工具
  tools.forEach((t, idx)=>{
    const card = document.createElement('div');
    card.className = 'tool-card';
  // 不再显示标签预览
    card.innerHTML = `
      <div class="title">
        <div style="display:flex;align-items:center;gap:8px;flex:1 1 auto">
          <strong>${escapeHtml(t.title||'未命名')}</strong>
        </div>
        <div style="display:flex;gap:6px">
          <button class="ghost btn-edit" title="编辑">${ICONS.edit}</button>
          <button class="ghost btn-del" title="删除">${ICONS.del}</button>
        </div>
      </div>
      <div class="desc" style="white-space:pre-wrap">${escapeHtml((t.content||'').slice(0,160))}${(t.content||'').length>160? '…':''}</div>
      <div class="actions-line">
        <div class="result" aria-live="polite">...</div>
        <div class="actions">
          <button class="btn-glass btn-glass-primary btn-draw" title="抽取">${ICONS.draw||'抽取'}</button>
          <button class="btn-glass btn-glass-secondary btn-copy" title="复制结果">${ICONS.copy||'复制'}</button>
        </div>
      </div>
    `;
    // 事件
    card.querySelector('.btn-edit').addEventListener('click', ()=> openToolEditor(idx));
    card.querySelector('.btn-del').addEventListener('click', async ()=>{
      const ok = await showConfirm('删除该随机工具？');
      if (!ok) return;
      tools.splice(idx,1); saveTools(tools); renderRandomTools();
    });
    card.querySelector('.btn-draw').addEventListener('click', ()=>{
      const res = drawTool(t);
      if (!res){ showAlert('请先在编辑中完善“内容”和“随机词条”'); return; }
      const resultEl = card.querySelector('.result');
      resultEl.textContent = res.text;
      // 触发短暂动画
      resultEl.classList.remove('flash');
      // 强制重绘以重新触发动画
      void resultEl.offsetWidth;
      resultEl.classList.add('flash');
      setTimeout(()=> resultEl.classList.remove('flash'), 700);
    });
    const copyBtn = card.querySelector('.btn-copy');
    card.querySelector('.btn-copy').addEventListener('click', ()=>{
      const resultEl = card.querySelector('.result');
      const txt = (resultEl?.textContent||'').trim();
      if (!txt || txt==='...'){ return; }
      copyToClipboard(txt);
      // 复制成功反馈：按钮变绿与勾号，过渡后恢复
      const prevClass = copyBtn.className;
      const prevHTML = copyBtn.innerHTML;
      copyBtn.className = prevClass.replace('btn-glass-secondary','btn-glass-success');
      copyBtn.innerHTML = (ICONS.check||'已复制');
      setTimeout(()=>{
        copyBtn.className = prevClass;
        copyBtn.innerHTML = (ICONS.copy||'复制');
      }, 1400);
    });
    frag.appendChild(card);
  });
  // 添加卡片
  const add = document.createElement('button');
  add.className = 'tool-card add-card';
  add.innerHTML = '<div class="plus">+</div>';
  add.addEventListener('click', ()=> openToolEditor());
  frag.appendChild(add);
  grid.innerHTML = '';
  grid.appendChild(frag);
}

// 编辑弹窗（标题 + 内容 + 随机词条）
let toolEditorModal = null;
let toolEditingIndex = null;
let toolEditorData = null; // 在编辑器中维护当前正在编辑的工具数据（未保存）
let entryEditorModal = null;
let entryEditingIndex = null;
function ensureToolEditor(){
  if (toolEditorModal) return toolEditorModal;
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'toolEditorModal';
  modal.innerHTML = `
    <div class="dialog onboarding-dialog" style="max-width:820px">
      <button class="modal-x" id="closeToolEditorX" aria-label="关闭" title="关闭">×</button>
      <h3 style="margin:0 0 6px; text-align:center; color:#6db3ff">添加/编辑随机工具</h3>
      <div class="tool-editor">
        <label>工具名称
          <input id="toolTitleInput" type="text" placeholder="工具名称" />
        </label>
        <label>内容（支持在文本中使用 [标签] 引用下方的随机词条）
          <textarea id="toolContentInput" placeholder="抽取内容" style="min-height:96px"></textarea>
        </label>
        <div class="tool-editor-entries">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:6px">
            <div style="font-weight:600; color:#6db3ff">随机词条</div>
          </div>
          <div id="entryCards" class="entry-cards"></div>
        </div>
        <div class="tool-editor-actions" style="display:flex; gap:8px; justify-content:flex-end; margin-top:12px">
          <button class="btn-glass btn-glass-danger" id="cancelTool">取消</button>
          <button class="btn-glass btn-glass-primary" id="saveTool">保存</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  toolEditorModal = modal;
  // 绑定通用关闭
  modal.addEventListener('click', (e)=>{ if (e.target===modal) closeToolEditor(); });
  modal.querySelector('#closeToolEditorX').addEventListener('click', closeToolEditor);
  // 绑定输入，同步到本地编辑态
  modal.querySelector('#toolTitleInput').addEventListener('input', (e)=>{ if (toolEditorData) toolEditorData.title = e.target.value; });
  modal.querySelector('#toolContentInput').addEventListener('input', (e)=>{ if (toolEditorData) toolEditorData.content = e.target.value; });
  modal.querySelector('#cancelTool').addEventListener('click', closeToolEditor);
  modal.querySelector('#saveTool').addEventListener('click', saveToolFromEditor);
  return modal;
}

function ensureEntryEditor(){
  if (entryEditorModal) return entryEditorModal;
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'entryEditorModal';
  modal.innerHTML = `
    <div class="dialog onboarding-dialog" style="max-width:620px">
      <button class="modal-x" id="closeEntryEditorX" aria-label="关闭" title="关闭">×</button>
      <h3 style="margin:0 0 6px; text-align:center; color:#6db3ff">编辑随机词条</h3>
      <div class="entry-editor">
        <label>词条名称
          <input id="entryNameInput" type="text" placeholder="词条名称" />
        </label>
        <div class="values-block">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:6px">
            <div style="font-weight:600; color:#6db3ff">可选值</div>
            <button class="ghost mini add" id="addEntryValue">${ICONS.plus} 添加值</button>
          </div>
          <div id="entryValuesList" class="values-list"></div>
        </div>
        <div class="tool-editor-actions" style="display:flex; gap:8px; justify-content:flex-end; margin-top:12px">
          <button class="btn-glass btn-glass-danger" id="cancelEntry">取消</button>
          <button class="btn-glass btn-glass-primary" id="saveEntry">保存</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  entryEditorModal = modal;
  // 绑定关闭
  modal.addEventListener('click', (e)=>{ if (e.target===modal) closeEntryEditor(); });
  modal.querySelector('#closeEntryEditorX').addEventListener('click', closeEntryEditor);
  modal.querySelector('#addEntryValue').addEventListener('click', ()=> addEntryValueRow(''));
  modal.querySelector('#cancelEntry').addEventListener('click', closeEntryEditor);
  modal.querySelector('#saveEntry').addEventListener('click', saveEntryFromEditor);
  return modal;
}

function addEntryValueRow(value){
  const list = entryEditorModal.querySelector('#entryValuesList');
  const row = document.createElement('div');
  row.className = 'value-row';
  row.innerHTML = `
    <input class="value-input" type="text" placeholder="值" />
    <button class="ghost mini del value-del" title="删除">${ICONS.del}</button>
  `;
  const input = row.querySelector('.value-input');
  input.value = value || '';
  input.addEventListener('keydown', (e)=>{
    if (e.key==='Enter'){
      e.preventDefault(); addEntryValueRow('');
      const inputs = list.querySelectorAll('.value-input');
      inputs[inputs.length-1]?.focus();
    }
  });
  row.querySelector('.value-del').addEventListener('click', ()=> row.remove());
  list.appendChild(row);
}

function openEntryEditor(index){
  ensureEntryEditor();
  entryEditingIndex = (typeof index==='number')? index : null;
  const entry = (entryEditingIndex!=null)? toolEditorData.entries[entryEditingIndex] : {name:'', values:['']};
  entryEditorModal.querySelector('#entryNameInput').value = entry.name || '';
  const list = entryEditorModal.querySelector('#entryValuesList');
  list.innerHTML = '';
  (entry.values && entry.values.length? entry.values : ['']).forEach(v=> addEntryValueRow(v));
  showModal(entryEditorModal);
}

function closeEntryEditor(){ hideModal(entryEditorModal); }

function saveEntryFromEditor(){
  const name = entryEditorModal.querySelector('#entryNameInput').value.trim();
  const values = Array.from(entryEditorModal.querySelectorAll('.value-input')).map(i=> i.value.trim()).filter(Boolean);
  if (!name){ showAlert('请填写词条名称'); return; }
  if (!values.length){ showAlert('请至少添加一个值'); return; }
  // 校验：当前工具内不允许存在重名词条（排除正在编辑的这条）
  const existing = (toolEditorData?.entries||[]).map((e, idx)=> ({ idx, name: (e?.name||'').trim() }));
  const dup = existing.find(e=> e.name && e.name===name && idxNotSelf(e.idx));
  function idxNotSelf(idx){ return !(entryEditingIndex!=null && idx===entryEditingIndex); }
  if (dup){ showAlert(`已存在同名的词条：“${name}”。请更换名称后再保存。`); return; }
  const data = { name, values };
  if (entryEditingIndex!=null) toolEditorData.entries[entryEditingIndex] = data;
  else toolEditorData.entries.push(data);
  renderEntryCards();
  closeEntryEditor();
}
function renderEntryCards(){
  const host = toolEditorModal.querySelector('#entryCards');
  host.innerHTML = '';
  const grid = document.createDocumentFragment();
  (toolEditorData.entries||[]).forEach((en, i)=>{
    const card = document.createElement('div');
    card.className = 'entry-card';
    const chips = (en.values||[]).slice(0,6).map(v=> `<span class="chipv">${escapeHtml(v)}</span>`).join('');
    const more = (en.values||[]).length>6? `<span class="chipv more">+${(en.values.length-6)}</span>`:'';
    card.innerHTML = `
      <div class="entry-card-head">
        <strong class="nm">${escapeHtml(en.name||'未命名')}</strong>
        <div class="ops">
          <button class="ghost mini edit" title="编辑">${ICONS.edit}</button>
          <button class="ghost mini del" title="删除">${ICONS.del}</button>
        </div>
      </div>
      <div class="entry-card-body">${chips}${more || (!chips? '<span class="muted">无可选值</span>':'')}</div>
      <div class="entry-card-tip muted">点击卡片可复制标签：[${escapeHtml(en.name||'未命名')}]</div>
    `;
    // 卡片点击复制标签（排除操作按钮区域）
    card.addEventListener('click', (e)=>{
      if (e.target.closest('.ops') || e.target.closest('button')) return;
      const name = en.name || '未命名';
      const tag = `[${name}]`;
      copyToClipboard(tag);
      const tip = card.querySelector('.entry-card-tip');
      const prev = tip.innerHTML;
      tip.style.opacity = '0.6';
      tip.classList.add('copied');
      tip.innerHTML = `${ICONS.check} 已复制`;
      setTimeout(()=>{ tip.style.opacity = '1'; }, 50);
      setTimeout(()=>{ tip.classList.remove('copied'); tip.innerHTML = prev; }, 1200);
    });
    card.querySelector('.edit').addEventListener('click', ()=> openEntryEditor(i));
    card.querySelector('.del').addEventListener('click', async ()=>{
      const ok = await showConfirm('删除该词条？');
      if (!ok) return;
      toolEditorData.entries.splice(i,1);
      renderEntryCards();
    });
    grid.appendChild(card);
  });
  const add = document.createElement('button');
  add.className = 'entry-card add-card';
  add.innerHTML = '<div class="plus">+</div><div class="muted">添加新的随机词条</div>';
  add.addEventListener('click', ()=> openEntryEditor(null));
  grid.appendChild(add);
  host.appendChild(grid);
}

function openToolEditor(index){
  ensureToolEditor();
  toolEditingIndex = (typeof index==='number')? index : null;
  const tools = loadTools();
  toolEditorData = JSON.parse(JSON.stringify((toolEditingIndex!=null)? tools[toolEditingIndex] : defaultTool()));
  toolEditorModal.querySelector('#toolTitleInput').value = toolEditorData.title || '';
  toolEditorModal.querySelector('#toolContentInput').value = toolEditorData.content || '';
  renderEntryCards();
  showModal(toolEditorModal);
}

function closeToolEditor(){ hideModal(toolEditorModal); }

function saveToolFromEditor(){
  const title = (toolEditorData?.title||'').trim();
  const content = (toolEditorData?.content||'').trim();
  const entries = Array.isArray(toolEditorData?.entries)? toolEditorData.entries.filter(e=> e && e.name && (e.values||[]).length) : [];
  if (!title){ showAlert('请填写工具名称'); return; }
  if (!content){ showAlert('请填写内容（可包含 [标签]）'); return; }
  // 校验：同一工具内词条名称不得重复
  const names = entries.map(e=> (e.name||'').trim());
  const seen = new Set();
  const dups = [];
  for (const n of names){
    if (!n) continue;
    if (seen.has(n)) dups.push(n); else seen.add(n);
  }
  if (dups.length){
    const list = Array.from(new Set(dups)).join('、');
    showAlert(`存在重复的词条名称：${list}。请修改后再保存。`);
    return;
  }
  // 若内容包含标签，则至少一条对应词条存在
  const tagNames = Array.from((content.match(/\[[^\[\]]+\]/g)||[])).map(s=> s.slice(1,-1));
  if (tagNames.length){
    const namesSet = new Set(entries.map(e=>e.name));
    const missing = tagNames.filter(n=> !namesSet.has(n));
  if (missing.length){ showAlert(`以下标签缺少词条定义：${missing.join('、')}`); return; }
  }
  const tools = loadTools();
  const data = { id: (toolEditingIndex!=null? (tools[toolEditingIndex]?.id) : (crypto.randomUUID?.() || String(Date.now()+Math.random()))), title, content, entries };
  if (toolEditingIndex!=null) tools[toolEditingIndex] = data; else tools.push(data);
  saveTools(tools);
  renderRandomTools();
  closeToolEditor();
}

function drawTool(tool){
  const content = (tool && tool.content || '').trim();
  const entries = Array.isArray(tool?.entries)? tool.entries : [];
  if (!content) return null;
  const map = new Map(entries.map(e=> [e.name, e.values||[]]));
  const tagRegex = /\[([^\[\]]+)\]/g;
  // 先收集需要替换的标签名
  const uniqueTags = new Set();
  let m; while ((m = tagRegex.exec(content))){ uniqueTags.add(m[1]); }
  const pickMap = new Map();
  for (const name of uniqueTags){
    const arr = map.get(name) || [];
    if (!arr.length) continue; // 未定义则跳过保留原样
    const pick = arr[Math.floor(Math.random()*arr.length)];
    pickMap.set(name, pick);
  }
  const text = content.replace(tagRegex, (_, name)=> pickMap.has(name)? pickMap.get(name) : `[${name}]`);
  return { text, selections: Object.fromEntries(pickMap.entries()) };
}

// END OF FILE

// 角色详情弹窗（图鉴点击）
const roleModal = document.createElement('div');
roleModal.className = 'modal role-modal';
roleModal.innerHTML = `
  <div class="dialog role-dialog">
    <button id="closeRoleX" class="modal-x" aria-label="关闭" title="关闭">×</button>
    <div class="role-header">
      <img id="roleAvatar" class="role-avatar" src="" alt="" />
      <h3 id="roleTitle" class="role-title"></h3>
    </div>
    <div id="roleUsageList" class="role-usage"></div>
    <div class="role-footer">
      <button id="removeRoleUsage" class="btn-glass btn-glass-danger">将此角色设为可用</button>
    </div>
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
roleModal.querySelector('#closeRoleX').addEventListener('click', closeRoleDetail);

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
  html += '</div>';
  if (!has){
    const img = pickEmptyImage();
    host.innerHTML = `<div class="empty-state" style="min-height:220px"><img src="${img}" alt="empty"/><div class="txt">暂无使用记录</div></div>`;
  } else {
    host.innerHTML = html;
  }
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
  if (document.getElementById('historySection')?.style.display==='block') renderHistory();
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
      let reason = '';
      if (conflict){
        if (bpMode==='personal'){
          reason = `P${p} 已使用过 ${nm}`;
        } else {
          const info = getLastUsageInfo(nm, true);
          if (info){
            const psTxt = info.ps.map(x=>`${x}P`).join(' / ');
            reason = `${nm} 在第${info.round}轮已被 ${psTxt} 使用`;
          } else {
            reason = `${nm} 已被使用（全局BP）`;
          }
        }
      }
      entries.push({ p, name:nm, avatarUrl, from:e.from||'auto', conflict, reason, editable:true });
    }
  }
  renderRoundPanel(entries);
}

roleModal.querySelector('#removeRoleUsage').addEventListener('click', ()=>{
  if (!roleModalCurrentName) return;
  clearRoleBPUpToCurrent(roleModalCurrentName);
});
