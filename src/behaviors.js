window.Pet = window.Pet || {};

function setBehavior(t, dur = 1200){
  Pet.state.pet.behavior = t;
  Pet.state.pet.behaviorStart = performance.now();
  Pet.state.pet.behaviorDur = dur;
  Pet.state.pet.behaviorUntil = Pet.state.pet.behaviorStart + dur;
  // 任何行为（含互动触发）结束后，都要等一段空档再进下一个待机动作，
  // 避免刚触发的互动被随机的待机行为立即覆盖。
  Pet.state.pet.nextBehavior = Pet.state.pet.behaviorUntil + Pet.util.RAND(2000, 5000) * (1 - Pet.state.excite * 0.5);
}

function startBlink(t){
  Pet.state.pet.blinkStart = t;
  Pet.state.pet.blinkDur = 160;
  Pet.state.pet.nextBlink = t + Pet.state.pet.blinkDur + Pet.util.RAND(2000, 4500);
}

function randomMood(){ return Pet.config.AUTO_MOODS[(Math.random() * Pet.config.AUTO_MOODS.length) | 0]; }

function updateBehavior(){
  if (Pet.state.music.playing) return; // 音乐播放时不随机待机，专心跳舞
  if (Pet.state.now < Pet.state.pet.nextBehavior) return;

  // 按权重随机选一个行为
  let pick = Math.random() * Pet.config.BEHAVIOR_TOTAL, chosen = null;
  for (const b of Pet.config.BEHAVIORS){
    pick -= b[2];
    if (pick <= 0){ chosen = b; break; }
  }
  if (!chosen) chosen = Pet.config.BEHAVIORS[Pet.config.BEHAVIORS.length - 1];
  const [name, dur] = chosen;
  setBehavior(name, dur);

  // 各行为的启动效果（初速度/方向等）
  if (name === '蹦了一下'){ Pet.state.pet.vy = -6; }
  else if (name === '伸了个懒腰'){ Pet.state.pet.vy = -4; }
  else if (name === '突然抽风'){ Pet.state.pet.vx = (Math.random() < 0.5 ? -1 : 1) * 2; }
  else if (name === '自己吓自己'){ Pet.state.pet.vx = (Math.random() < 0.5 ? -1 : 1) * 5; Pet.state.pet.vy = -6; }
  else if (name === '满屏疯跑'){
    Pet.state.pet.vx = (Math.random() < 0.5 ? -1 : 1) * Pet.util.RAND(5, 9);
    Pet.state.pet.vy = -Pet.util.RAND(3, 7);
    Pet.state.pet.turnAt = Pet.state.now + Pet.util.RAND(800, 1600);
  }
  else if (name === '钻地探头'){
    Pet.state.pet.vx = 0; Pet.state.pet.vy = 0;
  }
  else if (name === '钻进鼠标'){
    Pet.state.pet.vx = 0; Pet.state.pet.vy = 0;
  }
  else if (name === '穿屏瞬移'){
    Pet.state.pet.vx = 0; Pet.state.pet.vy = 3;
  }
  else if (name === '高空坠落'){
    Pet.state.pet.y = -Pet.env.R * 2;
    Pet.state.pet.x = Pet.util.RAND(Pet.env.R, Pet.env.W - Pet.env.R);
    Pet.state.pet.vx = 0; Pet.state.pet.vy = 0;
  }
  else if (name === '边缘偷看'){
    Pet.state.pet.edgeDir = Math.random() < 0.5 ? -1 : 1;
    Pet.state.pet.vx = 0; Pet.state.pet.vy = 0;
  }
  else if (name === '斗鸡眼挑衅'){
    Pet.state.pet.vx = 0; Pet.state.pet.vy = 0;
  }
  else if (name === '假摔碰瓷'){
    Pet.state.pet.vx = (Math.random() < 0.5 ? -1 : 1) * Pet.util.RAND(4, 7);
    Pet.state.pet.vy = -3;
  }
  else if (name === '眼珠乱转'){
    Pet.state.pet.vx = 0; Pet.state.pet.vy = 0;
  }
}

