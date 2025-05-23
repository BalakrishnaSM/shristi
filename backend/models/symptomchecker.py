import os
import time
import logging
import base64
from typing import Optional
from dotenv import load_dotenv
from google.cloud import translate_v3 as translate
from google import genai
from google.genai import types
from google.api_core import exceptions
# import requests # Removed: No longer making direct HTTP requests to Dwani API

# NEW: Import the dwani library
import dwani 

load_dotenv()  # Load environment variables from .env file

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Environment Variable Validation ---
DWANI_API_BASE_URL = os.environ.get("DWANI_API_BASE_URL") # Make sure this is set in your .env
DWANI_API_KEY = os.environ.get("DWANI_API_KEY")
PROJECT_ID = os.environ.get("GCP_PROJECT_ID")

if not DWANI_API_KEY:
    raise ValueError("DWANI_API_KEY environment variable not set")
# IMPORTANT: Ensure DWANI_API_BASE_URL is set in your .env file
# This MUST be the base URL for the official Dwani API, not necessarily a Hugging Face Space URL.
# It should be something like "https://api.dwani.ai/v1" or similar, as per Dwani's official docs.
if not DWANI_API_BASE_URL:
    raise ValueError("DWANI_API_BASE_URL environment variable not set. Please set it to the official Dwani API base URL.")
if not PROJECT_ID:
    raise ValueError("PROJECT_ID environment variable not set")
# --- End Environment Variable Validation ---

# --- Setup Dwani credentials globally ---
# This configures the dwani library to use your API key and base URL
dwani.api_key = DWANI_API_KEY
dwani.api_base = DWANI_API_BASE_URL
logging.info(f"Dwani API configured with base URL: {dwani.api_base}")
# --- End Dwani setup ---


def detect_language(text: str, project_id: str) -> str:
    """Detect language using Google Cloud Translate v3 API."""
    client = translate.TranslationServiceClient()
    location = "global"
    parent = f"projects/{project_id}/locations/{location}"

    try:
        response = client.detect_language(
            request={
                "parent": parent,
                "content": text,
                "mime_type": "text/plain"
            }
        )

        if response.languages:
            language = response.languages[0]
            logging.info(f"Detected language: {language.language_code} (Confidence: {language.confidence})")
            return language.language_code
        logging.warning("No language detected, falling back to 'en'")
        return "en"

    except Exception as e:
        logging.error(f"Language detection error: {e}, falling back to 'en'", exc_info=True)
        return "en"

def translate_text(text: str, target_language_code: str, project_id: str) -> str:
    """Translates text to the target language using Google Cloud Translate."""
    client = translate.TranslationServiceClient()
    location = "global"
    parent = f"projects/{project_id}/locations/{location}"

    try:
        response = client.translate_text(
            request={
                "parent": parent,
                "contents": [text],
                "mime_type": "text/plain",
                "target_language_code": target_language_code,
            }
        )
        logging.info(f"Translated to {target_language_code}: {response.translations[0].translated_text[:50]}...")
        return response.translations[0].translated_text
    except Exception as e:
        logging.error(f"Translation error: {e}. Returning original text.", exc_info=True)
        return text


def text_to_speech(text: str, language_code: str) -> Optional[str]: 
    """
    Converts text to speech using the Dwani API via the dwani Python library.
    Returns the base64 encoded audio data (MP3) with MIME prefix, or None if an error occurs.
    """
    try:
        logging.info(f"Attempting to generate speech for text: '{text[:50]}...' in language: '{language_code}'")

        # Use the dwani library's Audio.speech method
        # The dwani library handles the correct URL construction based on dwani.api_base
        # It takes 'input' for the text and 'response_format' (e.g., "mp3")
        audio_binary_data = dwani.Audio.speech(input=text, response_format="mp3")

        if not audio_binary_data:
            logging.warning("Dwani API returned empty binary audio data.")
            return None

        # Encode the binary audio data to base64
        # base64.b64encode returns bytes, .decode('utf-8') converts it to a string
        base64_audio = base64.b64encode(audio_binary_data).decode('utf-8')

        # Add MIME type prefix to create a data URI, which browsers can play directly
        mime_prefix = "data:audio/mpeg;base64,"
        final_audio_data_uri = f"{mime_prefix}{base64_audio}"

        logging.info(f"Successfully generated and encoded audio data (size: {len(audio_binary_data)} bytes).")
        return final_audio_data_uri # Return the data URI string

    except dwani.error.APIError as e:
        # Catch specific API errors from the dwani library
        logging.trace("Dwani API error (dwani.error.APIError):", exc_info=True) # Use logging.exception for full traceback
        logging.error(f"Dwani API error (dwani.error.APIError): {e}")
        return None
    except Exception as e:
        # Catch any other general exceptions
        logging.error(f"Text-to-speech error (general exception): {e}", exc_info=True) # exc_info=True for traceback
        return None


