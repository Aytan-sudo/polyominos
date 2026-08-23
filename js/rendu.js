import { dimensions } from './polyominos.js';
import { formeDe } from './partie.js';
import { NIVEAUX } from './generateur.js';

const $ = id => document.getElementById(id);

export function construireZone(puzzle) {
    const plateau = $('plateau');
    plateau.querySelectorAll('.case-zone').forEach(element => element.remove());
    plateau.style.setProperty('--colonnes', puzzle.largeur);
    plateau.style.setProperty('--lignes', puzzle.hauteur);
    for (const cellule of puzzle.zone) {
        const element = document.createElement('div');
        element.className = 'case-zone';
        element.style.setProperty('--x', cellule.x);
        element.style.setProperty('--y', cellule.y);
        element.setAttribute('aria-hidden', 'true');
        plateau.insertBefore(element, plateau.firstChild);
    }
    ajusterPlateau(puzzle);
}

export function ajusterPlateau(puzzle) {
    const plateau = $('plateau');
    if (!plateau.clientWidth) return;
    plateau.style.setProperty('--cellule', `${plateau.clientWidth / puzzle.largeur}px`);
}

function elementPiece(piece, etat, puzzle, selectionnee) {
    const forme = formeDe(puzzle, etat);
    const taille = dimensions(forme);
    const element = document.createElement('button');
    element.type = 'button';
    element.className = `piece piece-couleur-${piece.couleur}`;
    element.dataset.pieceId = piece.id;
    element.style.setProperty('--largeur-piece', taille.largeur);
    element.style.setProperty('--hauteur-piece', taille.hauteur);
    if (selectionnee) {
        element.classList.add('selectionnee');
        element.setAttribute('aria-pressed', 'true');
    } else {
        element.setAttribute('aria-pressed', 'false');
    }
    const numero = Number(piece.id.slice(1));
    element.setAttribute('aria-label', `Pièce ${numero}, ${piece.cellules.length} cases, ${etat.x === null ? 'dans la réserve' : 'posée'}`);
    for (const cellule of forme) {
        const carre = document.createElement('span');
        carre.className = 'carreau-piece';
        carre.style.setProperty('--x', cellule.x);
        carre.style.setProperty('--y', cellule.y);
        carre.setAttribute('aria-hidden', 'true');
        element.append(carre);
    }
    return element;
}

export function rendrePieces(puzzle, etats, selection) {
    const plateau = $('plateau');
    const reserve = $('reserve');
    plateau.querySelectorAll('.piece').forEach(element => element.remove());
    reserve.replaceChildren();
    let restantes = 0;
    for (const piece of puzzle.pieces) {
        const etat = etats.find(candidat => candidat.id === piece.id);
        const element = elementPiece(piece, etat, puzzle, selection === piece.id);
        if (etat.x === null) {
            restantes++;
            element.classList.add('dans-reserve');
            reserve.append(element);
        } else {
            element.classList.add('sur-plateau');
            element.style.setProperty('--piece-x', etat.x);
            element.style.setProperty('--piece-y', etat.y);
            plateau.append(element);
        }
    }
    if (!restantes) {
        const vide = document.createElement('p');
        vide.className = 'reserve-vide';
        vide.textContent = 'Toutes les pièces sont sur le plateau.';
        reserve.append(vide);
    }
}

export function mettreAJourTableau({ puzzle, etats, meta, mouvements, indices, tempsMs, selection, terminee }) {
    const posees = etats.filter(etat => etat.x !== null).length;
    $('hud-mode').textContent = meta.dateJour ? 'Défi du jour' : NIVEAUX[puzzle.niveau].nom;
    $('hud-pieces').textContent = `${posees}/${etats.length}`;
    $('hud-mouvements').textContent = String(mouvements);
    $('hud-temps').textContent = formaterTemps(tempsMs);
    $('bouton-annuler').disabled = !meta.peutAnnuler || terminee;
    $('bouton-indice').disabled = terminee;
    $('bouton-rotation-gauche').disabled = !selection || terminee;
    $('bouton-rotation-droite').disabled = !selection || terminee;
    $('bouton-retourner').hidden = !puzzle.miroirAutorise;
    $('bouton-retourner').disabled = !selection || terminee;
    $('bouton-reserve').disabled = !selection || terminee;
    $('compteur-indices').textContent = indices ? ` · ${indices} utilisé${indices > 1 ? 's' : ''}` : '';
    $('plateau').setAttribute('aria-label', `Zone de ${puzzle.zone.length} cases, ${posees} pièces posées sur ${etats.length}`);
}

export function rendreStatistiques(statistiques) {
    const niveaux = $('stats-niveaux');
    niveaux.replaceChildren();
    for (const [id, niveau] of Object.entries(NIVEAUX)) {
        const donnees = statistiques.niveaux[id] || {};
        const ligne = document.createElement('div');
        ligne.innerHTML = `<dt>${niveau.nom}</dt><dd><strong>${donnees.parties || 0}</strong> pavage${donnees.parties > 1 ? 's' : ''}${donnees.meilleurTempsMs ? ` · record ${formaterTemps(donnees.meilleurTempsMs)}` : ''}</dd>`;
        niveaux.append(ligne);
    }
    const quotidien = statistiques.quotidien || {};
    $('stat-serie').textContent = String(quotidien.serie || 0);
    $('stat-meilleure-serie').textContent = String(quotidien.meilleureSerie || 0);
    $('historique').replaceChildren(...(statistiques.historique || []).slice(0, 8).map(resultat => {
        const item = document.createElement('li');
        const date = new Date(resultat.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        item.textContent = `${date} · ${NIVEAUX[resultat.niveau]?.nom || resultat.niveau} · ${formaterTemps(resultat.tempsMs)} · ${resultat.mouvements} mvt`;
        return item;
    }));
    $('historique-vide').hidden = Boolean(statistiques.historique?.length);
}

export function formaterTemps(tempsMs) {
    const total = Math.max(0, Math.floor(tempsMs / 1000));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function annoncer(message) {
    const element = $('annonce');
    element.textContent = '';
    requestAnimationFrame(() => { element.textContent = message; });
}

export function confettis() {
    const couche = $('confettis');
    couche.replaceChildren(...Array.from({ length: 34 }, (_, index) => {
        const confetti = document.createElement('i');
        confetti.style.setProperty('--x', `${(index * 37) % 100}vw`);
        confetti.style.setProperty('--delai', `${(index % 9) * 40}ms`);
        confetti.style.setProperty('--tour', `${(index % 2 ? 1 : -1) * (240 + index * 17)}deg`);
        confetti.className = `piece-couleur-${index % 11}`;
        return confetti;
    }));
    setTimeout(() => couche.replaceChildren(), 1700);
}

