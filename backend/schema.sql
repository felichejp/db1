-- crear la base de datos
CREATE DATABASE IF NOT EXISTS asesorias;

-- usar la base de datos
USE asesorias;

-- tabla student
CREATE TABLE IF NOT EXISTS student (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    matricula VARCHAR(16) NOT NULL, -- matricula del estudiante
    dob DATE NOT NULL, -- fecha de nacimiento
    email VARCHAR(64) NOT NULL,
    phone VARCHAR(16) NOT NULL,
    degree VARCHAR(32) NOT NULL, -- carrera
    grade VARCHAR(8) NOT NULL, -- promedio general
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- tabla advisor
CREATE TABLE IF NOT EXISTS advisor (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_student INT NOT NULL UNIQUE, -- su id en la tabla student
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_student) REFERENCES student(id)
);

-- tabla class
CREATE TABLE IF NOT EXISTS class (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(64) NOT NULL, -- nombre de la clase
    id_advisor INT NOT NULL, -- asesor asignado
    scheduleinfo VARCHAR(64) NOT NULL, -- información del horario
    location VARCHAR(32) NOT NULL, -- lugar de la clase
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_advisor) REFERENCES advisor(id)
);