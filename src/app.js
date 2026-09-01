window.Pet = window.Pet || {};
(function () {
  const S = Pet.state;

  // 弹性缓出（开场“啵”地弹出，略带回弹）
  function elasticOut(p){
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    const c4 = (2 * Math.PI) / 3;
    return Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * c4) + 1;
  }

  function loop(t) {
    S.now = t;
    const dt = S.lastNow ? Math.min(t - S.lastNow, 50) : 16.7;
    S.lastNow = t;

    // 开场动画：从 0 弹性放大到 1，同时淡入
    // introStart 由设置加载完成后触发；在那之前保持不可见，避免“先满尺寸闪一下再弹入”
    if (!S.introDone){
      if (!S.introStart){
        S.drawScale = 0; S.drawAlpha = 0;
      } else {
        const p = Math.min(1, (t - S.introStart) / S.introDur);
        S.drawScale = elasticOut(p);
        S.drawAlpha = Math.min(1, p * 1.6);
        if (p >= 1){ S.introDone = true; S.drawScale = 1; S.drawAlpha = 1; }
      }
    } else {
      S.drawScale = 1; S.drawAlpha = 1;
    }

    // 退出动画：冻结一切动作，加速缩小 + 淡出，结束后再通知主进程真正退出
    if (S.quitting){
      S.now = S.quitStart; // 冻结：退出期间宠物保持静止
      const qp = Math.min(1, (t - S.quitStart) / S.quitDur);
      S.drawScale = 1 - qp * qp;
      S.drawAlpha = 1 - qp;
      Pet.render.draw();
      if (qp >= 1){ desktopAPI.quitNow(); return; }
      requestAnimationFrame(loop);
      return;
    }

    Pet.behaviors.updateBehavior();
    Pet.behaviors.updateMood();
    Pet.behaviors.updateDance();
    if (S.now >= S.pet.nextBlink && S.pet.mood !== 'sleep' && S.pet.mood !== 'sleepy') {
      Pet.behaviors.startBlink(S.now);
    }
    Pet.behaviors.updateLook();
    Pet.behaviors.updateOpen();
    Pet.physics.updatePhysics(dt);
    Pet.physics.updatePetting(dt);
    Pet.render.draw();
    requestAnimationFrame(loop);
  }

  function boot() {
    Pet.input.init();
    desktopAPI.onSavePosition(() => {
      desktopAPI.saveSettings({ lastX: Pet.state.pet.x, lastY: Pet.state.pet.y });
    });
    desktopAPI.onQuitRequest(() => {
      if (Pet.state.quitting) return;
      Pet.state.quitting = true;
      Pet.state.quitStart = performance.now();
      Pet.state.menuOpen = false;
      const menu = document.getElementById('menu');
      if (menu) menu.classList.remove('open');
    });
    requestAnimationFrame(loop);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
