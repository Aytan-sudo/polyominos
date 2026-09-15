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

// Le compteur de poses du tampon Logique : il vit dans l'espace du joueur,
// repart à zéro chaque jour, et ne tourne pas en mode invité.
const coffrePasseport = new Map();
const espacePasseport = { getItem: cle => coffrePasseport.get(cle) ?? null, setItem: (cle, valeur) => coffrePasseport.set(cle, String(valeur)) };
check('passeport : en mode invité, rien n’est compté', stockage.compterPosePasseport('2026-09-15') === null);
for (let i = 0; i < 19; i++) stockage.compterPosePasseport('2026-09-15', espacePasseport);
check('passeport : la vingtième pièce posée du jour atteint vingt', stockage.compterPosePasseport('2026-09-15', espacePasseport) === 20);
check('passeport : le lendemain, on repart de un', stockage.compterPosePasseport('2026-09-16', espacePasseport) === 1);
coffrePasseport.set('polyominos.passeport', '{cassé');
check('passeport : un compteur illisible repart proprement', stockage.compterPosePasseport('2026-09-16', espacePasseport) === 1);
check('passeport : le compteur ne touche pas au stockage du mode invité', localStorage.getItem('polyominos.passeport') === null);

rapport();
