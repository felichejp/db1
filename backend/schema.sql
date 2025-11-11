-- crear la base de datos
CREATE DATABASE IF NOT EXISTS asesoriaDB; //considero que el nombre de la base de datos es "asesoriaDB" 
// ya que hace referencia a lo que queremos implementar,además de que es un nombre descriptivo y fácil de recordar.

-- usar la base de datos
USE asesoriaDB;

-- crear la tabla  EXAMPLE
CREATE TABLE IF NOT EXISTS asesor ( //considero que el nombre de la tabla es adecuado ya que hace referencia a los asesores que brindan las asesorías.
    id_asesor SERIAL,               //de esta manera no habrá confusión al momento de identificar a los asesores en la base de datos.
    first_name VARCHAR(32) NOT NULL,    //como atributos de la tabla considero que son necesarios el nombre, apellido, correo electrónico y especialidad del asesor.
    last_name VARCHAR(64) NOT NULL,        //no implemente atributos, como telefono, dependencia, contraseña, puesto que eso se implementa en el registro inicial (lead), probablemente podria
    email VARCHAR(64) NOT NULL UNIQUE,     //hacer referencia hacia esta tabla una vez confirmado que seria un cliente
    specialty VARCHAR(32) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS asesorado (  //considero que el nombre de la tabla es adecuado ya que hace referencia a los asesorados que reciben las asesorías.
    id_asesorado SERIAL,                 //de esta manera no habrá confusión al momento de identificar a los asesorados en la base de datos.
    first_name VARCHAR(32) NOT NULL,     //como atributos de la tabla considero que son necesarios el nombre, apellido y correo electrónico del asesorado.
    last_name VARCHAR(64) NOT NULL,      // al igual que en la tabla asesor, no implemente atributos adicionales ya que esto se maneja en el registro inicial (lead).
    email VARCHAR(64) NOT NULL UNIQUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS class (  //considero que el nombre de la tabla es adecuado ya que hace referencia a las clases o sesiones de asesoría que se llevarán a cabo.
    id_class SERIAL,   
    subject_class VARCHAR(32) NOT NULL,   /
    premise VARCHAR(16) NOT NULL,  //como atributos de la tabla considero que son necesarios el edificion,aula, la fecha y hora de la clase, y el tema a tratar.
    classroom VARCHAR(16) NOT NULL,    //haciendo referencia a "topic"  como
    class_date DATETIME NOT NULL,
    topic VARCHAR(32) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS class_participants (  //esta tabla la realice puesto que cuando estaba creando las tablas me di cuenta que era necesario 
                                                    //tener una tabla intermedia que relacionara a los asesores, asesorados y las clases.
    id_participant INT AUTO_INCREMENT PRIMARY KEY,   //sino se hacia mucho más complicado el manejo de la información y las relaciones entre las tablas.
    id_class INT NOT NULL,                              //ademas asi se puede manejar mejor la relacion mucho
    id_asesor INT NOT NULL,
    id_asesorado INT NOT NULL,
    FOREIGN KEY (id_class) REFERENCES class(id_class),
    FOREIGN KEY (id_asesor) REFERENCES asesor(id_asesor),
    FOREIGN KEY (id_asesorado) REFERENCES asesorado(id_asesorado)
);
