/**
 * Eligibility Engine
 * Matches students to company drives based on CGPA and required skills
 */

import { query } from '../config/database.js';
import { parseRounds } from './helpers.js';

/**
 * Check if a student is eligible for a drive
 * @param {number} studentId - Student ID
 * @param {number} driveId - Drive ID
 * @returns {Promise<Object>} Eligibility result with qualified rounds
 */
export const checkEligibility = async (studentId, driveId) => {
  try {
    // Get drive requirements
    const drives = await query(
      `SELECT min_cgpa, rounds, target_employee_type 
       FROM drives 
       WHERE id = ? AND is_active = TRUE AND status = 'approved'`,
      [driveId]
    );

    if (drives.length === 0) {
      return {
        eligible: false,
        reason: 'Drive not found or not active'
      };
    }

    const drive = drives[0];
    const rounds = parseRounds(drive.rounds);

    // Get student details
    const students = await query(
      `SELECT s.cgpa, s.graduation_year, s.internship_experience_years,
              GROUP_CONCAT(ss.skill) as skills
       FROM students s
       LEFT JOIN student_skills ss ON s.id = ss.student_id
       WHERE s.id = ?
       GROUP BY s.id`,
      [studentId]
    );

    if (students.length === 0) {
      return {
        eligible: false,
        reason: 'Student not found'
      };
    }

    const student = students[0];
    const studentSkills = student.skills ? student.skills.split(',') : [];

    // Check CGPA requirement
    if (parseFloat(student.cgpa) < parseFloat(drive.min_cgpa)) {
      return {
        eligible: false,
        reason: `CGPA requirement not met. Required: ${drive.min_cgpa}, Student: ${student.cgpa}`
      };
    }

    // Get required skills for the drive
    const requiredSkills = await query(
      'SELECT skill FROM drive_required_skills WHERE drive_id = ?',
      [driveId]
    );

    const requiredSkillNames = requiredSkills.map(rs => rs.skill.toLowerCase());

    // Check if student has at least one required skill
    const hasRequiredSkill = requiredSkillNames.length === 0 || 
      studentSkills.some(skill => requiredSkillNames.includes(skill.toLowerCase()));

    if (!hasRequiredSkill && requiredSkillNames.length > 0) {
      return {
        eligible: false,
        reason: 'Required skills not met',
        requiredSkills: requiredSkillNames,
        studentSkills: studentSkills
      };
    }

    // Determine which rounds the student qualifies for
    // All students who meet basic requirements qualify for aptitude
    // Technical round requires matching skills
    // HR round is for all who pass previous rounds
    const qualifiedRounds = [];

    if (rounds.includes('aptitude')) {
      qualifiedRounds.push('aptitude');
    }

    if (rounds.includes('technical') && hasRequiredSkill) {
      qualifiedRounds.push('technical');
    }

    if (rounds.includes('HR') && qualifiedRounds.length > 0) {
      qualifiedRounds.push('HR');
    }

    return {
      eligible: true,
      qualifiedRounds: qualifiedRounds,
      studentCgpa: student.cgpa,
      studentSkills: studentSkills,
      requiredSkills: requiredSkillNames
    };
  } catch (error) {
    console.error('Eligibility check error:', error);
    throw error;
  }
};

/**
 * Get all eligible students for a drive
 * @param {number} driveId - Drive ID
 * @returns {Promise<Array>} List of eligible students
 */
export const getEligibleStudents = async (driveId) => {
  try {
    // Get drive requirements
    const drives = await query(
      `SELECT min_cgpa, rounds, target_employee_type 
       FROM drives 
       WHERE id = ? AND is_active = TRUE AND status = 'approved'`,
      [driveId]
    );

    if (drives.length === 0) {
      return [];
    }

    const drive = drives[0];
    const minCgpa = parseFloat(drive.min_cgpa);

    // Get required skills
    const requiredSkills = await query(
      'SELECT skill FROM drive_required_skills WHERE drive_id = ?',
      [driveId]
    );

    const requiredSkillNames = requiredSkills.map(rs => rs.skill.toLowerCase());

    // Get all students with CGPA >= min_cgpa
    const students = await query(
      `SELECT s.id, s.name, s.email, s.roll_number, s.department, 
              s.cgpa, s.domain, s.graduation_year,
              GROUP_CONCAT(DISTINCT ss.skill) as skills
       FROM students s
       LEFT JOIN student_skills ss ON s.id = ss.student_id
       WHERE s.cgpa >= ?
       GROUP BY s.id
       ORDER BY s.cgpa DESC, s.name ASC`,
      [minCgpa]
    );

    // Filter students by skills if required
    const eligibleStudents = students.filter(student => {
      if (requiredSkillNames.length === 0) {
        return true;
      }
      const studentSkills = student.skills ? student.skills.split(',').map(s => s.toLowerCase()) : [];
      return requiredSkillNames.some(skill => studentSkills.includes(skill));
    });

    // Check eligibility for each student and add qualified rounds
    const results = await Promise.all(
      eligibleStudents.map(async (student) => {
        const eligibility = await checkEligibility(student.id, driveId);
        return {
          ...student,
          eligible: eligibility.eligible,
          qualifiedRounds: eligibility.qualifiedRounds || []
        };
      })
    );

    return results.filter(s => s.eligible);
  } catch (error) {
    console.error('Get eligible students error:', error);
    throw error;
  }
};

