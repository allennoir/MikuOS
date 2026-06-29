/* ===========================================================================
   scene.js — Three.js 3D CRT that frames the live terminal screen.
   The WebGL layer renders the CRT shell + desk room; the screen (#crt) is mapped
   onto the CRT's display via CSS3DRenderer, so it stays crisp & interactive.

   v2.6: reads window.MikuScene (published by app.js) to react to playback —
   the screen-glow light + a bezel power LED shift toward the active song's
   colour and pulse on the beat / surge in the chorus, and the camera leans in
   on play. Adds desk props, a power-on bloom, perf guardrails (pause when the
   tab is hidden, adaptive pixel ratio) and a fit-to-viewport flat fallback.
   All cross-file reads are null-checked: either file may load first, and this
   one may have fallen back to .flat.
   =========================================================================== */
import * as THREE from "three";
import { CSS3DRenderer, CSS3DObject } from "three/addons/renderers/CSS3DRenderer.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const screenEl = document.getElementById("crt");
const mount = document.getElementById("stage3d");

/* ---- flat fallback: scale the 1280x752 surface to fit the viewport -------- */
function fitFlat() {
  const fit = Math.min(innerWidth / 1280, innerHeight / 752);
  screenEl.style.setProperty("--fit", fit.toFixed(4));
}

