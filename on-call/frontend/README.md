# On-Call Scheduler Frontend

React + Vite frontend for the On-Call Scheduler application.

## Setup

1. Install dependencies:
```bash
npm install
```

## Running the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

**Important:** Make sure the backend server is running on `http://localhost:8000` before using the application.

## Building for Production

```bash
npm run build
```

## Features

- **Clean Table Form**: Add/remove staff members in a clean table format
- **Date Picker**: Use react-datepicker to select unavailable days for each staff member
- **Calendar Grid View**: Beautiful calendar display showing the generated schedule
- **Staff Summary**: View target vs actual shifts for each staff member
- **Responsive Design**: Works on desktop and mobile devices

## Dependencies

- React 18.2.0
- Vite 5.0.8
- TailwindCSS 3.3.6
- Axios 1.6.2
- react-datepicker 4.25.0

## Usage

1. Enter the schedule start date and number of days
2. Add staff members with their names and target shifts
3. Select unavailable days for each staff member using the date picker
4. Click "Generate Schedule" to create the schedule
5. View the generated schedule in the calendar grid

