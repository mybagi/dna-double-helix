initHelix(document.querySelector('#dna'))?.setLanguage(false);

function initHelix(canvas) {
  const figure = canvas.closest('figure');
  const context = canvas.getContext('2d');
  if (!context || !figure) return null;
  figure.classList.remove('fallback');

  const control = figure.querySelector('.motion');
  const controlLabel = control?.querySelector('.motion-label');
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { x: -1000, y: -1000, strength: 0, inside: false };
  const tau = Math.PI * 2;
  const pitch = 1.95 * tau;
  const radius = 74;
  const height = 347;
  const restTime = 0;
  const shades = [
    [86, 144, 255], [67, 201, 255], [75, 249, 210], [114, 128, 255],
    [177, 100, 255], [247, 110, 203], [255, 155, 136], [255, 209, 139],
  ];
  const colorInk = shades.map(color => `rgb(${color.join(',')})`);
  const ink = shades.map(color => `rgb(${color.map(channel => Math.round(mix(channel, 255, .31))).join(',')})`);
  const coreInk = shades.map(color => `rgb(${color.map(channel => Math.round(mix(channel, 255, .64))).join(',')})`);
  const depthSteps = 5;
  const buckets = () => Array.from({ length: shades.length * depthSteps }, () => []);
  const strandBatches = buckets();
  const rungBatches = buckets();
  const dotBatches = buckets();
  const brightBatches = buckets();
  let state = 53621;

  function random() {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  }

  function strand(t, side) {
    const angle = pitch * (t - .5) + side * Math.PI;
    return { x: radius * Math.cos(angle), y: height * (.5 - t), z: radius * Math.sin(angle) };
  }

  function makeParticle(point, color, thickness, sparkle) {
    const ring = thickness * Math.sqrt(random());
    const direction = random() * tau;
    return {
      x: point.x + Math.cos(direction) * ring,
      y: point.y + (random() - .5) * ring,
      z: point.z + Math.sin(direction) * ring,
      color, phase: random() * tau, sparkle, offsetX: 0, offsetY: 0,
      xOnScreen: 0, yOnScreen: 0, tailX: 0, tailY: 0,
    };
  }

  const particles = [];
  const backbones = [[], []];
  const rungs = [];

  for (let side = 0; side < 2; side++) {
    for (let i = 0; i <= 76; i++) backbones[side].push(strand(i / 76, side));
    for (let i = 0; i < 530; i++) {
      const t = (i + random()) / 530;
      const taper = .73 + .27 * Math.sin(t * Math.PI);
      const thickness = (11 + 9 * random()) * taper;
      particles.push(makeParticle(strand(t, side), strandColor(side, t), thickness, random() > .79));
    }
  }

  function strandColor(side, t) {
    const position = side === 0 ? 2.4 * t : 3.15 + 3.65 * t;
    return Math.min(7, Math.max(0, Math.round(position + (random() - .5) * 1.58)));
  }

  for (let i = 0; i < 22; i++) {
    const t = (i + .5) / 22;
    const a = strand(t, 0);
    const b = strand(t, 1);
    rungs.push({ a, b, middle: { x: 0, y: a.y, z: 0 }, colors: [Math.round(2 * t), 3 + Math.round(4 * t)] });
    for (let j = 0; j < 10; j++) {
      const fraction = (j + .5 + (random() - .5) * .72) / 10;
      const point = { x: mix(a.x, b.x, fraction), y: a.y, z: mix(a.z, b.z, fraction) };
      const color = strandColor(fraction < .5 ? 0 : 1, t);
      particles.push(makeParticle(point, color, 4.7, false));
    }
  }

  const stars = Array.from({ length: 64 }, () => ({
    angle: random() * tau, distance: 98 + 167 * random() ** .7,
    drift: .042 * (2 * random() - 1), radius: .31 + random() ** 2 * .77,
    alpha: .17 + .45 * random() ** 2, phase: random() * tau,
  }));
  let width = 1;
  let tall = 1;
  let scale = 1;
  let wide = false;
  let time = restTime;
  let frameId = 0;
  let previousFrame = 0;
  let paused = motionPreference.matches;
  let inView = true;
  let chinese = false;

  function mix(a, b, f) { return a + (b - a) * f; }

  function draw(seconds, dt) {
    const turn = .91 + seconds * .365;
    const ca = Math.cos(turn), sa = Math.sin(turn);
    const incline = .19 + .047 * Math.sin(seconds * .59);
    const ci = Math.cos(incline), si = Math.sin(incline);
    const tilt = (wide ? -1.32 : -.38) + .065 * Math.sin(seconds * .42);
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const breath = 1 + .009 * Math.sin(seconds * .96);
    const centerX = width * .5;
    const centerY = tall * .472 + Math.sin(seconds * .72) * 1.6;
    pointer.strength += ((pointer.inside && !paused ? 1 : 0) - pointer.strength) * (1 - Math.exp(-10 * dt));

    const screen = { x: 0, y: 0, depth: 0 };
    function project(point, wiggleX = 0, wiggleY = 0) {
      const x = point.x + wiggleX;
      const y = point.y + wiggleY;
      const a = x * ca + point.z * sa;
      const b = point.z * ca - x * sa;
      const c = y * ci + b * si;
      const d = b * ci - y * si;
      const zoom = 520 / (520 - d) * scale * breath;
      screen.x = centerX + (a * ct - c * st) * zoom;
      screen.y = centerY - (a * st + c * ct) * zoom;
      screen.depth = Math.max(0, Math.min(1, (d + 105) / 210));
      return screen;
    }

    function groupIndex(color, depth) {
      return Math.min(depthSteps - 1, Math.floor(depth * depthSteps)) * shades.length + color;
    }

    context.clearRect(0, 0, width, tall);
    context.fillStyle = '#a4bdf6';
    const dustWidth = (wide ? 1.1 : .78) * scale;
    const dustHeight = (wide ? .61 : .81) * scale;
    for (const star of stars) {
      const angle = star.angle + seconds * star.drift;
      const size = star.radius * 1.55;
      context.globalAlpha = star.alpha * (.57 + .43 * Math.sin(star.phase + seconds * 1.22));
      context.fillRect(centerX + Math.cos(angle) * star.distance * dustWidth,
        centerY + Math.sin(angle) * star.distance * dustHeight, size, size);
    }

    for (const group of strandBatches) group.length = 0;
    for (const group of rungBatches) group.length = 0;
    for (const group of dotBatches) group.length = 0;
    for (const group of brightBatches) group.length = 0;

    for (const {a, b, middle, colors} of rungs) {
      const start = project(a);
      const ax = start.x, ay = start.y, ad = start.depth;
      const joint = project(middle);
      const jx = joint.x, jy = joint.y, jd = joint.depth;
      const end = project(b);
      const first = rungBatches[groupIndex(colors[0], (ad + jd) * .5)];
      const second = rungBatches[groupIndex(colors[1], (end.depth + jd) * .5)];
      first.push(ax, ay, jx, jy);
      second.push(jx, jy, end.x, end.y);
    }

    for (let side = 0; side < backbones.length; side++) {
      const points = backbones[side];
      let lastX, lastY, lastDepth;
      for (let index = 0; index < points.length; index++) {
        const p = project(points[index]);
        if (index > 0) {
          const u = index / (points.length - 1);
          const color = side ? 3 + Math.round(u * 4) : Math.round(u * 2);
          strandBatches[groupIndex(color, (lastDepth + p.depth) * .5)].push(lastX, lastY, p.x, p.y);
        }
        lastX = p.x;
        lastY = p.y;
        lastDepth = p.depth;
      }
    }

    const repel = Math.max(32, 62 * scale);
    const strength = pointer.strength;
    const response = 1 - Math.exp(-14 * dt);
    const count = width < 420 ? 940 : particles.length;
    for (let index = 0; index < count; index++) {
      const particle = particles[Math.floor(index * particles.length / count)];
      const p = project(particle, Math.sin(seconds * 1.9 + particle.phase) * 1.43,
        Math.sin(seconds * 1.45 + particle.phase) * 1.08);
      let offsetX = 0, offsetY = 0;
      if (strength > .003) {
        const dx = p.x - pointer.x, dy = p.y - pointer.y;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq > .01 && distanceSq < repel * repel) {
          const distance = Math.sqrt(distanceSq);
          const falloff = 1 - distance / repel;
          const push = falloff * falloff * strength * 53 * scale / distance;
          offsetX = dx * push;
          offsetY = dy * push;
        }
      }
      particle.offsetX += (offsetX - particle.offsetX) * response;
      particle.offsetY += (offsetY - particle.offsetY) * response;

      const x = p.x + particle.offsetX, y = p.y + particle.offsetY;
      const dx = x - particle.xOnScreen, dy = y - particle.yOnScreen;
      particle.tailX = particle.tailY = 0;
      if (dt > 0) {
        const tailSq = dx * dx + dy * dy;
        if (tailSq > .23 && tailSq < 100) {
          particle.tailX = dx * .58;
          particle.tailY = dy * .58;
        }
      }
      particle.xOnScreen = x;
      particle.yOnScreen = y;

      const glowing = particle.sparkle && Math.sin(seconds * 1.3 + particle.phase) > -.66;
      const group = groupIndex(particle.color, p.depth);
      (glowing ? brightBatches[group] : dotBatches[group]).push(particle);
    }

    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.globalCompositeOperation = 'lighter';
    const detailScale = Math.max(.78, Math.min(1.55, scale));
    for (let index = 0; index < strandBatches.length; index++) {
      const color = index % shades.length;
      const depth = Math.floor(index / shades.length) / (depthSteps - 1);
      strokeSegments(rungBatches[index], ink[color], detailScale * (1.05 + .52 * depth), .30 + .25 * depth);
      strokeSegments(strandBatches[index], colorInk[color], detailScale * (3.4 + 1.95 * depth), .067 + .1 * depth, true);
      strokeSegments(strandBatches[index], ink[color], detailScale * (1.11 + .85 * depth), .38 + .38 * depth, true);
    }
    for (let index = 0; index < dotBatches.length; index++) {
      const color = index % shades.length;
      const depth = Math.floor(index / shades.length) / (depthSteps - 1);
      const dots = dotBatches[index], highlights = brightBatches[index];
      const diameter = detailScale * (1.06 + .77 * depth);
      if (highlights.length) strokeDots(highlights, colorInk[color], diameter * 2.9, .09 + .09 * depth);
      if (dots.length) strokeDots(dots, colorInk[color], diameter, .40 + .46 * depth);
      if (highlights.length) strokeDots(highlights, coreInk[color], diameter * 1.22, .63 + .34 * depth);
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
  }

  function strokeSegments(segments, tint, width, opacity, join = false) {
    if (!segments.length) return;
    context.beginPath();
    let lastX, lastY;
    for (let i = 0; i < segments.length; i += 4) {
      if (!join || segments[i] !== lastX || segments[i + 1] !== lastY) context.moveTo(segments[i], segments[i + 1]);
      lastX = segments[i + 2];
      lastY = segments[i + 3];
      context.lineTo(lastX, lastY);
    }
    context.strokeStyle = tint;
    context.lineWidth = width;
    context.globalAlpha = opacity;
    context.stroke();
  }

  function strokeDots(dots, tint, width, opacity) {
    context.beginPath();
    for (const dot of dots) {
      context.moveTo(dot.xOnScreen - dot.tailX, dot.yOnScreen - dot.tailY);
      context.lineTo(dot.xOnScreen + .015, dot.yOnScreen);
    }
    context.strokeStyle = tint;
    context.lineWidth = width;
    context.globalAlpha = opacity;
    context.stroke();
  }

  function resize() {
    width = Math.max(1, canvas.clientWidth);
    tall = Math.max(1, canvas.clientHeight);
    wide = width / tall > 1.52;
    scale = Math.min(width / (wide ? 413 : 354), tall / (wide ? 294 : 437));
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(820000 / (width * tall)));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(tall * ratio);
    context.setTransform(canvas.width / width, 0, 0, canvas.height / tall, 0, 0);
    draw(time, 0);
  }

  function tick(stamp) {
    if (previousFrame && stamp - previousFrame < 11.4) {
      frameId = requestAnimationFrame(tick);
      return;
    }
    const dt = previousFrame ? Math.min(.05, (stamp - previousFrame) / 1000) : 0;
    previousFrame = stamp;
    time += dt;
    draw(time, dt);
    frameId = requestAnimationFrame(tick);
  }

  function updateAnimation() {
    const running = !paused && inView && !document.hidden;
    if (running && !frameId) {
      previousFrame = 0;
      frameId = requestAnimationFrame(tick);
    } else if (!running && frameId) {
      cancelAnimationFrame(frameId);
      frameId = 0;
      previousFrame = 0;
    }
  }

  function updateControl() {
    if (!control) return;
    const label = paused ? (chinese ? '播放' : 'Play') : (chinese ? '暂停' : 'Pause');
    if (controlLabel) controlLabel.textContent = label;
    control.setAttribute('aria-pressed', String(paused));
    control.setAttribute('aria-label', chinese ? label + ' DNA 动画' : label + ' DNA animation');
  }

  function point(event) {
    const bounds = canvas.getBoundingClientRect();
    pointer.x = event.clientX - bounds.left;
    pointer.y = event.clientY - bounds.top;
    pointer.inside = true;
  }

  canvas.addEventListener('pointerdown', point);
  canvas.addEventListener('pointermove', point);
  canvas.addEventListener('pointerleave', () => { pointer.inside = false; });
  for (const name of ['pointercancel', 'pointerup']) {
    canvas.addEventListener(name, event => {
      if (event.pointerType !== 'mouse') pointer.inside = false;
    });
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(figure);
  else window.addEventListener('resize', resize);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      updateAnimation();
    }).observe(figure);
  }
  document.addEventListener('visibilitychange', updateAnimation);

  control?.addEventListener('click', () => {
    paused = !paused;
    updateAnimation();
    draw(time, 0);
    updateControl();
  });
  motionPreference.addEventListener('change', event => {
    paused = event.matches;
    if (paused) time = restTime;
    updateAnimation();
    draw(time, 0);
    updateControl();
  });

  if (control) control.hidden = false;
  resize();
  updateAnimation();
  return {
    setLanguage(value) { chinese = value; updateControl(); },
  };
}
