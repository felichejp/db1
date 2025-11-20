import { Router, Request, Response } from "express";

const router = Router();

/**
 * GET /api/badges/ping
 * Comprobación de la ruta de badges
 */
router.get("/ping", (req: Request, res: Response) => {
  res.json({
    modulo: 6,
    seccion: "badges",
    status: "ok",
    mensaje: "Ruta de badges funcionando ✅"
  });
});

export default router;
