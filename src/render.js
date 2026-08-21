window.Pet = window.Pet || {};

// ---------- 绘制 ----------
function drawBubbles(count, color){
  const now = Pet.state.now;
  const pet = Pet.state.pet;
  const R = Pet.env.R;
  // 在身体上方飘出一串小圆泡（Zzz / 泡泡），随时间上浮淡出
  const p0 = now - pet.behaviorStart;
  for (let i = 0; i < count; i++){
    const ph = ((p0 / 1500) + i / count) % 1;
    const bx = (i - (count - 1) / 2) * R * 0.42 + Math.sin(ph * Math.PI * 2 + i * 1.7) * R * 0.14;
    const by = -R * 0.4 - ph * R * 1.3;
    Pet.env.ctx.globalAlpha = Math.max(0, 0.55 * (1 - ph));
    Pet.env.ctx.fillStyle = color;
    Pet.env.ctx.beginPath();
    Pet.env.ctx.arc(bx, by, R * (0.07 + 0.05 * i), 0, Math.PI * 2);
    Pet.env.ctx.fill();
  }
  Pet.env.ctx.globalAlpha = 1;
}

function drawNotes(count){
  const now = Pet.state.now;
  const R = Pet.env.R;
  // 随音乐舞动时，头顶飘出 ♪ ♫ 音符，随节拍上浮淡出
  for (let i = 0; i < count; i++){
    const ph = ((now / 2200) + i / count) % 1;
    const nx = (i - (count - 1) / 2) * R * 0.5 + Math.sin(ph * Math.PI * 2 + i * 2.1) * R * 0.16;
    const ny = -R * 0.5 - ph * R * 1.5;
    Pet.env.ctx.globalAlpha = Math.max(0, 0.75 * (1 - ph));
    Pet.env.ctx.fillStyle = Pet.util.shade(Pet.state.bodyColor, 0.22);
    Pet.env.ctx.font = Math.round(R * 0.42) + 'px serif';
    Pet.env.ctx.textAlign = 'center';
    Pet.env.ctx.textBaseline = 'middle';
    Pet.env.ctx.fillText(i % 2 ? '♫' : '♪', nx, ny); // ♫ ♪
  }
  Pet.env.ctx.globalAlpha = 1;
}

function drawBeatRings(){
  const now = Pet.state.now;
  const R = Pet.env.R;
  // 随节拍从身体向外扩散的律动圆环（身体本身不变形，只是周围加光晕）
  const period = 900 / (Pet.state.music.rate || 1);
  const beat = (Pet.state.now % period) / period;
  for (let i = 0; i < 2; i++){
    const ph = (beat + i / 2) % 1;
    const rr = R * (1 + ph * 1.1);
    Pet.env.ctx.globalAlpha = Math.max(0, 0.35 * (1 - ph));
    Pet.env.ctx.strokeStyle = Pet.util.shade(Pet.state.bodyColor, 0.15);
    Pet.env.ctx.lineWidth = Math.max(1.5, R * 0.05 * (1 - ph));
    Pet.env.ctx.beginPath();
    Pet.env.ctx.arc(0, 0, rr, 0, Math.PI * 2);
    Pet.env.ctx.stroke();
  }
  Pet.env.ctx.globalAlpha = 1;
}

function capsule(cx, cy, len, thick, rot){
  Pet.env.ctx.save();
  Pet.env.ctx.translate(cx, cy);
  Pet.env.ctx.rotate(rot);
  const r = thick / 2;
  const hw = Math.max(0, (len - thick) / 2);
  if (hw < 0.5){
    Pet.env.ctx.beginPath(); Pet.env.ctx.arc(0, 0, r, 0, Math.PI * 2); Pet.env.ctx.fill(); Pet.env.ctx.stroke();
    Pet.env.ctx.restore(); return;
  }
  Pet.env.ctx.beginPath();
  Pet.env.ctx.moveTo(-hw, -r);
  Pet.env.ctx.lineTo( hw, -r);
  Pet.env.ctx.arc( hw, 0, r, -Math.PI / 2, Math.PI / 2);
  Pet.env.ctx.lineTo(-hw,  r);
  Pet.env.ctx.arc(-hw, 0, r,  Math.PI / 2, Math.PI * 1.5);
  Pet.env.ctx.closePath();
  Pet.env.ctx.fill();
  Pet.env.ctx.stroke();
  Pet.env.ctx.restore();
}

