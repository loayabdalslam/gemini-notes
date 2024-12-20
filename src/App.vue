<script setup>
import { ref } from 'vue'
import VoiceRecorder from './components/VoiceRecorder.vue'

const error = ref(null)

const handleRecordingError = (errorMessage) => {
  error.value = errorMessage
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 py-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-center mb-8">Voice Recorder</h1>
      
      <!-- Error Alert -->
      <div v-if="error" class="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
        {{ error }}
      </div>

      <VoiceRecorder @error="handleRecordingError" />
    </div>
  </div>
</template>