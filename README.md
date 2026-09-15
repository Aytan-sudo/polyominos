# Polyominos

Un jeu de pavage statique et mobile-first : toutes les pièces imposées doivent
tenir dans la silhouette, sans chevauchement ni case vide. Les puzzles sont
créés à partir d’une solution complète, découpée en polyominos connexes, puis
mélangée. Ils sont donc toujours réalisables.

Le jeu n’a ni serveur ni dépendance de production. Il fonctionne au doigt, à
la souris et au clavier, reste disponible hors ligne après sa première visite
et ne transmet aucune donnée.

## Version 1.1.0 — Le passeport commun

- ouvert depuis le hub avec un passeport, le jeu range préférences, grille en
  cours et statistiques dans l’espace du joueur ; en mode invité, rien ne change ;
- une grille complétée donne le tampon **Logique** tout de suite (indices
  compris) ; sinon, la vingtième pièce posée dans la journée le donne aussi ;
- **correction** : recharger la page en pleine partie effaçait toutes les pièces
  posées, car l’adresse `?jour=` relançait une grille neuve. La grille
  sauvegardée est désormais reprise quand l’adresse la désigne ;
- **correction** : sur iPhone SE, le titre passait sous le bouton d’aide. Il se
  règle maintenant sur la place laissée par les boutons, et le logo s’efface sur
  les très petits écrans ; le zoom tactile est verrouillé comme le veut la
  convention ;
- l’adresse garde le profil du passeport ; bandeau du passeport, fichiers
  `commun/` précachés.

## Version 1.0.1

- les cibles tactiles de l'interface passent à 44 px (boutons d'en-tête,
  boutons texte, listes déroulantes), conformément à la convention.
- les pièces de la réserve déclarent leur exemption (`data-cible-libre`) : la
  taille d'une pièce est sa forme, pas un choix d'interface.

## Version 1.0

- glisser-déposer tactile avec alignement automatique sur la grille ;
- sélection puis pose au toucher, pratique sur les petits écrans ;
- rotation dans tous les niveaux, retournement miroir en Expert seulement ;
- trois difficultés définies par la silhouette et le nombre de pièces ;
- défi du jour déterministe, identique pour tout le monde ;
- parties libres partageables par leur graine ;
- annulation des quarante derniers mouvements ;
- indice qui place une pièce de la solution et libère les cases en conflit ;
- chronomètre suspendu quand l’application passe à l’arrière-plan ;
- statistiques par niveau, meilleurs temps et séries quotidiennes ;
- reprise exacte de la partie via `localStorage` ;
- six thèmes et des motifs optionnels pour distinguer les pièces sans leur
  couleur ;
- sons de synthèse, vibration optionnelle et mouvements réduits respectés ;
- PWA hors ligne, sans étape de compilation.

## Les trois ateliers

| Niveau | Zone | Pièces | Particularité |
| --- | ---: | ---: | --- |
| **Doux** | rectangle 6 × 6 | 7 | grandes pièces, rotations seules |
| **Corsé** | silhouette 7 × 7 sculptée | 9 | bords irréguliers |
| **Expert** | silhouette 8 × 8 | 11 | deux trous et miroirs |

La difficulté vient de la forme à lire, pas d’un tirage chanceux. En Expert,
les deux trous intérieurs créent des repères, mais aussi davantage de creux où
une pièce peut sembler presque juste.

## Génération

Le générateur part d’un rectangle. Selon le niveau, il retire des cellules du
bord tout en vérifiant que la zone reste connexe, puis perce éventuellement des
trous. Il extrait ensuite des groupes connexes de quatre à six cases en refusant
toute coupe qui déconnecterait le reste de la zone. Le dernier groupe ferme le
pavage.

La solution est conservée uniquement pour l’indice ; le joueur peut terminer
avec n’importe quel pavage valide. Une graine textuelle traverse un petit RNG
déterministe : même graine, même zone, mêmes pièces et mêmes orientations de
départ.

## Stockage et partage

Préférences, partie active, historique d’annulation et statistiques vivent sous
des clés `polyominos.*`, dans des enveloppes portant une version de schéma. Si
le stockage est absent ou corrompu, une mémoire temporaire prend le relais.

Une partie libre se partage avec `?seed=…&niveau=…`. Le défi quotidien utilise
`?jour=AAAA-MM-JJ`. Les liens ne contiennent aucun résultat personnel.

## Architecture

- `js/polyominos.js` — géométrie pure, rotations, miroirs et connexité ;
- `js/generateur.js` — sculpture de la zone et découpage d’une solution ;
- `js/partie.js` — placement, occupation, victoire, annulation et indice ;
- `js/hasard.js` — graine et hasard reproductible ;
- `js/stockage.js` — préférences, session, records et séries ;
- `js/rendu.js` — plateau, pièces, résultats et retours accessibles ;
- `js/app.js` — gestes, clavier, chronomètre et orchestration ;
- `css/themes.css` — les six palettes, seule source des couleurs ;
- `css/plateau.css` — géométrie et matière du pavage ;
- `css/interface.css` — mise en page mobile, paysage et dialogues ;
- `tests/` — transformations, génération, règles, stockage et PWA.

Le moteur ne touche jamais au DOM. Les tests rejouent des séries de graines et
vérifient que chaque solution recouvre exactement sa zone, sans chevauchement.

## Développer

```bash
npm test
npm run check
npm run serve   # http://localhost:8765
```

