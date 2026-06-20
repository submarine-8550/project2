/**
 * Admin Routes
 * Handles admin-specific operations
 */

import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import { query, beginTransaction, commitTransaction, rollbackTransaction } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import { parseRounds } from '../utils/helpers.js';
import { checkEligibility } from '../utils/eligibility.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);
router.use(authorize('admin'));

// Configure multer for CSV uploads
const upload = multer({ dest: 'uploads/' });

/**
 * Get dashboard statistics
 * GET /api/admin/stats
 */
router.get('/stats', async (req, res, next) => {
  try {
    const [
      totalStudents,
      totalCompanies,
      totalActiveApprovedDrives,
      pendingApprovals,
      totalRegistrations,
      placedStudents
    ] = await Promise.all([
      query('SELECT COUNT(*) as count FROM students'),
      query('SELECT COUNT(*) as count FROM companies'),
      query("SELECT COUNT(*) as count FROM drives WHERE status = 'approved' AND is_active = TRUE"),
      query('SELECT COUNT(*) as count FROM companies WHERE is_approved = FALSE'),
      query('SELECT COUNT(*) as count FROM drive_registrations'),
      query("SELECT COUNT(DISTINCT student_id) as count FROM drive_registrations WHERE status = 'selected'")
    ]);

    res.json({
      success: true,
      stats: {
        totalStudents: totalStudents[0].count,
        totalCompanies: totalCompanies[0].count,
        totalDrives: totalActiveApprovedDrives[0].count,
        pendingApprovals: pendingApprovals[0].count,
        totalRegistrations: totalRegistrations[0].count,
        placedStudents: placedStudents[0].count
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all companies (with approval status)
 * GET /api/admin/companies
 */
router.get('/companies', async (req, res, next) => {
  try {
    const { approved, search } = req.query;

    let sql = 'SELECT * FROM companies WHERE 1=1';
    const params = [];

    if (approved !== undefined) {
      sql += ' AND is_approved = ?';
      params.push(approved === 'true');
    }

    if (search) {
      sql += ' AND (name LIKE ? OR email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    sql += ' ORDER BY created_at DESC';

    const companies = await query(sql, params);

    res.json({
      success: true,
      companies
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Approve/reject a company
 * PUT /api/admin/companies/:companyId/approve
 */
router.put('/companies/:companyId/approve', async (req, res, next) => {
  try {
    const companyId = parseInt(req.params.companyId);
    const { approved } = req.body;

    await query(
      'UPDATE companies SET is_approved = ? WHERE id = ?',
      [approved === true, companyId]
    );

    res.json({
      success: true,
      message: `Company ${approved ? 'approved' : 'rejected'} successfully`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all drives (with approval status)
 * GET /api/admin/drives
 */
router.get('/drives', async (req, res, next) => {
  try {
    const { approved, status, search } = req.query;

    // FIX: Admin must see all drives including rejected
    let sql = `SELECT d.*, c.name as company_name, c.email as company_email,
                      GROUP_CONCAT(drs.skill) as required_skills
               FROM drives d
               JOIN companies c ON d.company_id = c.id
               LEFT JOIN drive_required_skills drs ON d.id = drs.drive_id
               WHERE 1=1`;
    const params = [];

    if (status) {
      sql += ' AND d.status = ?';
      params.push(status);
    } else if (approved !== undefined) {
      sql += ' AND d.status = ?';
      params.push(approved === 'true' ? 'approved' : 'pending');
    }

    if (search) {
      sql += ' AND (d.job_role LIKE ? OR c.name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    sql += ' GROUP BY d.id ORDER BY d.created_at DESC';

    const drives = await query(sql, params);

    const formattedDrives = drives.map(drive => ({
      ...drive,
      requiredSkills: drive.required_skills ? drive.required_skills.split(',') : [],
      rounds: parseRounds(drive.rounds)
    }));

    res.json({
      success: true,
      drives: formattedDrives
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Approve/reject a drive
 * PUT /api/admin/drives/:driveId/approve
 */
router.put('/drives/:driveId/approve', async (req, res, next) => {
  try {
    const driveId = parseInt(req.params.driveId);
    const { approved, rejectionReason } = req.body;
    const status = approved === true ? 'approved' : 'rejected';
    const adminUserId = req.user.id;

    const updateFields = ['status = ?'];
    const params = [status];

    if (status === 'approved') {
      updateFields.push('rejection_reason = NULL');
      updateFields.push('approved_by_admin_id = ?');
      updateFields.push('approved_at = NOW()');
      params.push(adminUserId);
    } else {
      updateFields.push('rejection_reason = ?');
      updateFields.push('approved_by_admin_id = NULL');
      updateFields.push('approved_at = NULL');
      params.push(rejectionReason || null);
    }

    params.push(driveId);

    await query(
      `UPDATE drives SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );

    res.json({
      success: true,
      message: `Drive ${status} successfully`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all students with filtering and sorting
 * GET /api/admin/students
 */
router.get('/students', async (req, res, next) => {
  try {
    const {
      department,
      domain,
      minCgpa,
      maxCgpa,
      skill,
      graduationYear,
      sortBy,
      sortOrder
    } = req.query;

    let sql = `SELECT s.*, 
                      GROUP_CONCAT(DISTINCT ss.skill) as skills,
                      GROUP_CONCAT(DISTINCT spjt.job_type) as preferred_job_types,
                      GROUP_CONCAT(DISTINCT spl.location) as preferred_locations
               FROM students s
               LEFT JOIN student_skills ss ON s.id = ss.student_id
               LEFT JOIN student_preferred_job_types spjt ON s.id = spjt.student_id
               LEFT JOIN student_preferred_locations spl ON s.id = spl.student_id
               WHERE 1=1`;
    const params = [];

    if (department) {
      sql += ' AND s.department = ?';
      params.push(department);
    }

    if (domain) {
      sql += ' AND s.domain = ?';
      params.push(domain);
    }

    if (minCgpa) {
      sql += ' AND s.cgpa >= ?';
      params.push(parseFloat(minCgpa));
    }

    if (maxCgpa) {
      sql += ' AND s.cgpa <= ?';
      params.push(parseFloat(maxCgpa));
    }

    if (graduationYear) {
      sql += ' AND s.graduation_year = ?';
      params.push(parseInt(graduationYear));
    }

    sql += ' GROUP BY s.id';

    if (skill) {
      sql += ' HAVING FIND_IN_SET(?, skills)';
      params.push(skill);
    }

    const validSortBy = ['name', 'cgpa', 'department', 'graduation_year'];
    const sortField = validSortBy.includes(sortBy) ? sortBy : 's.name';
    const sortDir = sortOrder === 'desc' ? 'DESC' : 'ASC';
    sql += ` ORDER BY ${sortField} ${sortDir}`;

    const students = await query(sql, params);

    const formattedStudents = students.map(student => ({
      ...student,
      skills: student.skills ? student.skills.split(',') : [],
      preferredJobTypes: student.preferred_job_types ? student.preferred_job_types.split(',') : [],
      preferredLocations: student.preferred_locations ? student.preferred_locations.split(',') : []
    }));

    res.json({
      success: true,
      students: formattedStudents
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Upload students via CSV
 * POST /api/admin/students/upload
 */
router.post('/students/upload', upload.single('csv'), async (req, res, next) => {
  const connection = await beginTransaction();
  
  try {
    if (!req.file) {
      await rollbackTransaction(connection);
      return res.status(400).json({
        success: false,
        message: 'CSV file is required'
      });
    }

    const students = [];
    const errors = [];

    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => {
          students.push(row);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    for (let i = 0; i < students.length; i++) {
      const row = students[i];
      try {
        if (!row.email || !row.name || !row.roll_number || !row.department || !row.cgpa) {
          errors.push(`Row ${i + 2}: Missing required fields`);
          continue;
        }

        const existingUsers = await connection.execute(
          'SELECT id FROM users WHERE email = ?',
          [row.email]
        );
        if (existingUsers[0].length > 0) {
          errors.push(`Row ${i + 2}: Email ${row.email} already exists`);
          continue;
        }

        const existingStudents = await connection.execute(
          'SELECT id FROM students WHERE roll_number = ?',
          [row.roll_number]
        );
        if (existingStudents[0].length > 0) {
          errors.push(`Row ${i + 2}: Roll number ${row.roll_number} already exists`);
          continue;
        }

        const defaultPassword = row.roll_number + '@123';
        const passwordHash = await bcrypt.hash(defaultPassword, 10);

        const userResult = await connection.execute(
          'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
          [row.email, passwordHash, 'student']
        );
        const userId = userResult[0].insertId;

        const studentResult = await connection.execute(
          `INSERT INTO students 
           (user_id, name, email, roll_number, department, cgpa, domain, 
            resume_link, phone, graduation_year, internship_experience_years)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            row.name,
            row.email,
            row.roll_number,
            row.department,
            parseFloat(row.cgpa) || 0,
            row.domain || null,
            row.resume_link || null,
            row.phone || null,
            parseInt(row.graduation_year) || new Date().getFullYear(),
            parseFloat(row.internship_experience_years) || 0
          ]
        );
        const studentId = studentResult[0].insertId;

        if (row.skills) {
          const skills = row.skills.split(',').map(s => s.trim()).filter(s => s);
          for (const skill of skills) {
            await connection.execute(
              'INSERT INTO student_skills (student_id, skill) VALUES (?, ?)',
              [studentId, skill]
            );
          }
        }

        if (row.preferred_job_types) {
          const jobTypes = row.preferred_job_types.split(',').map(j => j.trim()).filter(j => j);
          for (const jobType of jobTypes) {
            if (['FT', 'Intern'].includes(jobType)) {
              await connection.execute(
                'INSERT INTO student_preferred_job_types (student_id, job_type) VALUES (?, ?)',
                [studentId, jobType]
              );
            }
          }
        }

        if (row.preferred_locations) {
          const locations = row.preferred_locations.split(',').map(l => l.trim()).filter(l => l);
          for (const location of locations) {
            await connection.execute(
              'INSERT INTO student_preferred_locations (student_id, location) VALUES (?, ?)',
              [studentId, location]
            );
          }
        }
      } catch (error) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    fs.unlinkSync(req.file.path);

    if (errors.length > 0 && students.length === errors.length) {
      await rollbackTransaction(connection);
      return res.status(400).json({
        success: false,
        message: 'All rows failed to import',
        errors
      });
    }

    await commitTransaction(connection);

    res.json({
      success: true,
      message: `Successfully imported ${students.length - errors.length} students`,
      imported: students.length - errors.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    await rollbackTransaction(connection);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

/**
 * Assign students to a drive
 * POST /api/admin/drives/:driveId/assign-students
 */
router.post('/drives/:driveId/assign-students', async (req, res, next) => {
  const connection = await beginTransaction();
  
  try {
    const driveId = parseInt(req.params.driveId);
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      await rollbackTransaction(connection);
      return res.status(400).json({
        success: false,
        message: 'Student IDs array is required'
      });
    }

    const drives = await query('SELECT id FROM drives WHERE id = ?', [driveId]);
    if (drives.length === 0) {
      await rollbackTransaction(connection);
      return res.status(404).json({
        success: false,
        message: 'Drive not found'
      });
    }


    let assigned = 0;
    const errors = [];

    for (const studentId of studentIds) {
      try {
        const existing = await connection.execute(
          'SELECT id FROM drive_registrations WHERE drive_id = ? AND student_id = ?',
          [driveId, studentId]
        );
        if (existing[0].length > 0) {
          errors.push(`Student ${studentId} already registered`);
          continue;
        }

        const eligibility = await checkEligibility(studentId, driveId);
        if (!eligibility.eligible) {
          errors.push(`Student ${studentId}: ${eligibility.reason}`);
          continue;
        }

        await connection.execute(
          `INSERT INTO drive_registrations (drive_id, student_id, qualified_rounds, status)
           VALUES (?, ?, ?, 'applied')`,
          [driveId, studentId, JSON.stringify(eligibility.qualifiedRounds)]
        );
        assigned++;
      } catch (error) {
        errors.push(`Student ${studentId}: ${error.message}`);
      }
    }

    await commitTransaction(connection);

    res.json({
      success: true,
      message: `Assigned ${assigned} students to drive`,
      assigned,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    await rollbackTransaction(connection);
    next(error);
  }
});

/**
 * Get batch-wise company placement data
 * GET /api/admin/batch/:year
 * Returns: stats, upcoming drives, recently visited companies, once-in-3yr companies
 */
router.get('/batch/:year', async (req, res, next) => {
  try {
    const batchYear = parseInt(req.params.year);
    if (isNaN(batchYear) || batchYear < 2000 || batchYear > 2100) {
      return res.status(400).json({ success: false, message: 'Invalid batch year' });
    }

    // --- Stats for this batch ---
    const [totalStudents, placedStudents, totalOffers] = await Promise.all([
      query('SELECT COUNT(*) as count FROM students WHERE graduation_year = ?', [batchYear]),
      query(
        `SELECT COUNT(DISTINCT dr.student_id) as count
         FROM drive_registrations dr
         JOIN students s ON dr.student_id = s.id
         WHERE dr.status = 'selected' AND s.graduation_year = ?`,
        [batchYear]
      ),
      query(
        `SELECT COUNT(*) as count
         FROM drive_registrations dr
         JOIN students s ON dr.student_id = s.id
         WHERE dr.status = 'selected' AND s.graduation_year = ?`,
        [batchYear]
      )
    ]);

    // --- Bucket 1: Upcoming drives (deadline in future, approved, targeting this batch) ---
    const upcomingDrives = await query(
      `SELECT d.id, d.job_role, d.deadline, d.package_amount, d.package_currency,
              d.status, d.target_graduation_year,
              c.id as company_id, c.name as company_name, c.email as company_email
       FROM drives d
       JOIN companies c ON d.company_id = c.id
       WHERE d.deadline >= CURDATE()
         AND d.status IN ('approved', 'pending')
         AND (d.target_graduation_year = ? OR d.target_graduation_year IS NULL)
       ORDER BY d.deadline ASC`,
      [batchYear]
    );

    // --- Bucket 2: Recently visited (completed drives in last 12 months for this batch) ---
    const recentlyVisited = await query(
      `SELECT c.id as company_id, c.name as company_name, c.email as company_email,
              MAX(d.deadline) as last_visit_date,
              COUNT(DISTINCT d.id) as drive_count,
              COUNT(DISTINCT CASE WHEN dr.status = 'selected' THEN dr.student_id END) as selected_count
       FROM drives d
       JOIN companies c ON d.company_id = c.id
       LEFT JOIN drive_registrations dr ON d.id = dr.drive_id
       WHERE d.deadline < CURDATE()
         AND d.deadline >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
         AND d.status = 'approved'
         AND (d.target_graduation_year = ? OR d.target_graduation_year IS NULL)
       GROUP BY c.id, c.name, c.email
       ORDER BY last_visit_date DESC`,
      [batchYear]
    );

    // --- Bucket 3: Visited exactly once in last 3 years, never returned ---
    const visitedOnce = await query(
      `SELECT c.id as company_id, c.name as company_name, c.email as company_email,
              MAX(d.deadline) as last_visit_date,
              COUNT(DISTINCT d.id) as total_drives
       FROM drives d
       JOIN companies c ON d.company_id = c.id
       WHERE d.deadline >= DATE_SUB(CURDATE(), INTERVAL 3 YEAR)
         AND d.status = 'approved'
       GROUP BY c.id, c.name, c.email
       HAVING COUNT(DISTINCT d.id) = 1
          AND MAX(d.deadline) < CURDATE()
       ORDER BY last_visit_date DESC`,
      []
    );

    // --- All available batch years (for the year picker) ---
    const batchYears = await query(
      `SELECT DISTINCT graduation_year
       FROM students
       ORDER BY graduation_year DESC`,
      []
    );

    res.json({
      success: true,
      batchYear,
      stats: {
        totalStudents: totalStudents[0].count,
        placedStudents: placedStudents[0].count,
        totalCompaniesVisited: recentlyVisited.length,
        totalOffers: totalOffers[0].count
      },
      upcoming: upcomingDrives,
      recentlyVisited,
      visitedOnce,
      availableBatchYears: batchYears.map(r => r.graduation_year)
    });
  } catch (error) {
    next(error);
  }
});

export default router;
