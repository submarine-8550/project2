/**
 * Validation Utilities
 * Common validation functions and helpers
 */

import { body, validationResult } from 'express-validator';

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/**
 * Student registration validation rules
 */
export const validateStudentRegistration = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('rollNumber').trim().notEmpty().withMessage('Roll number is required'),
  body('department').trim().notEmpty().withMessage('Department is required'),
  body('cgpa').isFloat({ min: 0, max: 10 }).withMessage('CGPA must be between 0 and 10'),
  body('graduationYear').isInt({ min: 2020, max: 2030 }).withMessage('Valid graduation year is required'),
  body('phone').optional({ checkFalsy: true }).trim(),
  body('resumeLink').optional({ checkFalsy: true }).isURL().withMessage('Resume link must be a valid URL if provided'),
  body('skills').optional().isArray().withMessage('Skills must be an array'),
  body('preferredJobTypes').optional().isArray().withMessage('Preferred job types must be an array'),
  body('preferredLocations').optional().isArray().withMessage('Preferred locations must be an array'),
  handleValidationErrors
];

/**
 * Company registration validation rules
 */
export const validateCompanyRegistration = [
  body('name').trim().notEmpty().withMessage('Company name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidationErrors
];

/**
 * Login validation rules
 */
export const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

/**
 * Drive creation validation rules
 */
export const validateDriveCreation = [
  body('jobRole').trim().notEmpty().withMessage('Job role is required'),
  body('minCgpa').isFloat({ min: 0, max: 10 }).withMessage('Minimum CGPA must be between 0 and 10'),
  body('packageAmount').optional().isFloat({ min: 0 }).withMessage('Package amount must be positive'),
  body('deadline').isISO8601().withMessage('Valid deadline date is required'),
  body('openingsCount').isInt({ min: 1 }).withMessage('Openings count must be at least 1'),
  body('driveType').isIn(['core', 'non-core']).withMessage('Drive type must be core or non-core'),
  body('targetEmployeeType').isIn(['Fresher', 'Experienced', 'Intern']).withMessage('Valid employee type is required'),
  body('rounds').isArray().notEmpty().withMessage('Rounds must be a non-empty array'),
  body('requiredSkills').isArray().withMessage('Required skills must be an array'),
  handleValidationErrors
];

