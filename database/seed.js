/**
 * Database Seeding Script
 * Generates proper password hashes and seeds the database with initial data
 * 
 * Usage: node database/seed.js
 */

import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to load environment variables from backend
try {
  dotenv.config({ path: join(__dirname, '../backend/.env') });
} catch (error) {
  console.log('No .env file found, using defaults or environment variables');
}

const DEFAULT_PASSWORD = 'password123'; // Default password for all seed users

async function seedDatabase() {
  let connection;

  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'campus_placement_db',
      port: process.env.DB_PORT || 3306
    });

    console.log('Connected to database');

    // Hash default password
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    console.log('Generated password hash');

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('Clearing existing seed data...');
    await connection.execute('DELETE FROM interview_rounds');
    await connection.execute('DELETE FROM drive_registrations');
    await connection.execute('DELETE FROM student_skills');
    await connection.execute('DELETE FROM drive_required_skills');
    await connection.execute('DELETE FROM student_preferred_job_types');
    await connection.execute('DELETE FROM student_preferred_locations');
    await connection.execute('DELETE FROM drives');
    await connection.execute('DELETE FROM students');
    await connection.execute('DELETE FROM companies');
    await connection.execute('DELETE FROM admins');
    await connection.execute('DELETE FROM users');

    // Insert admin user
    console.log('Inserting admin user...');
    const [adminUserResult] = await connection.execute(
      'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
      ['admin@college.edu', passwordHash, 'admin']
    );
    const adminUserId = adminUserResult.insertId;
    await connection.execute(
      'INSERT INTO admins (user_id, name) VALUES (?, ?)',
      [adminUserId, 'College Admin']
    );

    // Insert company users
    console.log('Inserting company users...');
    const companies = [
      { email: 'hr@techcorp.com', name: 'TechCorp Solutions', phone: '+91-9876543210', website: 'https://techcorp.com', address: '123 Tech Street, Bangalore' },
      { email: 'recruiter@financebank.com', name: 'Finance Bank', phone: '+91-9876543211', website: 'https://financebank.com', address: '456 Finance Avenue, Mumbai' },
      { email: 'hiring@startup.io', name: 'Startup.io', phone: '+91-9876543212', website: 'https://startup.io', address: '789 Startup Lane, Hyderabad' }
    ];

    const companyIds = [];
    for (const company of companies) {
      const [userResult] = await connection.execute(
        'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
        [company.email, passwordHash, 'company']
      );
      const userId = userResult.insertId;
      const [companyResult] = await connection.execute(
        `INSERT INTO companies (user_id, name, email, phone, website, address, is_approved)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, company.name, company.email, company.phone, company.website, company.address, company.email !== 'hiring@startup.io']
      );
      companyIds.push(companyResult.insertId);
    }

    // Insert student users
    console.log('Inserting student users...');
    const students = [
      {
        email: 'student1@college.edu',
        name: 'John Doe',
        rollNumber: 'CS2021001',
        department: 'Computer Science',
        cgpa: 8.5,
        domain: 'Software Development',
        resumeLink: 'https://resume.example.com/johndoe.pdf',
        phone: '+91-9876543201',
        graduationYear: 2024,
        internshipExperienceYears: 1.5,
        skills: ['JavaScript', 'React', 'Node.js', 'Python'],
        preferredJobTypes: ['FT', 'Intern'],
        preferredLocations: ['Bangalore', 'Hyderabad']
      },
      {
        email: 'student2@college.edu',
        name: 'Jane Smith',
        rollNumber: 'CS2021002',
        department: 'Computer Science',
        cgpa: 9.2,
        domain: 'Data Science',
        resumeLink: 'https://resume.example.com/janesmith.pdf',
        phone: '+91-9876543202',
        graduationYear: 2024,
        internshipExperienceYears: 0.5,
        skills: ['Python', 'Machine Learning', 'Data Analysis', 'SQL'],
        preferredJobTypes: ['FT'],
        preferredLocations: ['Bangalore', 'Mumbai']
      },
      {
        email: 'student3@college.edu',
        name: 'Bob Johnson',
        rollNumber: 'EE2021001',
        department: 'Electrical Engineering',
        cgpa: 7.8,
        domain: 'Embedded Systems',
        resumeLink: 'https://resume.example.com/bobjohnson.pdf',
        phone: '+91-9876543203',
        graduationYear: 2024,
        internshipExperienceYears: 0.0,
        skills: ['C++', 'Embedded Systems', 'Arduino', 'Circuit Design'],
        preferredJobTypes: ['FT', 'Intern'],
        preferredLocations: ['Pune', 'Bangalore']
      }
    ];

    const studentIds = [];
    for (const student of students) {
      const [userResult] = await connection.execute(
        'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
        [student.email, passwordHash, 'student']
      );
      const userId = userResult.insertId;
      const [studentResult] = await connection.execute(
        `INSERT INTO students 
         (user_id, name, email, roll_number, department, cgpa, domain, resume_link, phone, graduation_year, internship_experience_years)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          student.name,
          student.email,
          student.rollNumber,
          student.department,
          student.cgpa,
          student.domain,
          student.resumeLink,
          student.phone,
          student.graduationYear,
          student.internshipExperienceYears
        ]
      );
      const studentId = studentResult.insertId;
      studentIds.push(studentId);

      // Insert skills
      for (const skill of student.skills) {
        await connection.execute(
          'INSERT INTO student_skills (student_id, skill) VALUES (?, ?)',
          [studentId, skill]
        );
      }

      // Insert preferred job types
      for (const jobType of student.preferredJobTypes) {
        await connection.execute(
          'INSERT INTO student_preferred_job_types (student_id, job_type) VALUES (?, ?)',
          [studentId, jobType]
        );
      }

      // Insert preferred locations
      for (const location of student.preferredLocations) {
        await connection.execute(
          'INSERT INTO student_preferred_locations (student_id, location) VALUES (?, ?)',
          [studentId, location]
        );
      }
    }

    // Insert drives
    console.log('Inserting drives...');
    const drives = [
      {
        companyId: companyIds[0],
        jobRole: 'Software Engineer',
        minCgpa: 8.0,
        packageAmount: 12.0,
        packageCurrency: 'LPA',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        openingsCount: 10,
        driveType: 'core',
        targetEmployeeType: 'Fresher',
        rounds: ['aptitude', 'technical', 'HR'],
        requiredSkills: ['JavaScript', 'React', 'Node.js'],
        isApproved: true
      },
      {
        companyId: companyIds[0],
        jobRole: 'Frontend Developer Intern',
        minCgpa: 7.5,
        packageAmount: 3.0,
        packageCurrency: 'LPA',
        deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        openingsCount: 5,
        driveType: 'non-core',
        targetEmployeeType: 'Intern',
        rounds: ['aptitude', 'technical'],
        requiredSkills: ['JavaScript', 'React', 'HTML', 'CSS'],
        isApproved: true
      },
      {
        companyId: companyIds[1],
        jobRole: 'Data Analyst',
        minCgpa: 8.5,
        packageAmount: 10.0,
        packageCurrency: 'LPA',
        deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        openingsCount: 8,
        driveType: 'core',
        targetEmployeeType: 'Fresher',
        rounds: ['aptitude', 'technical', 'HR'],
        requiredSkills: ['Python', 'SQL', 'Data Analysis'],
        isApproved: true
      },
      {
        companyId: companyIds[2],
        jobRole: 'Full Stack Developer',
        minCgpa: 7.0,
        packageAmount: 8.0,
        packageCurrency: 'LPA',
        deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        openingsCount: 6,
        driveType: 'core',
        targetEmployeeType: 'Fresher',
        rounds: ['aptitude', 'technical', 'HR'],
        requiredSkills: ['JavaScript', 'Node.js', 'MongoDB'],
        isApproved: false
      }
    ];

    const driveIds = [];
    for (const drive of drives) {
      const [driveResult] = await connection.execute(
        `INSERT INTO drives 
         (company_id, job_role, min_cgpa, package_amount, package_currency, deadline, 
          openings_count, drive_type, target_employee_type, rounds, is_active, is_approved)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
        [
          drive.companyId,
          drive.jobRole,
          drive.minCgpa,
          drive.packageAmount,
          drive.packageCurrency,
          drive.deadline,
          drive.openingsCount,
          drive.driveType,
          drive.targetEmployeeType,
          JSON.stringify(drive.rounds),
          drive.isApproved
        ]
      );
      const driveId = driveResult.insertId;
      driveIds.push(driveId);

      // Insert required skills
      for (const skill of drive.requiredSkills) {
        await connection.execute(
          'INSERT INTO drive_required_skills (drive_id, skill) VALUES (?, ?)',
          [driveId, skill]
        );
      }
    }

    // Insert some drive registrations
    console.log('Inserting drive registrations...');
    await connection.execute(
      `INSERT INTO drive_registrations (drive_id, student_id, status, qualified_rounds)
       VALUES (?, ?, 'applied', ?)`,
      [driveIds[0], studentIds[0], JSON.stringify(['aptitude', 'technical'])]
    );
    await connection.execute(
      `INSERT INTO drive_registrations (drive_id, student_id, status, qualified_rounds)
       VALUES (?, ?, 'shortlisted', ?)`,
      [driveIds[1], studentIds[0], JSON.stringify(['aptitude', 'technical'])]
    );
    await connection.execute(
      `INSERT INTO drive_registrations (drive_id, student_id, status, qualified_rounds)
       VALUES (?, ?, 'applied', ?)`,
      [driveIds[2], studentIds[1], JSON.stringify(['aptitude', 'technical'])]
    );

    console.log('\n✅ Database seeded successfully!');
    console.log('\nDefault password for all users: password123');
    console.log('\nTest accounts:');
    console.log('  Admin: admin@college.edu');
    console.log('  Company: hr@techcorp.com');
    console.log('  Student: student1@college.edu');

  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedDatabase();
