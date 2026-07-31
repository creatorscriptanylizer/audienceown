import { z } from "zod";
import { emergencySeverities, emergencyTypes } from "./types";

const uuid = z.string().uuid();
const name = z.string().trim().min(1).max(120);
const title = z.string().trim().min(1).max(160);
const message = z.string().trim().min(1).max(5000);
const optionalHttps = z.string().url().startsWith("https://").nullable().optional();

export const templateSchema = z.object({ name, emergency_type: z.enum(emergencyTypes), severity: z.enum(emergencySeverities), title_template: title, message_template: message, default_affected_account_id: uuid.nullable().optional() }).strict();
export const templatePatchSchema = templateSchema.partial().refine((value) => Object.keys(value).length > 0);
export const planSchema = z.object({ template_id: uuid.nullable().optional(), name, affected_account_id: uuid, emergency_type: z.enum(emergencyTypes), severity: z.enum(emergencySeverities), title, message, proposed_replacement_provider: z.string().trim().min(1).max(40).nullable().optional(), proposed_replacement_handle: z.string().trim().min(1).max(120).nullable().optional(), proposed_replacement_url: optionalHttps, notes: z.string().max(5000).nullable().optional() }).strict();
export const planPatchSchema = planSchema.partial().refine((value) => Object.keys(value).length > 0);
export const drillSchema = z.object({ source_plan_id: uuid, drill_mode: z.enum(["readiness", "full_activation"]).default("readiness"), idempotency_key: z.string().min(8).max(200).optional() }).strict();
export const preparedEmergencySchema = z.object({ source_template_id: uuid.optional(), source_plan_id: uuid.optional(), affected_account_id: uuid.optional(), idempotency_key: z.string().min(8).max(200).optional() }).strict().refine((value) => Boolean(value.source_template_id) !== Boolean(value.source_plan_id), "Choose exactly one prepared source");
