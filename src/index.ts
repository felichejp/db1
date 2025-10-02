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