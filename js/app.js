/**
 * app.js — Vue 2 (Options API) application
 * Depends on: wheel.js (loaded first via <script>)
 */

'use strict';

/* ── Constants ───────────────────────────────────────────────── */
const MAX_BET = 100;
const BC_BALANCE = 5830;

const JACKPOT_MSGS = [
    { user: 'Te***', prize: 'Jackpot' },
    { user: 'BlastM***', prize: 'x100' },
    { user: 'PhantomX***', prize: 'x10' },
    { user: 'IronW***', prize: 'x10' },
    { user: 'NeonR***', prize: 'x10' },
    { user: 'DarkV***', prize: 'x10' },
];

const CHARACTERS = ['Teddy', 'Nova', 'Ghost', 'Reaper', 'Phantom', 'Blaze'];

const MOCK_HISTORY = [
    { date: '2026.03.10 14:32', myBc: 5830, iBet: 50, spinResult: 'x100', balance: 5780 },
    { date: '2026.03.10 13:11', myBc: 5880, iBet: 100, spinResult: 'x10', balance: 5830 },
    { date: '2026.03.09 21:45', myBc: 5980, iBet: 30, spinResult: 'x0', balance: 5880 },
    { date: '2026.03.09 18:02', myBc: 6010, iBet: 30, spinResult: 'x50', balance: 5980 },
    { date: '2026.03.08 09:17', myBc: 6110, iBet: 100, spinResult: 'x0', balance: 6010 },
];

const COUNTDOWN_TARGET = new Date('2026-03-31T23:59:59+01:00').getTime();

/* ── Particle generation (done once on load) ─────────────────── */
function buildParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    // White twinkle stars
    for (let i = 0; i < 50; i++) {
        const d = document.createElement('div');
        const sz = Math.random() * 2 + 0.5;
        d.className = 'particle';
        d.style.cssText = `
      left:${Math.random() * 100}%;top:${Math.random() * 100}%;
      width:${sz}px;height:${sz}px;
      opacity:${Math.random() * 0.5 + 0.2};
      animation:twinkle ${2 + Math.random() * 4}s ${Math.random() * 4}s ease-in-out infinite alternate;
    `;
        container.appendChild(d);
    }

    // Gold sparkles
    for (let i = 0; i < 25; i++) {
        const d = document.createElement('div');
        const sz = Math.random() * 3 + 1.5;
        const isCircle = Math.random() > 0.5;
        d.className = 'sparkle-particle';
        d.style.cssText = `
      left:${Math.random() * 100}%;top:${Math.random() * 100}%;
      width:${sz}px;height:${sz}px;
      background:hsl(${40 + Math.random() * 20},100%,${65 + Math.random() * 25}%);
      border-radius:${isCircle ? '50%' : '1px'};
      animation:sparkle ${1.5 + Math.random() * 3}s ${Math.random() * 5}s ease-in-out infinite;
    `;
        container.appendChild(d);
    }
}

