# Campus Placement Management System

A full-stack web application for managing campus placement processes with three distinct portals: Admin (College), Company, and Student.

## Tech Stack

- **Frontend**: React 19 (Vite) + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: MySQL
- **Authentication**: JWT (JSON Web Tokens)

## Features

### Student Portal
- Student registration with comprehensive profile information
- View eligible company drives based on CGPA and skills
- Register for drives
- Track application status and qualified rounds
- Update profile and skills

### Company Portal
- Company registration (requires admin approval)
- Create and manage job drives
- View eligible students based on drive requirements
- Shortlist students
- Schedule interview rounds
- Post interview results

### Admin Portal
- Approve/reject company registrations
- Approve/reject drive listings
- Upload student database via CSV
- Filter and sort students by various criteria
- View placement statistics
- Assign students to drives

### Eligibility Engine
- Automatic matching of students to drives based on:
  - Minimum CGPA requirement
  - Required skills matching
- Determines which interview rounds a student qualifies for

## Project Structure

```
project2/
├── backend/                 # Express.js backend
│   ├── config/             # Database configuration
│   ├── middleware/         # Authentication middleware
│   ├── routes/             # API routes
│   ├── utils/              # Utility functions
│   └── server.js           # Entry point
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── context/        # React context (Auth)
│   │   ├── pages/          # Page components
│   │   ├── utils/          # Utility functions
│   │   └── App.jsx         # Main app component
│   └── package.json
├── database/               # Database scripts
│   ├── schema.sql          # Database schema
│   └── seed.sql            # Seed data
└── README.md
```

## Prerequisites

- Node.js (v18 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd project2
```

### 2. Install dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Database Setup

1. Create a MySQL database:
```sql
CREATE DATABASE campus_placement_db;
```

2. Update database credentials in `backend/.env` (see Environment Variables section)

3. Run the schema script:
```bash
mysql -u your_username -p campus_placement_db < database/schema.sql
```

4. (Optional) Load seed data:

   **Option A: Using Node.js script (Recommended - properly hashes passwords)**
   ```bash
   # Make sure backend dependencies are installed first
   cd backend
   npm install
   cd ..
   
   # Run the seed script
   node database/seed.js
   ```
   
   **Option B: Using SQL file (passwords will need to be reset)**
   ```bash
   mysql -u your_username -p campus_placement_db < database/seed.sql
   ```

   **Note**: The Node.js seed script creates users with the default password `password123`. Change this in production!

### 4. Environment Variables

#### Backend (.env)

Create `backend/.env` file:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=campus_placement_db
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

#### Frontend (.env)

Create `frontend/.env` file:

```env
VITE_API_URL=http://localhost:5000/api
```

### 5. Create uploads directory

```bash
mkdir -p backend/uploads
```

## Running the Application

### Development Mode

#### Start Backend Server

```bash
cd backend
npm run dev
```

The backend server will run on `http://localhost:5000`

#### Start Frontend Development Server

```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:5173`

### Production Build

#### Build Frontend

```bash
cd frontend
npm run build
```

The built files will be in `frontend/dist/`

#### Start Backend in Production

```bash
cd backend
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register/student` - Register a new student
- `POST /api/auth/register/company` - Register a new company
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info

### Student Routes (Protected)
- `GET /api/students/profile` - Get student profile
- `PUT /api/students/profile` - Update student profile
- `GET /api/students/eligible-drives` - Get eligible drives
- `POST /api/students/register-drive/:driveId` - Register for a drive
- `GET /api/students/my-registrations` - Get student's registrations

### Company Routes (Protected)
- `GET /api/companies/profile` - Get company profile
- `PUT /api/companies/profile` - Update company profile
- `GET /api/companies/my-drives` - Get company's drives
- `POST /api/companies/drives` - Create a new drive
- `GET /api/companies/drives/:driveId/eligible-students` - Get eligible students
- `PUT /api/companies/drives/:driveId/students/:studentId/shortlist` - Shortlist student
- `POST /api/companies/drives/:driveId/students/:studentId/interview` - Schedule interview
- `PUT /api/companies/drives/:driveId/students/:studentId/interview/:roundId` - Update interview result

### Admin Routes (Protected)
- `GET /api/admin/stats` - Get dashboard statistics
- `GET /api/admin/companies` - Get all companies
- `PUT /api/admin/companies/:companyId/approve` - Approve/reject company
- `GET /api/admin/drives` - Get all drives
- `PUT /api/admin/drives/:driveId/approve` - Approve/reject drive
- `GET /api/admin/students` - Get all students (with filters)
- `POST /api/admin/students/upload` - Upload students via CSV
- `POST /api/admin/drives/:driveId/assign-students` - Assign students to drive

### Public Routes
- `GET /api/drives` - Get all active drives
- `GET /api/drives/:id` - Get drive details

## CSV Upload Format

When uploading students via CSV, the file should have the following columns:

- `name` (required)
- `email` (required)
- `roll_number` (required)
- `department` (required)
- `cgpa` (required)
- `domain` (optional)
- `phone` (optional)
- `resume_link` (optional)
- `graduation_year` (optional, defaults to current year)
- `internship_experience_years` (optional, defaults to 0)
- `skills` (optional, comma-separated)
- `preferred_job_types` (optional, comma-separated: FT, Intern)
- `preferred_locations` (optional, comma-separated)

## Security Features

- Password hashing using bcrypt
- JWT-based authentication
- Input validation using express-validator
- SQL injection prevention using parameterized queries
- CORS configuration
- Role-based access control

## Database Schema

The database includes the following main tables:

- `users` - User authentication (all roles)
- `students` - Student profiles
- `companies` - Company profiles
- `admins` - Admin profiles
- `drives` - Job drive listings
- `drive_registrations` - Student-drive relationships
- `interview_rounds` - Interview scheduling and results
- `student_skills` - Student skills (many-to-many)
- `drive_required_skills` - Drive required skills (many-to-many)
- `student_preferred_job_types` - Student job preferences
- `student_preferred_locations` - Student location preferences

## Testing

### Backend Tests

```bash
cd backend
npm test
```

### Manual Testing

1. Register as a student/company
2. Login and verify JWT token
3. Test role-based access
4. Test eligibility matching
5. Test drive registration flow

## Deployment

### Backend Deployment

1. Set `NODE_ENV=production` in environment variables
2. Use a process manager like PM2:
```bash
pm2 start backend/server.js --name campus-placement-api
```

3. Configure reverse proxy (nginx) if needed

### Frontend Deployment

1. Build the frontend:
```bash
cd frontend
npm run build
```

2. Serve the `dist` folder using a web server (nginx, Apache, etc.)

3. Configure API URL in production environment variables

### Database

- Use a managed MySQL service (AWS RDS, Google Cloud SQL, etc.) for production
- Ensure proper backup and security configurations
- Use connection pooling for better performance

## Troubleshooting

### Database Connection Issues

- Verify MySQL is running
- Check database credentials in `.env`
- Ensure database exists
- Check firewall settings

### CORS Errors

- Verify `CORS_ORIGIN` in backend `.env` matches frontend URL
- Check browser console for specific CORS errors

### Authentication Issues

- Verify JWT_SECRET is set
- Check token expiration settings
- Clear browser localStorage if needed

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License

## Support

For issues and questions, please open an issue on the repository.

