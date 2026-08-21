window.Pet = window.Pet || {};

// 菜单 DOM（无独立命名空间，保持本地引用）
const menu = document.getElementById('menu');

function persist() {
  desktopAPI.saveSettings({
    bodyColor: Pet.state.bodyColor,
    eyeColor: Pet.state.eyeColor,
    size: Pet.env.R,
    homeSet: Pet.state.pet.homeSet,
    homeX: Pet.state.pet.homeX,
    lastX: Pet.state.pet.x,
    lastY: Pet.state.pet.y,
    autoStart: !!(Pet.state.settings && Pet.state.settings.autoStart),
    sound: !(Pet.state.settings && Pet.state.settings.sound === false),
  });
}

function resize(){
  Pet.env.DPR = window.devicePixelRatio || 1;
  Pet.env.W = window.innerWidth; Pet.env.H = window.innerHeight;
  Pet.env.cv.width = Pet.env.W * Pet.env.DPR; Pet.env.cv.height = Pet.env.H * Pet.env.DPR;
  Pet.env.cv.style.width = Pet.env.W + 'px'; Pet.env.cv.style.height = Pet.env.H + 'px';
  Pet.env.ctx.setTransform(Pet.env.DPR,0,0,Pet.env.DPR,0,0);
  applySize();
  if (!Pet.state.pet.x){ Pet.state.pet.x = Pet.env.W / 2; Pet.state.pet.y = Pet.env.floorY; }
  if (!Pet.state.pet.homeSet){ Pet.state.pet.homeX = Pet.env.W / 2; Pet.state.pet.homeSet = true; }
}
window.addEventListener('resize', resize);

function applySize(){
  const m = document.getElementById('mSize');
  Pet.env.R = Pet.util.clamp(parseInt(m.value) || 35, 21, 60);
  Pet.env.floorY = Pet.env.H - Pet.env.R - 8;
  if (Pet.state.pet.y > Pet.env.floorY) Pet.state.pet.y = Pet.env.floorY;
}

function setIgnore(v){
  if (v === Pet.state.ignoring) return;
  Pet.state.ignoring = v;
  desktopAPI.setIgnore(v);
}

function mouseOver(lx, ly){
  const d2 = (lx - Pet.state.pet.x) * (lx - Pet.state.pet.x) + (ly - Pet.state.pet.y) * (ly - Pet.state.pet.y);
  return d2 <= Pet.env.R * Pet.env.R;
}

function headTap(dx, dy){
  const t = performance.now();
  if (t - Pet.state.lastHeadTap < 500) Pet.state.headTapCount++; else Pet.state.headTapCount = 1;
  Pet.state.lastHeadTap = t;
  Pet.state.lastInteract = t;
  if (Pet.state.headTapCount >= 2){
    Pet.state.headTapCount = 0;
    Pet.state.excite = Pet.util.clamp(Pet.state.excite + 0.4, 0, 1);
    Pet.state.pet.mood = 'happy'; Pet.state.pet.moodUntil = t + 1100;
    Pet.state.pet.vy = -7;
    Pet.behaviors.setBehavior('被拍头', 1300);
  } else {
    Pet.state.excite = Pet.util.clamp(Pet.state.excite + 0.25, 0, 1);
    Pet.state.pet.mood = 'dizzy'; Pet.state.pet.moodUntil = t + 900;
    Pet.state.pet.vx = (dx < 0 ? 1 : -1) * 3;
    Pet.state.pet.vy = -4;
    Pet.behaviors.setBehavior('被弹脑门', 900);
  }
}

function bellyRub(){
  Pet.state.lastInteract = performance.now();
  Pet.state.excite = Pet.util.clamp(Pet.state.excite + 0.35, 0, 1);
  Pet.state.pet.shake = 1.4;
  Pet.state.pet.mood = 'happy'; Pet.state.pet.moodUntil = performance.now() + 1200;
  Pet.behaviors.setBehavior('被挠肚皮', 1400);
}

function tickle(){
  Pet.state.lastInteract = performance.now();
  Pet.state.excite = Pet.util.clamp(Pet.state.excite + 0.2, 0, 1);
  Pet.state.pet.shake = 1; Pet.state.pet.mood = 'happy'; Pet.state.pet.moodUntil = performance.now() + 1000;
  Pet.behaviors.setBehavior('被挠痒痒');
}

function clickSfx() {
  if (Pet.state.muted) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!Pet.state.audioCtx) Pet.state.audioCtx = new AC();
    const ctx = Pet.state.audioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(660, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.06);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
    o.connect(g); g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.09);
  } catch (e) {}
}

