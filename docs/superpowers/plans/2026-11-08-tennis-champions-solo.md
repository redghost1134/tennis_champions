# Tennis Champions — Phase 1 (mode solo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un jeu de tennis 3D jouable de bout en bout sur une Samsung Galaxy Tab A9 (Chrome), où Yazan ou Ghassan affronte les 10 champions débloqués un par un, avec les vraies règles du tennis.

**Architecture:** Toute la logique de jeu (score, service, physique de balle, qualité de frappe, IA, contrôleur de match, progression) est en JavaScript pur, sans Three.js ni DOM, testée avec Vitest. Le rendu (Three.js), l'interface (DOM) et le son (WebAudio) lisent l'état du contrôleur de match et ses événements, sans logique de règle. Le match entre frères (Phase 2) fera l'objet d'un plan séparé et réutilisera le même contrôleur.

**Tech Stack:** Vite 5, JavaScript ES modules, three@0.160.0 (npm, pas de CDN), Vitest 2, vite-plugin-pwa, @vite-pwa/assets-generator.

**Spec:** `docs/superpowers/specs/2026-11-08-tennis-champions-design.md`
**Référence visuelle :** `.superpowers/brainstorm/11378-1794155840/content/vue-3d-v4.html` (maquette validée : décor, personnages, effets, caméra — le code de rendu est porté depuis ce fichier).

## Global Constraints

- Cible : Samsung Galaxy Tab A9, Chrome Android, **paysage** ; jouable aussi au clavier sur ordinateur.
- Interface en **français** ; menus utilisables **sans savoir lire** (gros boutons, visages, pictogrammes). Zones tactiles ≥ 64 px.
- Palette décor : jaune `#ffc72c`, bleu `#1f56c4`, blanc `#f7f7f2`, noir `#1c1d22`. Lieu : « ÉCOLE GEORGE VANIER ». **Pas de public.**
- Yazan : 7 ans, cheveux courts bruns, peau claire, maillot n°7. Ghassan : 4 ans, cheveux bouclés marron un peu longs, peau claire, maillot n°4, plus petit (échelle visuelle 1.05 contre 1.3).
- **Aucun handicap** : Yazan et Ghassan ont la même vitesse (4.4 m/s) et la même portée de frappe (0.9 m). La taille est purement visuelle.
- Règles réelles : 0/15/30/40/jeu, **égalité/avantage**, service en diagonale, 2 essais, double faute, set à 6 jeux avec 2 d'écart et **tie-break à 6-6**.
- Durées : `quick` = 1 jeu, `normal` = 3 jeux gagnants, `set` = 1 set.
- Contrôles : croix 4 flèches à gauche ; LOB, SMASH, SERVICE à droite ; frappe automatique ; clavier : flèches, `Q` = lob, `S` = smash, `Espace` = service.
- Caméra derrière son joueur : position `(px*0.5, 7.6, pz+7.4)`, regarde `(px*0.25, 0, -1.0)` (valeurs de la maquette v4).
- Aucune donnée envoyée hors de la tablette ; progression dans `localStorage`.
- Terrain (unités = mètres de jeu) : `W=7` (x ∈ [-3.5, 3.5]), `L=18` (z ∈ [-9, 9]), filet en z=0, hauteur 0.84, lignes de service à |z|=5, ligne médiane x=0. Le joueur humain est le côté `A` (z>0, regarde vers -z) ; l'adversaire est `B` (z<0).

## Review Focus

1. **Égalité qui s'éternise / tie-break** — 40-40 → AV → égalité plusieurs fois doit rester correct ; tie-break à 6-6 gagné à 7 avec 2 points d'écart (ex. 8-6). Tests ajoutés en Task 2.
2. **Balle frappée deux fois / frappe juste après sa propre frappe** — un joueur ne doit pas re-frapper une balle qui s'éloigne de lui. Test ajouté en Task 7.
3. **Balle bloquée sur le filet ou qui roule** — après un filet, le point doit se terminer en < 2 s même si la balle ne rebondit plus. Test ajouté en Task 4 et Task 7.
4. **Changement d'onglet / tablette en veille** — un `dt` énorme au retour ne doit ni téléporter la balle à travers le joueur ni casser l'état (dt plafonné à 0.05 s, et pas de NaN si dt = 0). Test ajouté en Task 7.
5. **localStorage indisponible ou corrompu** — le jeu démarre quand même (profil à choisir, niveau 1 débloqué). Test ajouté en Task 6.

---

## Structure des fichiers