/* ── Vue 2 App ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    buildParticles();

    // Set background image
    const bgEl = document.getElementById('bg-image');
    if (bgEl) bgEl.style.backgroundImage = `url('${window.IMG.mainBg}')`;

    // Set header & hero images via src
    const setImg = (id, src) => { const el = document.getElementById(id); if (el) el.src = src; };
    setImg('img-papaya', window.IMG.papaya);
    setImg('img-blackshot', window.IMG.blackshot);
    setImg('img-title-logo', window.IMG.titleLogo);
    setImg('img-character', window.IMG.character);
    setImg('img-footer-papaya', window.IMG.papaya);
    setImg('img-footer-bluepotion', window.IMG.bluepotion);

    new Vue({
        el: '#vue-app',

        data() {
            return {
                // Auth
                isLoggedIn: false,
                // Wheel state
                isSpinning: false,
                prizeResult: null,    // index or null
                confirmType: null,    // 'gem' | 'usedFree' | null
                gems: 1231,
                bcBalance: BC_BALANCE,
                // Betting
                betAmount: '50',
                isMaxBet: false,
                selectedChar: '',
                // History
                spinHistory: [],
                showHistory: false,
                // Ticker
                tickerIdx: 0,
                // Responsive
                isMobile: window.innerWidth <= 768,
                windowWidth: window.innerWidth,
                // Countdown
                countdown: { days: 0, hours: 0, mins: 0, secs: 0 },
                // Result modal anim
                resultVisible: false,
                resultAnimReady: false,
                // History modal anim
                historyVisible: false,
                // Sound
                soundOn: true,
                // Constants for template
                CHARACTERS,
                JACKPOT_MSGS,
                MAX_BET,
                BC_BALANCE,
            };
        },

        computed: {
            characters() { return CHARACTERS; },
            historyRows() {
                return this.spinHistory;
            },
            prize() {
                return this.prizeResult !== null ? window.PRIZES[this.prizeResult] : null;
            },
            isJackpot() { return this.prize && this.prize.multiplier === 100; },
            isLose() { return this.prize && this.prize.multiplier === 0; },
            isWin() { return this.prize && !this.isJackpot && !this.isLose; },
            earnings() { return this.prize ? parseInt(this.betAmount || 0) * this.prize.multiplier : 0; },
            wheelDisplaySize() {
                return this.isMobile ? Math.min(320, this.windowWidth - 32) : 500;
            },
            wheelScale() { return this.wheelDisplaySize / 500; },
            // Result modal images
            resultCharImg() {
                if (!this.prize) return '';
                return this.isJackpot ? window.IMG.charJackpot : (this.isWin ? window.IMG.charWin : window.IMG.charLose);
            },
            resultTitleImg() {
                if (!this.prize) return '';
                return this.isJackpot ? window.IMG.titleJackpot : (this.isWin ? window.IMG.titleWin : window.IMG.titleLose);
            },
            resultTitleStyle() {
                if (!this.prize) return {};
                if (this.isJackpot) return { top: '53px', width: '231px', height: '80px' };
                if (this.isWin) return { top: '56px', width: '125px', height: '68px' };
                return { top: '54px', width: '117px', height: '68px' };
            },
            resultCharTop() { return this.isJackpot ? '139px' : '125px'; },
            resultCharSize() { return this.isJackpot ? '115px' : '129px'; },
            resultCharLeft() { return this.isJackpot ? 'calc(-50% + 0.5px)' : 'calc(-50% - 0.5px)'; },
            resultModalScale() {
                return Math.min(1, (this.windowWidth - 32) / 722);
            },
            // countdown digits
            cdDays() { return String(this.countdown.days).padStart(2, '0').split(''); },
            cdHours() { return String(this.countdown.hours).padStart(2, '0').split(''); },
            cdMins() { return String(this.countdown.mins).padStart(2, '0').split(''); },
            cdSecs() { return String(this.countdown.secs).padStart(2, '0').split(''); },
            // max-btn dome color
            maxBtnActive() { return this.isMaxBet; },
            // Display BC balance
            bcDisplay() {
                return this.isLoggedIn ? this.bcBalance.toLocaleString() : '—';
            },
        },

        watch: {
            isLoggedIn(val) {
                this.selectedChar = val ? 'Teddy' : '';
                if (this.wheel) this.wheel.updateLoggedIn(val);
            },
            prizeResult(val) {
                if (val !== null) {
                    this._t1 = setTimeout(() => { this.resultVisible = true; }, 50);
                    this._t2 = setTimeout(() => { this.resultAnimReady = true; }, 350);
                } else {
                    this.resultVisible = false;
                    this.resultAnimReady = false;
                    clearTimeout(this._t1);
                    clearTimeout(this._t2);
                }
            },
            showHistory(val) {
                if (val) {
                    this._th = setTimeout(() => { this.historyVisible = true; }, 30);
                } else {
                    this.historyVisible = false;
                    clearTimeout(this._th);
                }
            },
            wheelDisplaySize(size) {
                this._applyWheelSize(size);
            },
        },

        mounted() {
            // Hide preloader
            setTimeout(() => {
                const preloader = document.getElementById('preloader');
                if (preloader) {
                    preloader.classList.add('loaded');
                    setTimeout(() => { preloader.style.display = 'none'; }, 600);
                }
            }, 500);

            // Responsive listener
            const onResize = () => {
                this.isMobile = window.innerWidth <= 768;
                this.windowWidth = window.innerWidth;
            };
            window.addEventListener('resize', onResize);
            this._cleanResize = () => window.removeEventListener('resize', onResize);

            // Countdown ticker
            this._updateCountdown();
            this._cdInterval = setInterval(() => this._updateCountdown(), 1000);

            // Jackpot ticker
            this._tickerInterval = setInterval(() => {
                this.tickerIdx = (this.tickerIdx + 1) % JACKPOT_MSGS.length;
            }, 3500);

            // Build wheel (one tick later to ensure DOM is ready)
            this.$nextTick(() => {
                this._buildWheel();
            });
        },

        beforeDestroy() {
            if (this._cleanResize) this._cleanResize();
            clearInterval(this._cdInterval);
            clearInterval(this._tickerInterval);
        },

        methods: {
            // ── Wheel ─────────────────────────────────────────────────
            _buildWheel() {
                const wrapper = document.getElementById('wheel-wrapper');
                if (!wrapper) return;

                // Set outer div size
                const size = this.wheelDisplaySize;
                this._applyWheelSize(size);

                this.wheel = new window.WheelController('wheel-wrapper', (idx) => {
                    this.handleSpinEnd(idx);
                });
                this.wheel.updateLoggedIn(this.isLoggedIn);
            },

            _applyWheelSize(size) {
                const outerEl = document.getElementById('wheel-outer');
                if (outerEl) {
                    outerEl.style.width = size + 'px';
                    outerEl.style.height = size + 'px';
                    outerEl.style.cursor = (this.isLoggedIn && !this.isSpinning) ? 'pointer' : 'default';
                }
                const scaleEl = document.getElementById('wheel-scale-wrap');
                if (scaleEl) {
                    const scale = size / 500;
                    scaleEl.style.transform = scale < 1 ? `scale(${scale})` : 'none';
                }
            },

            // ── Spin flow ──────────────────────────────────────────────
            handleSpinClick() {
                if (!this.isLoggedIn || this.isSpinning) return;

                // ① BC가 0인 경우
                if (this.bcBalance === 0) {
                    alert('BC가 없습니다. Event를 진행할 수 없습니다.\nYou have 0 BC. Event cannot be started.');
                    return;
                }

                // ② 배팅금액 미입력 또는 0인 경우
                const bet = parseInt(this.betAmount) || 0;
                if (!this.betAmount || bet === 0) {
                    alert('There is no betting amount.');
                    return;
                }

                // ③ BC < 배팅금액인 경우
                if (this.bcBalance < bet) {
                    alert('BC가 부족합니다.\nInsufficient BC.');
                    return;
                }

                if (this.gems >= 70) {
                    this.confirmType = 'gem';
                } else {
                    this.doSpin();
                }
            },


            handleConfirmSpin() {
                this.confirmType = null;
                this.gems -= 70;
                this.doSpin();
            },

            doSpin() {
                this.isSpinning = true;
                // 휠 효과음 재생
                if (this._wheelSound) { this._wheelSound.pause(); this._wheelSound.currentTime = 0; }
                if (this.soundOn) {
                    this._wheelSound = new Audio('sound/wheel.mp3');
                    this._wheelSound.loop = true;
                    this._wheelSound.play().catch(() => { });
                }
                if (this.wheel) this.wheel.spin();
            },

            handleSpinEnd(idx) {
                this.isSpinning = false;
                // 휠 효과음 정지
                if (this._wheelSound) { this._wheelSound.pause(); this._wheelSound.currentTime = 0; }
                this.prizeResult = idx;
                const d = new Date();
                const months = ["Jan.", "Feb.", "March.", "April.", "May.", "June.", "July.", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];
                const now = `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')} ${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                this.spinHistory.unshift({
                    date: now,
                    myBc: this.bcBalance,
                    iBet: parseInt(this.betAmount) || 0,
                    spinResult: window.PRIZES[idx].name,
                    balance: this.bcBalance - (parseInt(this.betAmount) || 0),
                });
                // 결과 효과음 재생
                if (this.soundOn) {
                    const prize = window.PRIZES[idx];
                    let soundFile;
                    if (prize.multiplier === 100) soundFile = 'sound/jackpot.mp3';
                    else if (prize.multiplier === 0) soundFile = 'sound/lose.mp3';
                    else soundFile = 'sound/win.mp3';
                    const resultSound = new Audio(soundFile);
                    resultSound.play().catch(() => { });
                }
                // Update cursor after spin
                const outerEl = document.getElementById('wheel-outer');
                if (outerEl) outerEl.style.cursor = 'pointer';

                // Change main character if jackpot
                if (window.PRIZES[idx].multiplier === 100) {
                    const charImg = document.getElementById('img-character');
                    if (charImg) charImg.src = window.IMG.characterJackpotPose;
                    this.startConfetti();
                }
            },

            closeResult() {
                this.prizeResult = null;
                // Revert main character to normal pose
                const charImg = document.getElementById('img-character');
                if (charImg) charImg.src = window.IMG.character;
                this.stopConfetti();
            },

            startConfetti() {
                this._confettiActive = true;
                const colors = ['#FFD700', '#ff0000', '#00ff00', '#ffffff', '#ff00ff'];
                const frame = () => {
                    if (!this._confettiActive || !window.confetti) return;

                    window.confetti({
                        particleCount: 7,
                        angle: 60,
                        spread: 55,
                        origin: { x: 0, y: 1 },
                        colors: colors,
                        zIndex: 9999
                    });
                    window.confetti({
                        particleCount: 7,
                        angle: 120,
                        spread: 55,
                        origin: { x: 1, y: 1 },
                        colors: colors,
                        zIndex: 9999
                    });
                    requestAnimationFrame(frame);
                };
                frame();
            },

            stopConfetti() {
                this._confettiActive = false;
                if (window.confetti) {
                    try { window.confetti.reset(); } catch (e) { }
                }
            },

            // ── Betting ────────────────────────────────────────────────
            handleBetChange(val) {
                if (val === '' || /^\d+$/.test(val)) {
                    const num = parseInt(val) || 0;
                    if (num <= MAX_BET) {
                        this.betAmount = val;
                        this.isMaxBet = (num === MAX_BET && val !== '');
                    }
                }
            },

            handleMaxToggle() {
                if (!this.isLoggedIn) return;
                if (this.isMaxBet) {
                    this.isMaxBet = false;
                    this.betAmount = '';
                } else {
                    this.isMaxBet = true;
                    this.betAmount = String(MAX_BET);
                }
            },

            // ── Sound ──────────────────────────────────────────────────
            toggleSound() {
                this.soundOn = !this.soundOn;
                // 뮤트 시 휠 소리 즉시 정지
                if (!this.soundOn && this._wheelSound) {
                    this._wheelSound.pause();
                    this._wheelSound.currentTime = 0;
                }
            },

            // ── Countdown ──────────────────────────────────────────────
            _updateCountdown() {
                const diff = Math.max(0, COUNTDOWN_TARGET - Date.now());
                this.countdown = {
                    days: Math.floor(diff / 86400000),
                    hours: Math.floor((diff % 86400000) / 3600000),
                    mins: Math.floor((diff % 3600000) / 60000),
                    secs: Math.floor((diff % 60000) / 1000),
                };
            },

            // ── History ────────────────────────────────────────────────
            openHistory() { this.showHistory = true; },
            closeHistory() { this.showHistory = false; },

            // ── Helpers ────────────────────────────────────────────────
            historyRowBg(i) {
                return i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent';
            },
            historyDateDisplay(row) {
                return this.isMobile ? row.date.split(' ')[0] : row.date;
            },
        },
    });
});
