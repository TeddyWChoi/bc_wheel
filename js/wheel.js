/**
 * wheel.js — Lucky Wheel SVG drawing & spin logic (vanilla JS)
 * No framework dependency. Used by app.js.
 */

'use strict';

// ── Prize configuration ─────────────────────────────────────────
const PRIZES = [
  { name: 'x0', multiplier: 0 },
  { name: 'x10', multiplier: 10 },
  { name: 'x10', multiplier: 10 },
  { name: 'x0', multiplier: 0 },
  { name: 'x10', multiplier: 10 },
  { name: 'x100', multiplier: 100 },
];

// Image map: hash → relative path from index.html
const IMG = {
  coin: 'images/2db7b5b03016488c7f8a7ac5c8c4d3bd801fc1dd.png',
  coinMiss: 'images/60059a5c837f22b218f4b1a872cdd0eb479079d0.png',
  crystal: 'images/7a91bab80904fe493d0e08bb15a093a76dcd5e1f.png',
  gem: 'images/ce8ea4cea729904698a81b6a20d97f5234bbde21.png',
  ring: 'images/5e8d13afdb391b7a46983068843fd305bf7e8306.png',

  // Result modal
  fwJackpot: 'images/a5f28a277402d63a6cfcd89cbf9721376eb61dff.png',
  charJackpot: 'images/jackpot.gif',
  titleJackpot: 'images/09ea47dd2ab10368a9f265f1a1417f7933032654.png',

  fwWin: 'images/f7eb0f13191499107f8c883c1ce848f8dabc5a21.png',
  charWin: 'images/win.gif',
  titleWin: 'images/11858cabc8a088c469ef1b8bfd1eeedd96dee9b7.png',

  bgLose: 'images/6bd8c7c82d3eed9cb2b7582c71f3f9dab121e7e0.png',
  charLose: 'images/lose.gif',
  titleLose: 'images/63a41f82ad786bbd0711f88dc9c398b056495d3e.png',

  container: 'images/5fd3debeb328f575349f53dd16eaf13b0742a20e.png',
  img207: 'images/f18708ae9846da92a57363317025859ca7e31fcb.png',
  img203: 'images/e91792b2a1c5f3393ffb6c8b73db69133d173971.png',
  img205: 'images/b5bfeee9eeb33d487b622f1c6b6146516cf73186.png',

  // Header / footer
  papaya: 'images/c7f1ea453a9a1a5d482f44a2d5f57a461989e587.png',
  blackshot: 'images/7dcd573ad4b4a28bfd658cc4cdebfa15d2c73628.png',
  titleLogo: 'images/fa8b6b33ed99ff6b6d7a428477578a67a98802cb.png',
  character: 'images/bunny_suit.png',
  characterJackpotPose: 'images/9b703ebd3c9f8529a6a1a34ac35a249e1636eb06.png',
  mainBg: 'images/3f20a3cef9dbfa7e97d8e9dcd158d26bf7a67af1.png',
  bluepotion: 'images/230d1452f41f3031f96e68e7e3db44b07c311c8b.png',
};

// ── Geometry constants ──────────────────────────────────────────
const W = 500;
const CX = 250;
const CY = 250;
const OUTER_R = 205;
const INNER_R = 58;
const LABEL_R = 165;
const COIN_R = 120;
const COIN_SZ = 51;
const DOT_R = 234;
const N_DOTS = 12;
const SPIN_DUR = 7000;

// ── Math helpers ────────────────────────────────────────────────
function polar(cx, cy, r, deg) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, oR, iR, a1, a2) {
  const o1 = polar(cx, cy, oR, a1), o2 = polar(cx, cy, oR, a2);
  const i1 = polar(cx, cy, iR, a1), i2 = polar(cx, cy, iR, a2);
  const f = v => v.toFixed(3);
  const lg = (a2 - a1) > 180 ? 1 : 0;
  return (
    `M ${f(i1.x)} ${f(i1.y)} L ${f(o1.x)} ${f(o1.y)} ` +
    `A ${oR} ${oR} 0 ${lg} 1 ${f(o2.x)} ${f(o2.y)} ` +
    `L ${f(i2.x)} ${f(i2.y)} ` +
    `A ${iR} ${iR} 0 ${lg} 0 ${f(i1.x)} ${f(i1.y)} Z`
  );
}

