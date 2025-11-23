# On-Call Scheduler Backend

FastAPI backend for generating on-call schedules using constraint satisfaction programming.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Server

```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

API documentation (Swagger UI): `http://localhost:8000/docs`

## Testing the Scheduler

You can test the scheduler logic directly:

```bash
python scheduler.py
```

## API Endpoints

- `GET /` - Root endpoint
- `GET /health` - Health check
- `POST /api/schedule/generate` - Generate a schedule
- `POST /api/schedule/validate` - Validate schedule request

