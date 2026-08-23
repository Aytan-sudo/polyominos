import { Alea } from './hasard.js';
import { cleCellule, normaliser, sontConnexes, voisinsDe } from './polyominos.js';

export const NIVEAUX = {
    facile: {
        id: 'facile', nom: 'Doux', largeur: 6, hauteur: 6,
        retraitsBord: 0, trous: 0, pieces: 7, miroir: false,
        description: 'Une zone régulière et sept grandes pièces.'
    },
    moyen: {
        id: 'moyen', nom: 'Corsé', largeur: 7, hauteur: 7,
        retraitsBord: 7, trous: 0, pieces: 9, miroir: false,
        description: 'Une silhouette découpée et neuf pièces.'
    },
    difficile: {
        id: 'difficile', nom: 'Expert', largeur: 8, hauteur: 8,
        retraitsBord: 12, trous: 2, pieces: 11, miroir: true,
        description: 'Des creux, deux trous et des pièces à retourner.'
    }
};

function rectangle(largeur, hauteur) {
    return Array.from({ length: largeur * hauteur }, (_, index) => ({
        x: index % largeur,
        y: Math.floor(index / largeur)
    }));
}

function conserveLesBords(cellules, largeur, hauteur) {
    return [
        cellules.some(cellule => cellule.x === 0),
        cellules.some(cellule => cellule.x === largeur - 1),
        cellules.some(cellule => cellule.y === 0),
        cellules.some(cellule => cellule.y === hauteur - 1)
    ].every(Boolean);
}

function retirerDuBord(cellules, nombre, largeur, hauteur, alea) {
    let zone = [...cellules];
    for (let retrait = 0; retrait < nombre; retrait++) {
        const presentes = new Set(zone.map(cleCellule));
        const candidates = zone.filter(cellule => {
            const voisines = voisinsDe(cellule).filter(voisine => presentes.has(cleCellule(voisine))).length;
            if (voisines === 4 || voisines < 2) return false;
            const suivante = zone.filter(autre => autre !== cellule);
            return conserveLesBords(suivante, largeur, hauteur) && sontConnexes(suivante);
        });
        if (!candidates.length) throw new Error('Impossible de sculpter cette zone.');

        // Les pointes et les angles sont retirés avant les longues parois : la
        // silhouette reste lisible, sans étranglement d'une case.
        const classees = alea.melanger(candidates).sort((a, b) => {
            const degreA = voisinsDe(a).filter(v => presentes.has(cleCellule(v))).length;
            const degreB = voisinsDe(b).filter(v => presentes.has(cleCellule(v))).length;
            return degreA - degreB;
        });
        const bassin = classees.slice(0, Math.max(1, Math.ceil(classees.length / 3)));
        const choisie = alea.choix(bassin);
        zone = zone.filter(cellule => cellule !== choisie);
    }
    return zone;
}

function percer(cellules, nombre, alea) {
    let zone = [...cellules];
    const trous = [];
    for (let index = 0; index < nombre; index++) {
        const presentes = new Set(zone.map(cleCellule));
        const candidates = zone.filter(cellule =>
            voisinsDe(cellule).every(voisine => presentes.has(cleCellule(voisine)))
            && trous.every(trou => Math.abs(trou.x - cellule.x) + Math.abs(trou.y - cellule.y) > 2)
        );
        if (!candidates.length) throw new Error('Impossible de percer cette zone.');
        const choisie = alea.choix(candidates);
        trous.push(choisie);
        zone = zone.filter(cellule => cellule !== choisie);
    }
    return zone;
}

function taillesDePieces(aire, nombre, alea) {
    const base = Math.floor(aire / nombre);
    const reste = aire % nombre;
    return alea.melanger(Array.from({ length: nombre }, (_, index) => base + (index < reste ? 1 : 0)));
}

function frontiereDu(groupe, restantes) {
    const deja = new Set(groupe.map(cleCellule));
    const candidates = new Map();
    for (const cellule of groupe) {
        for (const voisine of voisinsDe(cellule)) {
            const cle = cleCellule(voisine);
            if (restantes.has(cle) && !deja.has(cle)) candidates.set(cle, restantes.get(cle));
        }
    }
    return [...candidates.values()];
}

