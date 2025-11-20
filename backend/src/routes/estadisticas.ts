import { Router, Request, Response } from "express";

const router = Router();

/**
 * GET /api/estadisticas/ping
 * Comprobación de la ruta de estadísticas
 */
router.get("/ping", (req: Request, res: Response) => {
  res.json({
    modulo: 6,
    seccion: "estadisticas",
    status: "ok",
    mensaje: "Ruta de estadísticas funcionando ✅"
  });
});

export default router;
