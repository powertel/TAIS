# Django Backend for Django + React App

This is the Django backend for the Django + React application. It provides a REST API for managing items.

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

## Installation

1. Navigate to the backend directory: `cd backend`
2. Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment:
   - On Windows: `venv\Scripts\activate`
   - On macOS/Linux: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt` (if requirements.txt exists) or `pip install django djangorestframework`
5. Run database migrations: `python manage.py migrate`
6. Create a superuser: `python manage.py createsuperuser` (optional)

## Running the Application

1. Make sure your virtual environment is activated
2. Start the Django development server: `python manage.py runserver`
3. The API will be available at `http://localhost:8000`
4. The admin interface will be available at `http://localhost:8000/admin`

## API Endpoints

- `GET /api/items/` - Get all items
- `POST /api/items/` - Create a new item
- `GET /api/items/{id}/` - Get a specific item
- `PUT /api/items/{id}/` - Update a specific item
- `DELETE /api/items/{id}/` - Delete a specific item

## Environment Variables

No environment variables are currently used in this setup.

## Management Commands

- `python manage.py runserver` - Starts the development server
- `python manage.py migrate` - Applies database migrations
- `python manage.py makemigrations` - Creates new migrations based on model changes
- `python manage.py createsuperuser` - Creates a new admin user