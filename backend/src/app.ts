import express from "express";
import cors from "cors";
import { sendSuccess } from "./shared/http/index.js";
import { errorHandler } from "./shared/errors/index.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  sendSuccess(res, { status: "ok" });
});

app.use(errorHandler);

export default app;
export { app };
