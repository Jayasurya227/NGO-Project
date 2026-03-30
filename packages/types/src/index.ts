// src/index.ts

export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
}

export interface RequirementExtractionPayload {
  requirementId: string;
  tenantId: string;
  documentUrl: string;
}

export interface EvidenceVerificationPayload {
  evidenceId: string;
  tenantId: string;
}

export interface PaymentProcessingPayload {
  razorpayPaymentId: string;
  amount: number;
  donorId: string;
  contractId: string;
  tenantId: string;
}

export type WsEvent =
  | { type: 'CONNECTED'; tenantId: string }
  | { type: 'AGENT_JOB_STATUS'; jobId: string; agentName: string; status: string }
  | { type: 'EVIDENCE_VERIFIED'; evidenceId: string; status: string }
  | {
      type: 'REQUIREMENT_EXTRACTED';
      requirementId: string;
      extractedData?: any;
      requiresReview: boolean;
      lowConfidenceFields?: string[];
    }
  | {
      type: 'APPROVAL_REQUIRED';
      entityType: string;
      entityId: string;
      gateType: string;
      assignedRole: string;
    }
  | { type: 'PAYMENT_PROCESSED'; paymentId: string; status: string }
  | { type: 'STORY_CREATED'; storyId: string; title: string }
  | { type: 'MATCH_RESULTS_READY'; requirementId: string; matchCount: number }
  | { type: 'ALLOCATION_UPDATED'; allocationId: string; amount: number };

export enum UserRole {
  ADMIN = 'ADMIN',
  DRM = 'DRM',
  FIELD_WORKER = 'FIELD_WORKER',
  DONOR = 'DONOR',
}

export enum MilestoneStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}
