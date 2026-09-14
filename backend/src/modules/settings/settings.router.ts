import { Router } from "express";
import { validate } from "../../shared/validation/index.js";
import { authorize } from "../../shared/auth/authorize.js";
import { updateStoreSettingsSchema } from "./settings.schemas.js";
import {
  getStoreSettingsHandler,
  updateStoreSettingsHandler
} from "./settings.handlers.js";

const settingsRouter = Router();

// GET /api/settings - any authenticated user
settingsRouter.get("/", getStoreSettingsHandler);

// PATCH /api/settings - owner only
settingsRouter.patch(
  "/",
  authorize("settings:manage"),
  validate({ body: updateStoreSettingsSchema }),
  updateStoreSettingsHandler
);

export { settingsRouter };
