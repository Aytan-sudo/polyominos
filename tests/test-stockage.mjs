import { compteur } from './harness.mjs';

const memoire = new Map();
globalThis.localStorage = {
    getItem: cle => memoire.get(cle) ?? null,
    setItem: (cle, valeur) => memoire.set(cle, String(valeur)),
    removeItem: cle => memoire.delete(cle)
};

const stockage = await import('../js/stockage.js');
stockage._reinitialiserPourTests();
const { check, rapport } = compteur();
console.log('\nStockage local et séries\n');

const preferences = stockage.chargerPreferences();
check('les préférences possèdent des valeurs sûres', preferences.niveau === 'moyen' && preferences.motifs === true);
stockage.enregistrerPreferences({ ...preferences, theme: 'nuit' });
check('les préférences sont relues', stockage.chargerPreferences().theme === 'nuit');

stockage.enregistrerSession({ puzzle: 'test', mouvements: 3 });
check('la partie en cours est conservée', stockage.chargerSession().mouvements === 3);
stockage.oublierSession();
check('la partie en cours peut être oubliée', stockage.chargerSession() === null);

stockage.enregistrerVictoire({ niveau: 'moyen', quotidien: true, dateJour: '2026-08-22', tempsMs: 70000, mouvements: 18, indices: 0 });
stockage.enregistrerVictoire({ niveau: 'moyen', quotidien: true, dateJour: '2026-08-23', tempsMs: 65000, mouvements: 17, indices: 1 });
const statistiques = stockage.chargerStatistiques();
check('deux jours consécutifs créent une série de deux', statistiques.quotidien.serie === 2);
check('le meilleur temps est conservé', statistiques.niveaux.moyen.meilleurTempsMs === 65000);
check('le sans-indice est compté séparément', statistiques.niveaux.moyen.sansIndice === 1);

rapport();

