import { z } from "zod";

export const measurementFieldInputSchema = z.object({
  fieldKey: z
    .string()
    .trim()
    .min(1, "Field key is required")
    .regex(/^[a-z0-9_]+$/, "Field key must be lowercase snake_case (letters, numbers, and underscores)"),
  label: z.string().trim().min(1, "Field label is required"),
  unit: z.string().trim().min(1, "Unit is required"),
  isRequired: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0)
});

export const garmentTypeIdParamSchema = z.object({
  id: z.string().uuid("Invalid garment type ID format")
});

export const garmentTypeQuerySchema = z.object({
  includeInactive: z.preprocess((val) => val === "true" || val === true, z.boolean()).default(false),
  q: z.string().trim().optional()
});

export const createGarmentTypeSchema = z.object({
  name: z.string().trim().min(1, "Garment type name is required"),
  description: z.string().trim().nullable().optional(),
  isActive: z.boolean().optional().default(true),
  measurementFields: z
    .array(measurementFieldInputSchema)
    .optional()
    .default([])
    .refine(
      (fields) => {
        if (!fields) return true;
        const keys = fields.map((f) => f.fieldKey.toLowerCase());
        return new Set(keys).size === keys.length;
      },
      { message: "Field keys must be unique within a garment type" }
    )
});

export const updateGarmentTypeSchema = z
  .object({
    name: z.string().trim().min(1, "Garment type name cannot be empty").optional(),
    description: z.string().trim().nullable().optional(),
    isActive: z.boolean().optional(),
    measurementFields: z
      .array(measurementFieldInputSchema)
      .optional()
      .refine(
        (fields) => {
          if (!fields) return true;
          const keys = fields.map((f) => f.fieldKey.toLowerCase());
          return new Set(keys).size === keys.length;
        },
        { message: "Field keys must be unique within a garment type" }
      )
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update"
  });

export type MeasurementFieldInput = z.infer<typeof measurementFieldInputSchema>;
export type CreateGarmentTypeInput = z.infer<typeof createGarmentTypeSchema>;
export type UpdateGarmentTypeInput = z.infer<typeof updateGarmentTypeSchema>;
export type GarmentTypeQueryParams = z.infer<typeof garmentTypeQuerySchema>;
export type GarmentTypeIdParam = z.infer<typeof garmentTypeIdParamSchema>;
