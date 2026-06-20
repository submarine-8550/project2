/**
 * Drive Routes
 * Public/Shared drive-related endpoints
 */

import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

/**
 * Get all active and approved drives (public)
 * GET /api/drives
 */
router.get('/', async (req, res, next) => {
  try {
    const { search, driveType, targetEmployeeType } = req.query;

    let sql = `SELECT d.*, c.name as company_name, c.email as company_email,
                      GROUP_CONCAT(drs.skill) as required_skills
               FROM drives d
               JOIN companies c ON d.company_id = c.id
               LEFT JOIN drive_required_skills drs ON d.id = drs.drive_id
               WHERE d.is_active = TRUE AND d.is_approved = TRUE`;
    const params = [];

    if (search) {
      sql += ' AND (d.job_role LIKE ? OR c.name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (driveType) {
      sql += ' AND d.drive_type = ?';
      params.push(driveType);
    }

    if (targetEmployeeType) {
      sql += ' AND d.target_employee_type = ?';
      params.push(targetEmployeeType);
    }

    sql += ' GROUP BY d.id ORDER BY d.deadline ASC';

    const drives = await query(sql, params);

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
 * Get a specific drive by ID
 * GET /api/drives/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const driveId = parseInt(req.params.id);

    const drives = await query(
      `SELECT d.*, c.name as company_name, c.email as company_email, c.website,
              GROUP_CONCAT(drs.skill) as required_skills
       FROM drives d
       JOIN companies c ON d.company_id = c.id
       LEFT JOIN drive_required_skills drs ON d.id = drs.drive_id
       WHERE d.id = ?
       GROUP BY d.id`,
      [driveId]
    );

    if (drives.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Drive not found'
      });
    }

    const drive = drives[0];
    res.json({
      success: true,
      drive: {
        ...drive,
        requiredSkills: drive.required_skills ? drive.required_skills.split(',') : [],
        rounds: JSON.parse(drive.rounds || '[]')
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;