try {
  /* screen DOM is 1280x752 (~1.7:1); map it to 3.2 world units wide */
  const PX_W = 1280, SCREEN_W = 3.2, SCREEN_H = 1.88, SCALE = SCREEN_W / PX_W;
  const BODY_W = 3.76, BODY_H = 2.51, BODY_D = 1.05;
  const NECK_H = 0.22, BASE_H = 0.09, SOFF = 0.035;
  const GY = BODY_H / 2 + NECK_H + BASE_H;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c1016);
  scene.fog = new THREE.Fog(0x0c1016, 8, 20);

  const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 0.1, 100);
  const target = new THREE.Vector3(0, GY, 0);
  camera.position.set(0, GY + 0.12, 5.3);
  camera.lookAt(target);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // left/top (not inset:0) so setSize's explicit width/height stick — that keeps
  // the WebGL canvas the same pixel size as the CSS3D layer, which is what keeps
  // the screen registered to the monitor body.
  renderer.domElement.style.cssText = "position:absolute;left:0;top:0;z-index:1";
  mount.appendChild(renderer.domElement);

  const css = new CSS3DRenderer();
  css.domElement.style.cssText = "position:absolute;left:0;top:0;z-index:2";
  mount.appendChild(css.domElement);

  /* Size BOTH renderers + the camera from the ACTUAL container size (not
     window.innerWidth, which can lie in embedded/zoomed browsers). A single
     source of truth on every resize keeps the WebGL body and CSS3D screen locked
     together. ResizeObserver also catches panel/webview resizes that never fire
     a window 'resize' event. */
  function resize() {
    const w = Math.round(mount.clientWidth || innerWidth);
    const h = Math.round(mount.clientHeight || innerHeight);
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(w < 900 ? Math.min(devicePixelRatio, 1.5) : Math.min(devicePixelRatio, 2));
    renderer.setSize(w, h);
    css.setSize(w, h);
  }
  resize();
  addEventListener("resize", resize);
  if (window.ResizeObserver) { try { new ResizeObserver(resize).observe(mount); } catch {} }

  /* lights */
  scene.add(new THREE.AmbientLight(0x33373f, 1.3));
  const key = new THREE.DirectionalLight(0xe6ecff, 1.5);
  key.position.set(-4, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  const sc = key.shadow.camera;
  sc.left = -6; sc.right = 6; sc.top = 6; sc.bottom = -6; sc.near = 1; sc.far = 22;
  sc.updateProjectionMatrix();
  scene.add(key);
  const glow = new THREE.PointLight(0x7fb0ff, 8, 12, 2);   // screen casts cool light; reacts to playback
  glow.position.set(0, GY, 1.3);
  scene.add(glow);
  const rim = new THREE.DirectionalLight(0x2c4a78, 0.45);
  rim.position.set(3, 2, -5);
  scene.add(rim);

  /* materials */
  const plastic = new THREE.MeshStandardMaterial({ color: 0xc9c2b0, roughness: 0.62, metalness: 0.05 });
  const darkPlastic = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.7, metalness: 0.08 });
  const inner = new THREE.MeshStandardMaterial({ color: 0x0a0d0c, roughness: 0.8, emissive: 0x0a1830, emissiveIntensity: 0.5 });

  /* CRT */
  const crt = new THREE.Group();
  crt.position.set(0, GY, 0);
  scene.add(crt);

  const body = new THREE.Mesh(new RoundedBoxGeometry(BODY_W, BODY_H, BODY_D, 5, 0.08), plastic);
  body.castShadow = body.receiveShadow = true;
  crt.add(body);

  const lip = new THREE.Mesh(new RoundedBoxGeometry(BODY_W + 0.04, BODY_H + 0.04, 0.16, 5, 0.07), plastic);
  lip.position.z = BODY_D / 2 - 0.03;
  lip.castShadow = true;
  crt.add(lip);

  const well = new THREE.Mesh(new THREE.BoxGeometry(SCREEN_W + 0.10, SCREEN_H + 0.10, 0.1), inner);
  well.position.set(0, SOFF, BODY_D / 2 + 0.03);
  crt.add(well);

  /* power + restart buttons — FLAT circular discs on the chin bezel, each with a
     white icon painted on (canvas texture). Restart is a bit smaller than power.
     Side by side, not extruded. Sit just proud of the lip face to avoid z-fight. */
  const chinY = -(BODY_H / 2) + 0.205;
  const FRONT = BODY_D / 2 + 0.07;

  function buttonTexture(kind) {
    const s = 256, cv = document.createElement("canvas"); cv.width = cv.height = s;
    const g = cv.getContext("2d"), cx = s / 2, cy = s / 2, R = s * 0.48;
    // flat silver button face + thin ring (matches a real monitor button)
    // muted mid-grey face so the buttons sit INTO the bezel instead of glaring
    const grad = g.createRadialGradient(cx, cy - R * 0.28, R * 0.2, cx, cy, R);
    grad.addColorStop(0, "#888c92"); grad.addColorStop(0.6, "#70747b"); grad.addColorStop(1, "#565a61");
    g.fillStyle = grad; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
    g.lineWidth = s * 0.02; g.strokeStyle = "#43464c"; g.beginPath(); g.arc(cx, cy, R - s * 0.01, 0, Math.PI * 2); g.stroke();
    g.lineWidth = s * 0.012; g.strokeStyle = "rgba(255,255,255,.2)";
    g.beginPath(); g.arc(cx, cy, R - s * 0.03, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    // soft (not pure-white) icon — readable, not glary
    g.strokeStyle = "#eaedf0"; g.fillStyle = "#eaedf0"; g.lineCap = "round"; g.lineJoin = "round";
    g.shadowColor = "rgba(0,0,0,.45)"; g.shadowBlur = s * 0.012;
    if (kind === "power") {
      const pr = R * 0.4; g.lineWidth = s * 0.06;
      g.beginPath(); g.arc(cx, cy + s * 0.012, pr, -Math.PI / 2 + 0.55, -Math.PI / 2 - 0.55 + Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(cx, cy - pr * 1.35 + s * 0.012); g.lineTo(cx, cy - pr * 0.05 + s * 0.012); g.stroke();
    } else {
      const rr = R * 0.4; g.lineWidth = s * 0.055;
      const a0 = -Math.PI * 0.12, a1 = Math.PI * 1.32;
      g.beginPath(); g.arc(cx, cy, rr, a0, a1); g.stroke();
      const ex = cx + rr * Math.cos(a0), ey = cy + rr * Math.sin(a0), ah = s * 0.075;
      g.beginPath(); g.moveTo(ex + ah * 0.1, ey - ah * 0.95); g.lineTo(ex + ah * 0.95, ey + ah * 0.15); g.lineTo(ex - ah * 0.55, ey + ah * 0.5); g.closePath(); g.fill();
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    return tex;
  }
  function makeButton(kind, x, radius) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 48),
      new THREE.MeshBasicMaterial({ map: buttonTexture(kind), transparent: true }));
    m.position.set(x, chinY, FRONT);
    m.userData.action = kind;
    crt.add(m); return m;
  }
  const pwrBtn = makeButton("power", BODY_W / 2 - 0.30, 0.082);
  const restartBtn = makeButton("restart", BODY_W / 2 - 0.50, 0.064);
  const buttons = [pwrBtn, restartBtn];

  /* stand */
  const neck = new THREE.Mesh(new RoundedBoxGeometry(0.46, NECK_H, 0.4, 4, 0.05), plastic);
  neck.position.set(0, -(BODY_H / 2 + NECK_H / 2), -0.16);
  neck.castShadow = true;
  crt.add(neck);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.78, BASE_H, 44), plastic);
  base.position.set(0, -(BODY_H / 2 + NECK_H + BASE_H / 2), -0.16);
  base.castShadow = base.receiveShadow = true;
  crt.add(base);

  /* live screen on the front face */
  const screenObj = new CSS3DObject(screenEl);
  screenObj.scale.setScalar(SCALE);
  screenObj.position.set(0, SOFF, BODY_D / 2 + 0.06);
  crt.add(screenObj);

  /* room */
  const desk = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 44),
    new THREE.MeshStandardMaterial({ color: 0x14171d, roughness: 0.42, metalness: 0.0 }));
  desk.rotation.x = -Math.PI / 2;
  desk.receiveShadow = true;
  scene.add(desk);
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 30),
    new THREE.MeshStandardMaterial({ color: 0x10141c, roughness: 0.95 }));
  wall.position.set(0, 9, -7);
  scene.add(wall);

  /* desk props — keyboard, two speakers, a mug, a desk mat (low-poly, static) */
  const props = new THREE.Group();
  props.position.set(0, 0, 1.55);
  const matM = new THREE.MeshStandardMaterial({ color: 0x0c1d1b, roughness: 0.85 });
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.5), matM);
  mat.rotation.x = -Math.PI / 2; mat.position.set(0, 0.011, 0.2); mat.receiveShadow = true; props.add(mat);
  const kbd = new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.12, 0.62, 3, 0.03), darkPlastic);
  kbd.position.set(0, 0.06, 0.25); kbd.rotation.x = -0.04; kbd.castShadow = true; props.add(kbd);
  const spkGeo = new RoundedBoxGeometry(0.42, 0.78, 0.4, 3, 0.04);
  const coneGeo = new THREE.CircleGeometry(0.13, 18);
  const coneMat = new THREE.MeshStandardMaterial({ color: 0x111316, roughness: 0.6 });
  const cones = [];
  for (const sx of [-2.35, 2.35]) {
    const spk = new THREE.Mesh(spkGeo, darkPlastic);
    spk.position.set(sx, 0.39, -0.35); spk.rotation.y = sx < 0 ? 0.22 : -0.22; spk.castShadow = true; props.add(spk);
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.set(sx + (sx < 0 ? 0.09 : -0.09), 0.5, -0.15); cone.rotation.y = sx < 0 ? 0.22 : -0.22; props.add(cone);
    cones.push(cone);
  }
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.22, 18),
    new THREE.MeshStandardMaterial({ color: 0x39c5bb, roughness: 0.4 }));
  mug.position.set(1.5, 0.11, 0.5); mug.castShadow = true; props.add(mug);
  scene.add(props);

  /* ---- power-on bloom overlay (an inner child of #crt, NOT #crt itself: the
     CSS3DObject rewrites #crt's transform every frame, so we animate a child). */
  const bloom = document.createElement("div");
  bloom.className = "crt-bloom";
  screenEl.appendChild(bloom);
  window.MikuScene = window.MikuScene || {};
  window.MikuScene.powerOn = () => { bloom.classList.remove("on"); void bloom.offsetWidth; bloom.classList.add("on"); };

  /* gentle mouse parallax */
  let mx = 0, my = 0;
  addEventListener("pointermove", (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; });

  /* raycast the bezel buttons (power / restart) — hover highlight + click */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hoverBtn = null;
  const pickButton = (e) => {
    const r = mount.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(buttons, false)[0];
    return hit ? hit.object : null;
  };
  addEventListener("pointermove", (e) => {
    const b = pickButton(e);
    if (b === hoverBtn) return;
    if (hoverBtn) hoverBtn.scale.setScalar(1);
    hoverBtn = b;
    if (b) b.scale.setScalar(1.09);
    css.domElement.style.cursor = b ? "pointer" : "";
  });
  addEventListener("pointerdown", (e) => {
    const b = pickButton(e);
    if (!b) return;
    b.scale.setScalar(0.9);                                  // flat press feedback
    setTimeout(() => b.scale.setScalar(hoverBtn === b ? 1.08 : 1), 130);
    const S = window.MikuScene || {};
    if (b.userData.action === "power" && S.pressPower) S.pressPower();
    else if (b.userData.action === "restart" && S.pressRestart) S.pressRestart();
  });

  const idleColor = new THREE.Color(0x7fb0ff);
  const tmpColor = new THREE.Color();
  let revealed = false, hidden = false;

  (function animate() {
    requestAnimationFrame(animate);
    if (hidden) return;                         // perf: skip rendering when tab is hidden

    const S = window.MikuScene || {};
    const reduce = !!S.reduce;
    const playing = !!S.playing && !reduce;

    /* reactive screen glow: lerp toward the active song colour while playing,
       surge in the chorus, kick on each beat. */
    const tgt = playing ? tmpColor.set(S.songColor || "#39c5bb") : idleColor;
    glow.color.lerp(tgt, 0.06);
    let wantI = playing ? (S.chorus ? 11 : 9) : 6;
    const sinceBeat = S.beatAt ? performance.now() - S.beatAt : 1e9;
    if (playing && sinceBeat < 130) wantI += 2.5 * (1 - sinceBeat / 130);
    glow.intensity += (wantI - glow.intensity) * 0.12;

    /* speaker cones gently push on the beat */
    const push = playing && sinceBeat < 130 ? 1 + 0.18 * (1 - sinceBeat / 130) : 1;
    for (const c of cones) c.scale.z += (push - c.scale.z) * 0.25;

    /* camera: idle parallax + a subtle lean-in on play */
    const zTarget = playing && !reduce ? 5.0 : 5.3;
    const yBias = playing && !reduce ? -0.06 : 0.12;
    const px = reduce ? 0 : mx * 0.5, pyo = reduce ? 0 : my * 0.35;
    camera.position.x += (px - camera.position.x) * 0.05;
    camera.position.y += (GY + yBias - pyo - camera.position.y) * 0.05;
    camera.position.z += (zTarget - camera.position.z) * 0.04;
    camera.lookAt(target);

    renderer.render(scene, camera);
    css.render(scene, camera);
    if (!revealed) { revealed = true; screenEl.classList.add("ready"); }
  })();

  document.addEventListener("visibilitychange", () => { hidden = document.hidden; });
  // (resize is handled by resize() + ResizeObserver above)
} catch (e) {
  console.error("[scene] 3D init failed — falling back to flat screen:", e);
  screenEl.classList.add("flat", "ready");
  fitFlat();
  addEventListener("resize", fitFlat);
  // flat mode still gets the power-on bloom + a usable MikuScene bridge
  window.MikuScene = window.MikuScene || {};
  if (!window.MikuScene.powerOn) {
    const bloom = document.createElement("div"); bloom.className = "crt-bloom"; screenEl.appendChild(bloom);
    window.MikuScene.powerOn = () => { bloom.classList.remove("on"); void bloom.offsetWidth; bloom.classList.add("on"); };
  }
}