function updateMood(){
  // 音乐播放且不在互动动作里 → 表情慢速轮换（避免眼睛变太快）
  if (Pet.state.music.playing && Pet.state.now >= Pet.state.pet.behaviorUntil){
    if (Pet.state.now >= Pet.state.musicMood.next){
      Pet.state.musicMood.next = Pet.state.now + Pet.util.RAND(2500, 5000);
      const arr = ['happy', 'surprised', 'sleep', 'wink', 'dazed', 'pleading'];
      Pet.state.musicMood.m = arr[(Math.random() * arr.length) | 0];
    }
    Pet.state.pet.mood = Pet.state.musicMood.m;
    return;
  }
  if (Pet.state.now >= Pet.state.pet.moodUntil && Pet.state.now >= Pet.state.pet.nextAutoMood){
    Pet.state.pet.nextAutoMood = Pet.state.now + Pet.util.RAND(6000, 12000) * (1 - Pet.state.excite * 0.4);
    Pet.state.pet.mood = randomMood();
    Pet.state.pet.moodUntil = Pet.state.now + Pet.util.RAND(1500, 3000);
  }
  if (Pet.state.now < Pet.state.pet.behaviorUntil){
    if (Pet.state.pet.behavior === '打了个哈欠') Pet.state.pet.mood = 'sleepy';
    else if (Pet.state.pet.behavior === '伸了个懒腰') Pet.state.pet.mood = 'sleepy';
    else if (Pet.state.pet.behavior === '叹了口气') Pet.state.pet.mood = 'sad';
    else if (Pet.state.pet.behavior === '打了个喷嚏') Pet.state.pet.mood = 'surprised';
    else if (Pet.state.pet.behavior === '打滚') Pet.state.pet.mood = 'neutral';
    else if (Pet.state.pet.behavior === '发呆') Pet.state.pet.mood = 'sleepy';
    else if (Pet.state.pet.behavior === '打瞌睡') Pet.state.pet.mood = 'sleepy';
    else if (Pet.state.pet.behavior === '睡死打呼噜') Pet.state.pet.mood = 'sleep';
    else if (Pet.state.pet.behavior === '哼歌摇摆') Pet.state.pet.mood = 'happy';
    else if (Pet.state.pet.behavior === '卖萌') Pet.state.pet.mood = 'surprised';
    else if (Pet.state.pet.behavior === '数蚂蚁') Pet.state.pet.mood = 'neutral';
    else if (Pet.state.pet.behavior === '偷看你') Pet.state.pet.mood = 'neutral';
    else if (Pet.state.pet.behavior === '突然抽风') Pet.state.pet.mood = 'surprised';
    else if (Pet.state.pet.behavior === '神经质扫视') Pet.state.pet.mood = 'neutral';
    else if (Pet.state.pet.behavior === '自己吓自己') Pet.state.pet.mood = 'surprised';
    else if (Pet.state.pet.behavior === '斜眼挑衅') Pet.state.pet.mood = 'sneer';
    else if (Pet.state.pet.behavior === '冒泡泡') Pet.state.pet.mood = 'happy';
    // 新增待机的表情
    else if (Pet.state.pet.behavior === '打嗝') Pet.state.pet.mood = 'dazed';
    else if (Pet.state.pet.behavior === '望天发呆') Pet.state.pet.mood = 'dazed';
    else if (Pet.state.pet.behavior === '思考') Pet.state.pet.mood = 'neutral';
    else if (Pet.state.pet.behavior === '抖腿') Pet.state.pet.mood = 'neutral';
    else if (Pet.state.pet.behavior === '抓痒') Pet.state.pet.mood = 'happy';
    else if (Pet.state.pet.behavior === '打坐冥想') Pet.state.pet.mood = 'sleep';
    else if (Pet.state.pet.behavior === '连环喷嚏') Pet.state.pet.mood = 'surprised';
    else if (Pet.state.pet.behavior === '追尾巴') Pet.state.pet.mood = 'dizzy';
    // 特殊行为的表情
    else if (Pet.state.pet.behavior === '满屏疯跑') Pet.state.pet.mood = 'surprised';
    else if (Pet.state.pet.behavior === '钻地探头') Pet.state.pet.mood = 'surprised';
    else if (Pet.state.pet.behavior === '钻进鼠标') Pet.state.pet.mood = 'surprised';
    else if (Pet.state.pet.behavior === '穿屏瞬移') Pet.state.pet.mood = 'surprised';
    else if (Pet.state.pet.behavior === '高空坠落') Pet.state.pet.mood = 'surprised';
    else if (Pet.state.pet.behavior === '边缘偷看') Pet.state.pet.mood = 'neutral';
    else if (Pet.state.pet.behavior === '斗鸡眼挑衅') Pet.state.pet.mood = 'neutral';
    else if (Pet.state.pet.behavior === '假摔碰瓷') Pet.state.pet.mood = 'dizzy';
    else if (Pet.state.pet.behavior === '眼珠乱转') Pet.state.pet.mood = 'neutral';
  }
}

