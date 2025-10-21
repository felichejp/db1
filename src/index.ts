import { InitRegister } from "./struct";
import { Database } from "./database";
import * as dotenv from 'dotenv';
    dotenv.config();
class InitRegisterClass {
    private initRegister: InitRegister;

    constructor(initRegister: InitRegister) {
        this.initRegister = initRegister;
    }
    public printInitRegister(): void {
        console.log(this.initRegister);
    }
}
const testRegister = {
    institutionName: "Universidad de los Andes",
    dependencies: "Facultad de Ciencias",
    responseName: "John Doe",
    responsePassword: "123456",
    email: "john.doe@example.com",
    mobileNumber: "1234567890",
}
const register1 = new InitRegisterClass(testRegister);
register1.printInitRegister();

const DatabaseConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_DATABASE,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
}
const database = new Database(DatabaseConfig);
database.connect()
    .then(() => {
        console.log('Database connected successfully');
        database.query('SELECT * FROM "testtable"')
            .then((result) => {
                console.log(result.rows);
                database.query('INSERT INTO "testtable" (id, name, age) VALUES (3, \'Liz\', 24)')
                    .then((result) => {
                        console.log(result.rows);
                        database.disconnect()
                            .then(() => {
                                console.log('Database disconnected successfully');
                            })
                            .catch((error) => {
                                console.error('Failed to disconnect from database:', error);
                            });
                    })
                    .catch((error) => {
                        console.error('Failed to insert into database:', error);
                    });
                
            })
            .catch((error) => {
                console.error('Failed to query database:', error);
            });
        
    })
    .catch((error) => {
        console.error('Failed to connect to database:', error);
    });