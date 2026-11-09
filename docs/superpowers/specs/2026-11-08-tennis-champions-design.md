# Tennis Champions — document de conception

Date : 2026-11-08
Statut : en attente de validation

## 1. Intention

Un jeu de tennis pour deux frères, **Yazan (7 ans)** et **Ghassan (4 ans)**, qui leur permet de s'affronter chacun sur sa tablette dans la même pièce, ou de jouer seul contre une galerie de champions. Le jeu doit être **un « vrai jeu »** (3D cartoon, animations, effets) et **apprendre les vraies règles du tennis** (comptage, égalité/avantage, service en diagonale, deux essais, double faute).

Les personnages principaux sont les deux enfants eux-mêmes :

- **Yazan** — 7 ans, cheveux courts bruns, peau caucasienne (claire). Le plus grand des deux.
- **Ghassan** — 4 ans, cheveux un peu longs, bouclés, marron, peau caucasienne (claire). Plus petit.

Ghassan sait jouer : **aucun handicap ni aide** n'est appliqué au plus jeune.

## 2. Objectifs

1. Match 1 contre 1 entre deux tablettes sur le Wi-Fi de la maison.
2. Mode solo contre **10 adversaires** contrôlés par l'ordinateur, un par niveau de difficulté (1 à 10), **débloqués un par un**.
3. Règles réelles du tennis, y compris le service.
4. Rendu 3D cartoon de qualité, animations riches, ambiance cour d'école.
5. Jouable dans un navigateur, sur tablette en priorité (tactile) et sur ordinateur.

## 3. Non-objectifs

- Jeu en ligne contre des inconnus, classements publics, comptes utilisateurs.
- Chat, publicités, achats intégrés.
- Double (2 contre 2).
- Public / tribunes (explicitement retirés).

## 4. Anti-objectifs (échec même si « ça marche »)

- Des menus qui exigent de savoir lire : Ghassan (4 ans) doit pouvoir naviguer seul.
- Des règles simplifiées qui contredisent le vrai tennis.
- Un match à deux qui lague ou se désynchronise au point de rendre les points injustes.
- Toute collecte de données personnelles sur les enfants.

## 5. Ce qui a été décidé avec le demandeur

### 5.1 Plateforme

- Navigateur web, tablettes en priorité ; aussi jouable sur ordinateur.
- **Chaque enfant a sa propre tablette.**
- Les deux tablettes sont dans la même pièce, sur le **Wi-Fi de la maison, qui a accès à Internet**.
- **Tablettes cibles : Samsung Galaxy Tab A9 (Android, Chrome)** — tablette d'entrée de gamme : le budget graphique doit être calibré dessus (qualité adaptative, ombres et nombre d'objets maîtrisés). iPad non prioritaire.
- **Hébergement à une adresse web publique accepté**, y compris avec les prénoms, l'apparence des enfants et le nom de l'école.

### 5.1 bis Ordre de livraison

1. **D'abord le mode solo** contre les 10 champions (jouable de bout en bout sur une tablette).
2. **Ensuite le match entre frères** sur deux tablettes.

### 5.2 Caméra et style

- Caméra **en hauteur, derrière son propre joueur** : sur chaque tablette, on voit son personnage en bas et l'adversaire en face. (Référence : maquette `vue-3d-v4.html`, réglage final caméra : position `(x*0.5, 7.6, z+7.4)` regardant `(x*0.25, 0, -1.0)` côté joueur.)
- **3D cartoon** : corps entiers, raquettes, contours noirs, ombres, animations de frappe (coup droit, revers, smash), effets visuels (onomatopées « PAF ! », étincelles, traînée de balle, poussière, confettis).
- **Lieu : la cour de l'École George Vanier**, palette **jaune, bleu, blanc, noir**. Bâtiment d'école à chaque bout avec l'enseigne « ÉCOLE GEORGE VANIER », sol de cour, terrain bleu bordé de jaune, filet noir, grillage, fanions, bancs. **Pas de public.**
- La maquette `.superpowers/brainstorm/11378-1794155840/content/vue-3d-v4.html` est la **référence de direction artistique validée** (personnages, décor, effets, caméra). Le produit final doit être au moins à ce niveau.

### 5.3 Contrôles

- **Déplacement : croix de 4 flèches à gauche de l'écran** (gauche, droite, avancer vers le filet, reculer).
- **Frappe automatique** : le personnage frappe dès qu'il est assez près de la balle, sans bouton. Sans autre action, la frappe est **simple** (coup droit ou revers selon le côté de la balle).
- **Boutons à droite : visée ◀ / ▶, LOB et SMASH** pour choisir la direction et le type de frappe. (« ou autre » a été évoqué : d'autres coups pourront s'ajouter plus tard.)

### 5.4 Règles

- Comptage réel : 0, 15, 30, 40, jeu ; **égalité et avantage** conservés.
- **Durée sélectionnable par le joueur avant le match** : 1 jeu / 3 jeux gagnants / 1 set de 6 jeux.
- Le service change à chaque jeu.
- **Fautes en échange, comme au vrai tennis** : une frappe peut sortir (trop longue, trop large) ou finir dans le filet. Le risque dépend de la qualité de la frappe : frappe trop tôt / trop tard, joueur mal placé ou en pleine course, smash sur une balle trop basse, lob trop fort. Une frappe bien placée et bien chronométrée passe presque toujours. « OUT ! » / « FILET ! » s'affichent clairement pour apprendre pourquoi le point est perdu.

### 5.5 Service (comme au vrai tennis)

1. **Viser** : une cible clignotante dans le carré de service en diagonale, déplaçable avec les flèches (centre / milieu / extérieur).
2. **Lancer** : bouton **SERVICE** (à droite) → le personnage lance la balle.
3. **Puissance** : une jauge monte vert → jaune → rouge ; second appui pour frapper.
   - vert : lent, passe toujours ;
   - jaune : rapide, passe presque toujours ;
   - rouge : très rapide, souvent faute (filet ou trop long).
