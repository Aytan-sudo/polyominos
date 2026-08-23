export const cleCellule = ({ x, y }) => `${x},${y}`;

export const voisinsDe = ({ x, y }) => [
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 }
];

export function normaliser(cellules) {
    const minX = Math.min(...cellules.map(cellule => cellule.x));
    const minY = Math.min(...cellules.map(cellule => cellule.y));
    return cellules
        .map(cellule => ({ x: cellule.x - minX, y: cellule.y - minY }))
        .sort((a, b) => a.y - b.y || a.x - b.x);
}

export function dimensions(cellules) {
    const forme = normaliser(cellules);
    return {
        largeur: Math.max(...forme.map(cellule => cellule.x)) + 1,
        hauteur: Math.max(...forme.map(cellule => cellule.y)) + 1
    };
}

export function tourner(cellules) {
    return normaliser(cellules.map(({ x, y }) => ({ x: -y, y: x })));
}

export function retourner(cellules) {
    return normaliser(cellules.map(({ x, y }) => ({ x: -x, y })));
}

export function transformer(cellules, rotation = 0, miroir = false) {
    let forme = miroir ? retourner(cellules) : normaliser(cellules);
    for (let i = 0; i < ((rotation % 4) + 4) % 4; i++) forme = tourner(forme);
    return forme;
}

export function signature(cellules) {
    return normaliser(cellules).map(cleCellule).join('|');
}

export function orientations(cellules, miroirAutorise = false) {
    const formes = [];
    const vues = new Set();
    for (const miroir of miroirAutorise ? [false, true] : [false]) {
        for (let rotation = 0; rotation < 4; rotation++) {
            const forme = transformer(cellules, rotation, miroir);
            const cle = signature(forme);
            if (!vues.has(cle)) {
                vues.add(cle);
                formes.push({ rotation, miroir, cellules: forme });
            }
        }
    }
    return formes;
}

export function sontConnexes(cellules) {
    if (!cellules.length) return false;
    const toutes = new Set(cellules.map(cleCellule));
    const visitees = new Set();
    const file = [cellules[0]];
    while (file.length) {
        const cellule = file.pop();
        const cle = cleCellule(cellule);
        if (visitees.has(cle)) continue;
        visitees.add(cle);
        for (const voisine of voisinsDe(cellule)) {
            if (toutes.has(cleCellule(voisine)) && !visitees.has(cleCellule(voisine))) file.push(voisine);
        }
    }
    return visitees.size === toutes.size;
}

