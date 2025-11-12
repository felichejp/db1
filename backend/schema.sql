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

CREATE TABLE student (
  id INT PRIMARY KEY,
  name VARCHAR(100),
);

CREATE TABLE advisor (
  id INT PRIMARY KEY,
  name VARCHAR(100),
);

CREATE TABLE class (
  id INT PRIMARY KEY,
  course_name VARCHAR(100),
);