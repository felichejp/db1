-- crear la base de datos
CREATE DATABASE IF NOT EXISTS asesorias;

-- usar la base de datos
USE asesorias;

-- crear la tabla  EXAMPLE
CREATE TABLE IF NOT EXISTS student (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    matricula VARCHAR(255) NOT NULL,
    career VARCHAR(255) NOT NULL,
    semester INT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
--advisor
CREATE TABLE IF NOT EXISTS advisor (
    id SERIAL PRIMARY KEY,
    id_student INT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_student) REFERENCES student(id) 
);

-- Tabla class
CREATE TABLE IF NOT EXISTS class (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    id_advisor INT NOT NULL,
    schedule_info VARCHAR(64) NOT NULL, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_advisor) REFERENCES advisor(id) 
);