function clickPet(){
  Pet.state.lastInteract = performance.now();
  Pet.state.excite = Pet.util.clamp(Pet.state.excite + 0.35, 0, 1);
  Pet.state.pet.vy = -6;
  Pet.state.pet.mood = 'surprised'; Pet.state.pet.moodUntil = performance.now() + 600;
  Pet.behaviors.setBehavior('被点了一下');
  const t = performance.now();
  if (t - Pet.state.petStreakT < 800) Pet.state.petStreak++; else Pet.state.petStreak = 1;
  Pet.state.petStreakT = t;
  if (Pet.state.petStreak >= 3){
    Pet.state.pet.chasing = false;           // 连点3下会顺带触发 dblclick 的追逐，这里取消掉
    Pet.state.pet.mood = 'dizzy'; Pet.state.pet.moodUntil = t + 1500;
    Pet.behaviors.setBehavior('被戳晕了');
    Pet.state.petStreak = 0;
  }
}

function buildSwatches(){
  const box = document.getElementById('mSwatches');
  box.innerHTML = '';
  Pet.config.PALETTES.forEach((p, i) => {
    const b = document.createElement('button');
    b.className = 'sw' + (i === 0 ? ' active' : '');
    b.style.background = p.body;
    b.dataset.body = p.body;
    b.addEventListener('click', () => {
      Pet.state.bodyColor = p.body; Pet.state.eyeColor = p.eye;
      box.querySelectorAll('.sw').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      persist();
    });
    box.appendChild(b);
  });
}

function openMenu(){
  Pet.state.menuOpen = true;
  setIgnore(false);
  // 定位在宠物上方
  const mw = 224, mh = menu.offsetHeight || 300;
  let mx = Pet.state.pet.x - mw / 2;
  let my = Pet.state.pet.y - Pet.env.R - mh - 24;
  mx = Pet.util.clamp(mx, 12, Pet.env.W - mw - 12);
  if (my < 12) my = Pet.state.pet.y + Pet.env.R + 24;
  menu.style.left = mx + 'px';
  menu.style.top = my + 'px';
  menu.classList.add('open');
}
function closeMenu(){
  if (!Pet.state.menuOpen) return;
  Pet.state.menuOpen = false;
  menu.classList.remove('open');
  setIgnore(!mouseOver(Pet.state.mouse.x, Pet.state.mouse.y));
}