// 舞步：随音乐每 2~4 秒随机切换一种舞姿（只整体平移，不变形）
function updateDance(){
  if (!Pet.state.music.playing){ Pet.state.dance.style = 0; return; }
  if (Pet.state.now >= Pet.state.dance.next){
    Pet.state.dance.next = Pet.state.now + Pet.util.RAND(2000, 4000);
    Pet.state.dance.style = (Math.random() * 6) | 0;
  }
}

// 返回当前舞步的整体位移 {x, y}，供 draw() 平移身体
function danceOffset(){
  const t = Pet.state.now;
  switch (Pet.state.dance.style){
    case 0: // 蹦迪：上下蹦 + 左右小摆
      return { x: Math.sin(t * 0.005) * Pet.env.R * 0.10,
               y: -Math.abs(Math.sin(t * 0.008)) * Pet.env.R * 0.16 };
    case 1: // 摇摆：像钟摆一样左右大晃
      return { x: Math.sin(t * 0.006) * Pet.env.R * 0.22,
               y: -Math.abs(Math.sin(t * 0.012)) * Pet.env.R * 0.03 };
    case 2: // 点头打拍：上下点头
      return { x: 0,
               y: -Math.abs(Math.sin(t * 0.012)) * Pet.env.R * 0.12 };
    case 3: // 画圈：身体绕中心画小圆圈
      return { x: Math.cos(t * 0.008) * Pet.env.R * 0.14,
               y: Math.sin(t * 0.008) * Pet.env.R * 0.10 - Pet.env.R * 0.05 };
    case 4: // 扭动：左右快速小幅度扭
      return { x: Math.sin(t * 0.02) * Pet.env.R * 0.07,
               y: -Math.abs(Math.sin(t * 0.016)) * Pet.env.R * 0.06 };
    default: // 大跳：突然蹦起来（偶尔离地）
      const beat = Math.floor(t / 500) % 4;
      const ph = (t % 500) / 500;
      return { x: Math.sin(t * 0.004) * Pet.env.R * 0.06,
               y: beat === 0 ? -Math.sin(ph * Math.PI) * Pet.env.R * 0.30 : -Math.abs(Math.sin(t * 0.008)) * Pet.env.R * 0.05 };
  }
}

