import { compteur } from './harness.mjs';
import { genererPuzzle } from '../js/generateur.js';
import {
    appliquerIndice, estTerminee, etatsInitiaux, occupation, peutPlacer,
    placer, remettreDansLaReserve
} from '../js/partie.js';

const { check, rapport } = compteur();
console.log('\nRègles de placement\n');

const puzzle = genererPuzzle('regles', 'difficile');
let etats = etatsInitiaux(puzzle);
check('toutes les pièces commencent dans la réserve', etats.every(etat => etat.x === null && etat.y === null));
check('la partie ne commence pas terminée', !estTerminee(puzzle, etats));

for (const piece of puzzle.pieces) {
    const solution = piece.solution;
    const suivants = placer(puzzle, etats, piece.id, solution.x, solution.y, solution.rotation, solution.miroir);
    check(`la solution accepte ${piece.id}`, Boolean(suivants));
    etats = suivants;
}
check('toutes les pièces de la solution terminent la partie', estTerminee(puzzle, etats));
check('l’occupation couvre toute la zone', occupation(puzzle, etats).size === puzzle.zone.length);

const premiere = puzzle.pieces[0];
const sansPremiere = remettreDansLaReserve(etats, premiere.id);
check('ranger une pièce interrompt le pavage', !estTerminee(puzzle, sansPremiere));
const autre = puzzle.pieces[1];
check('un chevauchement est refusé', !peutPlacer(
    puzzle, etats, premiere.id,
    autre.solution.x, autre.solution.y,
    premiere.solution.rotation, premiere.solution.miroir
));

const vierges = etatsInitiaux(puzzle);
const indice = appliquerIndice(puzzle, vierges);
check('un indice place exactement une pièce', indice.pieceId && indice.etats.filter(etat => etat.x !== null).length === 1);

rapport();

