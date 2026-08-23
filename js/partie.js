import { cleCellule, dimensions, transformer } from './polyominos.js';

export function etatsInitiaux(puzzle) {
    return puzzle.pieces.map(piece => ({
        id: piece.id,
        x: null,
        y: null,
        rotation: piece.depart.rotation,
        miroir: puzzle.miroirAutorise ? piece.depart.miroir : false
    }));
}

export const pieceParId = (puzzle, id) => puzzle.pieces.find(piece => piece.id === id);
export const etatParId = (etats, id) => etats.find(etat => etat.id === id);

export function formeDe(puzzle, etat) {
    return transformer(pieceParId(puzzle, etat.id).cellules, etat.rotation, etat.miroir);
}

export function cellulesPlacees(puzzle, etat) {
    if (etat.x === null || etat.y === null) return [];
    return formeDe(puzzle, etat).map(cellule => ({ x: cellule.x + etat.x, y: cellule.y + etat.y }));
}

export function occupation(puzzle, etats, saufId = null) {
    const occupees = new Map();
    for (const etat of etats) {
        if (etat.id === saufId) continue;
        for (const cellule of cellulesPlacees(puzzle, etat)) occupees.set(cleCellule(cellule), etat.id);
    }
    return occupees;
}

export function peutPlacer(puzzle, etats, id, x, y, rotation, miroir) {
    const zone = new Set(puzzle.zone.map(cleCellule));
    const occupees = occupation(puzzle, etats, id);
    const piece = pieceParId(puzzle, id);
    const forme = transformer(piece.cellules, rotation, puzzle.miroirAutorise && miroir);
    return forme.every(cellule => {
        const cle = cleCellule({ x: cellule.x + x, y: cellule.y + y });
        return zone.has(cle) && !occupees.has(cle);
    });
}

export function placer(puzzle, etats, id, x, y, rotation, miroir) {
    if (!peutPlacer(puzzle, etats, id, x, y, rotation, miroir)) return null;
    return etats.map(etat => etat.id === id
        ? { ...etat, x, y, rotation: ((rotation % 4) + 4) % 4, miroir: puzzle.miroirAutorise && miroir }
        : { ...etat });
}

export function remettreDansLaReserve(etats, id) {
    return etats.map(etat => etat.id === id ? { ...etat, x: null, y: null } : { ...etat });
}

export function chercherPlacementProche(puzzle, etats, id, xVise, yVise, rotation, miroir) {
    const piece = pieceParId(puzzle, id);
    const taille = dimensions(transformer(piece.cellules, rotation, miroir));
    const candidats = [];
    for (let y = -taille.hauteur + 1; y < puzzle.hauteur; y++) {
        for (let x = -taille.largeur + 1; x < puzzle.largeur; x++) {
            if (peutPlacer(puzzle, etats, id, x, y, rotation, miroir)) {
                const centreX = x + (taille.largeur - 1) / 2;
                const centreY = y + (taille.hauteur - 1) / 2;
                candidats.push({ x, y, distance: (centreX - xVise) ** 2 + (centreY - yVise) ** 2 });
            }
        }
    }
    return candidats.sort((a, b) => a.distance - b.distance)[0] || null;
}

export function estTerminee(puzzle, etats) {
    return etats.every(etat => etat.x !== null)
        && occupation(puzzle, etats).size === puzzle.zone.length;
}

export function estDansLaSolution(puzzle, etat) {
    const solution = pieceParId(puzzle, etat.id).solution;
    const voulues = transformer(pieceParId(puzzle, etat.id).cellules, solution.rotation, solution.miroir)
        .map(cellule => cleCellule({ x: cellule.x + solution.x, y: cellule.y + solution.y }))
        .sort();
    return cellulesPlacees(puzzle, etat).map(cleCellule).sort().join('|') === voulues.join('|');
}

export function appliquerIndice(puzzle, etats) {
    const cible = etats.find(etat => !estDansLaSolution(puzzle, etat));
    if (!cible) return { etats, pieceId: null, retirees: [] };
    const solution = pieceParId(puzzle, cible.id).solution;
    const cellulesSolution = new Set(transformer(pieceParId(puzzle, cible.id).cellules, 0, false)
        .map(cellule => cleCellule({ x: cellule.x + solution.x, y: cellule.y + solution.y })));
    const retirees = etats
        .filter(etat => etat.id !== cible.id && cellulesPlacees(puzzle, etat).some(cellule => cellulesSolution.has(cleCellule(cellule))))
        .map(etat => etat.id);
    const suivants = etats.map(etat => {
        if (etat.id === cible.id) return { ...etat, ...solution };
        if (retirees.includes(etat.id)) return { ...etat, x: null, y: null };
        return { ...etat };
    });
    return { etats: suivants, pieceId: cible.id, retirees };
}

