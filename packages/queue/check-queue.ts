
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis('redis://:ngo_redis_pass@localhost:6379/0', {
  maxRetriesPerRequest: null,
});

async function main() {
  const q = new Queue('requirement-extraction', { connection });
  const counts = await q.getJobCounts('wait', 'active', 'completed', 'failed', 'delayed', 'paused');
  console.log('Queue: requirement-extraction');
  console.log(JSON.stringify(counts, null, 2));

  const j4 = await q.getJob('4');
  if (j4) {
    console.log('\nJob 4:');
    console.log(JSON.stringify({
        id: j4.id,
        status: await j4.getState(),
        finishedOn: j4.finishedOn ? new Date(j4.finishedOn) : null,
        failedReason: j4.failedReason
    }, null, 2));
  } else {
    console.log('\nJob 4 not found');
  }
}

main().catch(console.error).finally(() => {
    connection.disconnect();
    process.exit(0);
});