function updateLook(){
  if (Pet.state.now >= Pet.state.pet.saccadeUntil){
    Pet.state.pet.saccadeUntil = Pet.state.now + Pet.util.RAND(2500, 5000);
    const a = Pet.util.RAND(0, Math.PI * 2);
    Pet.state.pet.saccade = { x: Math.cos(a) * Pet.env.R * 0.5, y: Math.sin(a) * Pet.env.R * 0.5 };
  }
  let tx, ty;
  // 数蚂蚁：眼睛盯着地面上慢悠悠爬的"蚂蚁"
  if (Pet.state.pet.behavior === '数蚂蚁' && Pet.state.now < Pet.state.pet.behaviorUntil){
    tx = Math.sin(Pet.state.now * 0.0022) * Pet.env.R * 0.55;
    ty = Math.cos(Pet.state.now * 0.0017) * Pet.env.R * 0.35 + Pet.env.R * 0.25;
    Pet.state.pet.look.x = Pet.util.lerp(Pet.state.pet.look.x, tx, 0.05);
    Pet.state.pet.look.y = Pet.util.lerp(Pet.state.pet.look.y, ty, 0.05);
    return;
  }
  // 神经质扫视：眼睛高频快速左右扫
  if (Pet.state.pet.behavior === '神经质扫视' && Pet.state.now < Pet.state.pet.behaviorUntil){
    tx = Math.sin(Pet.state.now * 0.045) * Pet.env.R * 0.5;
    ty = Math.cos(Pet.state.now * 0.032) * Pet.env.R * 0.15;
    Pet.state.pet.look.x = Pet.util.lerp(Pet.state.pet.look.x, tx, 0.35);
    Pet.state.pet.look.y = Pet.util.lerp(Pet.state.pet.look.y, ty, 0.35);
    return;
  }
  // 偷看你：偷偷瞄一眼，幅度小
  if (Pet.state.pet.behavior === '偷看你' && Pet.state.now < Pet.state.pet.behaviorUntil){
    const dx = Pet.state.mouse.x - Pet.state.pet.x, dy = Pet.state.mouse.y - Pet.state.pet.y;
    const d = Math.hypot(dx, dy) || 1;
    tx = (dx / d) * Pet.env.R * 0.12 + Math.sin(Pet.state.now * 0.02) * Pet.env.R * 0.05;
    ty = (dy / d) * Pet.env.R * 0.10;
    Pet.state.pet.look.x = Pet.util.lerp(Pet.state.pet.look.x, tx, 0.06);
    Pet.state.pet.look.y = Pet.util.lerp(Pet.state.pet.look.y, ty, 0.06);
    return;
  }
  // 斜眼挑衅：眼睛一起斜向一侧
  if (Pet.state.pet.behavior === '斜眼挑衅' && Pet.state.now < Pet.state.pet.behaviorUntil){
    tx = Pet.env.R * 0.22; ty = Pet.env.R * 0.16;
    Pet.state.pet.look.x = Pet.util.lerp(Pet.state.pet.look.x, tx, 0.1);
    Pet.state.pet.look.y = Pet.util.lerp(Pet.state.pet.look.y, ty, 0.1);
    return;
  }
  // 望天发呆：眼睛朝上放空
  if (Pet.state.pet.behavior === '望天发呆' && Pet.state.now < Pet.state.pet.behaviorUntil){
    tx = Math.sin(Pet.state.now * 0.0015) * Pet.env.R * 0.08;
    ty = -Pet.env.R * 0.5;
    Pet.state.pet.look.x = Pet.util.lerp(Pet.state.pet.look.x, tx, 0.05);
    Pet.state.pet.look.y = Pet.util.lerp(Pet.state.pet.look.y, ty, 0.05);
    return;
  }
  // 思考：眼睛斜向上左右游移
  if (Pet.state.pet.behavior === '思考' && Pet.state.now < Pet.state.pet.behaviorUntil){
    tx = Math.sin(Pet.state.now * 0.0012) * Pet.env.R * 0.4;
    ty = -Pet.env.R * 0.42;
    Pet.state.pet.look.x = Pet.util.lerp(Pet.state.pet.look.x, tx, 0.06);
    Pet.state.pet.look.y = Pet.util.lerp(Pet.state.pet.look.y, ty, 0.06);
    return;
  }
  // 追尾巴：眼睛跟着身体绕圈
  if (Pet.state.pet.behavior === '追尾巴' && Pet.state.now < Pet.state.pet.behaviorUntil){
    const a = Pet.state.now * 0.006;
    tx = Math.cos(a) * Pet.env.R * 0.4;
    ty = Math.sin(a) * Pet.env.R * 0.3 + Pet.env.R * 0.1;
    Pet.state.pet.look.x = Pet.util.lerp(Pet.state.pet.look.x, tx, 0.3);
    Pet.state.pet.look.y = Pet.util.lerp(Pet.state.pet.look.y, ty, 0.3);
    return;
  }
  // 眼珠乱转：瞳孔高频乱跳
  if (Pet.state.pet.behavior === '眼珠乱转' && Pet.state.now < Pet.state.pet.behaviorUntil){
    tx = (Math.random() - 0.5) * Pet.env.R * 0.8;
    ty = (Math.random() - 0.5) * Pet.env.R * 0.6;
    Pet.state.pet.look.x = Pet.util.lerp(Pet.state.pet.look.x, tx, 0.5);
    Pet.state.pet.look.y = Pet.util.lerp(Pet.state.pet.look.y, ty, 0.5);
    return;
  }
  // 高空坠落：眼睛朝下看
  if (Pet.state.pet.behavior === '高空坠落' && Pet.state.now < Pet.state.pet.behaviorUntil){
    tx = 0; ty = Pet.env.R * 0.3;
    Pet.state.pet.look.x = Pet.util.lerp(Pet.state.pet.look.x, tx, 0.2);
    Pet.state.pet.look.y = Pet.util.lerp(Pet.state.pet.look.y, ty, 0.2);
    return;
  }
  // 边缘偷看：探出时眼珠朝屏幕里扫
  if (Pet.state.pet.behavior === '边缘偷看' && Pet.state.now < Pet.state.pet.behaviorUntil){
    const p2 = (Pet.state.now - Pet.state.pet.behaviorStart) / Pet.state.pet.behaviorDur;
    const peeking = (p2 >= 0.35 && p2 < 0.55) || (p2 >= 0.7 && p2 < 0.85);
    if (peeking){
      tx = Math.sin(Pet.state.now * 0.03) * Pet.env.R * 0.2 + (Pet.state.pet.edgeDir === -1 ? Pet.env.R * 0.1 : -Pet.env.R * 0.1);
      ty = Math.cos(Pet.state.now * 0.025) * Pet.env.R * 0.1;
      Pet.state.pet.look.x = Pet.util.lerp(Pet.state.pet.look.x, tx, 0.2);
      Pet.state.pet.look.y = Pet.util.lerp(Pet.state.pet.look.y, ty, 0.2);
      return;
    }
  }
  // 钻地探头：探头时东张西望
  if (Pet.state.pet.behavior === '钻地探头' && Pet.state.now < Pet.state.pet.behaviorUntil){
    const p2 = (Pet.state.now - Pet.state.pet.behaviorStart) / Pet.state.pet.behaviorDur;
    const peeking = (p2 >= 0.48 && p2 < 0.66) || (p2 >= 0.76 && p2 < 0.88);
    if (peeking){
      tx = Math.sin(Pet.state.now * 0.05) * Pet.env.R * 0.4;
      ty = Math.cos(Pet.state.now * 0.04) * Pet.env.R * 0.3 + Pet.env.R * 0.1;
      Pet.state.pet.look.x = Pet.util.lerp(Pet.state.pet.look.x, tx, 0.3);
      Pet.state.pet.look.y = Pet.util.lerp(Pet.state.pet.look.y, ty, 0.3);
      return;
    }
  }
  if (Pet.state.mouse.active){
    const dx = Pet.state.mouse.x - Pet.state.pet.x, dy = Pet.state.mouse.y - Pet.state.pet.y;
    const d = Math.hypot(dx, dy) || 1;
    const m = Math.min(d, Pet.env.R * 1.4);
    tx = (dx / d) * m * 0.24;
    ty = (dy / d) * m * 0.24;
  } else {
    tx = Math.sin(Pet.state.now * 0.0011) * Pet.env.R * 0.18 + Pet.state.pet.saccade.x;
    ty = Math.cos(Pet.state.now * 0.0009) * Pet.env.R * 0.14 + Pet.state.pet.saccade.y;
  }
  Pet.state.pet.look.x = Pet.util.lerp(Pet.state.pet.look.x, tx, 0.1);
  Pet.state.pet.look.y = Pet.util.lerp(Pet.state.pet.look.y, ty, 0.1);
}

