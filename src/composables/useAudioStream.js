import { ref, onMounted } from 'vue';

export function useAudioStream() {
  const error = ref('');
  const isSystemAudioSupported = ref(false);

  // Check system audio support
  const checkSystemAudioSupport = async () => {
    try {
      isSystemAudioSupported.value = !!(navigator.mediaDevices?.getDisplayMedia);
      return isSystemAudioSupported.value;
    } catch (err) {
      console.error("Error checking system audio support:", err);
      isSystemAudioSupported.value = false;
      return false;
    }
  };

  // Get microphone stream
  const getMicrophoneStream = async () => {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          channelCount: 1,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (!stream || !stream.getAudioTracks().length) {
        throw new Error("No audio tracks found in microphone stream");
      }
      return stream;
    } catch (err) {
      error.value = `Failed to access microphone: ${err.message}`;
      console.error("Microphone stream error:", err);
      throw err;
    }
  };

  // Get system audio stream
  const getSystemAudioStream = async () => {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          channelCount: 2,},
      };

      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);

      // Ensure audio tracks exist
      const audioTracks = stream.getAudioTracks();
      if (!audioTracks.length) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("No system audio selected");
      }

      // Stop video tracks (not needed)
      stream.getVideoTracks().forEach((track) => track.stop());

      // Return audio-only stream
      return new MediaStream(audioTracks);
    } catch (err) {
      if (err.name === "NotAllowedError") {
        error.value = "Permission denied for system audio capture";
      } else {
        error.value = `Failed to access system audio: ${err.message}`;
      }
      console.error("System audio stream error:", err);
      throw err;
    }
  };

  // Automatically check system audio support on mount
  onMounted(() => {
    checkSystemAudioSupport();
  });

  return {
    error,
    isSystemAudioSupported,
    getMicrophoneStream,
    getSystemAudioStream,
    checkSystemAudioSupport,
  };
}
