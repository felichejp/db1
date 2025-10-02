import { InitRegister } from "./struct";

class InitRegister {
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
    dependenies: "Facultad de Ciencias",
    responseName: "John Doe",
    responsePassword: "123456",
    email: "john.doe@example.com",
    movilNumber: "1234567890",
}
const register1 = new InitRegister(testRegister);
register1.printInitRegister();
