from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional # Removed List, Literal as they are no longer directly used in the request model
import logging
from dotenv import load_dotenv
load_dotenv()

# Import your existing symptom checker function
from models.symptomchecker import check_symptoms

app = FastAPI()

# Allow your React frontend origin for CORS
origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- REVISED PART ---

# New Pydantic model to match the React frontend's request body
# The frontend sends a `symptom_description` key, not a `messages` list
class SymptomCheckerRequest(BaseModel):
    symptom_description: str # This directly matches the key sent from React
    language_code: Optional[str] = None # Optional language code

@app.post("/api/symptom-checker")
async def symptom_checker_api(request: SymptomCheckerRequest): # Use the new model
    user_text = request.symptom_description.strip() # Directly access symptom_description

    if not user_text:
        # Changed detail message to reflect the new input
        raise HTTPException(status_code=400, detail="Symptom description is required")

    try:
        # Call your existing symptom checker function with the direct input
        # The React frontend can optionally send user_language_code, which will be passed here.
        # If not sent, it will be None, and your Python backend will handle it.
        result = check_symptoms(user_text, user_language_code=request.language_code)

        # The check_symptoms function already returns a dictionary with 'result', 'speech_data', etc.
        # You can return this dictionary directly.
        return result
    except ValueError as ve:
        logging.error(f"ValueError in symptom checker: {ve}") # Log the specific error
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logging.exception("Error in symptom checker API") # Log the full traceback
        raise HTTPException(status_code=500, detail="Internal server error")

# --- END REVISED PART ---

if __name__ == "__main__":
    import uvicorn
    # Use 'main:app' to correctly import the FastAPI app instance
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)
