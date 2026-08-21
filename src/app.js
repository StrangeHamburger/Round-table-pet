window.Pet = window.Pet || {};
(function () {
  const S = Pet.state;
  function loop(t) {
    S.now = t;
    const dt = S.lastNow ? Math.min(t - S.lastNow, 50) : 16.7;
    S.lastNow = t;
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
    requestAnimationFrame(loop);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
