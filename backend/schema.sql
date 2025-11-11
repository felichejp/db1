-- crear la base de datos
CREATE DATABASE IF NOT EXISTS asesorias_registro;
-- El nombre de la base de datos es asesorias_registro indica que se registrara lo necesario con relacion a las asesorias
-- usar la base de datos
USE asesorias_registro;

CREATE TABLE IF NOT EXISTS alumnos(
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(32) NOT NULL,
    apellido_paterno VARCHAR(32) NOT NULL,
    apellido_materno VARCHAR(32) NOT NULL,
    fechaNacimiento DATE NOT NULL,
    matricula VARCHAR(16) NOT NULL,
    email VARCHAR(64) NOT NULL,
    telefono VARCHAR(16) NOT NULL,
    whatsapp VARCHAR(16) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS asesor(
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(32) NOT NULL,
    apellido_paterno VARCHAR(32) NOT NULL,
    apellido_materno VARCHAR(32) NOT NULL,
    email VARCHAR(64) NOT NULL,
    telefono VARCHAR(16) NOT NULL,
    whatsapp VARCHAR(16) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP --se considera si se actualiza la informacion del asesor
);

CREATE TABLE IF NOT EXISTS nombre_materia(
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(32) NOT NULL UNIQUE,
    create timestamp DEFAULT CURRENT_TIMESTAMP,
);

CREATE TABLE IF NOT EXISTS materia(
    id SERIAL PRIMARY KEY,
    nombre_materia_id INT NOT NULL,
    cupo INT NOT NULL,
    asesor_id INT NOT NULL,
    periodo VARCHAR(16) NOT NULL, -- se refiere al periodo en el que se imparte la materia
    horario VARCHAR(16) NOT NULL, -- se refiere al horario en el que se imparte la materia
    salon VARCHAR(16) NOT NULL, -- se refiere al salon en el que se imparte la materia
    dias VARCHAR(16) NOT NULL, -- se refiere a los dias en el que se imparte la materia
    FOREIGN KEY (nombre_materia_id) REFERENCES nombre_materia(id),
    FOREIGN KEY (asesor_id) REFERENCES asesor(id),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);