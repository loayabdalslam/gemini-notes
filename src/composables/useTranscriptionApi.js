import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

export function useTranscriptionApi() {
  const sendTranscriptionRequest = async (audioBlob) => {
    try {
      console.log('Starting transcription request...', { blobSize: audioBlob?.size });

      // Ensure the audioBlob is valid
      let processedBlob = audioBlob;
      if (!(audioBlob instanceof Blob) || !audioBlob.type.includes('audio')) {
        console.warn('Input is not a valid audio Blob. Attempting to convert...');
        try {
          processedBlob = new Blob([audioBlob], { type: 'audio/webm; codecs=opus' });
          console.log('Conversion successful:', {
            blobType: processedBlob.type,
            blobSize: processedBlob.size,
          });
        } catch (error) {
          console.error('Failed to convert input to a valid Blob:', error);
          throw new Error('Invalid audio input. Could not create a valid Blob.');
        }
      }

      // Append audio to FormData
      const fileExtension = processedBlob.type.includes('webm') ? 'webm' : 'wav';
      const formData = new FormData();
      formData.append('audio', processedBlob, `recording.${fileExtension}`);

      console.log('Sending transcription request...', {
        url: `${API_BASE_URL}/transcribe`,
        blobType: processedBlob.type,
        blobSize: processedBlob.size,
      });

      try {
        const response = await axios.post(`${API_BASE_URL}/transcribe`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 120000, // 120-second timeout
          onUploadProgress: (progressEvent) => {
            const total = progressEvent.total || processedBlob.size;
            const percentCompleted = Math.round((progressEvent.loaded * 100) / total);
            console.log(`Upload Progress: ${percentCompleted}%`);
          },
        });

        console.log('Transcription response received:', response.data);

        if (response.data.error) {
          throw new Error(`Transcription error: ${response.data.error}`);
        }

        return response.data.text || '';
      } catch (error) {
        console.error('Transcription request failed:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        throw new Error(
          error.response?.data?.error || 'Failed to transcribe audio. Please try again.'
        );
      }

      console.log('Received transcription response:', response.data);

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data.text || '';
    } catch (error) {
      console.error('Transcription error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw new Error(
        error.response?.data?.error || 'Failed to transcribe audio. Please check the server.'
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
