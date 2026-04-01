# Matching Agent — Design Notes

## Overview
The Matching Agent takes a validated requirement with extracted fields and returns
a ranked list of up to 5 initiative matches with explanations.

## State Machine
1. load_requirement_node    → Load extracted fields from DB
2. embed_requirement_node   → Call Vertex AI embeddings on requirement text
3. vector_search_node       → pgvector cosine search, top 20 candidates
4. score_candidates_node    → Apply weighted scoring to each candidate
5. explain_top5_node        → Gemini generates plain-English explanation for each
6. persist_results_node     → Save MatchResult rows to DB

## Scoring Formula
overallScore = (sector x 0.30) + (geography x 0.25) + (budget x 0.20) + (kpi x 0.15) + (track x 0.10)

All sub-scores are 0-100. The explanation node only runs on the top 5 after scoring.

## Key Technical Challenges
1. Vector search needs pgvector raw query (Prisma does not support vector ops natively)
2. Scoring function must handle null values gracefully (use 50 as default for missing fields)
3. Explanation generation: pass initiative data + requirement fields to Gemini,
   ask for 2-sentence explanation of why this is a good or poor match
4. Must NOT generate embeddings inside the matching agent — use queues.initiativeEmbedding
   to ensure all initiatives are embedded before matching runs
5. Embeddings use Vertex AI text-embedding-004 with 768 dimensions

## Integration Contract
Input:  { requirementId: string; tenantId: string }
Output: Array of MatchResult rows saved to DB
WS Event: MATCH_RESULTS_READY { requirementId, matchCount }

## AI Models Used
- Embeddings: Vertex AI text-embedding-004 (768 dimensions)
- Chat/Extraction: Gemini 2.0 Flash (gemini-2.0-flash-001)
- Project: inspire-education-489506
- Location: us-central1