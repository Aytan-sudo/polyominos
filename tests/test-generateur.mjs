import { compteur } from './harness.mjs';
import { genererPuzzle, NIVEAUX } from '../js/generateur.js';
import { cleCellule, sontConnexes, transformer } from '../js/polyominos.js';

const { check, egal, rapport } = compteur();
console.log('\nGénérateur de pavages\n');

for (const niveau of Object.keys(NIVEAUX)) {
    for (let index = 0; index < 20; index++) {
        const puzzle = genererPuzzle(`serie-${index}`, niveau);
        const zone = new Set(puzzle.zone.map(cleCellule));
        const solution = [];
        for (const piece of puzzle.pieces) {
            check(`${niveau} ${index + 1} : pièce ${piece.id} connexe`, sontConnexes(piece.cellules));
            check(`${niveau} ${index + 1} : taille de pièce équilibrée`, piece.cellules.length >= 4 && piece.cellules.length <= 6);
            for (const cellule of transformer(piece.cellules, piece.solution.rotation, piece.solution.miroir)) {
                solution.push(cleCellule({ x: cellule.x + piece.solution.x, y: cellule.y + piece.solution.y }));
            }
        }
        check(`${niveau} ${index + 1} : zone connexe`, sontConnexes(puzzle.zone));
        check(`${niveau} ${index + 1} : bon nombre de pièces`, puzzle.pieces.length === NIVEAUX[niveau].pieces);
        check(`${niveau} ${index + 1} : aucun chevauchement dans la solution`, new Set(solution).size === solution.length);
        egal(`${niveau} ${index + 1} : la solution couvre exactement la zone`, [...new Set(solution)].sort(), [...zone].sort());
        check(`${niveau} ${index + 1} : miroir conforme au niveau`, puzzle.miroirAutorise === NIVEAUX[niveau].miroir);
    }
}

egal('une même graine redonne le même puzzle', genererPuzzle('stable', 'difficile'), genererPuzzle('stable', 'difficile'));
check('les niveaux sculptent des aires différentes', new Set(Object.keys(NIVEAUX).map(niveau => genererPuzzle('aire', niveau).zone.length)).size === 3);

rapport();

