import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compteur } from './harness.mjs';
import { VERSION } from '../js/config.js';
import { NIVEAUX } from '../js/generateur.js';
import { THEMES } from '../js/themes.js';

const { check, rapport } = compteur();
console.log('\nPage, mobile et PWA\n');
const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const lire = chemin => readFileSync(join(racine, chemin), 'utf8');
const page = lire('index.html');
const app = lire('js/app.js');
const rendu = lire('js/rendu.js');
const styles = [lire('css/themes.css'), lire('css/plateau.css'), lire('css/interface.css')].join('\n');
const worker = lire('sw.js');
const paquet = JSON.parse(lire('package.json'));
const manifeste = JSON.parse(lire('manifest.webmanifest'));

check('la version est partagée par le paquet et le code', paquet.version === VERSION);
check('la version est visible dans les options', page.includes(`Polyominos ${VERSION}`));
check('le cache porte la même version', worker.includes(`const VERSION = 'polyominos-${VERSION}'`));

function modulesCharges(depart) {
    const vus = new Set();
    const aVoir = [depart];
    while (aVoir.length) {
        const nom = aVoir.pop();
        if (vus.has(nom)) continue;
        vus.add(nom);
        for (const [, cible] of lire(`js/${nom}`).matchAll(/from\s+'\.\/([\w-]+\.js)'/g)) aVoir.push(cible);
    }
    return vus;
}

const charges = modulesCharges('app.js');
const modules = readdirSync(join(racine, 'js')).filter(nom => nom.endsWith('.js'));
const coquille = [...worker.matchAll(/^\s+'([^']+)',?$/gm)].map(([, chemin]) => chemin);
check('tous les modules sont reliés à l’application', modules.every(nom => charges.has(nom)));
check('tous les modules sont disponibles hors ligne', modules.every(nom => coquille.includes(`js/${nom}`)));
check('tous les fichiers du cache existent', coquille.every(chemin => chemin === './' || existsSync(join(racine, chemin))));
check('le service worker est enregistré', app.includes("navigator.serviceWorker.register('./sw.js')"));
check('la page charge une application modulaire', page.includes('<script type="module" src="js/app.js">'));
const idsDemandes = [...`${app}\n${rendu}`.matchAll(/\$\('([\w-]+)'\)/g)].map(([, id]) => id);
check('tous les éléments cherchés par l’application existent', idsDemandes.every(id => page.includes(`id="${id}"`)));

check('les trois niveaux sont documentés dans la page', Object.keys(NIVEAUX).length === 3 && ['Doux', 'Corsé', 'Expert'].every(nom => page.includes(nom)));
check('les six thèmes ont une palette', THEMES.length === 6 && THEMES.slice(1).every(theme => styles.includes(`[data-theme="${theme.id}"]`)));
check('les gestes du plateau sont directs', styles.includes('.plateau {') && styles.includes('touch-action: none'));
check('les encoches du téléphone sont respectées', styles.includes('safe-area-inset-top') && styles.includes('safe-area-inset-bottom'));
check('le paysage compact possède sa mise en page', styles.includes('@media (orientation: landscape)'));
check('les mouvements réduits sont respectés', styles.includes('prefers-reduced-motion'));

check('le manifeste autorise toutes les orientations', manifeste.orientation === 'any');
check('le manifeste décrit précisément le jeu', manifeste.name === 'Polyominos' && manifeste.description.length > 80);
check('les trois icônes PNG existent', manifeste.icons.length === 3 && manifeste.icons.every(icone => existsSync(join(racine, icone.src))));
check('page et manifeste partagent la couleur initiale', page.includes(`content="${manifeste.theme_color}"`));
check('le thème initial lit le stockage versionné', page.includes("localStorage.getItem('polyominos.preferences')"));
check('le déploiement Pages attend les tests', lire('.github/workflows/pages.yml').includes('needs: tester') && lire('.github/workflows/pages.yml').includes('actions/deploy-pages@v4'));

rapport();
