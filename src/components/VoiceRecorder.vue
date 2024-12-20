<script setup>
import { ref, onMounted, computed } from 'vue';
import { useAudioRecorder } from '../composables/useAudioRecorder';
import { formatTime } from '../utils/timeFormatter';
import { useAudioStream } from '../composables/useAudioStream';

const {
  isRecording,
  recordingTime,
  transcription,
  summary,
  startRecording,
  stopRecording,
  error: recorderError,
  hasSystemAudio
} = useAudioRecorder();

const { isSystemAudioSupported, checkSystemAudioSupport, error: streamError } = useAudioStream();

onMounted(async () => {
  isSystemAudioSupported.value = await checkSystemAudioSupport();
});

const error = computed(() => recorderError || streamError);
</script>

<template>
  <div class="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
    <!-- System Audio Support Warning -->
    <div v-if="!isSystemAudioSupported" class="mb-6 p-4 bg-yellow-100 text-yellow-700 rounded-lg">
      System audio capture is not supported in your browser. Only microphone recording will be available.
    </div>

    <!-- Recording Instructions -->
    <div v-if="!isRecording && isSystemAudioSupported" class="mb-6 p-4 bg-blue-50 text-blue-700 rounded-lg">
      <p class="font-medium mb-2">When you start recording:</p>
      <ol class="list-decimal list-inside space-y-1">
        <li>A screen sharing dialog will appear</li>
        <li>Select the "System Audio" or "Chrome Tab" option</li>
        <li>Make sure "Share audio" is checked</li>
        <li>Click "Share" to begin recording</li>
      </ol>
    </div>

    <!-- Recording Controls -->
    <div class="flex justify-center gap-4 mb-6">
      <button
        @click="startRecording"
        :disabled="isRecording"
        class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
      >
        Start Recording
      </button>
      <button
        @click="stopRecording"
        :disabled="!isRecording"
        class="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
      >
        Stop Recording
      </button>
    </div>

    <!-- Recording Status -->
    <div class="mb-6 text-center">
      <div class="flex items-center justify-center gap-2">
        <div
          :class="['w-3 h-3 rounded-full', isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-300']"
        ></div>
        <span class="font-mono">{{ formatTime(recordingTime) }}</span>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
      {{ error }}
    </div>

    <!-- Live Transcription -->
    <div class="mb-6">
      <h3 class="text-lg font-semibold mb-2">Live Transcription</h3>
      <div class="p-4 bg-gray-50 rounded-lg min-h-[100px] max-h-[200px] overflow-y-auto">
        {{ transcription }}
      </div>
    </div>

    <!-- Summary -->
    <div v-if="summary" class="mb-6">
      <h3 class="text-lg font-semibold mb-2">Summary</h3>
      <div class="p-4 bg-gray-50 rounded-lg">
        {{ summary }}
      </div>
    </div>

    <!-- Updated status message -->
    <div v-if="!hasSystemAudio && isRecording" class="text-yellow-600 mb-4 p-4 bg-yellow-50 rounded-lg">
      <p class="font-medium">Recording with microphone only</p>
      <p class="text-sm mt-1">To include system audio, stop recording and select "System Audio" when sharing your screen.</p>
    </div>
  </div>
</template>