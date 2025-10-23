// prueba de la funcion hashPassword
const { hashPassword, verifyPassword } = require('./hashPass');

const testPassword = async () => {
    const password = '123456';
    const hash = await hashPassword(password);
    console.log(hash);
    const isVerified = await verifyPassword(password, hash);
    console.log(isVerified);
}

testPassword();