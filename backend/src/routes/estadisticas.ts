import { Router, Request, Response } from "express";

const router = Router();

/**
 * Estadísticas de prueba
 * Sirve para simular datos mientras se conecta con la BD real
 */
let estadisticasFake: any = {
    1: { promedio: 5, totalSesiones: 3 },
    2: { promedio: 4.2, totalSesiones: 10 }
};

/**
 * 🔍 Ping de prueba
 */
router.get("/ping", (_req: Request, res: Response) => {
    res.json({
        modulo: 6,
        seccion: "estadisticas",
        status: "ok",
        mensaje: "Estadísticas activas 📊"
    });
});

/**
 * Consultar estadísticas de un usuario
 * Método: GET /api/estadisticas/:id
 */
router.get("/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    const stats = estadisticasFake[id];

    if (!stats)
        return res.status(404).json({ error: "Usuario sin estadísticas aún" });

    res.json({
        status: "ok",
        user_id: id,
        ...stats
    });
});

export default router;
