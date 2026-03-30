import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis('redis://:ngo_redis_pass@localhost:6379/0');

const reqQueue = new Queue('requirement-extraction', { connection });

async function check() {
  const wait = await reqQueue.getWaitingCount();
  const act = await reqQueue.getActiveCount();
  const fail = await reqQueue.getFailedCount();
  const comp = await reqQueue.getCompletedCount();
  const del = await reqQueue.getDelayedCount();
  
  console.log('Requirement Extraction Queue:');
  console.log(`Waiting: ${wait}, Active: ${act}, Failed: ${fail}, Completed: ${comp}, Delayed: ${del}`);
  
  if (fail > 0) {
    const failedJobs = await reqQueue.getFailed();
    console.log('Failed job reason:', failedJobs[0].failedReason);
  }
}

check().then(() => process.exit(0)).catch(console.error);