```
package.json, vite.config.js, index.html, .gitignore
public/icons/icon.svg (+ PNG générés)
src/
  core/            (pur, testé)
    court.js        dimensions, in/out, carrés de service
    scoring.js      moteur de score tennis
    serve.js        jauge et issue du service
    physics.js      balle : lancer, intégration, rebond, filet, prédiction
    shot.js         qualité de frappe, cible, issue
    opponents.js    les 10 champions (données)
    ai.js           décisions de l'adversaire
    progress.js     profil + déblocages (localStorage injectable)
    match.js        contrôleur de match (machine à états + événements)
    rng.js          générateur aléatoire déterministe
  render/
    scene.js        renderer, lumière, ciel, nuages, qualité adaptative
    school.js       cour de l'école George Vanier
    characters.js   makeCharacter(spec) + animateCharacter + presets
    effects.js      particules, traînées, onomatopées
    camera.js       caméra derrière le joueur + tremblement
    portraits.js    portraits 2D des personnages pour les menus
  ui/
    controls.js     croix + boutons + clavier → état d'entrée
    hud.js          score, jauge de service, messages
    screens.js      profil, menu, galerie, durée, fin de match
  audio/sfx.js      sons synthétisés WebAudio + mute
  main.js           assemblage + boucle
tests/core/*.test.js
```

---

### Task 1: Projet, outillage et squelette

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `.gitignore`, `src/main.js`, `src/core/rng.js`, `tests/core/rng.test.js`

**Interfaces:**
- Produces: `createRng(seed: number) => () => number` (valeurs dans [0,1), déterministe — mulberry32). Scripts npm `dev`, `build`, `preview`, `test` (`vitest run`).

- [ ] **Step 1:** `git init`, puis `.gitignore` avec `node_modules/`, `dist/`, `.superpowers/`.
- [ ] **Step 2:** `npm init -y` puis `npm i three@0.160.0` et `npm i -D vite@5 vitest@2 vite-plugin-pwa @vite-pwa/assets-generator`.
- [ ] **Step 3: Write the failing test** `tests/core/rng.test.js`

```js
import { createRng } from '../../src/core/rng.js';
test('même graine → même suite', () => {
  const a = createRng(42), b = createRng(42);
  expect([a(), a(), a()]).toEqual([b(), b(), b()]);
});
test('valeurs dans [0,1)', () => {
  const r = createRng(1);
  for (let i = 0; i < 1000; i++) { const v = r(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
});
```

- [ ] **Step 4:** `npm test` → FAIL (module introuvable).
- [ ] **Step 5:** Implémenter `createRng` (mulberry32) dans `src/core/rng.js`.
- [ ] **Step 6:** `npm test` → PASS.
- [ ] **Step 7:** `index.html` : `<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">`, `<html lang="fr">`, `<canvas id="c">`, `<div id="ui">`, `<script type="module" src="/src/main.js">`. CSS : `touch-action:none; overscroll-behavior:none; user-select:none` sur `body`. `src/main.js` affiche un cube Three.js qui tourne.
- [ ] **Step 8:** `npm run dev` → la page affiche le cube sans erreur console.
- [ ] **Step 9: Commit** `git add -A && git commit -m "chore: scaffold Vite + Three + Vitest"`

---

### Task 2: Moteur de score (`scoring.js`)

**Files:**
- Create: `src/core/scoring.js`, `tests/core/scoring.test.js`

**Interfaces:**
- Produces:
  - `createScore({ format: 'quick'|'normal'|'set', firstServer: 'A'|'B' }) => Score`
  - `Score = { format, points:{A,B}, games:{A,B}, tiebreak:boolean, server:'A'|'B', winner:null|'A'|'B' }` (immuable)
  - `awardPoint(score, side) => { score: Score, events: Array<'game'|'tiebreak_start'|'match'> }`
  - `pointLabel(score) => { A: string, B: string }` — `'0','15','30','40','AV',''` ; en tie-break, les nombres ; à 40-40 et plus à égalité : `{A:'Égalité',B:'Égalité'}`
  - `serveSide(score) => 'deuce'|'ad'` — `deuce` quand la somme des points du jeu en cours est paire.

- [ ] **Step 1: Write the failing tests** (un `test` par ligne) :

```js
// helpers : play(score, 'AAAB') applique awardPoint pour chaque lettre
test('0-15-30-40-jeu', ...)                       // AAAA → games.A=1, points remis à 0
test('égalité puis avantage puis égalité', ...)    // AAABBB → label Égalité ; A → A:'AV',B:'' ; B → Égalité
test('avantage converti gagne le jeu', ...)        // AAABBB A A → games.A=1
test('égalité répétée 5 fois reste correcte', ...)
test('le serveur change à chaque jeu', ...)        // après AAAA, server='B'
test('serveSide alterne deuce/ad', ...)            // 0 pt deuce, 1 pt ad, 2 pts deuce
test('quick : 1 jeu gagne le match', ...)          // winner='A', events contient 'match'
test('normal : 3 jeux gagnants', ...)              // 2 jeux → winner null ; 3e → 'A'
test('set : 6-4 gagne', ...)
test('set : 6-5 ne gagne pas, 7-5 gagne', ...)
test('set : tie-break à 6-6', ...)                 // tiebreak=true, events 'tiebreak_start'
test('tie-break gagné 7-5', ...)
test('tie-break 6-6 → gagné 8-6 seulement', ...)
test('tie-break : service 1 puis 2-2', ...)        // pts 0:A, 1-2:B, 3-4:A (firstServer A)
test('awardPoint après la fin ne change rien', ...)
```

