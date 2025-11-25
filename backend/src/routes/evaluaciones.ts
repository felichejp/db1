import { Router, Request, Response } from "express";

const router = Router();

/**
 * Evaluaciones en memoria
 * Mientras no tengamos permisos en la base de datos,
 * guardaremos temporalmente las evaluaciones aquí.
 */
let evaluacionesFake: any[] = [];

/**
 *  Ruta de prueba
 * Permite verificar que la sección de Evaluaciones está funcionando
 */
router.get("/ping", (_req: Request, res: Response) => {
    res.json({
        modulo: 6,
        seccion: "evaluaciones",
        status: "ok",
        mensaje: "Ruta de evaluaciones funcionando 🚀"
    });
});

/**
 * Registrar una nueva evaluación
 * Método: POST
 * Datos recibidos: session_id, evaluador_id, evaluado_id, rating, comentario
 */
router.post("/", (req: Request, res: Response) => {
    const { session_id, evaluador_id, evaluado_id, rating, comentario } = req.body;

    // Validación básica
    if (!session_id || !evaluador_id || !evaluado_id || !rating) {
        return res.status(400).json({ error: "Datos incompletos" });
    }

    // Creación del objeto de evaluación (simulación mientras no hay BD)
    const nuevaEvaluacion = {
        id: evaluacionesFake.length + 1,
        session_id,
        evaluador_id,
        evaluado_id,
        rating,
        comentario,
        fecha: new Date()
    };

    // Se almacena temporalmente
    evaluacionesFake.push(nuevaEvaluacion);

    res.status(201).json({
        status: "ok",
        mensaje: "Evaluación guardada temporalmente 🎯",
        data: nuevaEvaluacion
    });
});

/**
 *  Obtener todas las evaluaciones registradas
 * Método: GET
 */
router.get("/", (_req: Request, res: Response) => {
    res.json({
        total: evaluacionesFake.length,
        data: evaluacionesFake
    });
});

export default router;
