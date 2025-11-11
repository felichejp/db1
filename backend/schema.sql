-- crear la base de datos
CREATE DATABASE IF NOT EXISTS asesorias;

-- usar la base de datos
USE asesorias;


--tabla student
CREATE TABLE if not EXISTS student(
    student_id SERIAL PRIMARY KEY,
    name VARCHAR(64) NOT NULL, 
    email VARCHAR(256) NOT NULL, 
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--tabla advisor
CREATE TABLE if not EXISTS advisor(
    advisor_id SERIAL PRIMARY KEY, 
    name VARCHAR(64) NOT NULL, 
    email VARCHAR(256) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--tabla class
CREATE TABLE if not EXISTS class(
    class_id SERIAL PRIMARY KEY,
    class_name VARCHAR(32),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--tabla sesion, cuando esta agendada la sesion
CREATE TABLE if not EXISTS session (
    session_id INT NOT NULL PRIMARY KEY,
    student_id INT NOT NULL REFERENCES student(student_id),
    advisor_id INT NOT NULL REFERENCES advisor(advisor_id),
    class_id   INT NOT NULL REFERENCES class(class_id),
    session_date DATE NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);