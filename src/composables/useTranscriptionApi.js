import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

export function useTranscriptionApi() {
  const sendTranscriptionRequest = async (audioBlob) => {
    try {
      if (!audioBlob?.size) {
        console.error('Invalid audio blob:', { size: audioBlob?.size, type: audioBlob?.type });
        throw new Error('Invalid audio blob: zero size');
      }

      console.log('Starting transcription request...', {
        blobSize: audioBlob.size,
        blobType: audioBlob.type,
        isBlob: audioBlob instanceof Blob
      });

      // Create a new blob with explicit type
      const processedBlob = new Blob([audioBlob], {
        type: 'audio/webm;codecs=opus'
      });

      // Verify the processed blob
      if (!processedBlob.size) {
        throw new Error('Processed blob has zero size');
      }

      const formData = new FormData();
      formData.append('audio', processedBlob, 'recording.webm');

      // Log the FormData content
      console.log('FormData details:', {
        hasFile: formData.has('audio'),
        fileName: 'recording.webm',
        blobSize: processedBlob.size
      });

      const response = await axios.post(`${API_BASE_URL}/transcribe`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000,
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || processedBlob.size;
          const percentCompleted = Math.round((progressEvent.loaded * 100) / total);
          console.log(`Upload Progress: ${percentCompleted}%`, {
            loaded: progressEvent.loaded,
            total: total
          });
        },
      });

      console.log('Server response:', response.data);

      if (response.data.error) {
        throw new Error(`Server error: ${response.data.error}`);
      }

      return response.data.text || '';
    } catch (error) {
      console.error('Transcription error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      throw new Error(
        error.response?.data?.error || 'Failed to transcribe audio. Please try again.'
      );
    }
  };

  const sendSummaryRequest = async (text) => {
    try {
      if (!text || typeof text !== 'string') {
        throw new Error('Invalid text provided for summarization');
      }

      console.log('Starting summary request...', { textLength: text.length });

      const response = await axios.post(
        `${API_BASE_URL}/summarize`,
        { text },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30-second timeout for summarization
        }
      );

      console.log('Received summary response:', response.data);

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data.summary || '';
    } catch (error) {
      console.error('Summary error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw new Error(
        error.response?.data?.error || 'Failed to generate summary. Please check the server.'
      );
    }
  };

  return {
    sendTranscriptionRequest,
    sendSummaryRequest,
  };
}
