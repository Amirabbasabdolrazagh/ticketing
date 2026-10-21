const DTMF_FREQUENCIES = {
  "1": [697, 1209],
  "2": [697, 1336],
  "3": [697, 1477],
  "4": [770, 1209],
  "5": [770, 1336],
  "6": [770, 1477],
  "7": [852, 1209],
  "8": [852, 1336],
  "9": [852, 1477],
  "*": [941, 1209],
  "0": [941, 1336],
  "#": [941, 1477],
};

let audioContext = null;

export function playDialTone(digit) {
  const frequencies = DTMF_FREQUENCIES[String(digit)];
  if (!frequencies || typeof window === "undefined") return;

  try {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    if (!audioContext || audioContext.state === "closed") {
      audioContext = new AudioContextClass();
    }

    const context = audioContext;
    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    const start = context.currentTime;
    const duration = 0.11;

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.045, start + 0.008);
    gain.gain.setValueAtTime(0.045, start + duration - 0.018);
    gain.gain.linearRampToValueAtTime(0.0001, start + duration);

    gain.connect(context.destination);

    frequencies.forEach((frequency) => {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.connect(gain);
      oscillator.start(start);
      oscillator.stop(start + duration);
      oscillator.onended = () => oscillator.disconnect();
    });

    window.setTimeout(() => gain.disconnect(), 180);
  } catch {
    // Audio feedback must never interrupt dialing.
  }
}
