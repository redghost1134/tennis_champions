// Coach bubble (portrait + line) at the bottom centre, and a bouncing hand pointing at a button.
const CSS = `
.tc-coach { position: absolute; left: 50%; top: calc(max(10px, env(safe-area-inset-top)) + 76px); transform: translateX(-50%);
  width: min(46vw, 560px); display: flex; align-items: center; gap: 10px; background: #f7f7f2; color: #1c1d22;
  border: 4px solid #1c1d22; border-radius: 22px; padding: 8px 14px 8px 8px; box-shadow: 0 5px 0 #1c1d22;
  font: 800 min(2.6vw, 21px)/1.2 'Trebuchet MS', sans-serif; pointer-events: auto; }
.tc-coach img { width: 74px; height: 74px; flex: none; border-radius: 50%; background: #1f56c4; border: 3px solid #1c1d22; }
.tc-coach.pop { animation: tc-cpop .35s ease-out; }
@keyframes tc-cpop { 0% { transform: translateX(-50%) scale(.85) } 60% { transform: translateX(-50%) scale(1.04) } }
.tc-hand { position: absolute; font-size: 64px; pointer-events: none; z-index: 5; animation: tc-hand .55s ease-in-out infinite alternate;
  filter: drop-shadow(0 4px 0 rgba(0,0,0,.35)); }
@keyframes tc-hand { to { transform: translateY(-16px) } }
.tc-steps { position: absolute; top: max(22px, env(safe-area-inset-top)); right: max(16px, env(safe-area-inset-right)); display: flex; gap: 6px; }
.tc-steps i { width: 18px; height: 18px; border-radius: 50%; border: 3px solid #1c1d22; background: rgba(255,255,255,.6); }
.tc-steps i.on { background: #ffc72c; }
.tc-steps i.cur { background: #ff5d8f; transform: scale(1.25); }
`;

export function createCoach(root, { portrait }) {
  if (!document.getElementById('tc-coach-css')) {
    const st = document.createElement('style');
    st.id = 'tc-coach-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  const box = document.createElement('div');
  box.className = 'tc-coach';
  box.innerHTML = `<img alt="" src="${portrait}"><span></span>`;
  const text = box.querySelector('span');
  root.appendChild(box);
  const hand = document.createElement('div');
  hand.className = 'tc-hand';
  hand.textContent = '👇';
  hand.style.display = 'none';
  root.appendChild(hand);
  const steps = document.createElement('div');
  steps.className = 'tc-steps';
  root.appendChild(steps);

  return {
    say(line) {
      text.textContent = line;
      box.classList.remove('pop');
      void box.offsetWidth;
      box.classList.add('pop');
    },
    // rect: {left, top, right, bottom} in page pixels, or null to hide the hand
    point(rect) {
      if (!rect) { hand.style.display = 'none'; return; }
      hand.style.display = '';
      hand.style.left = `${(rect.left + rect.right) / 2 - 32}px`;
      hand.style.top = `${rect.top - 74}px`;
    },
    progress(i, n) {
      steps.innerHTML = Array.from({ length: n }, (_, k) => `<i class="${k < i ? 'on' : k === i ? 'cur' : ''}"></i>`).join('');
    },
    destroy() {
      box.remove();
      hand.remove();
      steps.remove();
    },
  };
}
