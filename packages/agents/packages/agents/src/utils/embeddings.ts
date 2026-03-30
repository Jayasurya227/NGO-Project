import { VertexAI } from '@google-cloud/vertexai';

const projectId = process.env.GCP_PROJECT || 'inspire-education-489506';
const location = process.env.GCP_LOCATION || 'us-central1';
const model = process.env.GOOGLE_EMBEDDING_MODEL || 'text-embedding-004';

const vertexAI = new VertexAI({ project: projectId, location: location });

/**
 * Generate text embedding using Google Vertex AI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const embeddingModel = vertexAI.preview.getGenerativeModel({
    model: model,
  });

  const request = {
    content: [{ role: 'user', parts: [{ text }] }],
  };

  const result = await embeddingModel.generateContent(request);
  
  // Extract embedding from response
  const embedding = result.response.candidates[0].content.parts[0].text;
  
  return JSON.parse(embedding);
}