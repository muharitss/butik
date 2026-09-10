import { z } from "zod";

/**
 * Shared body measurement field vocabulary for MVP.
 * Contains standard English and Indonesian tailoring measurement terms.
 * ponytail: deliberate simplification — static vocabulary set. Adding custom fields
 * requires updating this array or Post-MVP dynamic vocabulary management.
 */
export const MEASUREMENT_FIELD_KEYS = [
  // English standard
  "chest",
  "bust",
  "underbust",
  "waist",
  "hip",
  "shoulder",
  "shoulder_width",
  "sleeve_length",
  "arm_length",
  "inseam",
  "outseam",
  "neck",
  "neck_circumference",
  "wrist",
  "thigh",
  "calf",
  "ankle",
  "torso_length",
  "back_width",
  "front_length",
  "shirt_length",
  "dress_length",
  "pants_length",
  "skirt_length",
  "crotch",
  // Indonesian standard
  "lingkar_dada",
  "lingkar_pinggang",
  "lingkar_pinggul",
  "panjang_baju",
  "panjang_celana",
  "panjang_gaun",
  "panjang_rok",
  "panjang_lengan",
  "lebar_bahu",
  "lebar_punggung",
  "lebar_dada",
  "lingkar_leher",
  "lingkar_kerung_lengan",
  "lingkar_lengan",
  "lingkar_pergelangan",
  "lingkar_paha",
  "lingkar_lutut",
  "lingkar_kaki",
  "pesak",
  "tinggi_duduk",
  "tinggi_punggung",
  "panjang_punggung"
] as const;

export type MeasurementFieldKey = (typeof MEASUREMENT_FIELD_KEYS)[number];
const MEASUREMENT_FIELD_KEYS_SET = new Set<string>(MEASUREMENT_FIELD_KEYS);

export const customerIdParamSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID format")
});

export const measurementValueInputSchema = z.object({
  fieldKey: z
    .string()
    .trim()
    .toLowerCase()
    .refine((key) => MEASUREMENT_FIELD_KEYS_SET.has(key), {
      message: "Unknown measurement field key. Must belong to shared vocabulary."
    }),
  value: z.coerce
    .number({ message: "Measurement value must be a number" })
    .positive("Measurement value must be positive")
    .max(9999.99, "Measurement value exceeds maximum allowable limit (9999.99)"),
  unit: z.string().trim().min(1, "Unit is required").default("cm")
});

export const createMeasurementVersionSchema = z.object({
  measuredAt: z.coerce.date({ message: "Valid measuredAt date is required" }),
  label: z.string().trim().max(100).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  createdBy: z.string().uuid("Invalid user ID format").nullable().optional(),
  values: z
    .array(measurementValueInputSchema)
    .min(1, "At least one measurement value is required")
    .refine(
      (values) => {
        const keys = values.map((v) => v.fieldKey);
        return new Set(keys).size === keys.length;
      },
      { message: "Field keys must be unique within a measurement version" }
    )
});

export type CustomerIdParam = z.infer<typeof customerIdParamSchema>;
export type MeasurementValueInput = z.infer<typeof measurementValueInputSchema>;
export type CreateMeasurementVersionInput = z.infer<typeof createMeasurementVersionSchema>;
