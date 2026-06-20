/**
 * Authentication Routes
 * Handles user registration and login for all roles
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, beginTransaction, commitTransaction, rollbackTransaction } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { validateLogin, validateStudentRegistration, validateCompanyRegistration } from '../utils/validation.js';

const router = express.Router();

async function fetchStudentProfile(userId) {
  const students = await query(
    `SELECT s.*,
            GROUP_CONCAT(DISTINCT ss.skill) as skills,
            GROUP_CONCAT(DISTINCT spjt.job_type) as preferred_job_types,
            GROUP_CONCAT(DISTINCT spl.location) as preferred_locations
     FROM students s
     LEFT JOIN student_skills ss ON s.id = ss.student_id
     LEFT JOIN student_preferred_job_types spjt ON s.id = spjt.student_id
     LEFT JOIN student_preferred_locations spl ON s.id = spl.student_id
     WHERE s.user_id = ?
     GROUP BY s.id`,
    [userId]
  );
  if (students.length === 0) return null;
  const s = students[0];
  return {
    ...s,
    skills: s.skills ? s.skills.split(',') : [],
    preferredJobTypes: s.preferred_job_types ? s.preferred_job_types.split(',') : [],
    preferredLocations: s.preferred_locations ? s.preferred_locations.split(',') : []
  };
}

/**
 * Register a new student
 * POST /api/auth/register/student
 */
router.post('/register/student', validateStudentRegistration, async (req, res, next) => {
  const connection = await beginTransaction();
  
  try {
    const {
      name,
      email,
      password,
      rollNumber,
      department,
      cgpa,
      domain,
      resumeLink,
      phone,
      graduationYear,
      internshipExperienceYears,
      skills,
      preferredJobTypes,
      preferredLocations
    } = req.body;

    // Check if user already exists
    const [existingUsers] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      await rollbackTransaction(connection);
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Check if roll number already exists
    const [existingStudents] = await connection.execute('SELECT id FROM students WHERE roll_number = ?', [rollNumber]);
    if (existingStudents.length > 0) {
      await rollbackTransaction(connection);
      return res.status(400).json({
        success: false,
        message: 'Student with this roll number already exists'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userResult = await connection.execute(
      'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
      [email, passwordHash, 'student']
    );
    const userId = userResult[0].insertId;

    // Create student record
    await connection.execute(
      `INSERT INTO students 
       (user_id, name, email, roll_number, department, cgpa, domain, resume_link, phone, graduation_year, internship_experience_years)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, email, rollNumber, department, cgpa, domain || null, resumeLink || null, phone || null, graduationYear, internshipExperienceYears || 0]
    );

    const studentResult = await connection.execute('SELECT id FROM students WHERE user_id = ?', [userId]);
    const studentId = studentResult[0][0].id;

    // Insert skills
    if (skills && skills.length > 0) {
      for (const skill of skills) {
        await connection.execute(
          'INSERT INTO student_skills (student_id, skill) VALUES (?, ?)',
          [studentId, skill]
        );
      }
    }

    // Insert preferred job types
    if (preferredJobTypes && preferredJobTypes.length > 0) {
      for (const jobType of preferredJobTypes) {
        await connection.execute(
          'INSERT INTO student_preferred_job_types (student_id, job_type) VALUES (?, ?)',
          [studentId, jobType]
        );
      }
    }

    // Insert preferred locations
    if (preferredLocations && preferredLocations.length > 0) {
      for (const location of preferredLocations) {
        await connection.execute(
          'INSERT INTO student_preferred_locations (student_id, location) VALUES (?, ?)',
          [studentId, location]
        );
      }
    }

    await commitTransaction(connection);

    // Generate JWT token
    const token = jwt.sign(
      { userId, role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      token,
      user: {
        id: userId,
        email,
        role: 'student'
      }
    });
  } catch (error) {
    await rollbackTransaction(connection);
    next(error);
  }
});

/**
 * Register a new company
 * POST /api/auth/register/company
 */
router.post('/register/company', validateCompanyRegistration, async (req, res, next) => {
  const connection = await beginTransaction();
  
  try {
    const {
      name,
      email,
      password,
      phone,
      website,
      address
    } = req.body;

    // Check if user already exists
    const [existingUsers] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      await rollbackTransaction(connection);
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userResult = await connection.execute(
      'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
      [email, passwordHash, 'company']
    );
    const userId = userResult[0].insertId;

    // Create company record (not approved by default)
    await connection.execute(
      `INSERT INTO companies (user_id, name, email, phone, website, address, is_approved)
       VALUES (?, ?, ?, ?, ?, ?, FALSE)`,
      [userId, name, email, phone || null, website || null, address || null]
    );

    await commitTransaction(connection);

    res.status(201).json({
      success: true,
      message: 'Company registered successfully. Waiting for admin approval.',
      user: {
        id: userId,
        email,
        role: 'company'
      }
    });
  } catch (error) {
    await rollbackTransaction(connection);
    next(error);
  }
});

/**
 * Login user (all roles)
 * POST /api/auth/login
 */
router.post('/login', validateLogin, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Get user from database
    const users = await query(
      'SELECT id, email, password_hash, role FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = users[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // For companies, check if approved
    if (user.role === 'company') {
      const companies = await query(
        'SELECT is_approved FROM companies WHERE user_id = ?',
        [user.id]
      );
      if (companies.length > 0 && !companies[0].is_approved) {
        return res.status(403).json({
          success: false,
          message: 'Company account is pending admin approval'
        });
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get current user info
 * GET /api/auth/me
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let userData = {};

    if (role === 'student') {
      userData = await fetchStudentProfile(userId) || {};
    } else if (role === 'company') {
      const companies = await query(
        'SELECT * FROM companies WHERE user_id = ?',
        [userId]
      );
      if (companies.length > 0) {
        userData = companies[0];
      }
    } else if (role === 'admin') {
      const admins = await query(
        'SELECT * FROM admins WHERE user_id = ?',
        [userId]
      );
      if (admins.length > 0) {
        userData = admins[0];
      }
    }

    res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        ...userData
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;