function svgEl(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}

// ── WheelController ─────────────────────────────────────────────
class WheelController {
  constructor(containerId, onSpinEnd) {
    this.container = document.getElementById(containerId);
    this.onSpinEnd = onSpinEnd;
    this.rotation = 0;
    this.isAnim = false;
    this.n = PRIZES.length;
    this.segDeg = 360 / this.n;
    this._build();
  }

  _build() {
    const c = this.container;
    c.style.position = 'relative';
    c.style.width = W + 'px';
    c.style.height = W + 'px';

    // ── Spinning layer ──
    this.spinLayer = document.createElement('div');
    this.spinLayer.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${W}px;transform-origin:${CX}px ${CY}px;`;
    c.appendChild(this.spinLayer);

    // Build SVG
    this._buildSVG();

    // Build coin images inside spinning layer
    this._buildCoins();

    // ── Static layer ──
    this._buildStatic();
  }

  _buildSVG() {
    const svg = svgEl('svg', { width: W, height: W, viewBox: `0 0 ${W} ${W}`, style: 'display:block;position:absolute;left:0;top:0;' });

    // Defs
    const defs = svgEl('defs', {});

    PRIZES.forEach((prize, i) => {
      const rg = svgEl('radialGradient', { id: `wSeg${i}`, cx: '50%', cy: '50%', r: '50%' });
      if (prize.multiplier === 100) {
        // Golden slice with pulsing animation
        rg.appendChild(this._stop('0%', '#FFE066', '#FFE066;#FFFFFF;#FFE066'));
        rg.appendChild(this._stop('50%', '#D4AF37', '#D4AF37;#FFD700;#D4AF37'));
        rg.appendChild(this._stop('100%', '#8B6508', '#8B6508;#B8860B;#8B6508'));
      } else if (i % 2 === 0) {
        rg.appendChild(this._stop('0%', '#4A238C'));
        rg.appendChild(this._stop('60%', '#2E1060'));
        rg.appendChild(this._stop('100%', '#130430'));
      } else {
        rg.appendChild(this._stop('0%', '#6E3AB5'));
        rg.appendChild(this._stop('60%', '#421880'));
        rg.appendChild(this._stop('100%', '#1C0545'));
      }
      defs.appendChild(rg);
    });

    const dotFilter = svgEl('filter', { id: 'dotGlow', x: '-120%', y: '-120%', width: '340%', height: '340%' });
    const blur = svgEl('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: '2.5', result: 'blur' });
    const merge = svgEl('feMerge', {});
    merge.appendChild(svgEl('feMergeNode', { in: 'blur' }));
    merge.appendChild(svgEl('feMergeNode', { in: 'SourceGraphic' }));
    dotFilter.appendChild(blur);
    dotFilter.appendChild(merge);
    defs.appendChild(dotFilter);

    const centerGrad = svgEl('radialGradient', { id: 'wCenter', cx: '50%', cy: '50%', r: '50%' });
    centerGrad.appendChild(this._stop('0%', '#9A50D0'));
    centerGrad.appendChild(this._stop('50%', '#4A1A8A'));
    centerGrad.appendChild(this._stop('100%', '#1A0542'));
    defs.appendChild(centerGrad);

    svg.appendChild(defs);

    // Segments
    PRIZES.forEach((_, i) => {
      const a1 = i * this.segDeg, a2 = (i + 1) * this.segDeg;
      svg.appendChild(svgEl('path', { d: arcPath(CX, CY, OUTER_R, INNER_R, a1, a2), fill: `url(#wSeg${i})` }));
    });

    // Gold dividers
    PRIZES.forEach((_, i) => {
      const p1 = polar(CX, CY, INNER_R, i * this.segDeg);
      const p2 = polar(CX, CY, OUTER_R, i * this.segDeg);
      svg.appendChild(svgEl('line', {
        x1: p1.x.toFixed(3), y1: p1.y.toFixed(3),
        x2: p2.x.toFixed(3), y2: p2.y.toFixed(3),
        stroke: '#D4AF37', 'stroke-opacity': '0.75', 'stroke-width': '1.5',
      }));
    });