function drawEye(x, y, r, open, mood, side){
  Pet.env.ctx.fillStyle = Pet.state.eyeColor;
  Pet.env.ctx.strokeStyle = Pet.util.shade(Pet.state.eyeColor, -0.3);
  Pet.env.ctx.lineWidth = Math.max(1, r * 0.07);
  Pet.env.ctx.lineCap = 'round';

  const dot = (cx, cy, rr) => {
    Pet.env.ctx.beginPath(); Pet.env.ctx.arc(cx, cy, rr, 0, Math.PI * 2); Pet.env.ctx.fill(); Pet.env.ctx.stroke();
  };

  switch (mood){
    case 'happy':     capsule(x, y, r * 2.2, r * 0.42, -side * 0.30); return;
    case 'sad':       capsule(x, y, r * 2.2, r * 0.42,  side * 0.30); return;
    case 'surprised': dot(x, y, r * 1.35); return;
    case 'dizzy':     capsule(x, y, r * 2.0, r * 0.30, 0); return;
    case 'sleepy':    capsule(x, y, r * 2.0, r * 0.5, 0); return;
    case 'sleep':     capsule(x, y, r * 2.2, r * 0.2, 0); return;
    case 'sneer':     capsule(x, y, r * 1.8, r * 0.40, -0.55); return; // 斜眼：两只都往一边斜
    case 'wink':      return side < 0 ? capsule(x, y, r * 2.0, r * 0.35, 0) : dot(x, y, r); // 眨眼：一只眯一只圆
    case 'fierce':    capsule(x, y, r * 1.8, r * 0.35, -0.5); return; // 凶狠：细斜眼盯着猎物
    case 'angry':     capsule(x, y, r * 1.9, r * 0.5, side * 0.55); return; // 生气：斜眼成怒眉
    case 'dazed':     dot(x, y, r * 0.4); return; // 呆滞豆豆眼
    case 'pleading':  capsule(x, y, r * 2.3, r * 0.42, side * 0.45); return; // 委屈：向下弯的大眼
    default:
      const thick = Math.max(2 * r * open, r * 0.2);
      const len = 2 * r * (1 + (1 - open) * 0.3);
      capsule(x, y, len, thick, 0);
      return;
  }
}

function drawDrillMouse(p){
  const R = Pet.env.R;
  const now = Pet.state.now;
  const pet = Pet.state.pet;
  const mouse = Pet.state.mouse;
  // 身体圆 + 眼睛（供钻进鼠标的各个阶段复用，身体始终正圆）
  const body = (bx, by, sc) => {
    Pet.env.ctx.save();
    Pet.env.ctx.translate(bx, by);
    Pet.env.ctx.scale(sc, sc);
    Pet.env.ctx.fillStyle = Pet.state.bodyColor;
    Pet.env.ctx.strokeStyle = Pet.util.shade(Pet.state.bodyColor, -0.25);
    Pet.env.ctx.lineWidth = Math.max(2, R * 0.03);
    Pet.env.ctx.lineJoin = 'round';
    Pet.env.ctx.beginPath(); Pet.env.ctx.arc(0, 0, R, 0, Math.PI * 2); Pet.env.ctx.fill(); Pet.env.ctx.stroke();
    const sx = R * 0.34, eyeY = -R * 0.05, eyeR = R * 0.22;
    drawEye(-sx + pet.look.x, eyeY + pet.look.y, eyeR, pet.openL, pet.mood, -1);
    drawEye( sx + pet.look.x, eyeY + pet.look.y, eyeR, pet.openR, pet.mood,  1);
    Pet.env.ctx.restore();
  };

  if (p < 0.20){
    // 阶段一：朝光标沉入底部消失
    body(pet.x, pet.y, 1);
    return;
  }
  if (p < 0.58){
    // 阶段二：藏起来，光标处出现团子色小球（像光标变成了团子），微微呼吸
    const breathe = 1 + Math.sin(now * 0.02) * 0.12;
    const br = R * 0.42 * breathe;
    Pet.env.ctx.fillStyle = Pet.state.bodyColor;
    Pet.env.ctx.strokeStyle = Pet.util.shade(Pet.state.bodyColor, -0.25);
    Pet.env.ctx.lineWidth = Math.max(1.5, br * 0.06);
    Pet.env.ctx.beginPath(); Pet.env.ctx.arc(mouse.x, mouse.y, br, 0, Math.PI * 2); Pet.env.ctx.fill(); Pet.env.ctx.stroke();
    const ex = br * 0.32, ey = -br * 0.02, er = br * 0.22;
    Pet.env.ctx.fillStyle = Pet.state.eyeColor;
    Pet.env.ctx.beginPath(); Pet.env.ctx.arc(mouse.x - ex, mouse.y + ey, er, 0, Math.PI * 2); Pet.env.ctx.fill();
    Pet.env.ctx.beginPath(); Pet.env.ctx.arc(mouse.x + ex, mouse.y + ey, er, 0, Math.PI * 2); Pet.env.ctx.fill();
    return;
  }
  if (p < 0.78){
    // 阶段三：从光标处被"挤出来"，身体从小变大（仍是正圆）
    const q = (p - 0.58) / 0.20;
    body(pet.x, pet.y, Pet.util.lerp(0.15, 1, q));
    return;
  }
  // 阶段四：完整团子从光标处掉回地面
  body(pet.x, pet.y, 1);
}

