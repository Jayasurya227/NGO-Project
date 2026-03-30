import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const p = new PrismaClient();

async function test() {
  const tenant = await p.tenant.findFirst({ where: { subdomain: 'shiksha-foundation' } });
  const donor = await p.donor.findFirst({ where: { tenantId: tenant!.id } });
  
  // LOGIN to get token
  const loginRes = await axios.post('http://localhost:4000/api/auth/donor-login', {
    email: 'test@test.com',
    password: 'test',
    subdomain: 'shiksha-foundation'
  });
  const token = loginRes.data.data.token;

  // UPLOAD
  const form = new FormData();
  form.append('file', fs.createReadStream('c:/Users/pavan/Desktop/NGO_IMPACT/apps/api-server/test-rfp.txt'));
  
  const uploadRes = await axios.post('http://localhost:4000/api/requirements/upload', form, {
    headers: {
      ...form.getHeaders(),
      'Authorization': `Bearer ${token}`
    }
  });

  console.log('Upload status:', uploadRes.status);
  console.log('Upload Response:', uploadRes.data);

  // CHECK DB
  const req = await p.sponsorRequirement.findFirst({
    where: { id: uploadRes.data.data.requirementId }
  });
  console.log('Database Record:', req ? 'FOUND' : 'NOT FOUND');
  console.log('Record Status:', req?.status);
}

test().catch(err => console.error(err.response?.data || err)).finally(() => p.$disconnect());
