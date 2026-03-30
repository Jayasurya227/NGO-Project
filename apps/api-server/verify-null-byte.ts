import { prisma } from '@ngo/database';

async function verify() {
  const token = (await fetch("http://localhost:4000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@shiksha.test", password: "TestPass123!", subdomain: "shiksha-foundation" })

  }).then(r => r.json())).data.accessToken;

  console.log("--- Testing NULL BYTE Sanitization ---");
  const res = await fetch("http://localhost:4000/api/initiatives", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      title: "Clean Title \u0000 with junk",
      sector: "EDUCATION",
      geography: { state: "Maharashtra", lat: 19.0, lng: 72.8 },
      description: "A valid description for the initiative with some length.",
      targetBeneficiaries: 100,
      budgetRequired: 50000,
      sdgTags: ["QUALITY_EDUCATION"]
    })
  }).then(r => r.json());

  if (res.success) {
    console.log("✅ Initiative Created Successfully with Null Byte!");
    console.log("Title in DB:", res.data.title);
    if (res.data.title.includes('\u0000')) {
      console.log("❌ Title still contains null byte!");
    } else {
      console.log("✅ Title is sanitized.");
    }
  } else {
    console.log("❌ Creation failed:", JSON.stringify(res.error));
  }
}
verify().catch(console.error);
