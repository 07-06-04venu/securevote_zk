from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
import numpy as np
import cv2
import hashlib
import time

app = FastAPI()

class BiometricTemplate(BaseModel):
    voter_id: str
    template_hash: str

# Simulated stores
templates = {}

@app.post("/register")
async def register_biometrics(voter_id: str, file: UploadFile = File(...)):
    """
    Captures biometric sample, performs liveness check, generates hash.
    """
    content = await file.read()
    nparr = np.frombuffer(content, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Simulate Liveness Check
    # In a real impl, we'd run a CNN model here
    is_live = True # Placeholder for actual AI inference
    
    if not is_live:
        raise HTTPException(status_code=400, detail="Liveness verification failed")
    
    # Secure Template Hashing
    # Biometric data is NOT stored directly
    template_hash = hashlib.sha256(content).hexdigest()
    templates[voter_id] = template_hash
    
    return {"voter_id": voter_id, "status": "registered", "hash": template_hash}

@app.post("/authenticate")
async def authenticate_voter(voter_id: str, file: UploadFile = File(...)):
    """
    Multimodal biometric verification.
    """
    if voter_id not in templates:
        raise HTTPException(status_code=404, detail="Voter not found")
        
    content = await file.read()
    new_hash = hashlib.sha256(content).hexdigest()
    
    if new_hash == templates[voter_id]:
        return {"status": "authenticated", "confidence": 0.99}
    else:
        raise HTTPException(status_code=401, detail="Biometric mismatch")

from sklearn.ensemble import IsolationForest
import pandas as pd

# AI Model for Fraud Detection
# Isolation Forest is excellent for anomaly detection in transaction/voting data
model = IsolationForest(contamination=0.05, random_state=42)

# Simulated historical voting data for "training"
# Features: [time_of_day, login_duration, attempts, location_id]
training_data = [
    [10, 30, 1, 1], [11, 45, 1, 1], [14, 20, 1, 2], [15, 60, 1, 1],
    [3, 5, 10, 5], # Anomaly: middle of night, high attempts
]
model.fit(training_data)

@app.post("/fraud-check")
async def fraud_check(voter_id: str, behavior_data: dict):
    """
    Detects anomalies like voting spikes or suspicious timing.
    """
    # Features: hour, duration, attempts, location
    features = [
        behavior_data.get('hour', 12),
        behavior_data.get('duration', 30),
        behavior_data.get('attempts', 1),
        behavior_data.get('location', 1)
    ]
    
    prediction = model.predict([features])
    fraud_score = 0.95 if prediction[0] == -1 else 0.05
    
    return {
        "voter_id": voter_id,
        "fraud_score": fraud_score,
        "is_safe": fraud_score < 0.5,
        "reasoning": "Suspicious login pattern detected" if fraud_score > 0.5 else "Behavior consistent with normal voter"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
