# Django + React Full Stack Application

This is a full-stack application with a Django backend and a React frontend. The backend provides a REST API, and the frontend consumes this API.

## Project Structure

```
TAIS/
├── backend/          # Django REST API
│   ├── myproject/    # Django project settings
│   ├── api/          # Django app with models, views, etc.
│   └── venv/         # Python virtual environment
└── frontend/         # React application
    ├── public/       # Static files
    ├── src/          # React source code
    └── node_modules/ # Node.js dependencies
```

## Prerequisites

- Python 3.8 or higher
- Node.js (v14 or higher)
- npm or yarn

## Setup Instructions

### Backend (Django)

1. Navigate to the backend directory: `cd backend`
2. Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment:
   - On Windows: `venv\Scripts\activate`
   - On macOS/Linux: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Run database migrations: `python manage.py migrate`
6. Start the Django server: `python manage.py runserver`

The Django API will be available at `http://localhost:8000`.

### Frontend (React)

1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the React development server: `npm start`

The React app will be available at `http://localhost:3000`.

## Running the Application

1. Start the Django backend (see above)
2. In a separate terminal, start the React frontend (see above)
3. Open your browser to `http://localhost:3000`

## API Endpoints

The Django backend provides the following REST API endpoints:

- `GET /api/items/` - Get all items
- `POST /api/items/` - Create a new item
- `GET /api/items/{id}/` - Get a specific item
- `PUT /api/items/{id}/` - Update a specific item
- `DELETE /api/items/{id}/` - Delete a specific item

## Features

- Full CRUD operations for items
- React frontend with TypeScript
- Django REST Framework backend
- CORS configured for local development
- Responsive design

## Development

When developing, both servers need to be running:

- Django backend on `http://localhost:8000`
- React frontend on `http://localhost:3000`

The frontend makes API calls to the backend at `http://localhost:8000/api/`.