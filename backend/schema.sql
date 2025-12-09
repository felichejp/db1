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
-- Tabla student(estudiante)
CREATE TABLE IF NOT EXISTS student (
    id_student SERIAL PRIMARY KEY,   -- id_student es el id del estudiante
    nameStudent VARCHAR(64) NOT NULL, -- nameStudent es el nombre del estudiante
    lastName VARCHAR (64) NOT NULL, -- lastName es el apellido del estudiante
    institution VARCHAR (64) NOT NULL, -- institution es la institución del estudiante
    career VARCHAR (64) NOT NULL, -- career es la carrera del estudiante
    age INT NOT NULL, -- age es la edad del estudiante
    phone_number VARCHAR (16) NOT NULL, -- phone_number es el teléfono del estudiante
    email VARCHAR (128) NOT NULL, -- email es el correo electrónico del estudiante
    advisor_id INTEGER REFERENCES advisor(id_advisor), -- advisor_id es el id del asesor del estudiante
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- created_at es la fecha de creación del estudiante
);

-- Tabla advisor(asesor)
CREATE TABLE IF NOT EXISTS advisor (
    id_advisor SERIAL PRIMARY KEY, -- id_advisor es el id del asesor
    nameAdvisor VARCHAR (64) NOT NULL, -- nameAdvisor es el nombre del asesor
    lastName VARCHAR (64) NOT NULL, -- lastName es el apellido del asesor
    institution VARCHAR (64) NOT NULL, -- institution es la institución del asesor
    phone_number VARCHAR (16) NOT NULL, -- phone_number es el teléfono del asesor
    email VARCHAR (128) NOT NULL, -- email es el correo electrónico del asesor
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- created_at es la fecha de creación del asesor
);

-- Tabla class(clase)
CREATE TABLE IF NOT EXISTS class (
    id_class SERIAL PRIMARY KEY, -- id_class es el id de la clase
    nameClass VARCHAR (64) NOT NULL, -- nameClass es el nombre de la clase
    description VARCHAR (255) NOT NULL, -- description es la descripción de la clase
    advisor_id INTEGER REFERENCES advisor(id_advisor), -- advisor_id es el id del asesor de la clase
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- created_at es la fecha de creación de la clase
);