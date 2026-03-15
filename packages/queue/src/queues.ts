import Bull from 'bull'

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
}

export const emailQueue = new Bull('email', { redis: redisConfig })
export const reportQueue = new Bull('report', { redis: redisConfig })
export const auditQueue = new Bull('audit', { redis: redisConfig })

emailQueue.process(async (job) => {
  console.log('Processing email job:', job.data)
  return { sent: true, to: job.data.to }
})

reportQueue.process(async (job) => {
  console.log('Processing report job:', job.data)
  return { generated: true, reportId: job.data.reportId }
})

auditQueue.process(async (job) => {
  console.log('Processing audit job:', job.data)
  return { logged: true }
})

export async function addEmailJob(data: { to: string; subject: string; body: string }) {
  return emailQueue.add(data, { attempts: 3, backoff: 5000 })
}

export async function addReportJob(data: { reportId: string; tenantId: string }) {
  return reportQueue.add(data, { attempts: 3, backoff: 5000 })
}

export async function addAuditJob(data: { action: string; userId: string; tenantId: string; details: string }) {
  return auditQueue.add(data)
}