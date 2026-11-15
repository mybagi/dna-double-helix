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
  const restTime = 2.65;
  const shades = [
    [86, 144, 255], [67, 201, 255], [75, 249, 210], [114, 128, 255],
    [177, 100, 255], [247, 110, 203], [255, 155, 136], [255, 209, 139],
  ];
  const lightSprites = shades.map(lightSprite);
  const colorInk = shades.map(color => `rgb(${color.join(',')})`);
  const ink = shades.map(color => `rgb(${color.map(channel => Math.round(mix(channel, 255, .26))).join(',')})`);
  const coreInk = shades.map(color => `rgb(${color.map(channel => Math.round(mix(channel, 255, .57))).join(',')})`);
  let state = 53621;

  function random() {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  }

  function strand(t, side) {
    const angle = pitch * (t - .5) + side * Math.PI;
    return { x: radius * Math.cos(angle), y: height * (.5 - t), z: radius * Math.sin(angle) };
  }

  function makeParticle(point, color, size, alpha, thickness, sparkle) {
    const orbit = random() * tau;
    const distance = 120 + 75 * random() ** .6;
    const ring = thickness * Math.sqrt(random());
    const direction = random() * tau;
    return {
      x: point.x + Math.cos(direction) * ring,
      y: point.y + (random() - .5) * ring,
      z: point.z + Math.sin(direction) * ring,
      orbit, distance, orbitDepth: (random() - .5) * 40,
      swirl: .68 + random() * .12,
      color, size, alpha, phase: random() * tau,
      sparkle,
      offsetX: 0, offsetY: 0,
      lastX: NaN, lastY: NaN,
    };
  }

  const particles = [];
  const backbones = [[], []];
  const rungs = [];

  for (let side = 0; side < 2; side++) {
    for (let i = 0; i <= 76; i++) backbones[side].push(strand(i / 76, side));
    for (let i = 0; i < 770; i++) {
      const t = (i + random()) / 770;
      const taper = .62 + .38 * Math.sin(t * Math.PI) ** .32;
      const thickness = (7 + 17 * random() ** 1.5) * taper;
      const sparkle = random() > .82;
      particles.push(makeParticle(strand(t, side), strandColor(side, t), .78 + random() ** 1.8 * 1.45,
        (.67 + random() * .33) * taper, thickness, sparkle));
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
    rungs.push({ a, b, colors: [colorInk[Math.round(2 * t)], colorInk[3 + Math.round(4 * t)]] });
    for (let j = 0; j < 19; j++) {
      const fraction = (j + .5 + (random() - .5) * .9) / 19;
      const point = { x: mix(a.x, b.x, fraction), y: a.y, z: mix(a.z, b.z, fraction) };
      const color = strandColor(fraction < .5 ? 0 : 1, t);
      particles.push(makeParticle(point, color, .62 + random() ** 2 * .86, .36 + random() * .37, 3.8, false));
    }
  }

  const stars = Array.from({ length: 83 }, () => ({
    angle: random() * tau, distance: 98 + 167 * random() ** .7,
    drift: .042 * (2 * random() - 1), radius: .31 + random() ** 2 * .77,
    alpha: .17 + .45 * random() ** 2, phase: random() * tau,
  }));
  let width = 1;
  let tall = 1;
  let scale = 1;
  let wide = false;
  let nebula;
  let time = motionPreference.matches ? restTime : 0;
  let frameId = 0;
  let previousFrame = 0;
  let paused = motionPreference.matches;
  let inView = true;
  let chinese = false;

  function lightSprite(color) {
    const size = 44;
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = size;
    const ink = sprite.getContext('2d');
    const half = size / 2;
    const [r, g, b] = color;
    const light = ink.createRadialGradient(half, half, 0, half, half, half);
    light.addColorStop(0, `rgb(${color.map(channel => Math.round(mix(channel, 255, .72))).join(',')})`);
    light.addColorStop(.14, `rgba(${r},${g},${b},.98)`);
    light.addColorStop(.29, `rgba(${r},${g},${b},.52)`);
    light.addColorStop(.54, `rgba(${r},${g},${b},.15)`);
    light.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ink.fillStyle = light;
    ink.fillRect(0, 0, size, size);
    return sprite;
  }

  function mix(a, b, f) { return a + (b - a) * f; }

  function ease(start, end, seconds) {
    const f = Math.max(0, Math.min(1, (seconds - start) / (end - start)));
    return f * f * f * (f * (f * 6 - 15) + 10);
  }

  function draw(seconds, dt) {
    const phase = seconds % 14;
    const assembly = ease(0, 1.7, seconds);
    const spread = ease(8.6, 10.45, phase) - ease(11, 13.18, phase);
    const morph = .11 * (1 - assembly) + .96 * spread;
    const turn = .61 + seconds * .11 + Math.PI / 2 * (ease(2.8, 4.8, phase) + ease(5.45, 7.4, phase) + 2 * Math.floor(seconds / 14));
    const ca = Math.cos(turn), sa = Math.sin(turn);
    const incline = .19 + .067 * Math.sin(seconds * .69);
    const ci = Math.cos(incline), si = Math.sin(incline);
    const tilt = (wide ? -1.34 : -.41) + .044 * Math.sin(seconds * .69);
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const orbitTilt = (wide ? .26 : .43) + .071 * Math.sin(seconds * .53);
    const co = Math.cos(orbitTilt), so = Math.sin(orbitTilt);
    const breath = 1 + .017 * Math.sin(seconds * 1.1);
    const centerX = width * .5;
    const centerY = tall * (wide ? .46 : .48) + 1.8 * Math.sin(seconds * .8);
    const displace = (pointer.inside && !paused ? 1 : 0) - pointer.strength;
    pointer.strength += displace * (1 - Math.exp(-8 * dt));

    const screen = { x: 0, y: 0, depth: 0, perspective: 1 };
    function project(x, y, z, f = 0, orbitX = 0, orbitY = 0, orbitZ = 0) {
      const a = x * ca + z * sa;
      const b = z * ca - x * sa;
      const c = y * ci + b * si;
      const d = b * ci - y * si;
      const depth = mix(d, orbitZ, f);
      const px = mix((a * ct - c * st) * breath, orbitX, f);
      const py = mix((a * st + c * ct) * breath, orbitY, f);
      screen.perspective = 493 / (493 - depth);
      screen.x = centerX + px * screen.perspective * scale;
      screen.y = centerY - py * screen.perspective * scale;
      screen.depth = Math.max(0, Math.min(1, (depth + 104) / 208));
      return screen;
    }

    context.clearRect(0, 0, width, tall);
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = .89 + .11 * Math.sin(seconds * .89);
    context.fillStyle = nebula;
    context.fillRect(0, 0, width, tall);
    context.fillStyle = '#bad2ff';
    const dustWidth = (wide ? 1.08 : .72) * scale;
    const dustHeight = (wide ? .56 : .88) * scale;
    for (const star of stars) {
      const angle = star.angle + seconds * star.drift;
      context.globalAlpha = star.alpha * (.63 + .37 * Math.sin(star.phase + seconds * 1.25));
      context.beginPath();
      context.arc(centerX + Math.cos(angle) * star.distance * dustWidth, centerY + Math.sin(angle) * star.distance * dustHeight,
        star.radius, 0, tau);
      context.fill();
    }
    context.globalAlpha = 1;

    context.globalCompositeOperation = 'lighter';
    context.lineCap = 'round';
    const bodyLight = (1 - morph) ** 3;
    if (bodyLight > .02) {
      for (const {a, b, colors} of rungs) {
        const start = project(a.x, a.y, a.z);
        const ax = start.x, ay = start.y, depth = start.depth;
        const end = project(b.x, b.y, b.z);
        const depthWeight = (depth + end.depth) / 2;
        const length = Math.hypot(end.x - ax, end.y - ay);
        const visibility = bodyLight * Math.min(1, length / 15);
        if (visibility <= .04) continue;
        const tint = context.createLinearGradient(ax, ay, end.x, end.y);
        tint.addColorStop(0, colors[0]);
        tint.addColorStop(.5, '#d1ddff');
        tint.addColorStop(1, colors[1]);
        context.strokeStyle = tint;
        context.beginPath();
        context.moveTo(ax, ay);
        context.lineTo(end.x, end.y);
        context.lineWidth = Math.max(2.4, (3 + 2 * depthWeight) * scale);
        context.globalAlpha = visibility * (.07 + .08 * depthWeight);
        context.stroke();
        context.lineWidth = Math.max(.85, (1.1 + .7 * depthWeight) * scale);
        context.globalAlpha = visibility * (.29 + .36 * depthWeight);
        context.stroke();
      }
      for (const [side, points] of backbones.entries()) {
        let previousX, previousY, previousDepth;
        for (const [index, point] of points.entries()) {
          const p = project(point.x, point.y, point.z);
          if (index > 0) {
            const fraction = index / (points.length - 1);
            const color = side ? 3 + Math.round(fraction * 4) : Math.round(fraction * 2);
            const depth = (previousDepth + p.depth) / 2;
            const taper = .76 + .24 * Math.sin(fraction * Math.PI);
            context.beginPath();
            context.moveTo(previousX, previousY);
            context.lineTo(p.x, p.y);
            context.strokeStyle = colorInk[color];
            context.lineWidth = Math.max(3.1, (6.8 + 5.1 * depth) * scale * taper);
            context.globalAlpha = bodyLight * (.07 + .15 * depth);
            context.stroke();
            context.strokeStyle = coreInk[color];
            context.lineWidth = Math.max(1, (1.45 + 1.75 * depth) * scale * taper);
            context.globalAlpha = bodyLight * (.41 + .5 * depth);
            context.stroke();
          }
          previousX = p.x;
          previousY = p.y;
          previousDepth = p.depth;
        }
      }
    }
    const repel = Math.max(33, 68 * scale);
    const count = width < 420 ? 1560 : particles.length;
    const returnFactor = dt > 0 ? 1 - Math.exp(-12 * dt) : 0;
    const tailMinimum = Math.max(.76, scale);
    const maxTail = 12 * scale;
    for (let i = 0; i < count; i++) {
      const particle = particles[Math.floor(i * particles.length / count)];
      let orbitX = 0, orbitY = 0, orbitDepth = 0;
      if (morph > .001) {
        const angle = particle.orbit + seconds * particle.swirl - (1 - assembly) * 1.8;
        const along = particle.distance * Math.cos(angle);
        const across = particle.distance * Math.sin(angle);
        orbitX = along * co - across * .43 * so;
        orbitY = along * so + across * .43 * co;
        orbitDepth = across * .29 + particle.orbitDepth;
      }
      const p = project(
        particle.x + 1.61 * Math.sin(seconds * 1.7 + particle.phase),
        particle.y + 1.17 * Math.sin(seconds * 1.2 + particle.phase),
        particle.z, morph, orbitX, orbitY, orbitDepth
      );
      let targetX = 0, targetY = 0;
      if (pointer.strength > .002) {
        const px = p.x - pointer.x, py = p.y - pointer.y;
        const distanceSquared = px * px + py * py;
        if (distanceSquared > .01 && distanceSquared < repel * repel) {
          const distance = Math.sqrt(distanceSquared);
          const shift = (1 - distance / repel) ** 2 * pointer.strength * 57 * scale / distance;
          targetX = px * shift;
          targetY = py * shift;
        }
      }
      particle.offsetX += (targetX - particle.offsetX) * returnFactor;
      particle.offsetY += (targetY - particle.offsetY) * returnFactor;
      const x = p.x + particle.offsetX, y = p.y + particle.offsetY;
      const brightness = Math.min(1, particle.alpha * (.66 + .78 * p.depth) * (.89 + .11 * Math.sin(seconds * 2.2 + particle.phase)));
      const core = Math.max(1.12, particle.size * (1.02 + .48 * p.depth) * scale * p.perspective);
      const sparkle = particle.sparkle && p.depth > .37;
      const diameter = core * (sparkle ? 7.1 : 4.85);
      context.globalAlpha = brightness;
      context.drawImage(lightSprites[particle.color], x - diameter / 2, y - diameter / 2, diameter, diameter);
      if (sparkle) {
        context.globalAlpha = brightness * .79;
        context.fillStyle = coreInk[particle.color];
        context.beginPath();
        context.arc(x, y, Math.max(.48, core * .41), 0, tau);
        context.fill();
      }
      if (dt > 0 && Number.isFinite(particle.lastX)) {
        const dx = x - particle.lastX, dy = y - particle.lastY;
        const speedSquared = dx * dx + dy * dy;
        if (speedSquared > tailMinimum * tailMinimum) {
          const tail = Math.min(1, maxTail / Math.sqrt(speedSquared));
          context.globalAlpha = brightness * .31;
          context.strokeStyle = ink[particle.color];
          context.lineWidth = Math.max(.56, core * .68);
          context.beginPath();
          context.moveTo(x - dx * tail, y - dy * tail);
          context.lineTo(x, y);
          context.stroke();
        }
      }
      particle.lastX = x;
      particle.lastY = y;
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
  }

  function resize() {
    width = Math.max(1, canvas.clientWidth);
    tall = Math.max(1, canvas.clientHeight);
    wide = width / tall > 1.52;
    scale = Math.min(width / (wide ? 413 : 354), tall / (wide ? 294 : 437));
    const ratio = Math.min(window.devicePixelRatio || 1, 1.8);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(tall * ratio);
    context.setTransform(canvas.width / width, 0, 0, canvas.height / tall, 0, 0);
    nebula = context.createRadialGradient(width / 2, tall * .48, 0, width / 2, tall * .48, Math.min(width * .46, tall * .47));
    nebula.addColorStop(0, 'rgba(48,65,200,.18)');
    nebula.addColorStop(.47, 'rgba(62,39,155,.073)');
    nebula.addColorStop(1, 'rgba(18,18,60,0)');
    draw(time, 0);
  }

  function tick(stamp) {
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
    if (paused && time < 1.7) time = restTime;
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
