import { VERSION, NIVEAU_QUOTIDIEN } from './config.js';
import { genererPuzzle, NIVEAUX } from './generateur.js';
import { graineLibre } from './hasard.js';
import { dimensions } from './polyominos.js';
import {
    appliquerIndice, chercherPlacementProche, estTerminee, etatParId,
    etatsInitiaux, formeDe, placer, remettreDansLaReserve
} from './partie.js';
import { lienDuPuzzle, messageDePartage } from './partage.js';
import {
    ajusterPlateau, annoncer, confettis, construireZone, formaterTemps,
    mettreAJourTableau, rendrePieces, rendreStatistiques
} from './rendu.js';
import { sonErreur, sonPoser, sonTourner, sonVictoire } from './son.js';
import {
    chargerPreferences, chargerSession, chargerStatistiques, effacerStatistiques,
    enregistrerPreferences, enregistrerSession, enregistrerVictoire, compterPosePasseport
} from './stockage.js';
import { THEMES, themeSuivant } from './themes.js';

const $ = id => document.getElementById(id);
const copierEtats = etats => etats.map(etat => ({ ...etat }));

let preferences = chargerPreferences();
let puzzle;
let etats;
let meta;
let historique = [];
let mouvements = 0;
let indices = 0;
let selection = null;
let terminee = false;
let resultatEnregistre = false;
let tempsCumule = 0;
let debutChrono = 0;
let chronoActif = false;
let curseur = { x: 0, y: 0 };
let glisser = null;
let dernierEnregistrement = 0;

function dateLocale(date = new Date()) {
    const annee = date.getFullYear();
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const jour = String(date.getDate()).padStart(2, '0');
    return `${annee}-${mois}-${jour}`;
}

function tempsActuel() {
    return tempsCumule + (chronoActif ? performance.now() - debutChrono : 0);
}

function lancerChrono() {
    if (chronoActif || terminee || document.hidden) return;
    debutChrono = performance.now();
    chronoActif = true;
}

function suspendreChrono() {
    if (!chronoActif) return;
    tempsCumule += performance.now() - debutChrono;
    chronoActif = false;
}

function appliquerPreferences() {
    document.documentElement.dataset.theme = THEMES.some(theme => theme.id === preferences.theme)
        ? preferences.theme : 'atelier';
    document.documentElement.dataset.motifs = preferences.motifs ? 'oui' : 'non';
    const couleur = THEMES.find(theme => theme.id === preferences.theme)?.couleur || THEMES[0].couleur;
    $('couleur-barre').setAttribute('content', couleur);
    $('option-sons').checked = preferences.sons;
    $('option-vibration').checked = preferences.vibration;
    $('option-motifs').checked = preferences.motifs;
}

function vibrer(motif) {
    if (preferences.vibration) navigator.vibrate?.(motif);
}

function jouer(son) {
    if (preferences.sons) son();
}

function lireRoute() {
    const params = new URLSearchParams(location.search);
    const jour = params.get('jour');
    if (/^\d{4}-\d{2}-\d{2}$/.test(jour || '')) {
        return {
            graine: `jour-${jour}`,
            niveau: NIVEAU_QUOTIDIEN,
            dateJour: jour,
            quotidien: jour === dateLocale()
        };
    }
    const seed = params.get('seed');
    if (seed) {
        const niveau = NIVEAUX[params.get('niveau')] ? params.get('niveau') : 'moyen';
        return { graine: seed.slice(0, 80), niveau, dateJour: null, quotidien: false };
    }
    return null;
}

function metaComplete(donnees) {
    return {
        ...donnees,
        nomNiveau: NIVEAUX[donnees.niveau].nom,
        peutAnnuler: historique.length > 0
    };
}

// Le passeport ne porte que le profil : il reste dans l'adresse, sinon un
// rechargement retomberait sur le dernier joueur choisi dans le hub.
function synchroniserAdresse() {
    const url = new URL(location.href);
    const profil = url.searchParams.get('profil');
    url.search = '';
    if (profil !== null) url.searchParams.set('profil', profil);
    if (meta.dateJour) {
        url.searchParams.set('jour', meta.dateJour);
    } else {
        url.searchParams.set('seed', meta.graine);
        url.searchParams.set('niveau', meta.niveau);
    }
    history.replaceState({}, '', `${url.pathname}${url.search}`);
}

