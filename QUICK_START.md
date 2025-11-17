# Quick Start Guide

## Starting the Application

### 1. Start Backend Server

Open a terminal and run:
```bash
cd backend
npm run dev
```

You should see:
```
Database connected successfully
Server is running on port 5001
Environment: development
```

### 2. Start Frontend Server

Open another terminal and run:
```bash
cd frontend
npm run dev
```

You should see:
```
VITE v7.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

### 3. Test the Connection

Open your browser and go to: `http://localhost:5173`

Try to:
1. Register as a student
2. Register as a company
3. Login with existing credentials

## Troubleshooting "Route Not Found" Error

If you see "Route not found", check:

1. **Backend is running**: Make sure you see "Server is running on port 5001" in the backend terminal
2. **Check browser console**: Open DevTools (F12) and check the Network tab to see what URL is being called
3. **Check backend terminal**: Look for any error messages when you try to register/login
4. **Verify .env files**:
   - `backend/.env` should have `PORT=5001`
   - `frontend/.env` should have `VITE_API_URL=http://localhost:5001/api`

## Common Issues

### Backend won't start
- Check if MySQL is running
- Verify database credentials in `backend/.env`
- Make sure the database exists: `campus_placement_db`

### CORS errors
- Make sure `CORS_ORIGIN` in `backend/.env` matches your frontend URL (usually `http://localhost:5173`)

### Database connection errors
- Verify MySQL is running: `mysql -u root -p`
- Check database exists: `SHOW DATABASES;`
- Run schema if needed: `mysql -u root -p campus_placement_db < database/schema.sql`

