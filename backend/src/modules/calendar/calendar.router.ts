import { Router } from "express";
import { validate } from "../../shared/validation/index.js";
import { calendarEventsQuerySchema } from "./calendar.schemas.js";
import { getCalendarEventsHandler } from "./calendar.handlers.js";

const calendarRouter = Router();

calendarRouter.get(
  "/events",
  validate({ query: calendarEventsQuerySchema }),
  getCalendarEventsHandler
);

export { calendarRouter };
export default calendarRouter;