function serialiserSession() {
    return {
        schema: 1,
        puzzle,
        etats,
        meta: { graine: meta.graine, niveau: meta.niveau, dateJour: meta.dateJour, quotidien: meta.quotidien },
        historique,
        mouvements,
        indices,
        selection,
        terminee,
        resultatEnregistre,
        tempsMs: Math.round(tempsActuel())
    };
}

function sauvegarder() {
    enregistrerSession(serialiserSession());
    dernierEnregistrement = Date.now();
}

function demarrer(donnees, synchroniser = true) {
    suspendreChrono();
    puzzle = genererPuzzle(donnees.graine, donnees.niveau);
    etats = etatsInitiaux(puzzle);
    historique = [];
    mouvements = 0;
    indices = 0;
    selection = null;
    terminee = false;
    resultatEnregistre = false;
    tempsCumule = 0;
    curseur = { x: Math.floor(puzzle.largeur / 2), y: Math.floor(puzzle.hauteur / 2) };
    meta = metaComplete(donnees);
    construireZone(puzzle);
    if (synchroniser) synchroniserAdresse();
    lancerChrono();
    rendreTout();
    sauvegarder();
    annoncer(meta.dateJour ? 'Le défi du jour est prêt.' : `Nouvelle grille ${meta.nomNiveau}.`);
}

function restaurer(session) {
    puzzle = session.puzzle;
    etats = copierEtats(session.etats);
    historique = Array.isArray(session.historique) ? session.historique.slice(-40) : [];
    mouvements = session.mouvements || 0;
    indices = session.indices || 0;
    selection = session.selection || null;
    terminee = Boolean(session.terminee);
    resultatEnregistre = Boolean(session.resultatEnregistre);
    tempsCumule = session.tempsMs || 0;
    meta = metaComplete({
        ...session.meta,
        quotidien: Boolean(session.meta.dateJour && session.meta.dateJour === dateLocale())
    });
    curseur = { x: Math.floor(puzzle.largeur / 2), y: Math.floor(puzzle.hauteur / 2) };
    construireZone(puzzle);
    synchroniserAdresse();
    lancerChrono();
    rendreTout();
}

function initialiserPartie() {
    const route = lireRoute();
    const session = chargerSession();
    const valide = session?.schema === 1 && session.puzzle?.schema === 1 && NIVEAUX[session.meta?.niveau];
    // L'adresse porte toujours le jour ou la graine de la grille en cours : la
    // recharger n'est pas demander une grille neuve. Sans ce test, un
    // rechargement effaçait toutes les pièces posées.
    const memeGrille = valide && route && session.meta.graine === route.graine && session.meta.niveau === route.niveau;
    if (route && !memeGrille) {
        demarrer(route);
        return;
    }
    if (valide) {
        try {
            restaurer(session);
            return;
        } catch { /* une session partielle ne doit jamais bloquer le jeu */ }
    }
    if (route) {
        demarrer(route);
        return;
    }
    const jour = dateLocale();
    demarrer({ graine: `jour-${jour}`, niveau: NIVEAU_QUOTIDIEN, dateJour: jour, quotidien: true });
}

function etatSelectionne() {
    return selection ? etatParId(etats, selection) : null;
}

function capturerHistorique() {
    historique.push({
        etats: copierEtats(etats), mouvements, indices, selection
    });
    historique = historique.slice(-40);
    meta.peutAnnuler = true;
}

function rendreCurseur() {
    const element = $('curseur-plateau');
    element.style.setProperty('--curseur-x', curseur.x);
    element.style.setProperty('--curseur-y', curseur.y);
}

function rendreTout() {
    ajusterPlateau(puzzle);
    rendrePieces(puzzle, etats, selection);
    meta.peutAnnuler = historique.length > 0;
    mettreAJourTableau({
        puzzle, etats, meta, mouvements, indices,
        tempsMs: tempsActuel(), selection, terminee
    });
    rendreCurseur();
}

// Le tampon Logique du passeport : une grille complétée le donne tout de suite ;
// sinon, la vingtième pièce posée dans la journée. En mode invité, rien ne compte.
function noterPasseport({ pose = false, reussite = false }) {
    const joueur = globalThis.Passeport;
    if (!joueur?.profilId) return;
    const poses = pose ? compterPosePasseport(joueur.jourLocal()) : 0;
    if (poses !== null) joueur.noter('polyominos', poses, reussite);
}