function init(){
  Pet.state.muted = false;
  Pet.state.bridgeAvailable = { music: true, keyboard: true };
  desktopAPI.onBridgeError(n => {
    if (n && Pet.state.bridgeAvailable[n] !== false) {
      Pet.state.bridgeAvailable[n] = false;
      console.warn('[团团] 桥接不可用: ' + n);
    }
  });
  desktopAPI.onMute(m => { Pet.state.muted = !!m; });

  desktopAPI.getInfo().then(info => { Pet.env.ox = info.x; Pet.env.oy = info.y; });

  // 音乐播放状态（GSMTC）：有音乐播放就跳舞
  desktopAPI.onMusic(s => {
    if (!s) return;
    Pet.state.bridgeAvailable.music = true;
    Pet.state.music.playing = !!s.playing;
    if (s.trackId && s.trackId !== Pet.state.lastTrackId) {
      Pet.state.lastTrackId = s.trackId;
      Pet.state.dance.style = 0;
      Pet.state.dance.next = 0;
      if (Pet.state.music.playing) {
        Pet.state.pet.vy = -5;
        Pet.behaviors.setBehavior('换新歌啦', 900);
      }
    }
    if (typeof s.playbackRate === 'number') Pet.state.music.rate = s.playbackRate;
  });

  // 打字检测：每按一个键攒一个小跳（身体原地轻跳，不乱跑）
  desktopAPI.onKey(s => {
    if (!s) return;
    Pet.state.typeHops += Math.min(s.newly || 0, 6);
  });

  // 全局光标
  desktopAPI.onCursor(p => {
    const lx = p.x - Pet.env.ox, ly = p.y - Pet.env.oy;
    if (!Pet.state.dragging){
      Pet.state.mouse.px = Pet.state.mouse.x; Pet.state.mouse.py = Pet.state.mouse.y;
      Pet.state.mouse.vx = lx - Pet.state.mouse.px; Pet.state.mouse.vy = ly - Pet.state.mouse.py;
      Pet.state.mouse.x = lx; Pet.state.mouse.y = ly; Pet.state.mouse.active = true;
    }
    if (!Pet.state.menuOpen && !Pet.state.dragging){
      const over = mouseOver(lx, ly);
      setIgnore(!over);
      Pet.state.hovering = over;
      Pet.env.cv.style.cursor = over ? 'grab' : 'default';
    }
    // 快速扫过它 → 受惊（眼睛瞪大、往后躲一下）
    const speed = Math.hypot(Pet.state.mouse.vx, Pet.state.mouse.vy);
    if (!Pet.state.menuOpen && !Pet.state.dragging && speed > 35 && mouseOver(lx, ly) && performance.now() - Pet.state.lastStartle > 1200){
      Pet.state.lastStartle = performance.now();
      Pet.state.pet.mood = 'surprised'; Pet.state.pet.moodUntil = performance.now() + 500;
      Pet.state.pet.vy = -5;
      Pet.state.pet.vx = (lx < Pet.state.pet.x ? 1 : -1) * 2.5;
      Pet.behaviors.setBehavior('被吓一跳', 700);
    }

    // 绕圈逗它 → 被转晕
    if (!Pet.state.menuOpen && !Pet.state.dragging){
      const d = Math.hypot(lx - Pet.state.pet.x, ly - Pet.state.pet.y);
      if (d < Pet.env.R * 2.6){
        Pet.state.orbitHist.push({ a: Math.atan2(ly - Pet.state.pet.y, lx - Pet.state.pet.x), t: performance.now() });
        if (Pet.state.orbitHist.length > 60) Pet.state.orbitHist.shift();
        const t0 = performance.now() - 1500;
        let total = 0;
        for (let i = 1; i < Pet.state.orbitHist.length; i++){
          if (Pet.state.orbitHist[i].t < t0) continue;
          let da = Pet.state.orbitHist[i].a - Pet.state.orbitHist[i - 1].a;
          while (da > Math.PI) da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          total += da;
        }
        if (Math.abs(total) > Math.PI * 2.2){
          Pet.state.orbitHist = [];
          Pet.state.lastInteract = performance.now();
          Pet.state.excite = Pet.util.clamp(Pet.state.excite + 0.3, 0, 1);
          Pet.state.pet.mood = 'dizzy'; Pet.state.pet.moodUntil = performance.now() + 1800;
          Pet.state.pet.shake = 1;
          Pet.behaviors.setBehavior('被转晕', 1800);
        }
      } else {
        Pet.state.orbitHist = [];
      }
    }
  });

  Pet.state.night = false;
  Pet.state.timeHour = -1;
  desktopAPI.onTime(t => {
    if (!t) return;
    Pet.state.timeHour = t.hour;
    if (Pet.state.settings && Pet.state.settings.timeAware) {
      Pet.state.night = (t.hour < 6 || t.hour >= 23);
    }
  });

  window.addEventListener('mousemove', e => {
    const lx = e.clientX, ly = e.clientY;
    Pet.state.mouse.px = Pet.state.mouse.x; Pet.state.mouse.py = Pet.state.mouse.y;
    Pet.state.mouse.vx = lx - Pet.state.mouse.px; Pet.state.mouse.vy = ly - Pet.state.mouse.py;
    Pet.state.mouse.x = lx; Pet.state.mouse.y = ly; Pet.state.mouse.active = true;
    if (Pet.state.dragging){
      const nx = lx - Pet.state.dragDX, ny = ly - Pet.state.dragDY;
      if (Math.hypot(nx - Pet.state.pet.x, ny - Pet.state.pet.y) > 6) Pet.state.dragMoved = true;
      Pet.state.pet.x = nx; Pet.state.pet.y = ny;
      Pet.state.pet.vx = Pet.state.mouse.vx; Pet.state.pet.vy = Pet.state.mouse.vy;
    }
  });

  window.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    if (Pet.state.menuOpen){
      if (!menu.contains(e.target)) closeMenu();
      return;
    }
    const dx = e.clientX - Pet.state.pet.x, dy = e.clientY - Pet.state.pet.y;
    Pet.state.downTime = performance.now();
    Pet.state.pressHold = Pet.state.downTime;
    Pet.state.downRelX = dx; Pet.state.downRelY = dy;
    if (dx * dx + dy * dy <= Pet.env.R * Pet.env.R){
      clickSfx();
      Pet.state.dragging = true; Pet.state.dragDX = dx; Pet.state.dragDY = dy; Pet.state.dragMoved = false;
      Pet.state.lastInteract = performance.now();
      Pet.env.cv.style.cursor = 'grabbing';
    }
  });

  window.addEventListener('mouseup', e => {
    if (Pet.state.menuOpen) return;
    const held = performance.now() - Pet.state.downTime;

    if (Pet.state.dragging){
      Pet.state.dragging = false;
      Pet.env.cv.style.cursor = 'grab';
      if (Pet.state.dragMoved){
        // 真拖拽：速度够快就甩飞
        if (Math.hypot(Pet.state.mouse.vx, Pet.state.mouse.vy) > 12){
          Pet.state.pet.vx = Pet.state.mouse.vx * 1.1; Pet.state.pet.vy = Pet.state.mouse.vy * 1.1 - 3;
          Pet.state.pet.mood = 'surprised'; Pet.state.pet.moodUntil = performance.now() + 700;
          Pet.behaviors.setBehavior('甩飞');
          Pet.state.lastInteract = performance.now();
        }
        setIgnore(!mouseOver(Pet.state.mouse.x, Pet.state.mouse.y));
        persist();
        return;
      }
      // 没有拖动（原地按下又松开）→ 当作点击 / 长按，继续往下判断
      setIgnore(!mouseOver(Pet.state.mouse.x, Pet.state.mouse.y));
    }

    const dx = e.clientX - Pet.state.pet.x, dy = e.clientY - Pet.state.pet.y;
    if (dx * dx + dy * dy <= Pet.env.R * Pet.env.R * 1.2){
      if (held < 260){
        if (Pet.state.downRelY < -Pet.env.R * 0.18) headTap(dx, dy);
        else clickPet();
      } else if (held >= 600){
        if (Pet.state.downRelY > Pet.env.R * 0.1) bellyRub();
        else tickle();
      }
    }
  });

  window.addEventListener('dblclick', e => {
    if (Pet.state.menuOpen) return;
    const dx = e.clientX - Pet.state.pet.x, dy = e.clientY - Pet.state.pet.y;
    if (dx * dx + dy * dy <= Pet.env.R * Pet.env.R){
      // 双击 → 追逐鼠标
      Pet.state.lastInteract = performance.now();
      Pet.state.pet.chasing = true;
      Pet.state.pet.chaseUntil = performance.now() + 6000;
      Pet.state.pet.mood = 'surprised'; Pet.state.pet.moodUntil = performance.now() + 600;
      Pet.behaviors.setBehavior('追着你跑');
    }
  });

  window.addEventListener('contextmenu', e => {
    e.preventDefault();
    openMenu();
  });

  document.getElementById('mHome').addEventListener('click', () => {
    Pet.state.pet.homeX = Pet.state.pet.x; Pet.state.pet.homeSet = true;
    Pet.state.pet.vy = -4; Pet.state.pet.mood = 'happy'; Pet.state.pet.moodUntil = performance.now() + 900;
    Pet.behaviors.setBehavior('记下家了');
    persist();
    closeMenu();
  });
  document.getElementById('mGoHome').addEventListener('click', () => {
    if (Pet.state.pet.homeSet){ Pet.state.pet.goingHome = true; Pet.state.pet.mood = 'neutral'; Pet.state.pet.moodUntil = 0; }
    closeMenu();
  });
  document.getElementById('mQuit').addEventListener('click', () => {
    desktopAPI.quit();
  });
  document.getElementById('mSize').addEventListener('input', () => {
    document.getElementById('mSizeVal').textContent = document.getElementById('mSize').value;
    applySize();
    persist();
  });

  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  buildSwatches();
  resize();

  desktopAPI.getSettings().then(s => {
    if (!s) return;
    if (s.bodyColor) Pet.state.bodyColor = s.bodyColor;
    if (s.eyeColor) Pet.state.eyeColor = s.eyeColor;
    if (s.size) { const m = document.getElementById('mSize'); if (m) m.value = s.size; applySize(); }
    if (s.homeSet) { Pet.state.pet.homeX = s.homeX; Pet.state.pet.homeSet = true; }
    if (typeof s.lastX === 'number') { Pet.state.pet.x = s.lastX; Pet.state.pet.y = s.lastY; }
    Pet.state.settings = Object.assign({}, Pet.state.settings, s);
    const sw = document.getElementById('mSwatches');
    if (sw) sw.querySelectorAll('.sw').forEach(b => {
      b.classList.toggle('active', !!b.dataset.body && !!Pet.state.bodyColor && b.dataset.body.toLowerCase() === Pet.state.bodyColor.toLowerCase());
    });
  });
}

Pet.input = { init };
