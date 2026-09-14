import { Router } from "express";
import { validate } from "../../shared/validation/index.js";
import { authorize } from "../../shared/auth/authorize.js";
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema
} from "./users.schemas.js";
import {
  listUsersHandler,
  createUserHandler,
  updateUserHandler,
  deactivateUserHandler,
  activateUserHandler,
  resetUserPasswordHandler
} from "./users.handlers.js";

const usersRouter = Router();

// All user management routes require 'users:manage' permission (owner role)
usersRouter.use(authorize("users:manage"));

usersRouter.get("/", listUsersHandler);
usersRouter.post("/", validate({ body: createUserSchema }), createUserHandler);
usersRouter.patch("/:id", validate({ body: updateUserSchema }), updateUserHandler);
usersRouter.patch("/:id/deactivate", deactivateUserHandler);
usersRouter.patch("/:id/activate", activateUserHandler);
usersRouter.patch(
  "/:id/password",
  validate({ body: resetPasswordSchema }),
  resetUserPasswordHandler
);

export { usersRouter };
