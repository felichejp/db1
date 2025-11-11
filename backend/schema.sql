-- crear la base de datos
CREATE DATABASE IF NOT EXISTS newDB;

-- usar la base de datos
USE newDB;

-- crear la tabla  EXAMPLE
/*CREATE TABLE IF NOT EXISTS codeLead (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);*/
 
CREATE TABLE IF NOT EXISTS student (
    registrationNumber VARCHAR(8) PRIMARY KEY NOT NULL, --Matricula, hace a la vez de id
    firstName VARCHAR(64) NOT NULL,
    lastName VARCHAR(64) NOT NULL,
    birthDate DATE,
    email VARCHAR(64) UNIQUE NOT NULL,
    degree INT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS advisor(
    idAdvisor INT AUTO_INCREMENT PRIMARY KEY,
    registrationNumber VARCHAR(8) UNIQUE KEY NOT NULL, --Como el asesor es estudiante tambien tiene una matricula
    score NUMERIC(3,2), --Promedio del asesor
    startDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP, --Fecha en que el alumno comenzo a dar asesorias
    FOREIGN KEY (registrationNumber) REFERENCES student(registrationNumber)
);


CREATE TABLE IF NOT EXISTS class (
    idClass INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    classroom VARCHAR(16), --Donde se imparte la clase
    schedule DATETIME, --Fecha y hora de la clase
    idAdvisor INT NOT NULL, --ID del asesor de la clase
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idAdvisor) REFERENCES advisor(idAdvisor)
);

-- Tabla intermedia para la relación muchos-a-muchos entre class y student
CREATE TABLE IF NOT EXISTS class_student (
    idClass INT NOT NULL,
    registrationNumber VARCHAR(8) NOT NULL, --Estudiantes que asisten a la asesoria
    PRIMARY KEY (idClass, registrationNumber), --Llave primaria compuesta
    FOREIGN KEY (idClass) REFERENCES class(idClass),
    FOREIGN KEY (registrationNumber) REFERENCES student(registrationNumber)
);