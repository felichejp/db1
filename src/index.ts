import { InitRegister } from "./struct";

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