function terminerSiBesoin() {
    if (terminee || !estTerminee(puzzle, etats)) return false;
    suspendreChrono();
    terminee = true;
    noterPasseport({ reussite: true });
    const tempsMs = Math.round(tempsActuel());
    if (!resultatEnregistre) {
        enregistrerVictoire({
            niveau: puzzle.niveau,
            quotidien: meta.quotidien,
            dateJour: meta.dateJour,
            tempsMs,
            mouvements,
            indices
        });
        resultatEnregistre = true;
    }
    sauvegarder();
    jouer(sonVictoire);
    vibrer([30, 45, 30]);
    confettis();
    $('fin-temps').textContent = formaterTemps(tempsMs);
    $('fin-mouvements').textContent = String(mouvements);
    $('fin-indices').textContent = indices ? String(indices) : 'Aucun';
    $('fin-sans-indice').hidden = indices !== 0;
    setTimeout(() => $('dialogue-fin').showModal(), 340);
    annoncer('Bravo, la zone est entièrement pavée !');
    return true;
}

function validerAction(suivants, message, son = sonPoser) {
    capturerHistorique();
    etats = suivants;
    mouvements++;
    jouer(son);
    vibrer(12);
    const victoire = terminerSiBesoin();
    rendreTout();
    sauvegarder();
    if (!victoire && message) annoncer(message);
}

function tournerSelection(sens) {
    const etat = etatSelectionne();
    if (!etat || terminee) return;
    const rotation = (etat.rotation + sens + 4) % 4;
    let suivants;
    if (etat.x === null) {
        suivants = etats.map(candidat => candidat.id === etat.id ? { ...candidat, rotation } : { ...candidat });
    } else {
        const taille = dimensions(formeDe(puzzle, etat));
        const cible = chercherPlacementProche(
            puzzle, etats, etat.id,
            etat.x + (taille.largeur - 1) / 2,
            etat.y + (taille.hauteur - 1) / 2,
            rotation, etat.miroir
        );
        if (!cible) return refuser('Pas assez de place pour tourner cette pièce.');
        suivants = placer(puzzle, etats, etat.id, cible.x, cible.y, rotation, etat.miroir);
    }
    validerAction(suivants, 'Pièce tournée.', sonTourner);
}

function retournerSelection() {
    const etat = etatSelectionne();
    if (!etat || !puzzle.miroirAutorise || terminee) return;
    const miroir = !etat.miroir;
    let suivants;
    if (etat.x === null) {
        suivants = etats.map(candidat => candidat.id === etat.id ? { ...candidat, miroir } : { ...candidat });
    } else {
        const taille = dimensions(formeDe(puzzle, etat));
        const cible = chercherPlacementProche(
            puzzle, etats, etat.id,
            etat.x + (taille.largeur - 1) / 2,
            etat.y + (taille.hauteur - 1) / 2,
            etat.rotation, miroir
        );
        if (!cible) return refuser('Pas assez de place pour retourner cette pièce.');
        suivants = placer(puzzle, etats, etat.id, cible.x, cible.y, etat.rotation, miroir);
    }
    validerAction(suivants, 'Pièce retournée.', sonTourner);
}

function remettreSelection() {
    const etat = etatSelectionne();
    if (!etat || etat.x === null || terminee) return;
    validerAction(remettreDansLaReserve(etats, etat.id), 'Pièce remise dans la réserve.');
}

function annuler() {
    if (!historique.length || terminee) return;
    const precedent = historique.pop();
    etats = copierEtats(precedent.etats);
    mouvements = precedent.mouvements;
    indices = precedent.indices;
    selection = precedent.selection;
    rendreTout();
    sauvegarder();
    annoncer('Dernier mouvement annulé.');
}

function demanderIndice() {
    if (terminee) return;
    const resultat = appliquerIndice(puzzle, etats);
    if (!resultat.pieceId) return;
    capturerHistorique();
    etats = resultat.etats;
    selection = resultat.pieceId;
    mouvements++;
    indices++;
    jouer(sonPoser);
    vibrer([12, 30, 12]);
    rendreTout();
    terminerSiBesoin();
    sauvegarder();
    annoncer(resultat.retirees.length
        ? `Une pièce est placée ; ${resultat.retirees.length} pièce conflictuelle retourne dans la réserve.`
        : 'Une pièce a trouvé sa place.');
}

