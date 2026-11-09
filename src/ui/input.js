// Pure input state shared by touch buttons and keyboard. read() returns the match Input
// in the player's own frame: move.x +1 = right, move.z +1 = toward the net.
// Moving and aiming are separate: aimDir comes from the armed aim buttons, never from the arrows,
// so a player can run right and still hit left.
export function createInputState() {
  const held = { left: false, right: false, up: false, down: false, serve: false };
  // Serve taps are queued so each one reaches the match as a rising edge, even when several taps
  // (or a tap and its release) happen between two frames: a released frame is inserted between taps.
  let pendingTaps = 0;
  let lastServe = false;
  let armed = null;
  let aim = 0; // -1 left, +1 right, 0 centre

  return {
    set(key, on) {
      if (!(key in held)) return;
      if (key === 'serve' && on && !held.serve) pendingTaps++;
      held[key] = !!on;
    },
    toggleArm(kind) {
      armed = armed === kind ? null : kind;
    },
    toggleAim(dir) {
      const d = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
      aim = aim === d ? 0 : d;
    },
    // the shot type and the aim are both used up by a hit
    disarm() {
      armed = null;
      aim = 0;
    },
    get aim() {
      return aim;
    },
    get armed() {
      return armed;
    },
    reset() {
      for (const k of Object.keys(held)) held[k] = false;
      pendingTaps = 0;
      lastServe = false;
      armed = null;
      aim = 0;
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
      return { move: { x, z }, armed, servePress, aimDir: aim };
    },
  };
}
