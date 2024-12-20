/**
 * Combines multiple audio chunks into a single audio blob
 * @param {Blob[]} microphoneChunks - Microphone audio chunks
 * @param {Blob[]} systemChunks - System audio chunks
 * @returns {Promise<Blob>} Combined audio blob
 */
export async function combineAudioChunks(microphoneChunks, systemChunks) {
  try {
    console.log('Combining chunks:', {
      microphoneChunks: microphoneChunks.length,
      systemChunks: systemChunks.length
    });

    // If no system chunks, return microphone audio directly
    if (!systemChunks || systemChunks.length === 0) {
      const micBlob = new Blob(microphoneChunks, { type: 'audio/webm; codecs=opus' });
      console.log('Returning microphone-only blob:', { size: micBlob.size });
      return micBlob;
    }

    // Combine all chunks into a single blob
    const allChunks = [...microphoneChunks, ...systemChunks];
    const combinedBlob = new Blob(allChunks, { type: 'audio/webm; codecs=opus' });
    console.log('Created combined blob:', { size: combinedBlob.size });
    return combinedBlob;

  } catch (error) {
    console.error('Error combining audio chunks:', error);
    // Return microphone audio only as fallback
    const fallbackBlob = new Blob(microphoneChunks, { type: 'audio/webm; codecs=opus' });
    console.log('Returning fallback blob:', { size: fallbackBlob.size });
    return fallbackBlob;
  }
}

export async function requestAudioPermission() {
  try {
    // Check if MediaRecorder is supported
    if (!window.MediaRecorder) {
      throw new Error('MediaRecorder is not supported in this browser');
    }

    // Request microphone permission
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return stream;
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      throw new Error('Microphone permission denied');
    } else if (error.name === 'NotFoundError') {
      throw new Error('No microphone device found');
    } else {
      throw new Error(`Failed to access microphone: ${error.message}`);
    }
  }
}