function refuser(message) {
    jouer(sonErreur);
    vibrer(30);
    $('plateau').classList.remove('refus');
    requestAnimationFrame(() => $('plateau').classList.add('refus'));
    annoncer(message);
}

function selectionner(id) {
    if (terminee) return;
    selection = id;
    rendreTout();
    sauvegarder();
    const etat = etatSelectionne();
    annoncer(`Pièce ${Number(id.slice(1))} sélectionnée${etat.x === null ? ', dans la réserve' : ', sur le plateau'}.`);
}

function celluleLaPlusProche(forme, x, y) {
    return [...forme].sort((a, b) =>
        ((a.x + 0.5 - x) ** 2 + (a.y + 0.5 - y) ** 2)
        - ((b.x + 0.5 - x) ** 2 + (b.y + 0.5 - y) ** 2)
    )[0];
}

function debutGlisser(evenement, element) {
    if (terminee || evenement.button > 0) return;
    const id = element.dataset.pieceId;
    const etat = etatParId(etats, id);
    const forme = formeDe(puzzle, etat);
    const taille = dimensions(forme);
    const rect = element.getBoundingClientRect();
    const celluleSource = rect.width / taille.largeur;
    const prise = celluleLaPlusProche(
        forme,
        (evenement.clientX - rect.left) / celluleSource,
        (evenement.clientY - rect.top) / celluleSource
    );
    selection = id;
    glisser = {
        id,
        element,
        pointeur: evenement.pointerId,
        departX: evenement.clientX,
        departY: evenement.clientY,
        prise,
        bouge: false,
        fantome: null
    };
    evenement.preventDefault();
}

function bougerGlisser(evenement) {
    if (!glisser || evenement.pointerId !== glisser.pointeur) return;
    const distance = Math.hypot(evenement.clientX - glisser.departX, evenement.clientY - glisser.departY);
    if (!glisser.bouge && distance < 5) return;
    if (!glisser.bouge) {
        glisser.bouge = true;
        glisser.fantome = glisser.element.cloneNode(true);
        glisser.fantome.classList.remove('dans-reserve', 'sur-plateau', 'selectionnee');
        glisser.fantome.classList.add('piece-fantome');
        glisser.element.classList.add('source-glisser');
        document.body.append(glisser.fantome);
    }
    const unite = $('plateau').getBoundingClientRect().width / puzzle.largeur;
    glisser.fantome.style.setProperty('--piece-cell', `${unite}px`);
    glisser.fantome.style.left = `${evenement.clientX - (glisser.prise.x + 0.5) * unite}px`;
    glisser.fantome.style.top = `${evenement.clientY - (glisser.prise.y + 0.5) * unite}px`;
    evenement.preventDefault();
}

function finGlisser(evenement) {
    if (!glisser || evenement.pointerId !== glisser.pointeur) return;
    const action = glisser;
    action.fantome?.remove();
    action.element.classList.remove('source-glisser');
    glisser = null;
    if (!action.bouge) {
        selectionner(action.id);
        return;
    }
    const rect = $('plateau').getBoundingClientRect();
    const unite = rect.width / puzzle.largeur;
    const x = Math.round((evenement.clientX - rect.left) / unite - action.prise.x - 0.5);
    const y = Math.round((evenement.clientY - rect.top) / unite - action.prise.y - 0.5);
    const etat = etatParId(etats, action.id);
    const suivants = placer(puzzle, etats, action.id, x, y, etat.rotation, etat.miroir);
    if (!suivants) {
        rendreTout();
        refuser('Cette pièce ne tient pas ici.');
        return;
    }
    selection = action.id;
    noterPasseport({ pose: true });
    validerAction(suivants, 'Pièce posée.');
}

function poserPresDuCurseur(x = curseur.x, y = curseur.y) {
    const etat = etatSelectionne();
    if (!etat || terminee) return;
    const cible = chercherPlacementProche(puzzle, etats, etat.id, x, y, etat.rotation, etat.miroir);
    if (!cible) return refuser('Aucune place libre à cet endroit.');
    const suivants = placer(puzzle, etats, etat.id, cible.x, cible.y, etat.rotation, etat.miroir);
    noterPasseport({ pose: true });
    validerAction(suivants, 'Pièce posée.');
}

