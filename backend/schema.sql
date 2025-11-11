-- crear la base de datos
CREATE DATABASE IF NOT EXISTS newDB;

-- usar la base de datos
USE newDB;

-- crear la tabla  EXAMPLE
CREATE TABLE IF NOT EXISTS codeLead (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student (
    student_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE -- 'UNIQUE' asegura que no haya emails repetidos
);

-- crear la tabla advisor
CREATE TABLE IF NOT EXISTS advisor (
    advisor_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    specialty TEXT -- La especialidad del asesor 
);


CREATE TABLE IF NOT EXISTS course (
    class_id SERIAL PRIMARY KEY,
    subject_name VARCHAR(255) NOT NULL, -- Ej. 'Programación 1', 'Álgebra Lineal'
    description TEXT
);