function draw(){
  const pet = Pet.state.pet;
  const floorY = Pet.env.floorY;
  const R = Pet.env.R;
  const now = Pet.state.now;
  const mouse = Pet.state.mouse;
  const music = Pet.state.music;
  Pet.env.ctx.clearRect(0, 0, Pet.env.W, Pet.env.H);

  // 家的标记
  if (pet.homeSet){
    Pet.env.ctx.fillStyle = 'rgba(255,255,255,0.10)';
    Pet.env.ctx.beginPath(); Pet.env.ctx.arc(pet.homeX, floorY + R * 0.7, R * 0.25, 0, Math.PI * 2); Pet.env.ctx.fill();
  }

  // 地面阴影（特殊行为"消失"阶段不画阴影，避免露馅）
  const b0 = pet.behavior;
  let hidden = false;
  if (now < pet.behaviorUntil){
    const sp = (now - pet.behaviorStart) / pet.behaviorDur;
    if (b0 === '穿屏瞬移') hidden = sp >= 0.28 && sp < 0.72;
    else if (b0 === '钻地探头') hidden = (sp >= 0.20 && sp < 0.48) || (sp >= 0.66 && sp < 0.76);
    else if (b0 === '钻进鼠标') hidden = sp >= 0.20 && sp < 0.58;
  }
  if (!hidden){
    const shadowScale = 1 - Pet.util.clamp((floorY - pet.y) / 300, 0, 1) * 0.5;
    Pet.env.ctx.fillStyle = 'rgba(0,0,0,0.20)';
    Pet.env.ctx.beginPath();
    Pet.env.ctx.ellipse(pet.x, floorY + R * 0.85, R * 0.8 * shadowScale, R * 0.16 * shadowScale, 0, 0, Math.PI * 2);
    Pet.env.ctx.fill();
  }

  // 钻进鼠标：特殊绘制（消失 → 光标变团子色 → 挤出来 → 落地）
  if (b0 === '钻进鼠标' && now < pet.behaviorUntil){
    drawDrillMouse(Pet.util.clamp((now - pet.behaviorStart) / pet.behaviorDur, 0, 1));
    return;
  }

  const shakeX = pet.shake > 0.01 ? (Math.random() - 0.5) * pet.shake * 6 : 0;

  // 各行为的身体位移（身体仍是正圆，只是整体平移，不变形）
  const b = pet.behavior;
  const active = now < pet.behaviorUntil;
  let moffX = 0, moffY = 0;
  if (active){
    const p = Pet.util.clamp((now - pet.behaviorStart) / pet.behaviorDur, 0, 1);
    if (b === '哼歌摇摆'){
      moffX = Math.sin(now * 0.012) * R * 0.07;
      moffY = Math.sin(now * 0.024) * R * 0.02;
    } else if (b === '打瞌睡'){
      moffY = Math.sin(Pet.util.clamp(p * 1.4, 0, 1) * Math.PI) * R * 0.13; // 点头下沉再抬头
    } else if (b === '卖萌'){
      moffY = -Math.sin(p * Math.PI) * R * 0.07; // 小跳
    } else if (b === '被吓一跳'){
      moffY = -Math.sin(p * Math.PI) * R * 0.05;
    } else if (b === '睡死打呼噜'){
      moffY = Math.sin(now * 0.004) * R * 0.035; // 呼吸起伏
    } else if (b === '斜眼挑衅'){
      moffX = Math.sin(now * 0.02) * R * 0.06; // 贱兮兮地晃
    } else if (b === '被拍头'){
      moffY = Math.sin(p * Math.PI) * R * 0.06; // 头被拍得往下一点
    } else if (b === '被弹脑门'){
      moffX = Math.sin(p * Math.PI) * R * 0.08; // 弹得后仰
    } else if (b === '打嗝'){
      const tick = (now % 800) / 800;
      moffY = tick < 0.15 ? Math.sin(tick / 0.15 * Math.PI) * R * 0.06 : 0; // 一抽一抽
    } else if (b === '望天发呆'){
      moffY = -R * 0.03;
      moffX = Math.sin(now * 0.002) * R * 0.02;
    } else if (b === '思考'){
      moffX = Math.sin(now * 0.003) * R * 0.03; // 微微前后晃
    } else if (b === '抖腿'){
      moffX = Math.sin(now * 0.05) * R * 0.03; // 高频小抖
    } else if (b === '抓痒'){
      moffX = Math.sin(now * 0.03) * R * 0.08; // 左右蹭地
    } else if (b === '连环喷嚏'){
      const sp = (now % 700) / 700;
      moffY = sp < 0.12 ? -Math.sin(sp / 0.12 * Math.PI) * R * 0.1 : 0; // 连续打喷嚏
    } else if (b === '追尾巴'){
      moffX = Math.cos(now * 0.006) * R * 0.12; // 原地绕圈
      moffY = Math.sin(now * 0.006) * R * 0.06;
    } else if (b === '斗鸡眼挑衅'){
      // 朝鼠标方向缓缓凑近再退回
      const dx = mouse.x - pet.x, dy = mouse.y - pet.y;
      const d = Math.hypot(dx, dy) || 1;
      const lean = Math.sin(p * Math.PI) * R * 0.18;
      moffX = (dx / d) * lean;
      moffY = (dy / d) * lean;
    }
  }
  // 随音乐舞动：音乐播放且没有互动动作时，用当前舞步平移（仍只是整体平移，不变形）
  if (music.playing && !active){
    const d = Pet.behaviors.danceOffset();
    moffX = d.x;
    moffY = d.y;
  }

  Pet.env.ctx.save();
  Pet.env.ctx.translate(pet.x + shakeX + moffX, pet.y + moffY);

  // 身体：恒定正圆，永不形变
  Pet.env.ctx.fillStyle = Pet.state.bodyColor;
  Pet.env.ctx.strokeStyle = Pet.util.shade(Pet.state.bodyColor, -0.25);
  Pet.env.ctx.lineWidth = Math.max(2, R * 0.03);
  Pet.env.ctx.lineJoin = 'round';
  Pet.env.ctx.beginPath();
  Pet.env.ctx.arc(0, 0, R, 0, Math.PI * 2);
  Pet.env.ctx.fill();
  Pet.env.ctx.stroke();

  // 眼睛
  const sx = R * 0.34, eyeY = -R * 0.05, eyeR = R * 0.22;

  if (active && b === '打滚'){
    const p = Pet.util.clamp((now - pet.behaviorStart) / pet.behaviorDur, 0, 1);
    const roll = p * Math.PI * 2;
    const c = Math.cos(roll), s = Math.sin(roll);
    drawEye(-sx * c - eyeY * s, -sx * s + eyeY * c, eyeR, 1, 'neutral', -1);
    drawEye( sx * c - eyeY * s,  sx * s + eyeY * c, eyeR, 1, 'neutral',  1);
  } else if (active && b === '躲猫猫'){
    drawEye(-sx + pet.look.x, eyeY + pet.look.y, eyeR * 0.45, 1, 'neutral', -1);
    drawEye( sx + pet.look.x, eyeY + pet.look.y, eyeR * 0.45, 1, 'neutral',  1);
  } else {
    const cross = (b === '斗鸡眼挑衅') ? R * 0.16 : 0;
    drawEye(-sx + pet.look.x + cross, eyeY + pet.look.y, eyeR, pet.openL, pet.mood, -1);
    drawEye( sx + pet.look.x - cross, eyeY + pet.look.y, eyeR, pet.openR, pet.mood,  1);
  }

  // 睡死打呼噜 → Zzz；冒泡泡 → 圆泡泡
  if (active && b === '睡死打呼噜'){
    drawBubbles(3, 'rgba(255,255,255,0.65)');
  } else if (active && b === '冒泡泡'){
    drawBubbles(4, Pet.util.shade(Pet.state.bodyColor, 0.42));
  }

  // 思考 → 头顶飘省略号；打坐冥想 → 头顶飘圈
  if (active && b === '思考'){
    Pet.env.ctx.fillStyle = Pet.util.shade(Pet.state.bodyColor, 0.25);
    Pet.env.ctx.font = Math.round(R * 0.4) + 'px sans-serif';
    Pet.env.ctx.textAlign = 'center';
    Pet.env.ctx.textBaseline = 'middle';
    const dph = ((now - pet.behaviorStart) / 1200) % 1;
    for (let i = 0; i < 3; i++){
      const oy = -R * 0.55 - ((dph + i * 0.25) % 1) * R * 0.5;
      Pet.env.ctx.globalAlpha = Math.max(0, 0.7 * (1 - dph));
      Pet.env.ctx.fillText('·', (i - 1) * R * 0.18, oy);
    }
    Pet.env.ctx.globalAlpha = 1;
  } else if (active && b === '打坐冥想'){
    const mph = ((now - pet.behaviorStart) / 2200) % 1;
    for (let i = 0; i < 3; i++){
      const oy = -R * 0.5 - ((mph + i * 0.33) % 1) * R * 1.0;
      Pet.env.ctx.globalAlpha = Math.max(0, 0.5 * (1 - ((mph + i * 0.33) % 1)));
      Pet.env.ctx.strokeStyle = Pet.util.shade(Pet.state.bodyColor, 0.2);
      Pet.env.ctx.lineWidth = Math.max(1, R * 0.04);
      Pet.env.ctx.beginPath();
      Pet.env.ctx.arc(Math.sin(i * 2) * R * 0.12, oy, R * 0.08, 0, Math.PI * 2);
      Pet.env.ctx.stroke();
    }
    Pet.env.ctx.globalAlpha = 1;
  }

  // 被戳晕 / 被转晕 → 头顶绕圈的小圆点（晕乎乎）；只有这两个明确的"晕"行为才显示
  if (active && (b === '被戳晕了' || b === '被转晕')){
    for (let i = 0; i < 3; i++){
      const a = now * 0.01 + i * Math.PI * 2 / 3;
      const oxx = Math.cos(a) * R * 0.55;
      const oyy = Math.sin(a) * R * 0.32 - R * 0.7;
      Pet.env.ctx.fillStyle = Pet.util.shade(Pet.state.bodyColor, 0.30);
      Pet.env.ctx.beginPath();
      Pet.env.ctx.arc(oxx, oyy, R * 0.055, 0, Math.PI * 2);
      Pet.env.ctx.fill();
    }
  }

  // 随音乐舞动 → 律动圆环 + 头顶飘音符
  if (music.playing){
    drawBeatRings();
    drawNotes(5);
  }

  Pet.env.ctx.restore();
}

Pet.render = { draw, drawBubbles, drawNotes, drawBeatRings };
