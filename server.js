import express from "express";
import fs from "fs";
import https from "https";
import http from "http";
import path from "path";
import multer from "multer";
import cors from "cors";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { processUpload } from "./lib/processUpload.js";
import { getHistory } from "./lib/getHistory.js";
import { getDiseaseSummary } from "./lib/summary.js";
import { getDiseaseInfo } from "./lib/getDiseaseInfo.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

const SSL_KEY = path.join(__dirname, "server.key");
const SSL_CERT = path.join(__dirname, "server.cert");
const ENV = process.env.NODE_ENV || "development";

let server;
if (ENV === "development" && fs.existsSync(SSL_KEY) && fs.existsSync(SSL_CERT)) {
  server = https.createServer(
    {
      key: fs.readFileSync(SSL_KEY),
      cert: fs.readFileSync(SSL_CERT),
    },
    app
  );
  console.log("✅ HTTPS enabled for development");
} else {
  server = http.createServer(app);
  console.log("✅ HTTP enabled for production");
}

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ========================
// ✅ FIXED MULTER STORAGE
// ========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
  res.redirect("/home");
});

// Only for development (same as your code)
if (ENV === "development") {
  app.get("/home", (_, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });

  app.get("/analytics", (_, res) => {
    res.sendFile(path.join(__dirname, "public", "analytics.html"));
  });

  app.get("/information", (_, res) => {
    res.sendFile(path.join(__dirname, "public", "information.html"));
  });

  // ================================
  // ✅ FIXED UPLOAD API ENDPOINT
  // ================================
  app.post("/api/upload", upload.single("image"), async (req, res) => {
    console.log("📸 RECEIVED FILE:", req.file);
    console.log("📦 RECEIVED BODY:", req.body);

    if (!req.file) {
      return res.status(400).json({
        error: "No file received. Make sure field name is 'image'.",
      });
    }

    try {
      const result = await processUpload({ file: req.file });
      res.json(result);
    } catch (err) {
      console.error("❌ processUpload failed:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // History
  app.get("/api/history", async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const result = await getHistory({ page, limit });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch history." });
    }
  });

  // Summary
  app.get("/api/summary", async (req, res) => {
    const result = await getDiseaseSummary();
    res.json(result);
  });

  // Disease Info
  app.get("/api/disease-info", async (req, res) => {
    try {
      const info = await getDiseaseInfo();
      res.json(info);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

// Cleanup uploads folder
const uploadsPath = path.join(__dirname, "uploads");

if (fs.existsSync(uploadsPath)) {
  fs.readdirSync(uploadsPath).forEach((file) => {
    const filePath = path.join(uploadsPath, file);
    try {
      if (fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
        console.log(`🗑 Deleted: ${filePath}`);
      }
    } catch {}
  });
} else {
  fs.mkdirSync(uploadsPath);
  console.log("📂 Created missing uploads/ directory");
}

server.listen(PORT, () => {
  console.log(
    `🚀 Server running at http${server instanceof https.Server ? "s" : ""}://localhost:${PORT}`
  );
});
