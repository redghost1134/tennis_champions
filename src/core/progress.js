const KEY = 'tc.v1';
const PROFILES = [null, 'yazan', 'ghassan'];

function safeLocalStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function load(storage) {
  let raw = null;
  try {
    raw = JSON.parse(storage?.getItem(KEY));
  } catch {
    raw = null;
  }
  const o = raw && typeof raw === 'object' ? raw : {};
  return {
    profile: PROFILES.includes(o.profile) ? o.profile : null,
    // 0 = only the lesson (Cours) is open; level N unlocked = champions 1..N playable
    unlocked: Number.isInteger(o.unlocked) ? Math.min(10, Math.max(0, o.unlocked)) : 0,
    muted: typeof o.muted === 'boolean' ? o.muted : false,
  };
}

export function createProgress(storage = safeLocalStorage()) {
  const state = load(storage);
  const save = () => {
    try {
      storage?.setItem(KEY, JSON.stringify(state));
    } catch {
      // stockage indisponible : l'état reste en mémoire
    }
  };
  return {
    getProfile: () => state.profile,
    setProfile(p) {
      state.profile = PROFILES.includes(p) ? p : null;
      save();
    },
    unlocked: () => state.unlocked,
    recordWin(level) {
      state.unlocked = Math.max(state.unlocked, Math.min(level + 1, 10));
      save();
    },
    muted: () => state.muted,
    setMuted(b) {
      state.muted = !!b;
      save();
    },
  };
}
