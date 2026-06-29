// Simple physics simulator for parameter tuning
// Simulates one jump impulse and measures peak height and airtime

function simulate({gravity, jump, maxFallSpeed, fps = 60}) {
  // Match game's `update(delta)` which uses `delta` normalized to 60fps.
  // We'll run the sim with fixed delta = 1 (equivalent to one 60fps frame).
  const delta = 1;
  let y = 260; // start height (GAME_HEIGHT / 2)
  let v = 0;
  const startY = y;
  v = jump; // impulse at frame 0
  let minY = y;
  let frames = 0;
  const maxFrames = fps * 10; // 10 seconds cap
  while (frames < maxFrames) {
    frames++;
    // physics step matching game.js
    v += gravity * delta;
    if (v > maxFallSpeed) v = maxFallSpeed;
    y += v * delta;
    if (y < minY) minY = y;
    // stop when bird returns to or below start height after leaving it
    if (y >= startY && frames > 1) break;
  }
  const peakHeight = Math.max(0, startY - minY);
  const airtime = frames / fps;
  return {peakHeight, airtime, frames};
}

function scoreResult(res, target) {
  const hErr = (res.peakHeight - target.peak) / target.peak;
  const tErr = (res.airtime - target.time) / target.time;
  return Math.abs(hErr) + Math.abs(tErr);
}

function gridSearch() {
  const target = {peak: 90, time: 0.55};
  const results = [];
  for (let gravity = 0.25; gravity <= 0.6; gravity += 0.02) {
    for (let jump = -14; jump <= -6; jump += 0.4) {
      for (let maxFallSpeed = 8; maxFallSpeed <= 18; maxFallSpeed += 1) {
        const res = simulate({gravity, jump, maxFallSpeed});
        const s = scoreResult(res, target);
        results.push({gravity, jump, maxFallSpeed, res, score: s});
      }
    }
  }
  results.sort((a,b)=>a.score-b.score);
  return results.slice(0,10);
}

if (require.main === module) {
  console.log('Starting grid search...');
  const best = gridSearch();
  console.log('Top candidates:');
  best.forEach((b,i)=>{
    console.log(i+1, 'gravity=', b.gravity.toFixed(3), 'jump=', b.jump.toFixed(3), 'maxFall=', b.maxFallSpeed, 'peak=', b.res.peakHeight.toFixed(1), 'airtime=', b.res.airtime.toFixed(3), 'score=', b.score.toFixed(4));
  });
}

module.exports = {simulate, gridSearch};