4. **Deux essais** ; « FAUTE ! » au premier raté, « DOUBLE FAUTE ! » au second → point à l'adversaire.
5. Service alterné **côté droit / côté gauche** à chaque point.
6. Les adversaires de l'ordinateur servent selon la même mécanique ; les plus forts visent plus souvent le rouge.

### 5.6 Adversaires solo (10, débloqués un par un)

| Niv. | Personnage | Caractère de jeu |
|---|---|---|
| 1 | Toto la Tortue | très lent, renvoie au milieu, doucement |
| 2 | Bobo l'Ourson | lent, balles douces un peu plus sur les côtés |
| 3 | Léo le Lapin | rapide, sautille, fait des fautes |
| 4 | M. Gaston, gardien de l'école George Vanier | moustache, casquette ; régulier |
| 5 | Pingo le Pingouin | glisse, arrive toujours à temps |
| 6 | Capitaine Barbe-Bleue | pirate gentil, barbe bleue, bandeau sur l'œil ; varie lobs et balles croisées |
| 7 | Kenta le Ninja | disparaît en fumée et réapparaît sous la balle ; très rapide |
| 8 | Super Noé | super-héros masqué à cape ; smashs à traînée d'étoiles |
| 9 | Flamme le Dragon | petit dragon gentil ; balles de feu très rapides |
| 10 | Robo-Max | robot **gris et bleu**, champion final, presque imbattable |

Battre un adversaire (dans n'importe quelle durée de match) débloque le suivant.

**Tous les champions sont des personnages masculins** (demande du 2026-11-09 : aucun personnage féminin dans le jeu).

## 6. Choix faits par le concepteur (à vérifier par le demandeur)

- **Technologie de rendu** : Three.js (WebGL), comme la maquette.
- **Connexion des deux tablettes** : WebRTC pair-à-pair ; un service de mise en relation sur Internet sert uniquement à présenter les tablettes, ensuite elles échangent directement sur le Wi-Fi. Mise en relation par **un code court affiché** sur la tablette qui crée la partie, à saisir (ou choisir parmi des pictogrammes) sur l'autre.
- **Hébergement** : le jeu doit être servi depuis une adresse web fixe (hébergement statique) pour être ouvert sur les tablettes ; installable en **application plein écran (PWA)** sur l'écran d'accueil.
- **Orientation** : paysage.
- **Profils** : au premier lancement, chaque tablette choisit « Je suis Yazan » / « Je suis Ghassan » (gros boutons avec visage). La progression contre les champions est **mémorisée sur chaque tablette** séparément, sans compte ni serveur.
- **Menus sans lecture** : gros boutons à pictogrammes et visages, texte en français en complément seulement.
- **Langue** : français.
- **Sons** : effets de frappe, rebond, filet, « Faute ! », applaudissements/fanfare de victoire, petite musique de menu ; bouton couper le son.
- **Direction des frappes en échange** : deux boutons de visée **◀ 🎾 / 🎾 ▶** à droite (près de LOB/SMASH) s'arment comme LOB : la frappe suivante part de ce côté, puis le bouton s'éteint. Sans visée armée, la balle part vers le milieu du terrain adverse avec une légère variation. Les flèches servent **uniquement** à se déplacer, pour pouvoir courir d'un côté et frapper de l'autre (changement du 2026-11-09 : auparavant la flèche tenue au moment de la frappe donnait la direction, ce qui empêchait de courir à droite et frapper à gauche). La visée se combine avec LOB/SMASH.
- **LOB / SMASH** : appuyer arme le prochain coup (bouton en surbrillance) ; un smash demandé sur une balle basse devient une frappe simple.
- **Set de 6 jeux** : 2 jeux d'écart requis, **jeu décisif (tie-break) à 6-6**, conformément aux règles réelles.
- **Changement de côté** : non représenté visuellement (la caméra reste derrière son joueur).
- **Match à deux** : la tablette qui crée la partie fait foi pour la balle et le score (évite les désaccords) ; l'autre envoie ses déplacements et ses boutons. Si la connexion coupe, le match se met en pause et reprend à la reconnexion.

## 7. Parcours d'écrans

1. **Accueil** (premier lancement : choix du profil Yazan / Ghassan).
2. **Menu** : « Jouer contre mon frère » / « Défier un champion ».
3. **Contre mon frère** : Créer (affiche le code) ou Rejoindre (saisir le code) → la tablette qui crée choisit la durée → match.
4. **Défier un champion** : galerie des 10 adversaires (verrouillés grisés avec cadenas) → choix de la durée → match.
5. **Match** : HUD score (nom, points, indicateur de serveur), croix à gauche, LOB/SMASH/SERVICE à droite, bouton pause.
6. **Fin de match** : vainqueur célébré (saut, confettis), score final, « Rejouer » / « Menu » ; déblocage animé du champion suivant le cas échéant.

## 8. Contraintes

- Fluide sur tablette (viser 60 images/s, avec un réglage de qualité automatique plus bas si la tablette peine).
- Gros éléments tactiles (adaptés à des doigts de 4 ans).
- Aucune donnée personnelle envoyée hors des tablettes.

## 9. Laissé au constructeur

- Architecture du code, outils de build, choix précis du service de mise en relation et de l'hébergeur.
- Modélisation exacte des personnages (primitives procédurales comme la maquette ou modèles 3D), tant que le niveau visuel de la maquette est atteint ou dépassé.
- Réglage fin de la physique de balle, des vitesses et des paramètres de difficulté des 10 adversaires.
- Choix et création des sons et de la musique.
