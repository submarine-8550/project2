/**
 * Student Routes
 * Handles student-specific operations
 */

import express from 'express';
import { query, beginTransaction, commitTransaction, rollbackTransaction } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { checkEligibility } from '../utils/eligibility.js';
import { parseRounds } from '../utils/helpers.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * Get student profile
 * GET /api/students/profile
 */
router.get('/profile', authorize('student'), async (req, res, next) => {
  try {
    const userId = req.user.id;

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

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const student = students[0];
    res.json({
      success: true,
      student: {
        ...student,
        skills: student.skills ? student.skills.split(',') : [],
        preferredJobTypes: student.preferred_job_types ? student.preferred_job_types.split(',') : [],
        preferredLocations: student.preferred_locations ? student.preferred_locations.split(',') : []
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update student profile
 * PUT /api/students/profile
 */
router.put('/profile', authorize('student'), async (req, res, next) => {
  const connection = await beginTransaction();
  
  try {
    const userId = req.user.id;
    const {
      name,
      phone,
      resumeLink,
      skills,
      preferredJobTypes,
      preferredLocations,
      domain,
      cgpa
    } = req.body;

    // Get student ID
    const students = await query('SELECT id FROM students WHERE user_id = ?', [userId]);
    if (students.length === 0) {
      await rollbackTransaction(connection);
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    const studentId = students[0].id;

    // Update student basic info
    const updateFields = [];
    const updateValues = [];

    if (name) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (phone !== undefined) {
      updateFields.push('phone = ?');
      updateValues.push(phone);
    }
    if (resumeLink !== undefined) {
      updateFields.push('resume_link = ?');
      updateValues.push(resumeLink);
    }
    if (domain !== undefined) {
      updateFields.push('domain = ?');
      updateValues.push(domain);
    }
    if (cgpa !== undefined) {
      updateFields.push('cgpa = ?');
      updateValues.push(cgpa);
    }

    if (updateFields.length > 0) {
      updateValues.push(studentId);
      await connection.execute(
        `UPDATE students SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    }

    // Update skills
    if (skills && Array.isArray(skills)) {
      await connection.execute('DELETE FROM student_skills WHERE student_id = ?', [studentId]);
      for (const skill of skills) {
        await connection.execute(
          'INSERT INTO student_skills (student_id, skill) VALUES (?, ?)',
          [studentId, skill]
        );
      }
    }

    // Update preferred job types
    if (preferredJobTypes && Array.isArray(preferredJobTypes)) {
      await connection.execute('DELETE FROM student_preferred_job_types WHERE student_id = ?', [studentId]);
      for (const jobType of preferredJobTypes) {
        await connection.execute(
          'INSERT INTO student_preferred_job_types (student_id, job_type) VALUES (?, ?)',
          [studentId, jobType]
        );
      }
    }

    // Update preferred locations
    if (preferredLocations && Array.isArray(preferredLocations)) {
      await connection.execute('DELETE FROM student_preferred_locations WHERE student_id = ?', [studentId]);
      for (const location of preferredLocations) {
        await connection.execute(
          'INSERT INTO student_preferred_locations (student_id, location) VALUES (?, ?)',
          [studentId, location]
        );
      }
    }

    await commitTransaction(connection);

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    await rollbackTransaction(connection);
    next(error);
  }
});

/**
 * Get eligible drives for student
 * GET /api/students/eligible-drives
 */
router.get('/eligible-drives', authorize('student'), async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get student ID
    const students = await query('SELECT id FROM students WHERE user_id = ?', [userId]);
    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    const studentId = students[0].id;

    // Get all active and approved drives
    const drives = await query(
      `SELECT d.*, c.name as company_name, c.email as company_email,
              GROUP_CONCAT(drs.skill) as required_skills
       FROM drives d
       JOIN companies c ON d.company_id = c.id
       LEFT JOIN drive_required_skills drs ON d.id = drs.drive_id
       WHERE d.is_active = TRUE AND d.status = 'approved'
       GROUP BY d.id
       ORDER BY d.deadline ASC`,
      []
    );

    // Check eligibility for each drive
    const eligibleDrives = [];
    for (const drive of drives) {
      const eligibility = await checkEligibility(studentId, drive.id);
      if (eligibility.eligible) {
        // Check if already registered
        const registrations = await query(
          'SELECT * FROM drive_registrations WHERE drive_id = ? AND student_id = ?',
          [drive.id, studentId]
        );

        eligibleDrives.push({
          ...drive,
          requiredSkills: drive.required_skills ? drive.required_skills.split(',') : [],
          rounds: parseRounds(drive.rounds),
          eligible: true,
          qualifiedRounds: eligibility.qualifiedRounds,
          alreadyRegistered: registrations.length > 0,
          registrationStatus: registrations.length > 0 ? registrations[0].status : null
        });
      }
    }

    res.json({
      success: true,
      drives: eligibleDrives
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Register for a drive
 * POST /api/students/register-drive/:driveId
 */
router.post('/register-drive/:driveId', authorize('student'), async (req, res, next) => {
  const connection = await beginTransaction();
  
  try {
    const userId = req.user.id;
    const driveId = parseInt(req.params.driveId);
    const { registrationData } = req.body;

    // Get student ID
    const students = await query('SELECT id FROM students WHERE user_id = ?', [userId]);
    if (students.length === 0) {
      await rollbackTransaction(connection);
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    const studentId = students[0].id;

    // Check eligibility
    const eligibility = await checkEligibility(studentId, driveId);
    if (!eligibility.eligible) {
      await rollbackTransaction(connection);
      return res.status(400).json({
        success: false,
        message: eligibility.reason || 'Not eligible for this drive'
      });
    }

    // Check if already registered
    const existing = await query(
      'SELECT id FROM drive_registrations WHERE drive_id = ? AND student_id = ?',
      [driveId, studentId]
    );
    if (existing.length > 0) {
      await rollbackTransaction(connection);
      return res.status(400).json({
        success: false,
        message: 'Already registered for this drive'
      });
    }

    // Register student
    await connection.execute(
      `INSERT INTO drive_registrations (drive_id, student_id, qualified_rounds, registration_data, status)
       VALUES (?, ?, ?, ?, 'applied')`,
      [driveId, studentId, JSON.stringify(eligibility.qualifiedRounds), JSON.stringify(registrationData || {})]
    );

    await commitTransaction(connection);

    res.status(201).json({
      success: true,
      message: 'Successfully registered for drive',
      qualifiedRounds: eligibility.qualifiedRounds
    });
  } catch (error) {
    await rollbackTransaction(connection);
    next(error);
  }
});

/**
 * Get student's drive registrations
 * GET /api/students/my-registrations
 */
router.get('/my-registrations', authorize('student'), async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get student ID
    const students = await query('SELECT id FROM students WHERE user_id = ?', [userId]);
    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    const studentId = students[0].id;

    const registrations = await query(
      `SELECT dr.*, d.job_role, d.deadline, d.package_amount, d.package_currency,
              c.name as company_name
       FROM drive_registrations dr
       JOIN drives d ON dr.drive_id = d.id
       JOIN companies c ON d.company_id = c.id
       WHERE dr.student_id = ?
       ORDER BY dr.applied_at DESC`,
      [studentId]
    );

    const formattedRegistrations = registrations.map(reg => ({
      ...reg,
      qualifiedRounds: parseRounds(reg.qualified_rounds),
      registrationData: JSON.parse(reg.registration_data || '{}')
    }));

    res.json({
      success: true,
      registrations: formattedRegistrations
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get batch placement view for the logged-in student's batch
 * GET /api/students/batch-placement
 */
router.get('/batch-placement', authorize('student'), async (req, res, next) => {
  try {
    const userId = req.user.id;

    const students = await query(
      'SELECT id, graduation_year FROM students WHERE user_id = ?',
      [userId]
    );
    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const { id: studentId, graduation_year: batchYear } = students[0];

    // Stats for this student's batch
    const [totalStudents, placedStudents] = await Promise.all([
      query('SELECT COUNT(*) as count FROM students WHERE graduation_year = ?', [batchYear]),
      query(
        `SELECT COUNT(DISTINCT dr.student_id) as count
         FROM drive_registrations dr
         JOIN students s ON dr.student_id = s.id
         WHERE dr.status = 'selected' AND s.graduation_year = ?`,
        [batchYear]
      )
    ]);

    // Upcoming drives eligible for this student's batch
    const upcomingDrives = await query(
      `SELECT d.id, d.job_role, d.deadline, d.package_amount, d.package_currency,
              d.min_cgpa, d.target_graduation_year,
              c.id as company_id, c.name as company_name,
              GROUP_CONCAT(drs.skill) as required_skills
       FROM drives d
       JOIN companies c ON d.company_id = c.id
       LEFT JOIN drive_required_skills drs ON d.id = drs.drive_id
       WHERE d.deadline >= CURDATE()
         AND d.status = 'approved'
         AND d.is_active = TRUE
         AND (d.target_graduation_year = ? OR d.target_graduation_year IS NULL)
       GROUP BY d.id, c.id, c.name
       ORDER BY d.deadline ASC`,
      [batchYear]
    );

    // Recently visited companies (last 12 months)
    const recentlyVisited = await query(
      `SELECT c.id as company_id, c.name as company_name,
              MAX(d.deadline) as last_visit_date,
              COUNT(DISTINCT CASE WHEN dr.status = 'selected' THEN dr.student_id END) as selected_count
       FROM drives d
       JOIN companies c ON d.company_id = c.id
       LEFT JOIN drive_registrations dr ON d.id = dr.drive_id
       WHERE d.deadline < CURDATE()
         AND d.deadline >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
         AND d.status = 'approved'
         AND (d.target_graduation_year = ? OR d.target_graduation_year IS NULL)
       GROUP BY c.id, c.name
       ORDER BY last_visit_date DESC`,
      [batchYear]
    );

    res.json({
      success: true,
      batchYear,
      stats: {
        totalStudents: totalStudents[0].count,
        placedStudents: placedStudents[0].count,
        placementPercentage: totalStudents[0].count > 0
          ? Math.round((placedStudents[0].count / totalStudents[0].count) * 100)
          : 0
      },
      upcoming: upcomingDrives.map(d => ({
        ...d,
        requiredSkills: d.required_skills ? d.required_skills.split(',') : []
      })),
      recentlyVisited
    });
  } catch (error) {
    next(error);
  }
});

export default router;

