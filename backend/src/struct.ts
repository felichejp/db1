// las estructuras son objetos de tipo json

export interface InitRegister {
    institutionName: string;
    dependencies: string;
    responseName: string;
    responsePassword: string;
    email: string;
    mobileNumber: string;
}

export interface DatabaseConfig {
    host: string | undefined;
    port: number;
    database: string | undefined;
    username: string | undefined;
    password: string | undefined;
}