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

-- tabla student
CREATE TABLE IF NOT EXISTS student (
    id INT AUTO_INCREMENT PRIMARY KEY,// un id incremental para mi es mas fscil que se quede como la llave primaria en comparacion a la matricula, sin embargo, creo que igualmente se debe almacenar la matricula para cuestiones escolares
    matricula VARCHAR(16) NOT NULL, //  
    nombre VARCHAR(64) NOT NULL,
    primerApellido VARCHAR(64) NOT NULL,
    segundoApellido VARCHAR(64),
    email VARCHAR(128) UNIQUE,
    telefono VARCHAR(16), //telefono de contacto
    whatsapp VARCHAR(16), //telefono con acceso a whatsapp
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--tabla advisor
CREATE TABLE IF NOT EXISTS advisor (
    id INT AUTO_INCREMENT PRIMARY KEY,
    matricula VARCHAR(16) NOT NULL,
    nombre VARCHAR(64) NOT NULL,
    primerApellido VARCHAR(64) NOT NULL,
    segundoApellido VARCHAR(64),
    carrera VARCHAR(64),
    email VARCHAR(128) UNIQUE,
    telefono VARCHAR(16), //telefono de contacto
    whatsapp VARCHAR(16), //telefono con acceso a whatsapp
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--tabla class
CREATE TABLE IF NOT EXISTS class (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(64) NOT NULL,
    horario VARCHAR(64), //si ya se va a almacenar en DB el horario ya no deberia cambiar
    idAsesor INT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idAsesor) REFERENCES advisor(id)
);
