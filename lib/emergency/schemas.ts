import{z}from"zod";import{emergencySeverities,emergencyTypes}from"./types";
const httpsUrl=z.string().url().startsWith("https://");
export const emergencyInputSchema=z.object({emergency_type:z.enum(emergencyTypes),severity:z.enum(emergencySeverities),
title:z.string().trim().min(1).max(160),message:z.string().trim().min(1).max(5000),affected_account_id:z.string().uuid()}).strict();
export const emergencyUpdateSchema=emergencyInputSchema.omit({affected_account_id:true});
export const replacementSchema=z.object({provider:z.string().trim().min(1).max(40),stable_provider_account_id:z.string().trim().min(1).max(255),
display_handle:z.string().trim().min(1).max(120),canonical_profile_url:httpsUrl}).strict();
export const verificationSchema=replacementSchema.extend({verification_method:z.enum(["oauth","provider_api","dns","manual_review"]),
official:z.boolean().default(true)}).strict();