function extraire(restantes, taille, alea) {
    const toutes = [...restantes.values()];
    const bord = toutes.filter(cellule => voisinsDe(cellule).some(voisine => !restantes.has(cleCellule(voisine))));
    for (const depart of alea.melanger(bord)) {
        for (let essai = 0; essai < 8; essai++) {
            const groupe = [depart];
            while (groupe.length < taille) {
                const frontiere = frontiereDu(groupe, restantes);
                if (!frontiere.length) break;
                const clesGroupe = new Set(groupe.map(cleCellule));
                const classees = alea.melanger(frontiere).sort((a, b) => {
                    const attachesA = voisinsDe(a).filter(v => clesGroupe.has(cleCellule(v))).length;
                    const attachesB = voisinsDe(b).filter(v => clesGroupe.has(cleCellule(v))).length;
                    return attachesB - attachesA;
                });
                groupe.push(classees[0]);
            }
            if (groupe.length !== taille) continue;
            const prises = new Set(groupe.map(cleCellule));
            const suite = toutes.filter(cellule => !prises.has(cleCellule(cellule)));
            if (sontConnexes(suite)) return groupe;
        }
    }
    return null;
}

function partitionner(zone, nombre, alea) {
    const tailles = taillesDePieces(zone.length, nombre, alea);
    const restantes = new Map(zone.map(cellule => [cleCellule(cellule), cellule]));
    const groupes = [];
    for (let index = 0; index < tailles.length - 1; index++) {
        const groupe = extraire(restantes, tailles[index], alea);
        if (!groupe) return null;
        groupes.push(groupe);
        for (const cellule of groupe) restantes.delete(cleCellule(cellule));
    }
    const dernier = [...restantes.values()];
    if (!sontConnexes(dernier) || dernier.length !== tailles.at(-1)) return null;
    groupes.push(dernier);
    return groupes;
}

function fabriquerZone(configuration, alea) {
    let zone = rectangle(configuration.largeur, configuration.hauteur);
    zone = retirerDuBord(zone, configuration.retraitsBord, configuration.largeur, configuration.hauteur, alea);
    zone = percer(zone, configuration.trous, alea);
    return zone.sort((a, b) => a.y - b.y || a.x - b.x);
}

function fabriquerPieces(zone, configuration, alea) {
    for (let essai = 0; essai < 120; essai++) {
        const groupes = partitionner(zone, configuration.pieces, alea);
        if (!groupes) continue;
        const couleurs = alea.melanger(Array.from({ length: groupes.length }, (_, index) => index));
        return alea.melanger(groupes.map((groupe, index) => {
            const minX = Math.min(...groupe.map(cellule => cellule.x));
            const minY = Math.min(...groupe.map(cellule => cellule.y));
            return {
                id: `p${index + 1}`,
                cellules: normaliser(groupe),
                solution: { x: minX, y: minY, rotation: 0, miroir: false },
                depart: {
                    rotation: alea.entier(4),
                    miroir: configuration.miroir && alea.chance(0.55)
                },
                couleur: couleurs[index] % 11
            };
        }));
    }
    throw new Error('Le découpage de la zone a échoué.');
}

export function genererPuzzle(graine, niveau = 'moyen') {
    const configuration = NIVEAUX[niveau];
    if (!configuration) throw new Error(`Niveau inconnu : ${niveau}`);
    for (let essai = 0; essai < 20; essai++) {
        const alea = new Alea(`polyominos-v1|${graine}|${niveau}|${essai}`);
        try {
            const zone = fabriquerZone(configuration, alea);
            return {
                schema: 1,
                graine: String(graine),
                niveau,
                largeur: configuration.largeur,
                hauteur: configuration.hauteur,
                miroirAutorise: configuration.miroir,
                zone,
                pieces: fabriquerPieces(zone, configuration, alea)
            };
        } catch { /* une autre sculpture donnera un découpage plus docile */ }
    }
    throw new Error('Impossible de générer un puzzle jouable.');
}

