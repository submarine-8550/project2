/**
 * Company Routes
 * Handles company-specific operations
 */

import express from 'express';
import { query, beginTransaction, commitTransaction, rollbackTransaction } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { getEligibleStudents } from '../utils/eligibility.js';
import { validateDriveCreation } from '../utils/validation.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * Get company profile
 * GET /api/companies/profile
 */
router.get('/profile', authorize('company'), async (req, res, next) => {
  try {
    const userId = req.user.id;

    const companies = await query(
      'SELECT * FROM companies WHERE user_id = ?',
      [userId]
    );

    if (companies.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Company profile not found'
      });
    }

    res.json({
      success: true,
      company: companies[0]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update company profile
 * PUT /api/companies/profile
 */
router.put('/profile', authorize('company'), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, phone, website, address } = req.body;

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
    if (website !== undefined) {
      updateFields.push('website = ?');
      updateValues.push(website);
    }
    if (address !== undefined) {
      updateFields.push('address = ?');
      updateValues.push(address);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updateValues.push(userId);
    await query(
      `UPDATE companies SET ${updateFields.join(', ')} WHERE user_id = ?`,
      updateValues
    );

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get company's drives
 * GET /api/companies/my-drives
 */
router.get('/my-drives', authorize('company'), async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get company ID
    const companies = await query('SELECT id FROM companies WHERE user_id = ?', [userId]);
    if (companies.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }
    const companyId = companies[0].id;

    const drives = await query(
      `SELECT d.*, 
              GROUP_CONCAT(drs.skill) as required_skills,
              COUNT(DISTINCT dr.id) as registered_count
       FROM drives d
       LEFT JOIN drive_required_skills drs ON d.id = drs.drive_id
       LEFT JOIN drive_registrations dr ON d.id = dr.drive_id
       WHERE d.company_id = ?
       GROUP BY d.id
       ORDER BY d.created_at DESC`,
      [companyId]
    );

    const formattedDrives = drives.map(drive => ({
      ...drive,
      requiredSkills: drive.required_skills ? drive.required_skills.split(',') : [],
      rounds: JSON.parse(drive.rounds || '[]')
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
 * Create a new drive
 * POST /api/companies/drives
 */
router.post('/drives', authorize('company'), validateDriveCreation, async (req, res, next) => {
  const connection = await beginTransaction();
  
  try {
    const userId = req.user.id;
    const {
      jobRole,
      minCgpa,
      packageAmount,
      packageCurrency,
      deadline,
      openingsCount,
      driveType,
      targetEmployeeType,
      rounds,
      requiredSkills
    } = req.body;

    // Get company ID
    const companies = await query('SELECT id FROM companies WHERE user_id = ?', [userId]);
    if (companies.length === 0) {
      await rollbackTransaction(connection);
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }
    const companyId = companies[0].id;

    // Create drive (not approved by default)
    const driveResult = await connection.execute(
      `INSERT INTO drives 
       (company_id, job_role, min_cgpa, package_amount, package_currency, deadline, 
        openings_count, drive_type, target_employee_type, rounds, is_approved)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)`,
      [
        companyId,
        jobRole,
        minCgpa,
        packageAmount || null,
        packageCurrency || 'LPA',
        deadline,
        openingsCount,
        driveType,
        targetEmployeeType,
        JSON.stringify(rounds)
      ]
    );

    const driveId = driveResult[0].insertId;

    // Insert required skills
    if (requiredSkills && requiredSkills.length > 0) {
      for (const skill of requiredSkills) {
        await connection.execute(
          'INSERT INTO drive_required_skills (drive_id, skill) VALUES (?, ?)',
          [driveId, skill]
        );
      }
    }

    await commitTransaction(connection);

    res.status(201).json({
      success: true,
      message: 'Drive created successfully. Waiting for admin approval.',
      driveId
    });
  } catch (error) {
    await rollbackTransaction(connection);
    next(error);
  }
});

/**
 * Get eligible students for a drive
 * GET /api/companies/drives/:driveId/eligible-students
 */
router.get('/drives/:driveId/eligible-students', authorize('company'), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const driveId = parseInt(req.params.driveId);

    // Verify drive belongs to company
    const companies = await query('SELECT id FROM companies WHERE user_id = ?', [userId]);
    if (companies.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }
    const companyId = companies[0].id;

    const drives = await query(
      'SELECT id FROM drives WHERE id = ? AND company_id = ?',
      [driveId, companyId]
    );
    if (drives.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Drive not found or access denied'
      });
    }

    // Get eligible students
    const eligibleStudents = await getEligibleStudents(driveId);

    // Get registration status for each student
    const studentsWithStatus = await Promise.all(
      eligibleStudents.map(async (student) => {
        const registrations = await query(
          `SELECT dr.*, ir.round_name, ir.status as round_status, ir.scheduled_at
           FROM drive_registrations dr
           LEFT JOIN interview_rounds ir ON dr.drive_id = ir.drive_id AND dr.student_id = ir.student_id
           WHERE dr.drive_id = ? AND dr.student_id = ?
           ORDER BY ir.scheduled_at DESC`,
          [driveId, student.id]
        );

        return {
          ...student,
          skills: student.skills ? student.skills.split(',') : [],
          registered: registrations.length > 0,
          registrationStatus: registrations.length > 0 ? registrations[0].status : null,
          interviewRounds: registrations.filter(r => r.round_name).map(r => ({
            roundName: r.round_name,
            status: r.round_status,
            scheduledAt: r.scheduled_at
          }))
        };
      })
    );

    res.json({
      success: true,
      students: studentsWithStatus
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Shortlist a student for a drive
 * PUT /api/companies/drives/:driveId/students/:studentId/shortlist
 */
router.put('/drives/:driveId/students/:studentId/shortlist', authorize('company'), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const driveId = parseInt(req.params.driveId);
    const studentId = parseInt(req.params.studentId);

    // Verify drive belongs to company
    const companies = await query('SELECT id FROM companies WHERE user_id = ?', [userId]);
    if (companies.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }
    const companyId = companies[0].id;

    const drives = await query(
      'SELECT id FROM drives WHERE id = ? AND company_id = ?',
      [driveId, companyId]
    );
    if (drives.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Drive not found or access denied'
      });
    }

    // Update registration status
    await query(
      'UPDATE drive_registrations SET status = ? WHERE drive_id = ? AND student_id = ?',
      ['shortlisted', driveId, studentId]
    );

    res.json({
      success: true,
      message: 'Student shortlisted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Schedule an interview round
 * POST /api/companies/drives/:driveId/students/:studentId/interview
 */
router.post('/drives/:driveId/students/:studentId/interview', authorize('company'), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const driveId = parseInt(req.params.driveId);
    const studentId = parseInt(req.params.studentId);
    const { roundName, roundType, scheduledAt, conductedBy } = req.body;

    // Verify drive belongs to company
    const companies = await query('SELECT id FROM companies WHERE user_id = ?', [userId]);
    if (companies.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }
    const companyId = companies[0].id;

    const drives = await query(
      'SELECT id FROM drives WHERE id = ? AND company_id = ?',
      [driveId, companyId]
    );
    if (drives.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Drive not found or access denied'
      });
    }

    // Create interview round
    await query(
      `INSERT INTO interview_rounds 
       (drive_id, student_id, round_name, round_type, scheduled_at, conducted_by, status)
       VALUES (?, ?, ?, ?, ?, ?, 'scheduled')`,
      [driveId, studentId, roundName, roundType, scheduledAt, conductedBy || null]
    );

    res.status(201).json({
      success: true,
      message: 'Interview scheduled successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update interview round result
 * PUT /api/companies/drives/:driveId/students/:studentId/interview/:roundId
 */
router.put('/drives/:driveId/students/:studentId/interview/:roundId', authorize('company'), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const roundId = parseInt(req.params.roundId);
    const { status, feedback } = req.body;

    // Verify drive belongs to company
    const companies = await query('SELECT id FROM companies WHERE user_id = ?', [userId]);
    if (companies.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }
    const companyId = companies[0].id;

    const rounds = await query(
      `SELECT ir.* FROM interview_rounds ir
       JOIN drives d ON ir.drive_id = d.id
       WHERE ir.id = ? AND d.company_id = ?`,
      [roundId, companyId]
    );
    if (rounds.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Interview round not found or access denied'
      });
    }

    // Update round
    const updateFields = [];
    const updateValues = [];

    if (status) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }
    if (feedback !== undefined) {
      updateFields.push('feedback = ?');
      updateValues.push(feedback);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updateValues.push(roundId);
    await query(
      `UPDATE interview_rounds SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // If student passed all rounds, update registration status to selected
    if (status === 'passed') {
      const allRounds = await query(
        `SELECT COUNT(*) as total, 
                SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passed
         FROM interview_rounds
         WHERE drive_id = ? AND student_id = ?`,
        [rounds[0].drive_id, rounds[0].student_id]
      );

      const driveRounds = await query(
        'SELECT rounds FROM drives WHERE id = ?',
        [rounds[0].drive_id]
      );

      if (driveRounds.length > 0) {
        const requiredRounds = JSON.parse(driveRounds[0].rounds);
        if (allRounds[0].passed >= requiredRounds.length) {
          await query(
            'UPDATE drive_registrations SET status = ? WHERE drive_id = ? AND student_id = ?',
            ['selected', rounds[0].drive_id, rounds[0].student_id]
          );
        }
      }
    }

    res.json({
      success: true,
      message: 'Interview round updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;

