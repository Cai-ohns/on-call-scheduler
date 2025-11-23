# On-Call Scheduler

A web-based application for generating fair on-call schedules for medical staff using constraint satisfaction programming.

## Features

- **Staff Management**: Add multiple staff members with their constraints
- **Flexible Scheduling**: Configure target number of shifts and unavailable days
- **Smart Algorithm**: Uses Google OR-Tools CSP solver to generate optimal schedules
- **Constraints**:
  - Hard: Respects unavailable days
  - Hard: No back-to-back shifts
  - Soft: Attempts to match target shifts ±1

## Project Structure

```
.
├── backend/          # FastAPI backend
│   ├── scheduler.py  # CSP scheduling algorithm
│   ├── main.py       # FastAPI application
│   └── requirements.txt
├── frontend/         # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── StaffForm.jsx
│   │   │   └── ScheduleCalendar.jsx
│   │   └── App.jsx
│   └── package.json
└── README.md
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
```

3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - Linux/Mac: `source venv/bin/activate`

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Run the server:
```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`
API documentation: `http://localhost:8000/docs`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Usage

1. **Configure Staff**: Add staff members with their names, target number of shifts, and unavailable days
2. **Set Schedule Period**: Choose a start date and number of days (default: 28 days)
3. **Generate Schedule**: Click "Generate Schedule" to create an optimal schedule
4. **View Results**: The calendar view displays who is on call each day, with a summary of actual vs target shifts

## API Endpoints

- `GET /` - Root endpoint
- `GET /health` - Health check
- `POST /api/schedule/generate` - Generate a schedule
- `POST /api/schedule/validate` - Validate schedule request

## Technology Stack

- **Backend**: Python, FastAPI, OR-Tools (CSP solver)
- **Frontend**: React, Vite, TailwindCSS, Axios

## Testing the Scheduler

You can test the scheduler logic independently:

```bash
cd backend
python scheduler.py
```

This will run a test case with sample staff data.

