# appointment_service.py

import datetime
import requests
from google.oauth2 import service_account
from googleapiclient.discovery import build

DWANI_API_BASE_URL = "https://dwani-dwani-api.hf.space"
DWANI_API_KEY = "jahnavis062@gmail.com_dwani"

SERVICE_ACCOUNT_FILE = "credentials.json"
SCOPES = ['https://www.googleapis.com/auth/calendar']

# Setup Google Calendar service
credentials = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE, scopes=SCOPES)
calendar_service = build('calendar', 'v3', credentials=credentials)

SPECIALIST_MAP = {
    "cardiologist": "Cardiologist",
    "dermatologist": "Dermatologist",
    "dentist": "Dentist",
    "neurologist": "Neurologist"
}


def dwani_speech_to_text(audio_bytes: bytes, language_code: str = "en") -> str:
    url = f"{DWANI_API_BASE_URL}/api/asr"
    headers = {"Authorization": f"Bearer {DWANI_API_KEY}"}
    files = {"file": ("speech.wav", audio_bytes, "audio/wav")}
    data = {"lang": language_code}
    response = requests.post(url, headers=headers, files=files, data=data)
    response.raise_for_status()
    return response.json().get("text", "")


def parse_booking_intent(text: str):
    """ Very basic intent parser """
    lower = text.lower()
    for key in SPECIALIST_MAP:
        if key in lower:
            return {
                "specialist": SPECIALIST_MAP[key],
                "datetime": datetime.datetime.utcnow() + datetime.timedelta(days=1, hours=10)  # default slot
            }
    return None


def book_appointment(summary: str, start_time: datetime.datetime, duration_minutes=30):
    end_time = start_time + datetime.timedelta(minutes=duration_minutes)
    event = {
        'summary': summary,
        'start': {'dateTime': start_time.isoformat() + 'Z'},
        'end': {'dateTime': end_time.isoformat() + 'Z'},
    }
    event = calendar_service.events().insert(calendarId='primary', body=event).execute()
    return event


def handle_voice_appointment(audio_bytes: bytes, lang: str = "en"):
    transcript = dwani_speech_to_text(audio_bytes, lang)
    intent = parse_booking_intent(transcript)
    if not intent:
        return {"error": "Could not parse intent from input"}
    event = book_appointment(f"Appointment with {intent['specialist']}", intent['datetime'])
    return {
        "transcription": transcript,
        "confirmation": f"Appointment booked with {intent['specialist']} at {intent['datetime'].strftime('%Y-%m-%d %H:%M')}.",
        "event_link": event.get('htmlLink', '')
    }
