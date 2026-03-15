export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return {
    success: true as const,
    data,
    ...(meta && { meta }),
  };
}

export function err(code: string, message: string, details?: unknown) {
  return {
    success: false as const,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  };
}

export function paged<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return ok(data, {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

export function accepted(jobId: string, estimatedSeconds = 30) {
  return ok({
    jobId,
    status: 'QUEUED',
    estimatedCompletionSeconds: estimatedSeconds,
  });
}
