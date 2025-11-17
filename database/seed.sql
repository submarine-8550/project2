-- Seed data for Campus Placement Management System
-- This file contains sample data for testing and development

-- Insert sample users (passwords are hashed versions of "password123")
-- In production, these should be properly hashed using bcrypt
-- For seed data, we'll use a placeholder that will be hashed by the application

-- Admin user
INSERT INTO users (email, password_hash, role) VALUES
('admin@college.edu', '$2b$10$rOzJqJqJqJqJqJqJqJqJqOqJqJqJqJqJqJqJqJqJqJqJqJqJqJq', 'admin');

-- Company users
INSERT INTO users (email, password_hash, role) VALUES
('hr@techcorp.com', '$2b$10$rOzJqJqJqJqJqJqJqJqJqOqJqJqJqJqJqJqJqJqJqJqJqJqJqJq', 'company'),
('recruiter@financebank.com', '$2b$10$rOzJqJqJqJqJqJqJqJqJqOqJqJqJqJqJqJqJqJqJqJqJqJqJqJq', 'company'),
('hiring@startup.io', '$2b$10$rOzJqJqJqJqJqJqJqJqJqOqJqJqJqJqJqJqJqJqJqJqJqJqJqJq', 'company');

-- Student users
INSERT INTO users (email, password_hash, role) VALUES
('student1@college.edu', '$2b$10$rOzJqJqJqJqJqJqJqJqJqOqJqJqJqJqJqJqJqJqJqJqJqJqJqJq', 'student'),
('student2@college.edu', '$2b$10$rOzJqJqJqJqJqJqJqJqJqOqJqJqJqJqJqJqJqJqJqJqJqJqJqJq', 'student'),
('student3@college.edu', '$2b$10$rOzJqJqJqJqJqJqJqJqJqOqJqJqJqJqJqJqJqJqJqJqJqJqJqJq', 'student');

-- Insert admin
INSERT INTO admins (user_id, name) VALUES
(1, 'College Admin');

-- Insert companies
INSERT INTO companies (user_id, name, email, phone, website, address, is_approved) VALUES
(2, 'TechCorp Solutions', 'hr@techcorp.com', '+91-9876543210', 'https://techcorp.com', '123 Tech Street, Bangalore', TRUE),
(3, 'Finance Bank', 'recruiter@financebank.com', '+91-9876543211', 'https://financebank.com', '456 Finance Avenue, Mumbai', TRUE),
(4, 'Startup.io', 'hiring@startup.io', '+91-9876543212', 'https://startup.io', '789 Startup Lane, Hyderabad', FALSE);

-- Insert students
INSERT INTO students (user_id, name, email, roll_number, department, cgpa, domain, resume_link, phone, graduation_year, internship_experience_years) VALUES
(5, 'John Doe', 'student1@college.edu', 'CS2021001', 'Computer Science', 8.5, 'Software Development', 'https://resume.example.com/johndoe.pdf', '+91-9876543201', 2024, 1.5),
(6, 'Jane Smith', 'student2@college.edu', 'CS2021002', 'Computer Science', 9.2, 'Data Science', 'https://resume.example.com/janesmith.pdf', '+91-9876543202', 2024, 0.5),
(7, 'Bob Johnson', 'student3@college.edu', 'EE2021001', 'Electrical Engineering', 7.8, 'Embedded Systems', 'https://resume.example.com/bobjohnson.pdf', '+91-9876543203', 2024, 0.0);

-- Insert student skills
INSERT INTO student_skills (student_id, skill) VALUES
(1, 'JavaScript'), (1, 'React'), (1, 'Node.js'), (1, 'Python'),
(2, 'Python'), (2, 'Machine Learning'), (2, 'Data Analysis'), (2, 'SQL'),
(3, 'C++'), (3, 'Embedded Systems'), (3, 'Arduino'), (3, 'Circuit Design');

-- Insert student preferred job types
INSERT INTO student_preferred_job_types (student_id, job_type) VALUES
(1, 'FT'), (1, 'Intern'),
(2, 'FT'),
(3, 'FT'), (3, 'Intern');

-- Insert student preferred locations
INSERT INTO student_preferred_locations (student_id, location) VALUES
(1, 'Bangalore'), (1, 'Hyderabad'),
(2, 'Bangalore'), (2, 'Mumbai'),
(3, 'Pune'), (3, 'Bangalore');

-- Insert drives
INSERT INTO drives (company_id, job_role, min_cgpa, package_amount, package_currency, deadline, openings_count, drive_type, target_employee_type, rounds, is_active, is_approved) VALUES
(1, 'Software Engineer', 8.0, 12.0, 'LPA', DATE_ADD(CURDATE(), INTERVAL 30 DAY), 10, 'core', 'Fresher', '["aptitude", "technical", "HR"]', TRUE, TRUE),
(1, 'Frontend Developer Intern', 7.5, 3.0, 'LPA', DATE_ADD(CURDATE(), INTERVAL 20 DAY), 5, 'non-core', 'Intern', '["aptitude", "technical"]', TRUE, TRUE),
(2, 'Data Analyst', 8.5, 10.0, 'LPA', DATE_ADD(CURDATE(), INTERVAL 25 DAY), 8, 'core', 'Fresher', '["aptitude", "technical", "HR"]', TRUE, TRUE),
(3, 'Full Stack Developer', 7.0, 8.0, 'LPA', DATE_ADD(CURDATE(), INTERVAL 15 DAY), 6, 'core', 'Fresher', '["aptitude", "technical", "HR"]', TRUE, FALSE);

-- Insert drive required skills
INSERT INTO drive_required_skills (drive_id, skill) VALUES
(1, 'JavaScript'), (1, 'React'), (1, 'Node.js'),
(2, 'JavaScript'), (2, 'React'), (2, 'HTML'), (2, 'CSS'),
(3, 'Python'), (3, 'SQL'), (3, 'Data Analysis'),
(4, 'JavaScript'), (4, 'Node.js'), (4, 'MongoDB');

-- Insert some drive registrations
INSERT INTO drive_registrations (drive_id, student_id, status, qualified_rounds) VALUES
(1, 1, 'applied', '["aptitude", "technical"]'),
(2, 1, 'shortlisted', '["aptitude", "technical"]'),
(3, 2, 'applied', '["aptitude", "technical"]');