async function partager() {
    const texte = messageDePartage({
        meta, termine: terminee, temps: tempsActuel(), mouvements, indices,
        pieces: puzzle.pieces.length
    });
    try {
        if (navigator.share) await navigator.share({ title: 'Polyominos', text: texte, url: lienDuPuzzle(meta) });
        else {
            await navigator.clipboard.writeText(texte);
            annoncer('Résultat copié dans le presse-papiers.');
        }
    } catch (erreur) {
        if (erreur?.name !== 'AbortError') refuser('Le partage n’a pas fonctionné.');
    }
}

function remplirOptions() {
    const niveaux = $('choix-niveau');
    niveaux.replaceChildren(...Object.values(NIVEAUX).map(niveau => {
        const bouton = document.createElement('button');
        bouton.type = 'button';
        bouton.className = 'carte-niveau';
        bouton.dataset.niveau = niveau.id;
        bouton.innerHTML = `<strong>${niveau.nom}</strong><span>${niveau.description}</span>`;
        bouton.addEventListener('click', () => {
            preferences.niveau = niveau.id;
            enregistrerPreferences(preferences);
            mettreAJourOptions();
        });
        return bouton;
    }));

    const themes = $('choix-theme');
    themes.replaceChildren(...THEMES.map(theme => {
        const bouton = document.createElement('button');
        bouton.type = 'button';
        bouton.className = 'pastille-theme';
        bouton.dataset.theme = theme.id;
        bouton.style.setProperty('--pastille', theme.couleur);
        bouton.setAttribute('aria-label', `Thème ${theme.nom}`);
        bouton.title = theme.nom;
        bouton.addEventListener('click', () => {
            preferences.theme = theme.id;
            enregistrerPreferences(preferences);
            appliquerPreferences();
            mettreAJourOptions();
        });
        return bouton;
    }));
    mettreAJourOptions();
}

function mettreAJourOptions() {
    document.querySelectorAll('[data-niveau]').forEach(element => {
        const active = element.dataset.niveau === preferences.niveau;
        element.classList.toggle('active', active);
        element.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-theme]').forEach(element => {
        const active = element.dataset.theme === preferences.theme;
        element.classList.toggle('active', active);
        element.setAttribute('aria-pressed', String(active));
    });
}

function ouvrirStatistiques() {
    rendreStatistiques(chargerStatistiques());
    $('dialogue-stats').showModal();
}

