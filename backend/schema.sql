CREATE DATABASE IF NOT EXISTS tutoring;
USE tutoring;

CREATE TABLE IF NOT EXISTS student (
    student_id SERIAL PRIMARY KEY,
    first_name VARCHAR(16) NOT NULL,
    last_names VARCHAR(32) NOT NULL,
    email VARCHAR(64) UNIQUE NOT NULL,
    phone VARCHAR(16) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS advisor (
    advisor_id SERIAL PRIMARY KEY,
    first_name VARCHAR(16) NOT NULL,
    last_names VARCHAR(32) NOT NULL,
    email VARCHAR(64) UNIQUE NOT NULL,
    phone VARCHAR(16) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS class (
    class_id SERIAL PRIMARY KEY,
    subject_name VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session (
    session_id SERIAL PRIMARY KEY,
    student_id INT NOT NULL REFERENCES student(student_id),
    advisor_id INT NOT NULL REFERENCES advisor(advisor_id),
    class_id INT NOT NULL REFERENCES class(class_id),
    session_date TIMESTAMP NOT NULL,
    duration_minutes INT,
);
