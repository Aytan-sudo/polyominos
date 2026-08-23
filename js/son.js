let contexte;

function contexteAudio() {
    if (!contexte) {
        const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (AudioContext) contexte = new AudioContext();
    }
    return contexte;
}

function note(frequence, duree = 0.07, volume = 0.035, delai = 0) {
    const audio = contexteAudio();
    if (!audio) return;
    const debut = audio.currentTime + delai;
    const oscillateur = audio.createOscillator();
    const gain = audio.createGain();
    oscillateur.type = 'sine';
    oscillateur.frequency.setValueAtTime(frequence, debut);
    gain.gain.setValueAtTime(0.0001, debut);
    gain.gain.exponentialRampToValueAtTime(volume, debut + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
    oscillateur.connect(gain).connect(audio.destination);
    oscillateur.start(debut);
    oscillateur.stop(debut + duree + 0.02);
}

export const sonPoser = () => note(330, 0.065);
export const sonTourner = () => note(440, 0.05, 0.025);
export const sonErreur = () => note(145, 0.1, 0.025);
export function sonVictoire() {
    [392, 494, 587, 784].forEach((frequence, index) => note(frequence, 0.17, 0.035, index * 0.075));
}

