initHelix(document.querySelector('#dna'))?.setLanguage(false);

function initHelix(canvas) {
  const figure = canvas.closest('figure');
  const context = canvas.getContext('2d');
  if (!context || !figure) return null;
  figure.classList.remove('fallback');

  const control = figure.querySelector('.motion');
  const controlLabel = control?.querySelector('.motion-label');
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { x: 0, y: 0, toX: 0, toY: 0, flowX: 0, flowY: 0, strength: 0, inside: false };
  const tau = Math.PI * 2;
  const pitch = 1.95 * tau;
  const radius = 74;
  const height = 347;
  const shades = [
    [86, 144, 255], [74, 195, 255], [73, 247, 218], [122, 132, 255],
    [175, 112, 255], [244, 115, 212], [255, 151, 143], [255, 209, 139],
  ];
  const colorInk = shades.map(color => colorString(color, .06));
  const coreInk = shades.map(color => colorString(color, .47));
  const depthSteps = 5;
  const makeBatches = () => Array.from({ length: shades.length * depthSteps }, () => []);
  const dotBatches = makeBatches();
  const highlightBatches = makeBatches();
  const crossbarBatches = makeBatches();
  let state = 53621;

  function mix(a, b, f) { return a + (b - a) * f; }

  function colorString(color, lift) {
    return 'rgb(' + color.map(channel => Math.round(mix(channel, 255, lift))).join(',') + ')';
  }

  function random() {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  }

  function ease(start, end, time) {
    const u = Math.min(1, Math.max(0, (time - start) / (end - start)));
    return u * u * u * (10 - 15 * u + 6 * u * u);
  }

  function strand(t, side) {
    const angle = pitch * (t - .5) + side * Math.PI;
    return { x: radius * Math.cos(angle), y: height * (.5 - t), z: radius * Math.sin(angle) };
  }

  function strandColor(side, t) {
    const position = side === 0 ? 2.4 * t : 3.1 + 3.85 * t;
    return Math.min(7, Math.max(0, Math.round(position + (random() - .5) * 1.45)));
  }

  function makeParticle(point, color, thickness, isCrossbar) {
    const spread = thickness * Math.sqrt(random());
    const direction = random() * tau;
    const phase = random() * tau;
    const orbit = .91 + (random() - .5) * .2;
    return {
      x: point.x + Math.cos(direction) * spread,
      y: point.y + (random() - .5) * spread,
      z: point.z + Math.sin(direction) * spread,
      orbitX: orbit * Math.cos(phase), orbitY: orbit * Math.sin(phase),
      color, phase, isCrossbar, bright: random() > .74,
      offsetX: 0, offsetY: 0, speedX: 0, speedY: 0,
      xOnScreen: 0, yOnScreen: 0, tailX: 0, tailY: 0,
    };
  }

  const particles = [];
  const strandCount = 1040;
  for (let side = 0; side < 2; side++) {
    for (let index = 0; index < strandCount; index++) {
      const t = (index + random()) / strandCount;
      const taper = .76 + .24 * Math.sin(t * Math.PI);
      const thickness = (6 + 16 * random() ** 1.4) * taper;
      particles.push(makeParticle(strand(t, side), strandColor(side, t), thickness, false));
    }
  }

  const pairs = 24;
  const pointsPerPair = 26;
  for (let index = 0; index < pairs; index++) {
    const t = (index + .5) / pairs;
    const a = strand(t, 0), b = strand(t, 1);
    for (let dot = 0; dot < pointsPerPair; dot++) {
      const q = (dot + .5 + (random() - .5) * .84) / pointsPerPair;
      const point = { x: mix(a.x, b.x, q), y: a.y, z: mix(a.z, b.z, q) };
      const color = strandColor(q < .5 ? 0 : 1, t);
      particles.push(makeParticle(point, color, 5.1, true));
    }
  }

  const stars = Array.from({ length: 70 }, () => ({
    angle: random() * tau, distance: 100 + 164 * random() ** .7,
    drift: .03 * (2 * random() - 1), radius: .28 + random() ** 2 * .7,
    alpha: .14 + .38 * random() ** 2, phase: random() * tau,
  }));
  let width = 1;
  let tall = 1;
  let scale = 1;
  let wide = false;
  let time = 0;
  let frameId = 0;
  let previousFrame = 0;
  let paused = motionPreference.matches;
  let inView = true;
  let chinese = false;

  function draw(seconds, dt) {
    const phase = seconds % 14;
    const morph = ease(6.75, 9.25, phase) - ease(10.9, 13.28, phase);
    const turn = .91 + seconds * .375;
    const ca = Math.cos(turn), sa = Math.sin(turn);
    const incline = .19 + .044 * Math.sin(seconds * .59);
    const ci = Math.cos(incline), si = Math.sin(incline);
    const tilt = (wide ? -1.32 : -.38) + .06 * Math.sin(seconds * .42);
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const breath = 1 + .02 * Math.sin(seconds * 1.02);
    const centerX = width * .5;
    const centerY = tall * .472 + Math.sin(seconds * .72) * 1.6;
    const orbitTurn = seconds * .45;
    const orbitCos = Math.cos(orbitTurn), orbitSin = Math.sin(orbitTurn);
    const ringTilt = -.29 + .063 * Math.sin(seconds * .48);
    const ringCos = Math.cos(ringTilt), ringSin = Math.sin(ringTilt);
    const ringRadius = Math.min(width * (wide ? .375 : .412), tall * .69) * breath;
    const ringAspect = .44 + .029 * Math.sin(seconds * .62);

    const follow = 1 - Math.exp(-13 * dt);
    const oldX = pointer.x, oldY = pointer.y;
    pointer.x = mix(pointer.x, pointer.toX, follow);
    pointer.y = mix(pointer.y, pointer.toY, follow);
    const drift = 1 - Math.exp(-7 * dt);
    const wakeRate = dt > 0 ? .125 / dt : 0;
    pointer.flowX = mix(pointer.flowX, (pointer.x - oldX) * wakeRate, drift);
    pointer.flowY = mix(pointer.flowY, (pointer.y - oldY) * wakeRate, drift);
    pointer.strength = mix(pointer.strength, pointer.inside && !paused ? 1 : 0, drift);
    const influence = Math.max(32, 68 * scale);
    const impulse = 38 * scale;
    const pull = Math.exp(-7.8 * dt);

    context.clearRect(0, 0, width, tall);
    context.fillStyle = '#a8c2ff';
    const dustWidth = (wide ? 1.1 : .78) * scale;
    const dustHeight = (wide ? .61 : .81) * scale;
    for (const star of stars) {
      const angle = star.angle + seconds * star.drift;
      const size = star.radius * 1.5;
      context.globalAlpha = star.alpha * (.6 + .4 * Math.sin(star.phase + seconds * 1.22));
      context.fillRect(centerX + Math.cos(angle) * star.distance * dustWidth,
        centerY + Math.sin(angle) * star.distance * dustHeight, size, size);
    }

    for (const group of dotBatches) group.length = 0;
    for (const group of highlightBatches) group.length = 0;
    for (const group of crossbarBatches) group.length = 0;

    const count = width < 420 ? 1610 : particles.length;
    for (let index = 0; index < count; index++) {
      const particle = particles[Math.floor(index * particles.length / count)];
      const x = particle.x + Math.sin(seconds * 1.42 + particle.phase) * 1.42;
      const y = particle.y + Math.sin(seconds * 1.14 + particle.phase) * .88;
      const a = x * ca + particle.z * sa;
      const b = particle.z * ca - x * sa;
      const c = y * ci + b * si;
      const d = b * ci - y * si;
      const zoom = 520 / (520 - d) * scale * breath;
      let px = centerX + (a * ct - c * st) * zoom;
      let py = centerY - (a * st + c * ct) * zoom;
      let depth = Math.max(0, Math.min(1, (d + 105) / 210));

      if (morph > 0) {
        const along = particle.orbitX * orbitCos - particle.orbitY * orbitSin;
        const across = particle.orbitX * orbitSin + particle.orbitY * orbitCos;
        const ringX = centerX + (along * ringCos - across * ringAspect * ringSin) * ringRadius;
        const ringY = centerY + (along * ringSin + across * ringAspect * ringCos) * ringRadius;
        px = mix(px, ringX, morph);
        py = mix(py, ringY, morph);
        depth = mix(depth, .52 + .42 * across, morph);
      }

      let goalX = 0, goalY = 0;
      if (pointer.strength > .004) {
        const dx = px - pointer.x, dy = py - pointer.y;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq < influence * influence) {
          const distance = Math.sqrt(distanceSq);
          const falloff = 1 - distance / influence;
          const pressure = falloff * falloff * pointer.strength;
          const outward = impulse / Math.max(distance, influence * .16);
          const side = .32 * outward;
          const wakeX = Math.max(-impulse, Math.min(impulse, pointer.flowX));
          const wakeY = Math.max(-impulse, Math.min(impulse, pointer.flowY));
          goalX = (dx * outward - dy * side + wakeX * .36) * pressure;
          goalY = (dy * outward + dx * side + wakeY * .36) * pressure;
        }
      }

      // Critically damped spring: a moving target pulls on the offset and the
      // particle keeps its momentum as the pointer leaves the canvas.
      if (dt > 0) {
        const dx = particle.offsetX - goalX, dy = particle.offsetY - goalY;
        const vx = particle.speedX + 7.8 * dx, vy = particle.speedY + 7.8 * dy;
        particle.offsetX = goalX + (dx + vx * dt) * pull;
        particle.offsetY = goalY + (dy + vy * dt) * pull;
        particle.speedX = (particle.speedX - 7.8 * vx * dt) * pull;
        particle.speedY = (particle.speedY - 7.8 * vy * dt) * pull;
      }
      const screenX = px + particle.offsetX, screenY = py + particle.offsetY;
      const dx = screenX - particle.xOnScreen, dy = screenY - particle.yOnScreen;
      particle.tailX = particle.tailY = 0;
      if (dt > 0) {
        const movement = Math.hypot(dx, dy);
        if (movement > .3) {
          const exposure = mix(.006, .012, morph);
          const trail = Math.min(exposure / dt, 5.2 * Math.max(.72, scale) / movement);
          particle.tailX = dx * trail;
          particle.tailY = dy * trail;
        }
      }
      particle.xOnScreen = screenX;
      particle.yOnScreen = screenY;

      const group = Math.min(depthSteps - 1, Math.floor(depth * depthSteps)) * shades.length + particle.color;
      if (particle.isCrossbar) crossbarBatches[group].push(particle);
      else if (particle.bright) highlightBatches[group].push(particle);
      else dotBatches[group].push(particle);
    }

    context.lineCap = 'round';
    context.globalCompositeOperation = 'lighter';
    const detailScale = Math.max(.8, Math.min(1.7, scale));
    for (let index = 0; index < dotBatches.length; index++) {
      const color = index % shades.length;
      const depth = Math.floor(index / shades.length) / (depthSteps - 1);
      const dots = dotBatches[index];
      const highlights = highlightBatches[index];
      const crossbars = crossbarBatches[index];
      const diameter = detailScale * (1.25 + .74 * depth + .07 * morph);
      strokeDots(crossbars, colorInk[color], diameter * mix(.79, 1, morph), .47 + .29 * depth + .1 * morph);
      strokeDots(dots, colorInk[color], diameter, .49 + .4 * depth);
      strokeDots(highlights, colorInk[color], diameter * 2.65, .12 + .08 * depth);
      strokeDots(highlights, coreInk[color], diameter * 1.18, .66 + .32 * depth);
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
  }

  function strokeDots(dots, tint, diameter, opacity) {
    if (!dots.length) return;
    context.beginPath();
    for (const dot of dots) {
      context.moveTo(dot.xOnScreen - dot.tailX, dot.yOnScreen - dot.tailY);
      context.lineTo(dot.xOnScreen + .015, dot.yOnScreen);
    }
    context.strokeStyle = tint;
    context.lineWidth = diameter;
    context.globalAlpha = opacity;
    context.stroke();
  }

  function resize() {
    width = Math.max(1, canvas.clientWidth);
    tall = Math.max(1, canvas.clientHeight);
    wide = width / tall > 1.52;
    scale = Math.min(width / (wide ? 413 : 354), tall / (wide ? 294 : 437));
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5, Math.max(1, Math.sqrt(820000 / (width * tall))));
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
    pointer.toX = event.clientX - bounds.left;
    pointer.toY = event.clientY - bounds.top;
    if (!pointer.inside && pointer.strength < .065) {
      pointer.x = pointer.toX;
      pointer.y = pointer.toY;
      pointer.flowX = pointer.flowY = 0;
    }
    pointer.inside = true;
  }

  canvas.addEventListener('pointerdown', point, { passive: true });
  canvas.addEventListener('pointermove', point, { passive: true });
  canvas.addEventListener('pointerleave', () => { pointer.inside = false; }, { passive: true });
  for (const name of ['pointercancel', 'pointerup']) {
    canvas.addEventListener(name, event => {
      if (event.pointerType !== 'mouse') pointer.inside = false;
    }, { passive: true });
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(figure);
  else window.addEventListener('resize', resize);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (!inView) pointer.inside = false;
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
    if (paused) {
      time = 0;
      pointer.inside = false;
      pointer.strength = 0;
      pointer.flowX = pointer.flowY = 0;
      for (const particle of particles) particle.offsetX = particle.offsetY = particle.speedX = particle.speedY = 0;
    }
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