function updateOpen(){
  let baseL = 1, baseR = 1;
  if (Pet.state.pet.mood === 'sleep'){ baseL = 0; baseR = 0; }
  else if (Pet.state.pet.mood === 'sleepy'){ baseL = 0.35; baseR = 0.35; }
  else if (Pet.state.pet.mood === 'dizzy'){ baseL = 0.3; baseR = 0.3; }

  const blinking = Pet.state.now < Pet.state.pet.blinkStart + Pet.state.pet.blinkDur;
  const canBlink = Pet.state.pet.mood !== 'sleep' && Pet.state.pet.mood !== 'sleepy';
  if (blinking && canBlink){
    const p = Pet.util.clamp((Pet.state.now - Pet.state.pet.blinkStart) / Pet.state.pet.blinkDur, 0, 1);
    const b = 1 - Math.sin(Math.PI * p);
    Pet.state.pet.openL = baseL * b; Pet.state.pet.openR = baseR * b;
  } else {
    Pet.state.pet.openL = Pet.util.lerp(Pet.state.pet.openL, baseL, 0.18);
    Pet.state.pet.openR = Pet.util.lerp(Pet.state.pet.openR, baseR, 0.18);
  }
}

// 特殊创意行为的物理（满屏疯跑/钻地探头/钻进鼠标/穿屏瞬移/高空坠落/边缘偷看/假摔碰瓷）
// 返回 true 表示本帧由该行为接管（跳过正常重力/碰撞/回家逻辑）
function specialPhysics(dt){
  const b = Pet.state.pet.behavior;
  if (Pet.state.now >= Pet.state.pet.behaviorUntil) return false;
  const p = Pet.util.clamp((Pet.state.now - Pet.state.pet.behaviorStart) / Pet.state.pet.behaviorDur, 0, 1);
  const k = dt / 16.7;

  if (b === '满屏疯跑'){
    // 每隔一段随机转向冲刺
    if (Pet.state.now >= Pet.state.pet.turnAt){
      Pet.state.pet.turnAt = Pet.state.now + Pet.util.RAND(800, 1800);
      Pet.state.pet.vx = (Math.random() < 0.5 ? -1 : 1) * Pet.util.RAND(5, 9);
      Pet.state.pet.vy = -Pet.util.RAND(2, 7);
    }
    Pet.state.pet.vy += 0.5 * k;
    Pet.state.pet.x += Pet.state.pet.vx * k;
    Pet.state.pet.y += Pet.state.pet.vy * k;
    Pet.state.pet.vx *= 0.985;
    if (Pet.state.pet.y >= Pet.env.floorY){ Pet.state.pet.y = Pet.env.floorY; Pet.state.pet.vy = -Math.abs(Pet.state.pet.vy) * 0.85; }
    if (Pet.state.pet.x < Pet.env.R){ Pet.state.pet.x = Pet.env.R; Pet.state.pet.vx = Math.abs(Pet.state.pet.vx); }
    if (Pet.state.pet.x > Pet.env.W - Pet.env.R){ Pet.state.pet.x = Pet.env.W - Pet.env.R; Pet.state.pet.vx = -Math.abs(Pet.state.pet.vx); }
    return true;
  }

  if (b === '钻地探头'){
    if (p < 0.20){ // 从底部钻下去（消失）
      Pet.state.pet.y = Pet.util.lerp(Pet.env.floorY, Pet.env.H + Pet.env.R * 2, p / 0.20);
      Pet.state.pet.x = Pet.util.clamp(Pet.state.pet.x + Math.sin(Pet.state.now * 0.02) * 0.5 * k, Pet.env.R, Pet.env.W - Pet.env.R);
      Pet.state.pet.vy = 0;
    } else if (p < 0.48){ // 屏幕外藏起来
      Pet.state.pet.y = Pet.env.H + Pet.env.R * 2;
      Pet.state.pet.vy = 0;
    } else if (p < 0.66){ // 从顶部探头出来（只露脑袋东张西望）
      const q = (p - 0.48) / 0.18;
      Pet.state.pet.y = Pet.util.lerp(Pet.env.H + Pet.env.R * 2, Pet.env.R * 0.12, q);
      Pet.state.pet.x = Pet.util.clamp(Pet.state.pet.x + Math.sin(Pet.state.now * 0.004) * 0.4 * k, Pet.env.R, Pet.env.W - Pet.env.R);
    } else if (p < 0.76){ // 缩回上面（消失）
      const q = (p - 0.66) / 0.10;
      Pet.state.pet.y = Pet.util.lerp(Pet.env.R * 0.12, -Pet.env.R * 1.5, q);
    } else if (p < 0.88){ // 再探头一次
      const q = (p - 0.76) / 0.12;
      Pet.state.pet.y = Pet.util.lerp(-Pet.env.R * 1.5, Pet.env.R * 0.12, q);
      Pet.state.pet.x = Pet.util.clamp(Pet.state.pet.x + Math.sin(Pet.state.now * 0.005) * 0.4 * k, Pet.env.R, Pet.env.W - Pet.env.R);
    } else { // 从顶部掉回地面
      Pet.state.pet.vy += 0.5 * k;
      Pet.state.pet.y += Pet.state.pet.vy * k;
      if (Pet.state.pet.y >= Pet.env.floorY){ Pet.state.pet.y = Pet.env.floorY; Pet.state.pet.vy = 0; }
    }
    return true;
  }

  if (b === '高空坠落'){
    Pet.state.pet.vy += 0.55 * k;
    Pet.state.pet.y += Pet.state.pet.vy * k;
    Pet.state.pet.x += Pet.state.pet.vx * k;
    Pet.state.pet.vx *= 0.99;
    if (Pet.state.pet.y >= Pet.env.floorY){
      Pet.state.pet.y = Pet.env.floorY;
      if (Math.abs(Pet.state.pet.vy) > 2.5){
        Pet.state.pet.vy = -Math.abs(Pet.state.pet.vy) * 0.62; // 弹性回弹，越弹越低
        Pet.state.pet.vx = (Math.random() < 0.5 ? -1 : 1) * Pet.util.RAND(1, 3);
      } else {
        Pet.state.pet.vy = 0; Pet.state.pet.vx = 0;
      }
    }
    if (Pet.state.pet.x < Pet.env.R){ Pet.state.pet.x = Pet.env.R; Pet.state.pet.vx = Math.abs(Pet.state.pet.vx); }
    if (Pet.state.pet.x > Pet.env.W - Pet.env.R){ Pet.state.pet.x = Pet.env.W - Pet.env.R; Pet.state.pet.vx = -Math.abs(Pet.state.pet.vx); }
    return true;
  }

  if (b === '边缘偷看'){
    const restX = Pet.state.pet.edgeDir === -1 ? Pet.env.R : Pet.env.W - Pet.env.R;
    const hideX = Pet.state.pet.edgeDir === -1 ? -Pet.env.R * 0.75 : Pet.env.W + Pet.env.R * 0.75;
    const peekX = Pet.state.pet.edgeDir === -1 ? -Pet.env.R * 0.15 : Pet.env.W + Pet.env.R * 0.15;
    Pet.state.pet.y = Pet.util.lerp(Pet.state.pet.y, Pet.env.floorY, 0.2);
    if (p < 0.35){ Pet.state.pet.x = Pet.util.lerp(Pet.state.pet.x, hideX, 0.08); }
    else if (p < 0.55){ Pet.state.pet.x = Pet.util.lerp(Pet.state.pet.x, peekX, 0.10); }
    else if (p < 0.70){ Pet.state.pet.x = Pet.util.lerp(Pet.state.pet.x, hideX, 0.12); }
    else if (p < 0.85){ Pet.state.pet.x = Pet.util.lerp(Pet.state.pet.x, peekX, 0.10); }
    else { Pet.state.pet.x = Pet.util.lerp(Pet.state.pet.x, restX, 0.08); }
    return true;
  }

  if (b === '假摔碰瓷'){
    Pet.state.pet.vy += 0.5 * k;
    Pet.state.pet.x += Pet.state.pet.vx * k;
    Pet.state.pet.y += Pet.state.pet.vy * k;
    Pet.state.pet.vx *= 0.92;
    if (Pet.state.pet.y >= Pet.env.floorY){
      Pet.state.pet.y = Pet.env.floorY;
      if (Pet.state.pet.vy > 0) Pet.state.pet.vy = -Math.abs(Pet.state.pet.vy) * 0.35;
    }
    if (Pet.state.pet.x < Pet.env.R){ Pet.state.pet.x = Pet.env.R; Pet.state.pet.vx = Math.abs(Pet.state.pet.vx) * 0.5; }
    if (Pet.state.pet.x > Pet.env.W - Pet.env.R){ Pet.state.pet.x = Pet.env.W - Pet.env.R; Pet.state.pet.vx = -Math.abs(Pet.state.pet.vx) * 0.5; }
    return true;
  }

  if (b === '钻进鼠标'){
    if (p < 0.20){ // 直接消失：朝光标方向沉入屏幕底边
      Pet.state.pet.y = Pet.util.lerp(Pet.env.floorY, Pet.env.H + Pet.env.R * 2, p / 0.20);
      Pet.state.pet.x = Pet.util.lerp(Pet.state.pet.x, Pet.state.mouse.x, 0.25);
      Pet.state.pet.vy = 0; Pet.state.pet.vx = 0;
    } else if (p < 0.58){ // 藏起来，光标处出现团子色小球（在 draw 里画）
      Pet.state.pet.y = Pet.env.H + Pet.env.R * 2;
    } else if (p < 0.78){ // 从光标处被"挤出来"：定位到光标，身体从小变大（draw 里控制大小）
      Pet.state.pet.x = Pet.state.mouse.x; Pet.state.pet.y = Pet.state.mouse.y;
      Pet.state.pet.vx = 0; Pet.state.pet.vy = 0;
    } else { // 完整团子从光标处掉回地面
      Pet.state.pet.vy += 0.5 * k;
      Pet.state.pet.y += Pet.state.pet.vy * k;
      if (Pet.state.pet.y >= Pet.env.floorY){ Pet.state.pet.y = Pet.env.floorY; Pet.state.pet.vy = -Math.abs(Pet.state.pet.vy) * 0.4; }
    }
    return true;
  }

  if (b === '穿屏瞬移'){
    if (p < 0.28){ // 从底部滑出（消失）
      Pet.state.pet.vy = 4;
      Pet.state.pet.x += Pet.state.pet.vx * k;
      Pet.state.pet.y += Pet.state.pet.vy * k;
    } else if (p < 0.72){ // 屏幕外藏起来
      Pet.state.pet.y = Pet.env.H + Pet.env.R * 3;
      Pet.state.pet.vy = 0;
    } else { // 从顶部边缘冒出来，落回地面
      if (Pet.state.pet.y > -Pet.env.R * 2){ Pet.state.pet.y = -Pet.env.R * 2; Pet.state.pet.vy = 1; Pet.state.pet.x = Pet.util.RAND(Pet.env.R, Pet.env.W - Pet.env.R); }
      Pet.state.pet.vy += 0.5 * k;
      Pet.state.pet.y += Pet.state.pet.vy * k;
      if (Pet.state.pet.y >= Pet.env.floorY){ Pet.state.pet.y = Pet.env.floorY; Pet.state.pet.vy = 0; }
    }
    return true;
  }

  return false;
}

Pet.behaviors = { setBehavior, startBlink, updateBehavior, updateMood, updateDance, updateLook, updateOpen, specialPhysics, danceOffset };
