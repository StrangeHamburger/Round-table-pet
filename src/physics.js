window.Pet = window.Pet || {};

Pet.physics = (function(){

function updatePhysics(dt){
  Pet.state.excite = Pet.util.clamp(Pet.state.excite - dt * 0.0006, 0, 1); // 兴奋缓慢回落
  Pet.state.pet.shake *= 0.88; // 抖动始终衰减（菜单打开时也不冻结）
  if (Pet.state.dragging || Pet.state.menuOpen) return;

  if (Pet.behaviors.specialPhysics(dt)) return; // 特殊行为接管

  Pet.state.pet.vy += 0.5 * (dt / 16.7);
  Pet.state.pet.x += Pet.state.pet.vx * (dt / 16.7);
  Pet.state.pet.y += Pet.state.pet.vy * (dt / 16.7);
  Pet.state.pet.vx *= 0.92; Pet.state.pet.vy *= 0.98;

  // 砸到地面：用力下落时不再原地反弹，而是"扎地不见 → 下次从屏幕上方出现并落下"（一次性，落定后停住）
  if (Pet.state.pet.y >= Pet.env.floorY){
    if (Math.abs(Pet.state.pet.vy) > 2){
      const busy = Pet.state.pet.chasing || Pet.state.pet.goingHome || Pet.state.menuOpen;
      const free = Pet.state.now >= Pet.state.pet.behaviorUntil && Pet.state.pet.behavior !== '穿屏瞬移';
      if (!busy && free && Math.random() < 0.4){
        Pet.state.pet.y = Pet.env.floorY;
        Pet.state.pet.vy = 0;
        Pet.behaviors.setBehavior('穿屏瞬移', 1400);
      } else {
        Pet.state.pet.y = Pet.env.floorY; Pet.state.pet.vy *= -0.35;
      }
    } else {
      Pet.state.pet.y = Pet.env.floorY; Pet.state.pet.vy = 0;
    }
  }
  if (Pet.state.pet.x < Pet.env.R){ Pet.state.pet.x = Pet.env.R; Pet.state.pet.vx = Math.abs(Pet.state.pet.vx) * 0.7; }
  if (Pet.state.pet.x > Pet.env.W - Pet.env.R){ Pet.state.pet.x = Pet.env.W - Pet.env.R; Pet.state.pet.vx = -Math.abs(Pet.state.pet.vx) * 0.7; }

  // 追逐鼠标
  if (Pet.state.pet.chasing && Pet.state.now < Pet.state.pet.chaseUntil){
    const dx = Pet.state.mouse.x - Pet.state.pet.x;
    if (Math.abs(dx) > Pet.env.R * 0.8){
      Pet.state.pet.vx += (dx > 0 ? 1 : -1) * 0.8;
    } else {
      Pet.state.pet.vx = 0;
    }
    if (Math.abs(dx) <= Pet.env.R * 0.8 && Pet.state.pet.vy === 0){
      Pet.state.pet.chasing = false;
      Pet.state.pet.mood = 'happy'; Pet.state.pet.moodUntil = performance.now() + 900;
      Pet.behaviors.setBehavior('追上你啦');
      Pet.state.pet.vy = -5;
    }
  }
  if (Pet.state.pet.chasing && Pet.state.now >= Pet.state.pet.chaseUntil){ Pet.state.pet.chasing = false; }

  if (Pet.state.pet.goingHome){
    const d = Pet.state.pet.homeX - Pet.state.pet.x;
    if (Math.abs(d) > 3){
      Pet.state.pet.walkDir = d > 0 ? 1 : -1;
      Pet.state.pet.vx += Pet.state.pet.walkDir * 0.6;
    } else {
      Pet.state.pet.vx = 0; Pet.state.pet.x = Pet.state.pet.homeX;
      Pet.state.pet.goingHome = false;
      Pet.behaviors.setBehavior('到家啦', 900);
      Pet.state.pet.mood = 'happy'; Pet.state.pet.moodUntil = performance.now() + 900;
      Pet.state.pet.vy = -4;
    }
  }

  // 自动回家：离开家后静置一段时间，自己慢慢走回去
  if (!Pet.state.pet.goingHome && Pet.state.pet.homeSet && !Pet.state.dragging && !Pet.state.pet.chasing && !Pet.state.menuOpen){
    if (Math.abs(Pet.state.pet.x - Pet.state.pet.homeX) > Pet.env.R * 1.2 &&
        performance.now() - Pet.state.lastInteract > 6000 &&
        Math.abs(Pet.state.pet.vx) < 0.5 && Pet.state.pet.vy === 0){
      Pet.state.pet.goingHome = true;
      Pet.state.pet.mood = 'neutral'; Pet.state.pet.moodUntil = 0;
      Pet.behaviors.setBehavior('想起家了', 1500);
    }
  }

  if (Pet.state.pet.behavior === '打了个喷嚏' && Pet.state.now < Pet.state.pet.behaviorUntil){
    const p = (Pet.state.now - Pet.state.pet.behaviorStart) / Pet.state.pet.behaviorDur;
    if (p >= 0.6 && p < 0.62){ Pet.state.pet.vy = -7; }
  }

  // 突然抽风：连续快速不规则蹦跳
  if (Pet.state.pet.behavior === '突然抽风' && Pet.state.now < Pet.state.pet.behaviorUntil){
    const p = (Pet.state.now - Pet.state.pet.behaviorStart) / Pet.state.pet.behaviorDur;
    const hop = Math.floor(p * 3);
    if (hop !== Pet.state.pet.hopIdx && hop > 0){
      Pet.state.pet.hopIdx = hop;
      Pet.state.pet.vy = -9;
      Pet.state.pet.vx = (Math.random() < 0.5 ? -1 : 1) * Pet.util.RAND(2, 4);
    }
  }

  // 打字小跳：检测到敲键盘就跟着节奏轻轻跳（原地，不乱跑、不打扰其它状态）
  if (Pet.state.typeHops > 0 && !Pet.state.pet.chasing && !Pet.state.pet.goingHome && !Pet.state.music.playing &&
      Pet.state.pet.y >= Pet.env.floorY - 1 && Math.abs(Pet.state.pet.vy) < 1){
    Pet.state.typeHops--;
    Pet.state.pet.vy = -4.5;
    Pet.state.pet.vx += (Math.random() < 0.5 ? -1 : 1) * 0.4;
  }
}

function updatePetting(dt){
  if (Pet.state.mouse.active && !Pet.state.dragging && !Pet.state.menuOpen){
    const d = Math.hypot(Pet.state.mouse.x - Pet.state.pet.x, Pet.state.mouse.y - Pet.state.pet.y);
    if (d < Pet.env.R * 1.2 && Math.hypot(Pet.state.mouse.vx, Pet.state.mouse.vy) > 1 && Math.hypot(Pet.state.mouse.vx, Pet.state.mouse.vy) < 20){
      Pet.state.lastPetted += dt;
      if (Pet.state.lastPetted > 900){
        Pet.state.lastPetted = 0;
        Pet.state.pet.mood = 'happy'; Pet.state.pet.moodUntil = performance.now() + 900;
        Pet.behaviors.setBehavior('被摸得好舒服');
      }
    } else {
      Pet.state.lastPetted = 0;
    }
  }
}

return { updatePhysics, updatePetting };

})();
