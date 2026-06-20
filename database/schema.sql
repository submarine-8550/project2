-- Campus Placement Management System Database Schema
-- MySQL Database Schema

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS interview_rounds;
DROP TABLE IF EXISTS drive_registrations;
DROP TABLE IF EXISTS student_skills;
DROP TABLE IF EXISTS drive_required_skills;
DROP TABLE IF EXISTS student_preferred_job_types;
DROP TABLE IF EXISTS student_preferred_locations;
DROP TABLE IF EXISTS drives;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS users;

-- Users table (for authentication - stores all user types)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'company', 'student') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Admins table
CREATE TABLE admins (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Companies table
CREATE TABLE companies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    website VARCHAR(255),
    address TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_approved (is_approved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Students table
CREATE TABLE students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    roll_number VARCHAR(50) UNIQUE NOT NULL,
    department VARCHAR(100) NOT NULL,
    cgpa DECIMAL(3,2) NOT NULL CHECK (cgpa >= 0 AND cgpa <= 10),
    domain VARCHAR(100),
    resume_link VARCHAR(500),
    phone VARCHAR(20),
    graduation_year INT NOT NULL,
    internship_experience_years DECIMAL(3,1) DEFAULT 0 CHECK (internship_experience_years >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_roll_number (roll_number),
    INDEX idx_department (department),
    INDEX idx_cgpa (cgpa),
    INDEX idx_domain (domain),
    INDEX idx_graduation_year (graduation_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Student skills table (many-to-many relationship)
CREATE TABLE student_skills (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    skill VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_skill (student_id, skill),
    INDEX idx_skill (skill)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Student preferred job types table
CREATE TABLE student_preferred_job_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    job_type ENUM('FT', 'Intern') NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_job_type (student_id, job_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Student preferred locations table
CREATE TABLE student_preferred_locations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    location VARCHAR(100) NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_location (location)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Drives table (company job postings)
CREATE TABLE drives (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    job_role VARCHAR(255) NOT NULL,
    min_cgpa DECIMAL(3,2) NOT NULL CHECK (min_cgpa >= 0 AND min_cgpa <= 10),
    package_amount DECIMAL(10,2),
    package_currency VARCHAR(10) DEFAULT 'LPA',
    deadline DATE NOT NULL,
    openings_count INT NOT NULL CHECK (openings_count > 0),
    drive_type ENUM('core', 'non-core') NOT NULL,
    target_employee_type ENUM('Fresher', 'Experienced', 'Intern') NOT NULL,
    rounds JSON NOT NULL COMMENT 'Array of round types: ["aptitude", "technical", "HR"]',
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    approved_by_admin_id INT NULL,
    approved_at DATETIME NULL,
    is_active BOOLEAN DEFAULT TRUE,
    target_graduation_year INT NULL DEFAULT NULL COMMENT 'Batch year this drive targets, e.g. 2026. NULL means open to all batches.',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL,
    INDEX idx_company (company_id),
    INDEX idx_status (status),
    INDEX idx_active (is_active),
    INDEX idx_deadline (deadline),
    INDEX idx_target_grad_year (target_graduation_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Drive required skills table
CREATE TABLE drive_required_skills (
    id INT PRIMARY KEY AUTO_INCREMENT,
    drive_id INT NOT NULL,
    skill VARCHAR(100) NOT NULL,
    FOREIGN KEY (drive_id) REFERENCES drives(id) ON DELETE CASCADE,
    UNIQUE KEY unique_drive_skill (drive_id, skill),
    INDEX idx_skill (skill)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Drive registrations table (students applying to drives)
CREATE TABLE drive_registrations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    drive_id INT NOT NULL,
    student_id INT NOT NULL,
    status ENUM('applied', 'shortlisted', 'rejected', 'selected') DEFAULT 'applied',
    qualified_rounds JSON COMMENT 'Array of round names student qualified for',
    registration_data JSON COMMENT 'Custom form data submitted by student',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (drive_id) REFERENCES drives(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY unique_drive_student (drive_id, student_id),
    INDEX idx_status (status),
    INDEX idx_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Interview rounds table (scheduling and results)
CREATE TABLE interview_rounds (
    id INT PRIMARY KEY AUTO_INCREMENT,
    drive_id INT NOT NULL,
    student_id INT NOT NULL,
    round_name VARCHAR(100) NOT NULL,
    round_type ENUM('aptitude', 'technical', 'HR', 'other') NOT NULL,
    scheduled_at DATETIME,
    status ENUM('scheduled', 'completed', 'passed', 'failed', 'cancelled') DEFAULT 'scheduled',
    feedback TEXT,
    conducted_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (drive_id) REFERENCES drives(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_drive_student (drive_id, student_id),
    INDEX idx_status (status),
    INDEX idx_scheduled_at (scheduled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
