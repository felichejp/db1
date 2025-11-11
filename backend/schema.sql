-- crear la base de datos
CREATE DATABASE IF NOT EXISTS newDB;

-- usar la base de datos
USE newDB;

-- Tabla student
CREATE TABLE IF NOT EXISTS student (
    idStudent SERIAL PRIMARY KEY,
    nameStudent VARCHAR(64) NOT NULL,
    lastNameStudent VARCHAR(64) NOT NULL,
    institution VARCHAR(64) NOT NULL,
    career VARCHAR(64) NOT NULL,
    age INT NOT NULL,
    phoneNumber VARCHAR(16) NOT NULL,
    email VARCHAR(64) NOT NULL,
    idAdvisor INTEGER REFERENCES advisor(idAdvisor),
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
);

-- Tabla advisor
CREATE TABLE IF NOT EXISTS advisor (
    idAdvisor SERIAL PRIMARY KEY,
    nameAdvisor VARCHAR(64) NOT NULL,
    lastNameAdvisor VARCHAR(64) NOT NULL,
    institution VARCHAR(64) NOT NULL,
    phoneNumber VARCHAR(16) NOT NULL,
    email VARCHAR(64) NOT NULL,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
);

--Tabla class
CREATE TABLE IF NOT EXISTS class (
    idClass SERIAL PRIMARY KEY,
    nameClass VARCHAR(64) NOT NULL,
    descriptionClass VARCHAR(255) NOT NULL,
    idAdvisor INTEGER REFERENCES advisor(idAdvisor),
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
);