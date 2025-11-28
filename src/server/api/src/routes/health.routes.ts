import { Router, Request, Response } from "express";
import { asyncHandler } from "../middleware/error.middleware.js";
import { sendSuccess } from "../utils/response.utils.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

/**
 * Health check endpoint
 * GET /api/health
 */
router.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    sendSuccess(res, {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: "connected",
    });
  })
);

export default router;
