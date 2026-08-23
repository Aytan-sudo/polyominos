export const THEMES = [
    { id: 'atelier', nom: 'Atelier', couleur: '#c75b3c' },
    { id: 'sauge', nom: 'Sauge', couleur: '#47705d' },
    { id: 'ocean', nom: 'Océan', couleur: '#326a86' },
    { id: 'bonbon', nom: 'Bonbon', couleur: '#b64f78' },
    { id: 'ardoise', nom: 'Ardoise', couleur: '#59627a' },
    { id: 'nuit', nom: 'Nuit', couleur: '#e39a49' }
];

export function themeSuivant(theme) {
    const index = THEMES.findIndex(candidat => candidat.id === theme);
    return THEMES[(index + 1 + THEMES.length) % THEMES.length].id;
}