    // Outer gold ring
    svg.appendChild(svgEl('circle', { cx: CX, cy: CY, r: OUTER_R, fill: 'none', stroke: '#D4AF37', 'stroke-width': '9' }));
    // Decorative rings
    svg.appendChild(svgEl('circle', { cx: CX, cy: CY, r: 239, fill: 'none', stroke: '#D4AF37', 'stroke-width': '3.5' }));
    svg.appendChild(svgEl('circle', { cx: CX, cy: CY, r: 243, fill: 'none', stroke: '#8B6914', 'stroke-opacity': '0.5', 'stroke-width': '1.5' }));

    // Dot ring
    for (let i = 0; i < N_DOTS; i++) {
      const pt = polar(CX, CY, DOT_R, (360 / N_DOTS) * i);
      const lit = i % 2 === 0;
      const dot = svgEl('circle', {
        cx: pt.x.toFixed(3), cy: pt.y.toFixed(3), r: 6.5,
        fill: lit ? '#FFD700' : '#4A3508',
      });
      if (lit) dot.setAttribute('filter', 'url(#dotGlow)');
      svg.appendChild(dot);
    }

    // Inner gold ring
    svg.appendChild(svgEl('circle', { cx: CX, cy: CY, r: INNER_R + 7, fill: 'none', stroke: '#D4AF37', 'stroke-width': '4' }));
    // Center disc
    svg.appendChild(svgEl('circle', { cx: CX, cy: CY, r: INNER_R, fill: 'url(#wCenter)' }));

    // Prize labels
    PRIZES.forEach((prize, i) => {
      const mid = (i + 0.5) * this.segDeg;
      const pos = polar(CX, CY, LABEL_R, mid);
      const isSpec = prize.multiplier === 100;
      const pW = 80, pH = 28;
      const g = svgEl('g', { transform: `translate(${pos.x.toFixed(3)},${pos.y.toFixed(3)}) rotate(${mid})` });

      g.appendChild(svgEl('rect', {
        x: -pW / 2, y: -pH / 2, width: pW, height: pH, rx: pH / 2,
        fill: isSpec ? '#2E1060' : '#DDCDFF',
        stroke: isSpec ? '#FFD700' : 'rgba(194,165,255,0.5)',
        'stroke-width': isSpec ? 1.5 : 1,
      }));

      const txt = svgEl('text', {
        x: 0, y: 1,
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        fill: isSpec ? '#FFD700' : '#333', 'font-size': 20, 'font-weight': 'bold',
        'font-family': "'Open Sans', Arial, sans-serif",
      });
      txt.textContent = prize.name;
      g.appendChild(txt);
      svg.appendChild(g);
    });

