import { Router, Request, Response } from "express";
import { db} from "../database";

const router = Router();


// Ruta de prueba
router.get("/ping", (req: Request, res: Response) => {
  res.json({
    modulo: 6,
    seccion: "evaluaciones",
    status: "ok",
    mensaje: "Ruta de evaluaciones funcionando ✅"
  });
});

//  NUEVO  POST para insertar evaluación
router.post("/", async (req: Request, res: Response) => {
  try {
    const { session_id, evaluador_id, evaluado_id, rating, comentario } = req.body;

    if (!session_id || !evaluador_id || !evaluado_id || !rating) {
      return res.status(400).json({ error: "Faltan datos requeridos" });
    }

    const result = await db.query(`
      INSERT INTO evaluaciones (session_id, evaluador_id, evaluado_id, rating, comentario, fecha)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *;
    `, [session_id, evaluador_id, evaluado_id, rating, comentario]);

    res.json({
      status: "ok",
      mensaje: "Evaluación guardada correctamente",
      data: result.rows[0]
    });

  } catch (error: any) {
    console.error("Error en POST /api/evaluaciones:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;