def check_symptoms(symptom_description: str, user_language_code: str = None, max_retries=3, retry_delay=2) -> dict:
    """
    Analyze symptoms with Gemini, detect input language, translate to English,
    analyze, then translate back to the user's language (if different), and generate speech.
    """
    global PROJECT_ID
    project_id = PROJECT_ID

    if not symptom_description:
        raise ValueError("Symptoms description is required")

    # Language Detection. If user language is not provided, detect it
    if not user_language_code:
        user_language_code = detect_language(symptom_description, project_id)
        logging.info(f"Detected language for input: {user_language_code}")
    else:
        logging.info(f"User specified language: {user_language_code}")

    # Translate to English for Gemini processing (important for consistent results)
    english_symptom_description = symptom_description
    if user_language_code != "en":
        logging.info(f"Translating symptoms to English from {user_language_code}...")
        english_symptom_description = translate_text(symptom_description, "en", project_id)
        logging.info(f"Translated symptoms (English): {english_symptom_description[:50]}...")
    else:
        logging.info("Input language is English, no translation needed for Gemini.")


    client = genai.Client(
        vertexai=True,
        project=project_id,
        location="global",
    )

    system_instruction_text = """Symptom Checker

    ### ✨ Features:

    - User describes symptoms via voice/text
    - Gets probable conditions (list max 3)
    - Option to consult a doctor

    ### Guidelines:

    You are a symptom checker assistant that provides a list of the most probable medical conditions related to a user's written symptoms.  You are NOT a doctor, and you do NOT provide medical advice.  Your purpose is to provide a preliminary list of possible conditions, encouraging the user to seek professional medical attention.

    - If the symptoms are vague, ask for clarification.
    - Be concise and easy to understand for a general audience.
    - List a maximum of 3 possible conditions.
    - For each condition, provide a very brief (1-2 sentence) explanation linking the symptoms to the condition.
    - Always end with the phrase "Consult a medical professional for diagnosis and treatment."
    - reply for the prompts other than English too.
    - If the user asks for a condition, provide a brief explanation of the condition and its symptoms.
    - if user asks to explain or translate or say or reply in specific language reply in that language.

    ### Example:

    User: "I have a headache, fever, and cough."

    Response:
    Possible conditions:
    - Influenza (Flu): Flu can cause headache, fever, and cough.
    - Common Cold: A cold can also cause these symptoms.
    - Sinusitis: An infection of the sinuses can lead to headache, fever, and cough.

    Consult a medical professional for diagnosis and treatment.

    Do not respond to text other than related to health.
    """

    user_content = types.Content(
        role="user",
        parts=[types.Part.from_text(text=english_symptom_description)]
    )
    logging.debug(f"Gemini Prompt (English): {english_symptom_description}")

    generate_content_config = types.GenerateContentConfig(
        temperature=0.7,
        top_p=1,
        seed=0,
        max_output_tokens=1024,
        safety_settings=[
            types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="OFF"),
            types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="OFF"),
            types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="OFF"),
            types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="OFF"),
        ],
        system_instruction=[types.Part.from_text(text=system_instruction_text)],
    )

    gemini_response_text = ""
    
    for attempt in range(max_retries):
        try:
            gemini_response_text = ""
            response_stream = client.models.generate_content_stream(
                model="gemini-2.0-flash-001",
                contents=[user_content],
                config=generate_content_config,
            )
            for chunk in response_stream:
                gemini_response_text += chunk.text
            logging.debug(f"Gemini raw response: {gemini_response_text}")
            break

        except exceptions.ServiceUnavailable as e:
            logging.warning(f"Attempt {attempt + 1}/{max_retries} failed (ServiceUnavailable): {e}")
            if attempt == max_retries - 1:
                raise RuntimeError(f"Gemini API is unavailable after {max_retries} retries: {e}")
            time.sleep(retry_delay)
        except exceptions.DeadlineExceeded as e:
            logging.warning(f"Attempt {attempt + 1}/{max_retries} failed (DeadlineExceeded): {e}")
            if attempt == max_retries - 1:
                raise RuntimeError(f"Gemini API request timed out after {max_retries} retries: {e}")
            time.sleep(retry_delay)
        except Exception as e:
            logging.error(f"Attempt {attempt + 1}/{max_retries} failed (General Exception): {e}", exc_info=True)
            if attempt == max_retries - 1:
                raise RuntimeError(f"Gemini API error after {max_retries} retries: {e}")
            time.sleep(retry_delay)

    # Translate back to user's language
    final_result = gemini_response_text
    if user_language_code != "en":
        logging.info(f"Translating Gemini response back to user language ({user_language_code})...")
        final_result = translate_text(gemini_response_text, user_language_code, project_id)
        logging.info(f"Final translated response (user language): {final_result[:50]}...")
    else:
        logging.info("Gemini response is in English, no reverse translation needed.")

    # Generate speech from the result
    speech_data = text_to_speech(final_result, user_language_code)
    
    message_value = ""
    isValidbase64 = False

    if speech_data:
        try:
            # Attempt to decode to validate base64
            # We strip the MIME prefix before validating
            base64_content = speech_data.split(',')[1] if ',' in speech_data else speech_data
            base64.b64decode(base64_content, validate=True)
            logging.info("Base64 audio data validated successfully.")
            message_value = "Audio generated successfully."
            isValidbase64 = True
        except (base64.binascii.Error, IndexError) as e: # IndexError if split fails
            logging.error(f"Bad base64 encoding for audio data during validation: {e}")
            message_value = "Base64 encoding of audio data is invalid."
            isValidbase64 = False
    else:
        logging.warning("No speech data received from text_to_speech function.")
        message_value = "Failed to generate audio data."
        isValidbase64 = False

    return {
        "result": final_result.strip(),
        "language": user_language_code,
        "speech_data": speech_data,
        "message": message_value,
        "isValidbase64": isValidbase64
    }

