import { URL_JEU } from './config.js';

export function lienDuPuzzle(meta) {
    const url = new URL(URL_JEU);
    if (meta.dateJour) {
        url.searchParams.set('jour', meta.dateJour);
    } else {
        url.searchParams.set('seed', meta.graine);
        url.searchParams.set('niveau', meta.niveau);
    }
    return url.href;
}

export function messageDePartage({ meta, termine, temps, mouvements, indices, pieces }) {
    const titre = meta.dateJour
        ? `Polyominos ${meta.dateJour.split('-').reverse().join('/')}`
        : `Polyominos · ${meta.nomNiveau}`;
    const lignes = [titre];
    if (termine) {
        const minutes = Math.floor(temps / 60000);
        const secondes = Math.floor((temps % 60000) / 1000).toString().padStart(2, '0');
        lignes.push(`Pavé en ${minutes}:${secondes} · ${mouvements} mouvement${mouvements > 1 ? 's' : ''}`);
        lignes.push(indices ? `${indices} indice${indices > 1 ? 's' : ''} utilisé${indices > 1 ? 's' : ''}` : 'Sans indice ✨');
        lignes.push(Array.from({ length: Math.min(pieces, 11) }, (_, index) => ['🟧', '🟨', '🟩', '🟦', '🟪'][index % 5]).join(''));
    } else {
        lignes.push('Saurez-vous remplir la forme ?');
    }
    lignes.push(lienDuPuzzle(meta));
    return lignes.join('\n');
}

