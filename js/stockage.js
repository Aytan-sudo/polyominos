const PREFIXE = 'polyominos.';
const SCHEMA = 1;
const memoire = new Map();
let coffre;

export const PREFERENCES_PAR_DEFAUT = {
    niveau: 'moyen',
    theme: 'atelier',
    sons: true,
    vibration: true,
    motifs: true
};

function obtenirCoffre() {
    if (coffre) return coffre;
    try {
        const sonde = `${PREFIXE}sonde`;
        globalThis.localStorage.setItem(sonde, '1');
        globalThis.localStorage.removeItem(sonde);
        coffre = globalThis.localStorage;
    } catch {
        coffre = {
            getItem: cle => memoire.get(cle) ?? null,
            setItem: (cle, valeur) => memoire.set(cle, String(valeur)),
            removeItem: cle => memoire.delete(cle)
        };
    }
    return coffre;
}

function lire(cle, defaut) {
    try {
        const brut = obtenirCoffre().getItem(PREFIXE + cle);
        if (!brut) return defaut;
        const enveloppe = JSON.parse(brut);
        return enveloppe?.schema === SCHEMA ? enveloppe.donnees : defaut;
    } catch {
        return defaut;
    }
}

function ecrire(cle, donnees) {
    try {
        obtenirCoffre().setItem(PREFIXE + cle, JSON.stringify({ schema: SCHEMA, donnees }));
    } catch { /* le jeu reste utilisable en mémoire */ }
}

function oublier(cle) {
    try { obtenirCoffre().removeItem(PREFIXE + cle); } catch { /* rien à faire */ }
}

export function chargerPreferences() {
    return { ...PREFERENCES_PAR_DEFAUT, ...lire('preferences', {}) };
}

export const enregistrerPreferences = preferences => ecrire('preferences', preferences);
export const chargerSession = () => lire('session', null);
export const enregistrerSession = session => ecrire('session', session);
export const oublierSession = () => oublier('session');
export const chargerStatistiques = () => lire('statistiques', { niveaux: {}, quotidien: {}, historique: [] });

function ecartJours(dateA, dateB) {
    const a = Date.parse(`${dateA}T12:00:00Z`);
    const b = Date.parse(`${dateB}T12:00:00Z`);
    return Math.round((b - a) / 86400000);
}

export function enregistrerVictoire({ niveau, quotidien, dateJour, tempsMs, mouvements, indices }) {
    const statistiques = chargerStatistiques();
    const ancien = statistiques.niveaux[niveau] || {
        parties: 0, meilleurTempsMs: null, meilleursMouvements: null, sansIndice: 0
    };
    statistiques.niveaux[niveau] = {
        parties: ancien.parties + 1,
        meilleurTempsMs: ancien.meilleurTempsMs === null ? tempsMs : Math.min(ancien.meilleurTempsMs, tempsMs),
        meilleursMouvements: ancien.meilleursMouvements === null ? mouvements : Math.min(ancien.meilleursMouvements, mouvements),
        sansIndice: ancien.sansIndice + (indices === 0 ? 1 : 0)
    };

    let nouvelleSerie = false;
    if (quotidien && dateJour) {
        const quotidienStats = statistiques.quotidien;
        const dejaReussi = (quotidienStats.reussis || []).includes(dateJour);
        if (!dejaReussi) {
            const ecart = quotidienStats.dernierJour ? ecartJours(quotidienStats.dernierJour, dateJour) : null;
            quotidienStats.serie = ecart === 1 ? (quotidienStats.serie || 0) + 1 : 1;
            quotidienStats.meilleureSerie = Math.max(quotidienStats.meilleureSerie || 0, quotidienStats.serie);
            quotidienStats.dernierJour = dateJour;
            quotidienStats.reussis = [...(quotidienStats.reussis || []), dateJour].slice(-180);
            nouvelleSerie = true;
        }
    }

    statistiques.historique.unshift({
        date: new Date().toISOString(), niveau, quotidien, dateJour, tempsMs, mouvements, indices
    });
    statistiques.historique = statistiques.historique.slice(0, 12);
    ecrire('statistiques', statistiques);
    return { statistiques, nouvelleSerie };
}

export function effacerStatistiques() {
    ecrire('statistiques', { niveaux: {}, quotidien: {}, historique: [] });
}

export function _reinitialiserPourTests() {
    coffre = null;
    memoire.clear();
}

