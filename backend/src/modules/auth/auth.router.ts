import { Router } from "express";
import { validate } from "../../shared/validation/index.js";
import { loginInputSchema } from "./auth.schemas.js";
import { rateLimitLogin } from "./auth.middleware.js";
import {
  loginHandler,
  logoutHandler,
  meHandler
} from "./auth.handlers.js";

const authRouter = Router();

authRouter.post(
  "/login",
  rateLimitLogin(),
  validate({ body: loginInputSchema }),
  loginHandler
);

authRouter.post("/logout", logoutHandler);
authRouter.get("/me", meHandler);

export { authRouter };
