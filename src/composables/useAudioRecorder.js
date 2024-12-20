import { ref } from 'vue';
import { useAudioStream } from './useAudioStream';
import { useTranscriptionApi } from './useTranscriptionApi';

const CHUNK_DURATION = 5000; // 5 seconds

export function useAudioRecorder() {
  const { getMicrophoneStream, getSystemAudioStream, error: streamError } = useAudioStream();
  const { sendTranscriptionRequest, sendSummaryRequest } = useTranscriptionApi();

  const microphoneRecorder = ref(null);
  const systemRecorder = ref(null);
  const isRecording = ref(false);
  const recordingTime = ref(0);
  const transcription = ref('');
  const summary = ref('');
  const error = ref('');
  const hasSystemAudio = ref(false);
  
  let timer = null;
  let microphoneChunks = [];
  let systemChunks = [];
  let isProcessing = false;

  const cleanupStreams = () => {
    microphoneRecorder.value?.stream.getTracks().forEach(track => track.stop());
    systemRecorder.value?.stream.getTracks().forEach(track => track.stop());
    microphoneRecorder.value = null;
    systemRecorder.value = null;
  };

  const processAudioChunks = async (chunks, isSystemAudio) => {
    if (chunks.length === 0) return;

    const blob = new Blob(chunks, { type: 'audio/webm; codecs=opus' });
    console.log(`Processing ${isSystemAudio ? 'system' : 'microphone'} audio:`, {
      chunks: chunks.length,
      blobSize: blob.size
    });

    if (blob.size > 0) {
      try {
        const text = await sendTranscriptionRequest(blob);
        if (text) {
          transcription.value += (transcription.value ? ' ' : '') + 
            `[${isSystemAudio ? 'System' : 'Mic'}] ${text}`;
        }
      } catch (err) {
        console.error(`Error processing ${isSystemAudio ? 'system' : 'microphone'} audio:`, err);
      }
    }
  };

  const setupRecorder = (recorder, isSystemAudio) => {
    if (!recorder) return;

    recorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        console.log(`${isSystemAudio ? 'System' : 'Microphone'} chunk received:`, {
          size: event.data.size,
          time: new Date().toISOString()
        });

        if (isSystemAudio) {
          systemChunks.push(event.data);
        } else {
          microphoneChunks.push(event.data);
        }
      }
    };

    recorder.onerror = (e) => {
      console.error(`${isSystemAudio ? 'System' : 'Microphone'} recorder error:`, e.error);
      error.value = `Recording error: ${e.error.message}`;
      stopRecording();
    };

    recorder.start(CHUNK_DURATION);
  };

  const processChunks = async () => {
    if (isProcessing || !isRecording.value) return;

    try {
      isProcessing = true;

      // Process microphone chunks
      if (microphoneChunks.length > 0) {
        const currentMicChunks = [...microphoneChunks];
        microphoneChunks = [];
        await processAudioChunks(currentMicChunks, false);
      }

      // Process system chunks
      if (systemChunks.length > 0) {
        const currentSysChunks = [...systemChunks];
        systemChunks = [];
        await processAudioChunks(currentSysChunks, true);
      }
    } finally {
      isProcessing = false;
    }
  };

  const startRecording = async () => {
    try {
      error.value = '';
      transcription.value = '';
      summary.value = '';
      cleanupStreams();
      microphoneChunks = [];
      systemChunks = [];
      isProcessing = false;

      // Start microphone recording
      const micStream = await getMicrophoneStream();
      microphoneRecorder.value = new MediaRecorder(micStream, {
        mimeType: 'audio/webm; codecs=opus'
      });
      setupRecorder(microphoneRecorder.value, false);

      // Try to start system audio recording
      try {
        const sysStream = await getSystemAudioStream();
        systemRecorder.value = new MediaRecorder(sysStream, {
          mimeType: 'audio/webm; codecs=opus'
        });
        setupRecorder(systemRecorder.value, true);
        hasSystemAudio.value = true;
      } catch (err) {
        hasSystemAudio.value = false;
        console.log('System audio not available, continuing with microphone only');
      }

      isRecording.value = true;

      // Process chunks every 5 seconds
      timer = setInterval(() => {
        recordingTime.value += 1000;
        if (recordingTime.value % CHUNK_DURATION === 0) {
          processChunks();
        }
      }, 1000);

    } catch (err) {
      error.value = `Failed to start recording: ${err.message}`;
      cleanupStreams();
    }
  };

  const stopRecording = async () => {
    if (!isRecording.value) return;

    try {
      isRecording.value = false;
      clearInterval(timer);

      // Stop recorders and collect final chunks
      await new Promise((resolve) => {
        let expectedStops = systemRecorder.value ? 2 : 1;
        let stoppedCount = 0;

        const onStop = () => {
          stoppedCount++;
          if (stoppedCount === expectedStops) {
            setTimeout(resolve, 100);
          }
        };

        microphoneRecorder.value.onstop = onStop;
        if (systemRecorder.value) {
          systemRecorder.value.onstop = onStop;
          systemRecorder.value.stop();
        }
        microphoneRecorder.value.stop();
      });

      // Process any remaining chunks
      await processChunks();

      // Generate summary if we have transcription
      if (transcription.value.trim()) {
        const summaryText = await sendSummaryRequest(transcription.value);
        summary.value = summaryText;
      }

    } catch (err) {
      console.error('Stop recording error:', err);
      error.value = `Failed to stop recording: ${err.message}`;
    } finally {
      cleanupStreams();
      microphoneChunks = [];
      systemChunks = [];
      recordingTime.value = 0;
    }
  };

  return {
    isRecording,
    recordingTime,
    transcription,
    summary,
    error,
    hasSystemAudio,
    startRecording,
    stopRecording
  };
}