from flask import Blueprint, request, jsonify
import os
import subprocess
import logging
from datetime import datetime
import google.generativeai as genai

# Configure logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# Initialize Blueprint
transcription_bp = Blueprint('transcription', __name__)

# Configure Gemini
genai.configure(api_key='AIzaSyAHpVJiE-Q6D-GYUO4KTxGh8ok1i58GZHQ')
genai.configure(transport='rest')
model = genai.GenerativeModel('gemini-1.5-flash')

# Configure directories
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

def convert_webm_to_wav(webm_path, wav_path):
    """Convert WebM audio file to WAV format using ffmpeg."""
    try:
        result = subprocess.run(
            ['ffmpeg', '-i', webm_path, '-ar', '44100', '-ac', '1', wav_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        if result.returncode != 0:
            logger.error(f"ffmpeg error: {result.stderr.decode()}")
            return False
        return True
    except Exception as e:
        logger.error(f"Error during conversion: {e}")
        return False

@transcription_bp.route('/transcribe', methods=['POST'])
def transcribe_audio():
    logger.info("Received transcription request")
    webm_path = None
    wav_path = None

    try:
        # Log request details
        logger.info(f"Files in request: {request.files.keys()}")
        logger.info(f"Content type: {request.content_type}")
        
        if 'audio' not in request.files:
            logger.error("No audio file in request")
            return jsonify({'error': 'No audio file provided'}), 400

        audio_file = request.files['audio']
        
        # Log file details
        logger.info(f"Received file: {audio_file.filename}")
        logger.info(f"Content type: {audio_file.content_type}")
        logger.info(f"Content length: {audio_file.content_length}")

        # Validate file
        if not audio_file or audio_file.filename == '':
            logger.error("No selected file")
            return jsonify({'error': 'No selected file'}), 400

        if not audio_file.content_type.startswith('audio/'):
            logger.error(f"Invalid content type: {audio_file.content_type}")
            return jsonify({'error': 'Invalid audio format'}), 400

        # Generate unique filenames
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        webm_path = os.path.join(UPLOAD_DIR, f"audio_{timestamp}.webm")
        wav_path = os.path.join(UPLOAD_DIR, f"audio_{timestamp}.wav")

        # Save and validate the file
        audio_file.save(webm_path)
        if not os.path.exists(webm_path) or os.path.getsize(webm_path) == 0:
            logger.error("Failed to save audio file or file is empty")
            return jsonify({'error': 'Failed to save audio file'}), 500

        logger.info(f"Saved WebM file: {webm_path} (size: {os.path.getsize(webm_path)} bytes)")

        # Convert WebM to WAV
        if not convert_webm_to_wav(webm_path, wav_path):
            logger.error("Failed to convert WebM to WAV")
            return jsonify({'error': 'Failed to convert audio format'}), 500

        # Check if WAV file is valid
        if not os.path.exists(wav_path) or os.path.getsize(wav_path) == 0:
            logger.error("WAV conversion failed or file is empty")
            return jsonify({'error': 'WAV file conversion failed'}), 500

        logger.info(f"Converted WAV file: {wav_path} (size: {os.path.getsize(wav_path)} bytes)")

        try:
            # Upload file to Gemini with increased timeout
            logger.info(f"Uploading WAV file to Gemini: {wav_path}")
            audio_file = genai.upload_file(path=wav_path)

            # Send transcription request to Gemini
            prompt = """
            Please transcribe this audio file accurately and provide a clear, well-formatted transcription.
            Include proper punctuation and maintain natural speech patterns.
            If there are multiple speakers, please indicate speaker changes.
            """

            logger.info("Sending transcription request to Gemini")
            response = model.generate_content(
                [prompt, audio_file],
                generation_config={
                    'temperature': 0.3,
                    'top_p': 0.8,
                    'top_k': 40,
                    'max_output_tokens': 2048,
                },
                safety_settings=[
                    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
                ]
            )

            transcription = response.text
            logger.info("Received transcription from Gemini")

            return jsonify({
                'text': transcription,
                'success': True
            })

        except Exception as e:
            logger.error(f"Gemini transcription error: {e}", exc_info=True)
            return jsonify({
                'error': 'Failed to transcribe audio',
                'details': str(e)
            }), 500

    except Exception as e:
        logger.error(f"Request handling error: {e}", exc_info=True)
        return jsonify({
            'error': 'Server error',
            'details': str(e)
        }), 500

    finally:
        # Clean up temporary files
        try:
            if webm_path and os.path.exists(webm_path):
                os.remove(webm_path)
            if wav_path and os.path.exists(wav_path):
                os.remove(wav_path)
        except Exception as e:
            logger.error(f"Error cleaning up files: {e}")

@transcription_bp.route('/summarize', methods=['POST'])
def summarize_text():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400

        text = data['text']
        prompt = f"""
        Please provide a concise summary of the following transcription:
        {text}

        Focus on the key points and main ideas. Keep the summary clear and well-structured.
        """
        response = model.generate_content(prompt)
        summary = response.text

        return jsonify({'summary': summary, 'success': True})

    except Exception as e:
        logger.error(f"Summarization error: {e}", exc_info=True)
        return jsonify({'error': 'Failed to generate summary', 'details': str(e)}), 500