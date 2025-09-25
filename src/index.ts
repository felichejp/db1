/**
 * Programa Hola Mundo básico en TypeScript orientado a objetos
 * Autor: Feliche
 */

// Clase principal que representa el saludo
class Saludo {
    private mensaje: string;
    private autor: string;

    constructor(mensaje: string = "Hola Mundo !!!", autor: string = "TypeScript") {
        this.mensaje = mensaje;
        this.autor = autor;
    }

    // Método para obtener el mensaje
    public getMensaje(): string {
        return this.mensaje;
    }

    // Método para obtener el autor
    public getAutor(): string {
        return this.autor;
    }

    // Método para establecer un nuevo mensaje
    public setMensaje(nuevoMensaje: string): void {
        this.mensaje = nuevoMensaje;
    }

    // Método para mostrar el saludo completo
    public mostrarSaludo(): void {
        console.log(`${this.mensaje} - Creado con ${this.autor}`);
    }

    // Método para mostrar información detallada
    public mostrarInfo(): void {
        console.log("=================================");
        console.log("    PROGRAMA HOLA MUNDO TS");
        console.log("=================================");
        console.log(`Mensaje: ${this.mensaje}`);
        console.log(`Tecnología: ${this.autor}`);
        console.log(`Fecha: ${new Date().toLocaleDateString()}`);
        console.log("=================================");
    }
}

// Clase principal de la aplicación
class App {
    private saludo: Saludo;

    constructor() {
        this.saludo = new Saludo();
    }

    // Método principal para ejecutar la aplicación
    public ejecutar(): void {
        console.clear();
        this.saludo.mostrarInfo();
        this.saludo.mostrarSaludo();
        
        // Ejemplo de modificación del mensaje
        console.log("\n--- Modificando el mensaje ---");
        this.saludo.setMensaje("¡Hola desde TypeScript orientado a objetos!");
        this.saludo.mostrarSaludo();
    }
}

// Punto de entrada del programa
function main(): void {
    const app = new App();
    app.ejecutar();
}

// Ejecutar la aplicación
main();
