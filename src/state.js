window.Pet = window.Pet || {};
Pet.env = { W:0, H:0, DPR:1, R:35, floorY:0, ox:0, oy:0 };
Pet.util = {
  RAND:(a,b)=>a+Math.random()*(b-a),
  clamp:(v,a,b)=>v<a?a:(v>b?b:v),
  lerp:(a,b,t)=>a+(b-a)*t,
  shade(hex,amt){
    const n=parseInt(hex.slice(1),16);
    let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
    if(amt<0){const k=1+amt;r*=k;g*=k;b*=k;}
    else{r+=(255-r)*amt;g+=(255-g)*amt;b+=(255-b)*amt;}
    const h=x=>Math.round(Math.min(255,Math.max(0,x))).toString(16).padStart(2,'0');
    return '#'+h(r)+h(g)+h(b);
  },
};
const pet = {
  x:0,y:0,vx:0,vy:0,walkDir:1,
  mood:'neutral',moodUntil:0,nextAutoMood:0,
  behavior:'',behaviorUntil:0,behaviorStart:0,behaviorDur:1200,
  nextBehavior:3000,
  homeX:0,homeSet:false,goingHome:false,
  look:{x:0,y:0},openL:1,openR:1,
  blinkStart:0,blinkDur:0,nextBlink:0,
  saccadeUntil:0,saccade:{x:0,y:0},
  chasing:false,chaseUntil:0,shake:0,hopIdx:-1,turnAt:0,edgeDir:0,
};
Pet.state = {
  pet, excite:0, music:{playing:false}, now:0, lastNow:0,
  mouse:{x:0,y:0,active:false,px:0,py:0,vx:0,vy:0},
  dragging:false, dragDX:0, dragDY:0, dragMoved:false,
  downTime:0, downX:0, downY:0, hovering:false, downRelX:0, downRelY:0,
  ignoring:true, menuOpen:false,
  petStreak:0, petStreakT:0, lastPetted:0, pressHold:0,
  lastInteract:0, lastStartle:0, lastHeadTap:0, headTapCount:0,
  orbitHist:[], dance:{style:0,next:0,hopT:0},
  musicMood:{m:'happy',next:0}, typeHops:0, lastTrackId:'',
  bodyColor:(Pet.config.PALETTES[0] && Pet.config.PALETTES[0].body) || '#F6E7C6',
  eyeColor:(Pet.config.PALETTES[0] && Pet.config.PALETTES[0].eye) || '#6B4E33',
  settings:{},
  introStart:0, introDone:false, introDur:900,
  quitting:false, quitStart:0, quitDur:700,
  drawScale:1, drawAlpha:1,
};
Pet.env.cv = (typeof document !== 'undefined') ? document.getElementById('c') : null;
Pet.env.ctx = Pet.env.cv ? Pet.env.cv.getContext('2d') : null;
