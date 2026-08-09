from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def home():
    return {"message": "JobPilot-AI backend is running!"}