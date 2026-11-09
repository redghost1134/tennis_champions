// Pure input state shared by touch buttons and keyboard. read() returns the match Input
// in the player's own frame: move.x +1 = right, move.z +1 = toward the net.
export function createInputState() {
  const held = { left: false, right: false, up: false, down: false, serve: false };
  // Serve taps are queued so each one reaches the match as a rising edge, even when several taps
  // (or a tap and its release) happen between two frames: a released frame is inserted between taps.
  let pendingTaps = 0;
  let lastServe = false;
  let armed = null;

  return {
    set(key, on) {
      if (!(key in held)) return;
      if (key === 'serve' && on && !held.serve) pendingTaps++;
      held[key] = !!on;
    },
    toggleArm(kind) {
      armed = armed === kind ? null : kind;
    },
    disarm() {
      armed = null;
    },
    get armed() {
      return armed;
    },
    reset() {
      for (const k of Object.keys(held)) held[k] = false;
      pendingTaps = 0;
      lastServe = false;
      armed = null;
    },
    read() {
      const x = (held.right ? 1 : 0) - (held.left ? 1 : 0);
      const z = (held.up ? 1 : 0) - (held.down ? 1 : 0);
      let servePress;
      if (pendingTaps > 0) {
        servePress = !lastServe;
        if (servePress) pendingTaps--;
      } else servePress = held.serve;
      lastServe = servePress;
      return { move: { x, z }, armed, servePress, aimDir: x };
    },
  };
}
