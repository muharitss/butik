import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";

export interface RequestValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

export function validate(schemas: RequestValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        const parsedQuery = schemas.query.parse(req.query);
        Object.defineProperty(req, "query", {
          value: parsedQuery,
          writable: true,
          configurable: true,
          enumerable: true
        });
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as Request["params"];
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

export const validateBody = (schema: ZodType) => validate({ body: schema });
export const validateQuery = (schema: ZodType) => validate({ query: schema });
export const validateParams = (schema: ZodType) => validate({ params: schema });
