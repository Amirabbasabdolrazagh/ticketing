const silentAudioContexts = new Set();

export async function getMicrophoneOrSilence(constraints) {
  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    const noMicrophone = ["NotFoundError", "OverconstrainedError"].includes(error?.name);

    if (!noMicrophone || constraints?.audio === false || constraints?.video) {
      throw error;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw error;

    const context = new AudioContextClass();
    const source = context.createConstantSource();
    const destination = context.createMediaStreamDestination();

    source.offset.value = 0;
    source.connect(destination);
    source.start();

    silentAudioContexts.add({ context, source });

    return destination.stream;
  }
}

export function stopSilentAudio() {
  for (const { context, source } of silentAudioContexts) {
    try {
      source.stop();
    } catch {}

    context.close().catch(() => {});
  }

  silentAudioContexts.clear();
}
