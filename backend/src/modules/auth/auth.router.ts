import { Router } from "express";
import { validate } from "../../shared/validation/index.js";
import { loginInputSchema, changePasswordSchema } from "./auth.schemas.js";
import { rateLimitLogin } from "./auth.middleware.js";
import {
  loginHandler,
  logoutHandler,
  meHandler,
  changePasswordHandler
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
authRouter.patch(
  "/password",
  validate({ body: changePasswordSchema }),
  changePasswordHandler
);

export { authRouter };