- [ ] **Step 2:** `npm test -- scoring` → FAIL.
- [ ] **Step 3:** Implémenter `src/core/scoring.js`. Le tie-break est un jeu spécial (premier à 7, 2 d'écart) qui donne le set 7-6. En tie-break, `server` = celui qui devait servir au 13e jeu pour le point 0, puis alterne toutes les 2 points (`Math.floor((n+1)/2) % 2`).
- [ ] **Step 4:** `npm test -- scoring` → PASS.
- [ ] **Step 5: Commit** `feat(core): tennis scoring with deuce and tie-break`

---

### Task 3: Terrain et service (`court.js`, `serve.js`)

**Files:**
- Create: `src/core/court.js`, `src/core/serve.js`, `tests/core/court.test.js`, `tests/core/serve.test.js`

**Interfaces:**
- Produces (`court.js`): constantes `COURT = { W:7, L:18, HALF_W:3.5, HALF_L:9, NET_H:0.84, SERVICE_Z:5 }` ;
  `isInCourt(x, z, receivingSide) => boolean` (lignes = dedans) ;
  `serviceBox(server, side) => { xMin, xMax, zMin, zMax }` (carré visé) ;
  `serverSpot(server, side) => { x, z }` (`x = ±1.2`, `z = ±9.4`).
  Règle : pour `A` (droite = +x), `deuce` → serveur à x>0, carré cible x∈[-3.5,0], z∈[-5,0]. Pour `B` (droite = -x), `deuce` → serveur à x<0, carré x∈[0,3.5], z∈[0,5]. `ad` inverse les signes de x.
- Produces (`serve.js`):
  `gaugeValue(t) => number` — triangle 0→1→0, période 1.2 s ;
  `gaugeZone(v) => 'green'|'yellow'|'red'` — vert `<0.5`, jaune `<0.8`, rouge sinon ;
  `SERVE = { green:{speed:9, fault:0}, yellow:{speed:13, fault:0.08}, red:{speed:18, fault:0.45} }` ;
  `rollServe(zone, rng) => { fault: null|'net'|'long', speed }` (faute : moitié `net`, moitié `long`) ;
  `aimPoint(box, slot: 0|1|2, server) => { x, z }` — slot 0 = près de la ligne médiane (|x|=0.5), 1 = milieu (|x|=1.75), 2 = extérieur (|x|=3.0) ; z au milieu du carré (|z|=3.2).

- [ ] **Step 1: Write the failing tests**

```js
test('serviceBox A deuce', () => expect(serviceBox('A','deuce')).toEqual({xMin:-3.5,xMax:0,zMin:-5,zMax:0}));
test('serviceBox A ad',    () => expect(serviceBox('A','ad')).toEqual({xMin:0,xMax:3.5,zMin:-5,zMax:0}));
test('serviceBox B deuce', () => expect(serviceBox('B','deuce')).toEqual({xMin:0,xMax:3.5,zMin:0,zMax:5}));
test('isInCourt : ligne = dedans', () => { expect(isInCourt(3.5,-9,'B')).toBe(true); expect(isInCourt(3.51,-4,'B')).toBe(false); expect(isInCourt(0,2,'B')).toBe(false); });
test('gaugeValue triangle', () => { expect(gaugeValue(0)).toBe(0); expect(gaugeValue(0.6)).toBeCloseTo(1); expect(gaugeValue(1.2)).toBeCloseTo(0); });
test('gaugeZone seuils', () => { expect(gaugeZone(0.49)).toBe('green'); expect(gaugeZone(0.5)).toBe('yellow'); expect(gaugeZone(0.8)).toBe('red'); });
test('vert ne fait jamais faute', () => { const r=createRng(3); for(let i=0;i<500;i++) expect(rollServe('green',r).fault).toBeNull(); });
test('rouge fait faute ≈45 %', () => { const r=createRng(5); let f=0; for(let i=0;i<4000;i++) if(rollServe('red',r).fault) f++; expect(f/4000).toBeGreaterThan(0.40); expect(f/4000).toBeLessThan(0.50); });
test('aimPoint dans le carré', () => { for (const s of [0,1,2]) { const p=aimPoint(serviceBox('A','deuce'),s,'A'); const b=serviceBox('A','deuce'); expect(p.x).toBeGreaterThanOrEqual(b.xMin); expect(p.x).toBeLessThanOrEqual(b.xMax); } });
```

- [ ] **Step 2:** `npm test -- court serve` → FAIL.
- [ ] **Step 3:** Implémenter `court.js` et `serve.js`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(core): court geometry and serve gauge`

---

### Task 4: Physique de la balle (`physics.js`)

**Files:**
- Create: `src/core/physics.js`, `tests/core/physics.test.js`

**Interfaces:**
- Consumes: `COURT` (Task 3).
- Produces:
  - `G = 9.8`, `RESTITUTION = 0.62`, `FRICTION = 0.85` (vitesse horizontale conservée au rebond)
  - `Ball = { p:{x,y,z}, v:{x,y,z}, bounces:number, lastBounce:{x,z}|null, netHit:boolean, dead:boolean }`
  - `launch(from:{x,y,z}, to:{x,z}, horizSpeed:number) => {x,y,z}` — vitesse initiale pour atterrir (y=0) en `to` avec cette vitesse horizontale.
  - `launchApex(from, to, apexY) => {x,y,z}` — variante lob : passe par une hauteur max `apexY`.
  - `stepBall(ball, dt) => { ball, events: Array<{type:'bounce',x,z}|{type:'net'}> }` — intégration semi-implicite ; si la balle traverse z=0 avec y < NET_H → événement `net`, `v.z = -0.2*v.z`, `netHit=true` ; si `netHit` et vitesse < 0.3 m/s ou temps depuis filet > 1.5 s → `dead=true`.
  - `predictAt(ball, predicate:(b)=>boolean, maxT=3) => { t, p } | null` — simulation par pas de 1/120 s.

- [ ] **Step 1: Write the failing tests**

```js
test('launch atterrit sur la cible', ...)       // from (0,1,8) to (1,-6) speed 12 → simuler jusqu'au 1er rebond : |x-1|<0.05, |z+6|<0.05
test('launchApex atteint la hauteur', ...)      // apex 5.5 → max y ∈ [5.4,5.6]
test('rebond réduit vy de RESTITUTION', ...)
test('balle trop basse touche le filet', ...)   // from (0,0.5,6) vers (0,-6) speed 18 → event net, netHit true
test('balle au filet devient morte < 2 s', ...) // Review Focus 3
test('predictAt trouve la hauteur 1 m après rebond', ...)
test('stepBall avec dt=0 ne produit pas de NaN', ...)
```

- [ ] **Step 2:** `npm test -- physics` → FAIL.
- [ ] **Step 3:** Implémenter `physics.js`. `launch` : temps de vol `T = dist_xz / horizSpeed`, `vy = (0 - y0 + 0.5*G*T²)/T`.
- [ ] **Step 4:** `npm test -- physics` → PASS.
- [ ] **Step 5: Commit** `feat(core): ball physics with bounce and net`

---

### Task 5: Frappes (`shot.js`)

**Files:**
- Create: `src/core/shot.js`, `tests/core/shot.test.js`

**Interfaces:**
- Consumes: `COURT`, `launch`, `launchApex`.
- Produces:
  - `REACH = 0.9` (portée identique pour tous), `SMASH_MIN_Y = 1.6`
  - `resolveKind(armed: null|'lob'|'smash', ballY) => 'normal'|'lob'|'smash'` — smash sur balle < 1.6 → `normal`.
  - `errorChance({ kind, dist, speed, maxSpeed, errorScale=1 }) => number` = `(BASE[kind] + 0.25*(dist/REACH)² + 0.08*min(speed/maxSpeed,1)) * errorScale`, avec `BASE = { normal:0.03, lob:0.06, smash:0.10 }`, borné à [0, 0.9].
  - `planShot({ from, side, kind, aimDir: -1|0|1, rng, errorP }) => { v:{x,y,z}, outcome:'in'|'out'|'net', target:{x,z} }`
    - cible x : `aimDir*2.4` si aimDir≠0 (aimDir exprimé dans le repère du frappeur : droite = +x pour A, -x pour B), sinon `rng` dans [-1.2, 1.2] ;
    - profondeur (côté adverse, distance au filet) : normal 6.5, lob 7.5 (apex 5.5), smash 5.5 ;
    - vitesse horizontale : normal 12, lob via apex, smash 20 ;
    - si `rng() < errorP` : moitié `net` (cible côté frappeur à 1 m du filet, vitesse ×1.2), moitié `out` (aléatoire : profondeur 9.9, ou |x| = 4.3).

- [ ] **Step 1: Write the failing tests**

```js
test('smash sur balle basse devient normal', () => expect(resolveKind('smash', 1.0)).toBe('normal'));
test('smash sur balle haute reste smash', () => expect(resolveKind('smash', 2.0)).toBe('smash'));
test('frappe parfaite immobile : risque = base', () => expect(errorChance({kind:'normal',dist:0,speed:0,maxSpeed:4.4})).toBeCloseTo(0.03));
test('frappe en limite de portée en courant : risque plus élevé', () => expect(errorChance({kind:'normal',dist:0.9,speed:4.4,maxSpeed:4.4})).toBeCloseTo(0.36));
test('aimDir droite pour A vise +x', ...)
test('aimDir droite pour B vise -x', ...)
test('errorP=0 → atterrit dans le terrain adverse', ...)   // simuler avec stepBall, isInCourt true
test('outcome net → la balle touche le filet', ...)
test('outcome out → 1er rebond hors du terrain', ...)
```

- [ ] **Step 2:** `npm test -- shot` → FAIL.
- [ ] **Step 3:** Implémenter `shot.js`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(core): shot quality and trajectories`

---

### Task 6: Champions, IA et progression (`opponents.js`, `ai.js`, `progress.js`)

**Files:**
- Create: `src/core/opponents.js`, `src/core/ai.js`, `src/core/progress.js`, `tests/core/ai.test.js`, `tests/core/progress.test.js`

**Interfaces:**
- Produces (`opponents.js`): `OPPONENTS: Array<{ id, level, name, ai:{ speed, reaction, aimWide, errorScale, lob, smash, red, yellow } }>` — valeurs exactes :

| level | id | name | speed | reaction | aimWide | errorScale | lob | smash | red | yellow |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | lulu | Lulu la Tortue | 1.6 | 0.55 | 0 | 1.6 | 0 | 0 | 0 | 0 |
| 2 | bobo | Bobo l'Ourson | 1.9 | 0.50 | 0.3 | 1.5 | 0.05 | 0 | 0 | 0.1 |
| 3 | mimi | Mimi la Lapine | 3.2 | 0.35 | 0.5 | 2.2 | 0.05 | 0.05 | 0.1 | 0.3 |
| 4 | gaston | M. Gaston | 2.6 | 0.35 | 0.5 | 1.0 | 0.1 | 0.1 | 0.05 | 0.4 |
| 5 | pingo | Pingo le Pingouin | 3.4 | 0.25 | 0.55 | 0.9 | 0.1 | 0.15 | 0.1 | 0.5 |
| 6 | sonia | Mme Sonia | 3.4 | 0.22 | 0.7 | 0.8 | 0.3 | 0.2 | 0.15 | 0.5 |
| 7 | kenta | Kenta le Ninja | 4.4 | 0.15 | 0.7 | 0.7 | 0.15 | 0.3 | 0.2 | 0.5 |
| 8 | lea | Super Léa | 4.2 | 0.15 | 0.8 | 0.6 | 0.15 | 0.5 | 0.25 | 0.5 |
| 9 | flamme | Flamme le Dragon | 4.4 | 0.12 | 0.85 | 0.5 | 0.15 | 0.4 | 0.35 | 0.45 |
| 10 | robomax | Robo-Max | 4.8 | 0.08 | 0.95 | 0.35 | 0.2 | 0.6 | 0.4 | 0.5 |

- Produces (`ai.js`): `createAI(params, rng) => { decide(view, dt) => Input }` où `view = { me:{x,z}, ball:Ball, phase, iAmServer, opponent:{x,z} }` et `Input = { move:{x:-1..1, z:-1..1}, armed:null|'lob'|'smash', servePress:boolean, aimDir:-1|0|1 }` (même forme que l'entrée humaine). L'IA attend `reaction` s après la frappe adverse, puis vise le point `predictAt(ball, y≈1 après rebond côté B)` décalé de 0.5 vers son côté coup droit. Au service : choisit la zone visée (rouge avec proba `red`, jaune `yellow`, sinon vert) et relâche `servePress` quand `gaugeZone` atteint la zone visée. `aimWide` = proba de viser un côté (aimDir ≠ 0) plutôt que le centre.
- Produces (`progress.js`): `createProgress(storage = globalThis.localStorage) => { getProfile(): null|'yazan'|'ghassan', setProfile(p), unlocked(): number /*1..10*/, recordWin(level), muted(): boolean, setMuted(b) }` — clé `tc.v1` ; toute exception ou JSON invalide → valeurs par défaut (profil `null`, `unlocked=1`, `muted=false`). `recordWin(level)` met `unlocked = max(unlocked, min(level+1, 10))`.

- [ ] **Step 1: Write the failing tests**

```js
test('OPPONENTS : 10 niveaux 1..10 dans l'ordre', ...)
test('IA niveau 10 rejoint une balle centrée à temps', ...)   // simulation 2 s : |me.x - cible| < REACH
test('IA niveau 1 ne vise jamais les côtés (aimWide 0)', ...)
test('IA au service relâche dans la zone choisie', ...)
test('progress : storage vide → défauts', ...)
test('progress : JSON corrompu → défauts', ...)           // Review Focus 5
test('progress : storage qui lève une exception → défauts', ...)
test('progress : recordWin(3) débloque 4, recordWin(10) reste 10', ...)
test('progress : recordWin(1) après unlocked=5 ne régresse pas', ...)
```

- [ ] **Step 2:** `npm test -- ai progress` → FAIL.
- [ ] **Step 3:** Implémenter les trois modules.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(core): champions, AI and progress`

---

### Task 7: Contrôleur de match (`match.js`)

**Files:**
- Create: `src/core/match.js`, `tests/core/match.test.js`

**Interfaces:**
- Consumes: tout `src/core/*`.
- Produces:
  - `createMatch({ format, rng, firstServer='A', speedA=4.4, speedB, errorScaleB=1 }) => Match`
  - `Match.update(dt, inputA: Input, inputB: Input) => Event[]` — `dt` plafonné à 0.05 ; `dt<=0` → aucun changement.
  - `Match.state` (lecture) : `{ phase:'serve_aim'|'serve_power'|'rally'|'point_over'|'match_over', players:{A:{x,z,vx,vz,swing:null|{kind,side:'fh'|'bh'|'sm'}},B:{…}}, ball:Ball|null, score:Score, serveAttempt:1|2, aimSlot:0|1|2, gauge:number, lastHitter:null|'A'|'B' }`
  - `Event` : `{type:'toss'|'serve'|'hit'|'bounce'|'net'|'fault'|'double_fault'|'out'|'point'|'game'|'tiebreak_start'|'match', side?, kind?, outcome?, winner?, x?, z?}`
- Règles implémentées :
  - Déplacement : `move` × vitesse ; A limité à x∈[-5,5], z∈[1.5,11] ; B en miroir ; « haut » = vers le filet.
  - `serve_aim` : le serveur est placé sur `serverSpot` ; gauche/droite (front montant) change `aimSlot` ; `servePress` → `toss` puis `serve_power`.
  - `serve_power` : `gauge = gaugeValue(t)` ; `servePress` → `rollServe(gaugeZone(gauge))` ; lancement vers `aimPoint` (ou trajectoire de faute) ; phase `rally`.
  - Service : le 1er rebond doit être dans `serviceBox` → sinon `fault` (attempt 1 → attempt 2, retour à `serve_aim`) ou `double_fault` + point au receveur. Le retour de service doit rebondir avant d'être frappé.
  - Frappe auto : balle côté du joueur **et qui se dirige vers lui** (signe de v.z), `lastHitter !== joueur`, distance xz au point de raquette (x ± 0.5 côté coup droit ou revers, le plus proche) ≤ `REACH`, 0.15 ≤ y ≤ 2.6. `kind = resolveKind(armed, y)` ; `errorP = errorChance(...)` ; `planShot`. Le bouton armé est consommé.
  - Fin de point : 1er rebond hors terrain adverse → point à l'adversaire du frappeur (`out`) ; `net` puis balle morte → point à l'adversaire du frappeur ; 2e rebond côté receveur → point au frappeur. Puis `point_over` 1.8 s, puis `serve_aim` (ou `match_over`).

- [ ] **Step 1: Write the failing tests** (rng déterministe, entrées scriptées)

```js
test('double faute → point au receveur', ...)              // forcer rollServe rouge+faute deux fois (rng stub)
test('service dans le carré puis receveur immobile hors portée → point au serveur', ...)
test('balle dans le filet → point à l adversaire du frappeur', ...)   // Review Focus 3 : point en < 2 s
test('balle out → point à l adversaire du frappeur', ...)
test('un joueur ne re-frappe pas sa propre balle', ...)    // Review Focus 2
test('retour de service de volée impossible', ...)
test('le receveur immobile sur la trajectoire frappe automatiquement', ...)
test('smash armé sur balle basse → event hit kind normal', ...)
test('dt=10 est plafonné, aucun NaN', ...)                  // Review Focus 4
test('dt=0 ne change rien', ...)
test('match quick IA vs IA se termine avec un vainqueur', ...)  // boucle ≤ 20 000 pas
```

- [ ] **Step 2:** `npm test -- match` → FAIL.
- [ ] **Step 3:** Implémenter `match.js`.
- [ ] **Step 4:** `npm test` → PASS (toute la suite).
- [ ] **Step 5: Commit** `feat(core): match controller`

---

### Task 8: Scène, école et caméra

**Files:**
- Create: `src/render/scene.js`, `src/render/school.js`, `src/render/camera.js`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `COURT`.
- Produces: `createScene(canvas) => { renderer, scene, toon(color, opts), outline(mesh, s), mesh(geo, mat, x,y,z, parent, opts), textTex(txt, opts), setQuality('high'|'medium'|'low') }` ; `buildSchool(ctx) => { tick(t, dt) }` (fanions, arbres, nuages) ; `createCamera(ctx) => { camera, follow(player:{x,z}, side:'A', dt), shake(amount) }`.

- [ ] **Step 1:** Porter depuis la maquette v4 : renderer (ACES, exposition 1.2, ombres PCFSoft 2048), ciel en dégradé, nuages, terrain/lignes/filet, bâtiments « ÉCOLE GEORGE VANIER » aux deux bouts, écussons GV, horloge, grillage, fanions, bancs, panier, marelle, arbres, « GEORGE VANIER » peint au sol.
- [ ] **Step 2:** Qualité : `high` = pixelRatio min(dpr,2) + ombres 2048 ; `medium` = 1.5 + 1024 ; `low` = 1 + ombres désactivées sauf ombres rondes. Défaut `medium`.
- [ ] **Step 3:** `npm run dev` → capture d'écran : décor identique à la maquette v4, aucune erreur console.
- [ ] **Step 4: Commit** `feat(render): school scene and camera`

---

### Task 9: Personnages (Yazan, Ghassan, 10 champions)

**Files:**
- Create: `src/render/characters.js`, `src/render/portraits.js`

**Interfaces:**
- Consumes: `createScene` helpers.
- Produces: `makeCharacter(ctx, presetId) => THREE.Group` (userData = rig de la maquette : `root, body, legs[2], arms[2], head, eyes, smile, mouth, frame, swoosh, scale`) ; `animateCharacter(char, { vx, facing:1|-1, swing:null|{kind,side}, swingT, celebrate, sad, ballPos }, t, dt)` ; `PRESETS` (ids : `yazan`, `ghassan`, et les 10 ids de `OPPONENTS`) avec `trail` (couleur de traînée de raquette) ; `renderPortrait(ctx, presetId) => string` (dataURL 256×256, tête et épaules).
- Apparence des champions : rig bipède commun, têtes/accessoires spécifiques — Lulu (carapace verte, tête de tortue), Bobo (ours brun, oreilles rondes), Mimi (lapine blanche, longues oreilles), M. Gaston (casquette noire, moustache, bleu de travail), Pingo (corps noir/blanc, bec jaune), Mme Sonia (bandeau bleu, sifflet, haut jaune), Kenta (tenue noire, bandeau rouge ; nuage de fumée quand il se déplace vite), Super Léa (masque bleu, cape rouge ; traînée d'étoiles sur smash), Flamme (dragon vert, cornes jaunes ; traînée de feu), Robo-Max (**gris et bleu**, antenne, visière bleue ; traînée bleue lumineuse).
- Animations reprises de la maquette (clés `KEYS.fh/bh/sm`, sautillement d'attente, course + poussière, clignement, bouche ouverte, célébration, tête qui secoue) — **avec la correction `vx = dt>0 ? step/dt : 0`** (bug NaN de la maquette).

- [ ] **Step 1:** Implémenter `makeCharacter` + presets Yazan/Ghassan (portage maquette).
- [ ] **Step 2:** Ajouter les 10 presets champions.
- [ ] **Step 3:** Page de vérification `?gallery` dans `main.js` : les 12 personnages alignés qui sautillent et frappent en boucle → capture d'écran, chaque personnage reconnaissable, aucune erreur console.
- [ ] **Step 4: Commit** `feat(render): characters and champions`

---

### Task 10: Contrôles, HUD, effets et sons

**Files:**
- Create: `src/ui/controls.js`, `src/ui/hud.js`, `src/render/effects.js`, `src/audio/sfx.js`

**Interfaces:**
- Produces: `createControls(root) => { read(): Input, setMode('serve'|'rally'|'hidden') }` — croix 4 flèches à gauche (boutons 84 px), à droite LOB, SMASH (armement en surbrillance, consommé par la frappe) et SERVICE (visible seulement au service) ; bouton **pause** (en haut au centre ; menu pause : « Reprendre » / « Quitter ») ; multi-touch via Pointer Events ; clavier (flèches, Q, S, Espace, Échap = pause).
- `createHud(root) => { setScore(score, names), showGauge(v|null), showAim(slot|null), flash(text, color) }` — messages exacts : « FAUTE ! », « DOUBLE FAUTE ! », « OUT ! », « FILET ! », « Point Yazan ! 🎉 », « Jeu Ghassan ! 🏆 », « Égalité », « Avantage Yazan », « Jeu décisif ! ». Jauge verte/jaune/rouge aux seuils 0.5 / 0.8.
- `createEffects(ctx) => { onEvent(event, worldPos), tick(dt) }` — étincelles + anneau + onomatopée à la frappe (« PAF ! », « POK ! », « BIM ! », « TOC ! », « LOB ! », « SMASH ! »), anneau + poussière au rebond, tremblement du filet, confettis jaune/bleu/blanc/noir au point, tremblement caméra sur smash.
- `createSfx(progress) => { play('hit'|'bounce'|'net'|'fault'|'point'|'win'|'click'), music(on:boolean), setMuted(b) }` — synthèse WebAudio (pas de fichiers), contexte audio repris au premier toucher.

- [ ] **Step 1:** Implémenter les quatre modules.
- [ ] **Step 2:** Dans `main.js`, brancher un match `quick` contre Lulu (sans menus) → test manuel : se déplacer, servir (jauge, 3 cibles, faute, double faute), échanger, LOB/SMASH, voir les messages. Capture d'écran + aucune erreur console.
- [ ] **Step 3: Commit** `feat(ui): controls, HUD, effects and sounds`

---

### Task 11: Écrans et parcours complet

**Files:**
- Create: `src/ui/screens.js`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `createProgress`, `OPPONENTS`, `renderPortrait`, `createMatch`, `createAI`.
- Produces: `createScreens(root, deps) => { show('profile'|'menu'|'gallery'|'format'|'end', data) }`.
- Parcours :
  1. **Profil** (si `getProfile()` est null) : deux gros portraits « Yazan » / « Ghassan ».
  2. **Menu** : bouton « Défier un champion » (trophée) ; petit bouton profil (changer) et son. **Aucun bouton « Jouer contre mon frère » en Phase 1** (décision utilisateur : multijoueur non exposé, ajouté en Phase 2).
  3. **Galerie** : 10 cartes portrait + niveau + étoiles ; verrouillées grisées avec cadenas.
  4. **Durée** : trois gros boutons à pictogrammes — 1 balle (« Rapide »), 3 balles (« Normal »), coupe (« Set »).
  5. **Match**.
  6. **Fin** : vainqueur qui saute + confettis, score final, « Rejouer » / « Menu » ; si victoire contre le niveau débloquant → animation « Nouveau champion débloqué ! » avec le portrait.
- Le joueur humain est toujours le côté A avec le personnage du profil ; l'adversaire est B, `speedB` et `errorScaleB` pris dans `OPPONENTS`.

- [ ] **Step 1:** Implémenter `screens.js` et le parcours dans `main.js`.
- [ ] **Step 2:** Test manuel complet : premier lancement → profil → galerie → Lulu → match `quick` gagné → Bobo débloqué ; recharger la page → profil et déblocage conservés. Captures d'écran.
- [ ] **Step 3: Commit** `feat(ui): screens and solo flow`

---

### Task 12: Performance tablette, PWA et build

**Files:**
- Modify: `src/render/scene.js`, `vite.config.js`, `index.html`
- Create: `public/icons/icon.svg`, PNG générés

**Interfaces:**
- Produces: qualité adaptative — moyenne glissante des images/s sur 3 s ; < 45 i/s → descendre d'un niveau ; > 58 i/s pendant 10 s → monter (jamais au-dessus de `high`).

- [ ] **Step 1:** Implémenter la qualité adaptative ; plafonner les particules à 300.
- [ ] **Step 2:** `public/icons/icon.svg` (balle jaune sur fond bleu `#1f56c4`, liseré `#ffc72c`) puis `npx pwa-assets-generator --preset minimal-2023 public/icons/icon.svg`.
- [ ] **Step 3:** `vite-plugin-pwa` : `registerType:'autoUpdate'`, manifest `{ name:'Tennis Champions', short_name:'Tennis', lang:'fr', display:'fullscreen', orientation:'landscape', background_color:'#1f56c4', theme_color:'#1f56c4' }`, mise en cache de tous les fichiers du build. Écran « Tourne la tablette » si portrait. Verrou de veille d'écran (`navigator.wakeLock`) pendant un match, ignoré s'il est indisponible.
- [ ] **Step 4:** `npm run build && npm run preview` → Lighthouse « installable » OK ; le jeu se lance hors ligne après un premier chargement.
- [ ] **Step 5:** `npm test` → toute la suite PASS.
- [ ] **Step 6: Commit** `feat: adaptive quality and PWA`

**Hors plan (décision de l'utilisateur) :** la mise en ligne à une adresse publique (GitHub Pages, Netlify…) demande un compte ; à proposer à l'utilisateur une fois la Task 12 terminée, avec un test réel sur la Galaxy Tab A9.
