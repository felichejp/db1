import { Router, Request, Response } from "express";

const router = Router();

/**
 *  Badges (logros) de prueba
 * Más adelante estos se asignarán en base al desempeño del usuario
 */
let badgesFake = [
    { id: 1, nombre: "⭐ Tutor Destacado" },
    { id: 2, nombre: "🎯 Muy Participativo" }
];

/**
 *  Verificar ruta activa
 */
router.get("/ping", (_req: Request, res: Response) => {
    res.json({
        modulo: 6,
        seccion: "badges",
        status: "ok",
        mensaje: "Badges listos 🏅"
    });
});

/**
 * Obtener lista de badges disponibles
 */
router.get("/", (_req: Request, res: Response) => {
    res.json({
        status: "ok",
        total_badges: badgesFake.length,
        badges: badgesFake
    });
});

export default router;
