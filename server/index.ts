import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { pasangApi } from "./app";
import { serveStatic } from "./static";

const app = express();
const httpServer = createServer(app);

export function log(message: string, source = "express") {
  const waktu = new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  console.log(`${waktu} [${source}] ${message}`);
}

// Pencatat permintaan dipasang sebelum route agar seluruh panggilan API
// terekam, termasuk yang ditolak middleware autentikasi.
app.use((req, res, next) => {
  const mulai = Date.now();
  const path = req.path;
  let badanRespons: Record<string, unknown> | undefined;

  const jsonAsli = res.json;
  res.json = function (isi, ...sisa) {
    badanRespons = isi;
    return jsonAsli.apply(res, [isi, ...sisa]);
  };

  res.on("finish", () => {
    if (!path.startsWith("/api")) return;
    let baris = `${req.method} ${path} ${res.statusCode} in ${Date.now() - mulai}ms`;
    if (badanRespons) {
      const ringkas = JSON.stringify(badanRespons);
      baris += ` :: ${ringkas.length > 300 ? ringkas.slice(0, 300) + "..." : ringkas}`;
    }
    log(baris);
  });

  next();
});

(async () => {
  await pasangApi(app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    console.error("Galat tidak tertangani:", err);
    if (res.headersSent) return next(err);
    return res.status(status).json({
      error: status === 500 ? "Terjadi galat di server. Coba lagi." : err.message,
    });
  });

  // Vite hanya dipasang saat pengembangan, dan selalu setelah route API,
  // supaya catch-all-nya tidak menelan permintaan /api.
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5050", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
