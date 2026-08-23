import { compteur } from './harness.mjs';
import { dimensions, orientations, retourner, sontConnexes, tourner, transformer } from '../js/polyominos.js';

const { check, egal, rapport } = compteur();
console.log('\nTransformations des polyominos\n');

const elle = [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }];
egal('la normalisation suit une rotation', tourner(elle), [
    { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 }, { x: 2, y: 0 }
].sort((a, b) => a.y - b.y || a.x - b.x));
egal('quatre rotations ramènent la forme', transformer(elle, 4, false), elle);
check('le miroir conserve le nombre de cases', retourner(elle).length === elle.length);
egal('les dimensions sont exactes', dimensions(elle), { largeur: 2, hauteur: 3 });
check('un L est connexe', sontConnexes(elle));
check('deux îlots ne sont pas connexes', !sontConnexes([{ x: 0, y: 0 }, { x: 2, y: 0 }]));
check('un L possède huit orientations avec miroir', orientations(elle, true).length === 8);

rapport();