    this.spinLayer.appendChild(svg);
  }

  _stop(offset, color, animValues) {
    const s = svgEl('stop', { offset, 'stop-color': color });
    if (animValues) {
      s.appendChild(svgEl('animate', {
        attributeName: 'stop-color',
        values: animValues,
        dur: '2s',
        repeatCount: 'indefinite'
      }));
    }
    return s;
  }

  _buildCoins() {
    PRIZES.forEach((prize, i) => {
      const mid = (i + 0.5) * this.segDeg;
      const pt = polar(CX, CY, COIN_R, mid);
      const src = prize.multiplier === 0 ? IMG.coinMiss : IMG.coin;

      const div = document.createElement('div');
      div.style.cssText = `
        position:absolute;
        left:${(pt.x - COIN_SZ / 2).toFixed(1)}px;
        top:${(pt.y - COIN_SZ / 2).toFixed(1)}px;
        width:${COIN_SZ}px; height:${COIN_SZ}px;
        transform:rotate(${mid}deg);
        transform-origin:${COIN_SZ / 2}px ${COIN_SZ / 2}px;
        pointer-events:none;
      `;
      const img = document.createElement('img');
      img.src = src; img.alt = '';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;pointer-events:none;';
      div.appendChild(img);
      this.spinLayer.appendChild(div);
    });
  }

  _buildStatic() {
    const c = this.container;

    // Center hub
    const hubWrap = document.createElement('div');
    hubWrap.style.cssText = `position:absolute;left:166px;top:139px;width:169px;height:195px;pointer-events:none;z-index:5;`;

    const crystalWrap = document.createElement('div');
    crystalWrap.style.cssText = `position:absolute;left:0;right:0;top:27px;aspect-ratio:1050/1046;`;
    const crystalImg = document.createElement('img');
    crystalImg.src = IMG.crystal; crystalImg.alt = '';
    crystalImg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;';
    crystalWrap.appendChild(crystalImg);

    const gemWrap = document.createElement('div');
    gemWrap.style.cssText = `position:absolute;left:71px;top:0;width:25.407px;height:51px;transform:scaleY(-1);`;
    const gemImg = document.createElement('img');
    gemImg.src = IMG.gem; gemImg.alt = '';
    gemImg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;';
    gemWrap.appendChild(gemImg);

    hubWrap.appendChild(crystalWrap);
    hubWrap.appendChild(gemWrap);
    c.appendChild(hubWrap);

    // SPIN label (shown when logged in) — stored for toggling
    this.spinLabelEl = document.createElement('div');
    this.spinLabelEl.className = 'spin-label';
    this.spinLabelEl.style.cssText = `display:none;left:${CX - 55}px;top:${CY - 19}px;width:110px;`;
    this.spinLabelEl.innerHTML = `<p>SPIN</p>`;
    c.appendChild(this.spinLabelEl);

    // Outer ring image
    const ringWrap = document.createElement('div');
    ringWrap.style.cssText = `position:absolute;left:7px;top:7px;width:486px;height:486px;pointer-events:none;z-index:8;`;
    const ringImg = document.createElement('img');
    ringImg.src = IMG.ring; ringImg.alt = '';
    ringImg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;';
    ringWrap.appendChild(ringImg);
    c.appendChild(ringWrap);

    // Dimmer overlay (always present, shown/hidden by updateLoggedIn)
    this.dimmer = document.createElement('div');
    this.dimmer.className = 'wheel-dimmer';
    c.appendChild(this.dimmer);
  }

  updateLoggedIn(loggedIn) {
    if (loggedIn) {
      this.dimmer.style.display = 'none';
      this.spinLabelEl.style.display = 'block';
    } else {
      this.dimmer.style.display = 'flex';
      this.spinLabelEl.style.display = 'none';
    }
  }

  spin(prizeIndex) {
    const idx = (prizeIndex !== undefined) ? prizeIndex : Math.floor(Math.random() * this.n);
    const midpoint = (idx + 0.5) * this.segDeg;
    const base = Math.ceil(this.rotation / 360) * 360;
    const spins = 5 + Math.floor(Math.random() * 4);
    const target = base + (spins + 1) * 360 - midpoint;

    // 5 different easing curves (True Ease-Out Physical Start)
    // C1 y is very high and x is low -> max velocity instantly.
    // C2 x is high -> long, steady slowdown.
    // y2 > 1.0 causes the bounce back.
    const SPIN_EASES = [
      'cubic-bezier(0.1, 0.7, 0.7, 1.0)',   // 1) Normal: Firm rocket start, steady slow down
      'cubic-bezier(0.05, 0.8, 0.6, 1.0)',  // 2) Normal: Harder start, long crawl to stop
      'cubic-bezier(0.15, 0.85, 0.8, 1.0)', // 3) Normal: Smooth explosion, very slow tail
      'cubic-bezier(0.05, 0.8, 0.7, 1.08)', // 4) Bounce: Explodes, coasts past by ~8%, drags back
      'cubic-bezier(0.1, 0.9, 0.8, 1.15)'   // 5) Huge Bounce: Explodes, coasts past by ~15%, slowly drags back
    ];
    const ease = SPIN_EASES[Math.floor(Math.random() * SPIN_EASES.length)];

    this.rotation = target;
    this.isAnim = true;
    this.spinLayer.style.transition = `transform ${SPIN_DUR}ms ${ease}`;
    this.spinLayer.style.transform = `rotate(${target}deg)`;

    setTimeout(() => {
      this.isAnim = false;
      this.spinLayer.style.transition = 'none';
      if (this.onSpinEnd) this.onSpinEnd(idx);
    }, SPIN_DUR + 600);
  }
}

// Export to global for app.js
window.WheelController = WheelController;
window.PRIZES = PRIZES;
window.IMG = IMG;
