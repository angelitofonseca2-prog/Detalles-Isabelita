import bcrypt from "bcrypt";

const password = "cliente123";  // ← cámbiala si quieres

const generar = async () => {
    const hash = await bcrypt.hash(password, 10);
    console.log("HASH generado:");
    console.log(hash);
};

generar();
