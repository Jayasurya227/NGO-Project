import { z } from "zod";

// ENUMS
export const UserRole = z.enum(["NGO_ADMIN", "PROGRAM_MANAGER", "FIELD_WORKER", "FINANCE_OFFICER", "DRM", "AUDITOR"]);
export type UserRole = z.infer<typeof UserRole>;

export const TenantStatus = z.enum(["ONBOARDING", "ACTIVE", "SUSPENDED", "CLOSED"]);
export type TenantStatus = z.infer<typeof TenantStatus>;

export const DonorType = z.enum(["CSR", "INDIVIDUAL"]);
export type DonorType = z.infer<typeof DonorType>;

export const Sector = z.enum(["EDUCATION", "HEALTHCARE", "LIVELIHOOD", "ENVIRONMENT", "WATER_SANITATION", "OTHER"]);
export type Sector = z.infer<typeof Sector>;

export const MilestoneStatus = z.enum(["PLANNED", "FUNDED", "IN_PROGRESS", "EVIDENCE_SUBMITTED", "COMPLETED", "OVERDUE"]);
export type MilestoneStatus = z.infer<typeof MilestoneStatus>;

export const JobStatus = z.enum(["QUEUED", "RUNNING", "COMPLETED", "FAILED", "RETRYING"]);
export type JobStatus = z.infer<typeof JobStatus>;

export const StoryVariant = z.enum(["DONOR_SAFE", "PUBLIC_SAFE", "CSR_COMPLIANCE"]);
export type StoryVariant = z.infer<typeof StoryVariant>;

export const StoryApproval = z.enum(["DRAFT", "DIGNITY_REVIEWED", "PM_APPROVED", "ADMIN_APPROVED", "PUBLISHED", "REJECTED"]);
export type StoryApproval = z.infer<typeof StoryApproval>;

// JWT PAYLOAD
export const JwtPayload = z.object({ userId: z.string(), tenantId: z.string(), role: UserRole });
export type JwtPayload = z.infer<typeof JwtPayload>;

// API RESPONSE SHAPES
export const ApiSuccess = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({ success: z.literal(true), data: dataSchema, meta: z.record(z.unknown()).optional() });

export const ApiError = z.object({
  success: z.literal(false),
  error: z.object({ code: z.string(), message: z.string(), details: z.unknown().optional() }),
});

// BULLMQ JOB PAYLOADS
export type RequirementExtractionPayload = { requirementId: string; tenantId: string; documentUrl: string };
export type GapAnalysisPayload = { requirementId: string; tenantId: string };
export type InitiativeMatchingPayload = { requirementId: string; tenantId: string };
export type PitchDeckPayload = { requirementId: string; tenantId: string; approvedMatchIds: string[] };
export type OutreachDraftingPayload = { requirementId: string; tenantId: string; donorId: string; pitchDeckUrl: string };
export type EvidenceVerificationPayload = { evidenceId: string; tenantId: string };
export type OutcomeExtractionPayload = { milestoneId: string; tenantId: string };
export type StoryGenerationPayload = { initiativeId: string; tenantId: string };
export type ReengagementPayload = { donorId: string; tenantId: string };
export type InitiativeEmbeddingPayload = { initiativeId: string; tenantId: string };
export type PaymentProcessingPayload = { razorpayPaymentId: string; amount: number; donorId: string; contractId: string; tenantId: string };
export type NotificationPayload = { tenantId: string; recipientId: string; channel: "EMAIL" | "WHATSAPP" | "IN_APP"; templateId: string; variables: Record<string, string> };
export type ReceiptGenerationPayload = { donationId: string; tenantId: string };

// WEBSOCKET EVENTS
export type WsEvent =
  | { type: "REQUIREMENT_EXTRACTED"; requirementId: string; requiresReview: boolean; lowConfidenceFields: string[] }
  | { type: "GAP_ANALYSIS_COMPLETE"; entityType: string; entityId: string }
  | { type: "MATCH_RESULTS_READY"; requirementId: string; matchCount: number }
  | { type: "PITCH_DECK_READY"; contentArtifactId: string; fileUrl: string; requirementId: string }
  | { type: "EVIDENCE_VERIFIED"; evidenceId: string; milestoneId: string; score: number; flags: string[]; requiresReview: boolean }
  | { type: "STORY_GENERATED"; initiativeId: string; storyIds: string[]; requiresPmReview: boolean }
  | { type: "APPROVAL_REQUIRED"; entityType: string; entityId: string; gateType: string; assignedRole: string }
  | { type: "AGENT_JOB_STATUS"; jobId: string; agentName: string; status: string; latencyMs?: number };