function installerEvenements() {
    document.addEventListener('pointerdown', evenement => {
        const element = evenement.target.closest('.piece');
        if (element && !element.classList.contains('piece-fantome')) debutGlisser(evenement, element);
    });
    window.addEventListener('pointermove', bougerGlisser, { passive: false });
    window.addEventListener('pointerup', finGlisser);
    window.addEventListener('pointercancel', finGlisser);
    document.addEventListener('click', evenement => {
        const element = evenement.target.closest('.piece');
        if (!element || element.classList.contains('piece-fantome')) return;
        selectionner(element.dataset.pieceId);
        // Un clic synthétique (Entrée/Espace) enchaîne naturellement avec le
        // curseur de plateau, sans imposer une longue traversée au clavier.
        if (evenement.detail === 0) $('plateau').focus();
    });

    $('plateau').addEventListener('click', evenement => {
        if (evenement.target.closest('.piece')) return;
        const rect = $('plateau').getBoundingClientRect();
        curseur = {
            x: Math.max(0, Math.min(puzzle.largeur - 1, Math.floor((evenement.clientX - rect.left) / (rect.width / puzzle.largeur)))),
            y: Math.max(0, Math.min(puzzle.hauteur - 1, Math.floor((evenement.clientY - rect.top) / (rect.height / puzzle.hauteur))))
        };
        rendreCurseur();
        poserPresDuCurseur();
    });

    $('bouton-rotation-gauche').addEventListener('click', () => tournerSelection(-1));
    $('bouton-rotation-droite').addEventListener('click', () => tournerSelection(1));
    $('bouton-retourner').addEventListener('click', retournerSelection);
    $('bouton-reserve').addEventListener('click', remettreSelection);
    $('bouton-annuler').addEventListener('click', annuler);
    $('bouton-indice').addEventListener('click', demanderIndice);
    $('bouton-partager').addEventListener('click', partager);
    $('fin-partager').addEventListener('click', partager);

    $('bouton-nouveau').addEventListener('click', () => demarrer({
        graine: graineLibre(), niveau: preferences.niveau, dateJour: null, quotidien: false
    }));
    $('bouton-quotidien').addEventListener('click', () => {
        const jour = dateLocale();
        demarrer({ graine: `jour-${jour}`, niveau: NIVEAU_QUOTIDIEN, dateJour: jour, quotidien: true });
    });
    $('fin-rejouer').addEventListener('click', () => {
        $('dialogue-fin').close();
        demarrer({ graine: graineLibre(), niveau: preferences.niveau, dateJour: null, quotidien: false });
    });

    $('bouton-options').addEventListener('click', () => $('dialogue-options').showModal());
    $('options-jouer').addEventListener('click', () => {
        $('dialogue-options').close();
        demarrer({ graine: graineLibre(), niveau: preferences.niveau, dateJour: null, quotidien: false });
    });
    $('bouton-aide').addEventListener('click', () => $('dialogue-aide').showModal());
    $('bouton-stats').addEventListener('click', ouvrirStatistiques);
    document.querySelectorAll('[data-fermer]').forEach(bouton => bouton.addEventListener('click', () => bouton.closest('dialog').close()));

    $('bouton-theme').addEventListener('click', () => {
        preferences.theme = themeSuivant(preferences.theme);
        enregistrerPreferences(preferences);
        appliquerPreferences();
        mettreAJourOptions();
        annoncer(`Thème ${THEMES.find(theme => theme.id === preferences.theme).nom}.`);
    });
    for (const [id, cle] of [['option-sons', 'sons'], ['option-vibration', 'vibration'], ['option-motifs', 'motifs']]) {
        $(id).addEventListener('change', evenement => {
            preferences[cle] = evenement.target.checked;
            enregistrerPreferences(preferences);
            appliquerPreferences();
        });
    }
    $('effacer-stats').addEventListener('click', () => {
        if (!confirm('Effacer tous les résultats et toutes les séries ?')) return;
        effacerStatistiques();
        rendreStatistiques(chargerStatistiques());
    });

    document.addEventListener('keydown', evenement => {
        if (evenement.target.closest('dialog') || /^(INPUT|SELECT|TEXTAREA)$/.test(evenement.target.tagName)) return;
        const touche = evenement.key.toLowerCase();
        if (touche === 'r') tournerSelection(1);
        else if (touche === 'f') retournerSelection();
        else if (touche === 'u') annuler();
        else if (touche === 'delete' || touche === 'backspace') remettreSelection();
        else if (document.activeElement === $('plateau') && ['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(touche)) {
            evenement.preventDefault();
            if (touche === 'arrowleft') curseur.x = Math.max(0, curseur.x - 1);
            if (touche === 'arrowright') curseur.x = Math.min(puzzle.largeur - 1, curseur.x + 1);
            if (touche === 'arrowup') curseur.y = Math.max(0, curseur.y - 1);
            if (touche === 'arrowdown') curseur.y = Math.min(puzzle.hauteur - 1, curseur.y + 1);
            rendreCurseur();
        } else if (document.activeElement === $('plateau') && (touche === 'enter' || touche === ' ')) {
            evenement.preventDefault();
            poserPresDuCurseur();
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            suspendreChrono();
            sauvegarder();
        } else lancerChrono();
    });
    window.addEventListener('resize', () => {
        ajusterPlateau(puzzle);
        rendreCurseur();
    });
    for (const type of ['contextmenu', 'selectstart', 'dragstart']) {
        for (const zone of [$('plateau'), $('reserve')]) zone.addEventListener(type, evenement => evenement.preventDefault());
    }
}

appliquerPreferences();
remplirOptions();
installerEvenements();
initialiserPartie();
$('version').textContent = `Polyominos ${VERSION}`;

setInterval(() => {
    if (!puzzle) return;
    $('hud-temps').textContent = formaterTemps(tempsActuel());
    if (!terminee && Date.now() - dernierEnregistrement > 10000) sauvegarder();
}, 500);

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
