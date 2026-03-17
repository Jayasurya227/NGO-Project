import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import pdfParse from "pdf-parse";
import { downloadFile } from "@ngo/storage";
import { createAndStartServer } from "../shared/create-server";

function registerTools(server: McpServer) {
  server.tool(
    "extract_text_from_pdf",
    "Extract all readable text from a PDF stored in S3. Returns plain text.",
    {
      s3Key: z.string().describe("The S3 key of the PDF file"),
      maxCharacters: z.number().default(12000).describe("Truncate output to this length"),
    },
    async ({ s3Key, maxCharacters }) => {
      let buffer: Buffer;
      try {
        buffer = await downloadFile(s3Key);
      } catch {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "FILE_NOT_FOUND", text: null }) }] };
      }

      let extractedText = "";
      try {
        const parsed = await pdfParse(buffer);
        extractedText = parsed.text;
      } catch {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "PARSE_FAILED", text: null, hint: "PDF may be scanned or encrypted." }) }] };
      }

      const cleaned = extractedText
        .replace(/\n{3,}/g, "\n\n")
        .replace(/[ \t]+/g, " ")
        .trim()
        .slice(0, maxCharacters);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ text: cleaned, charCount: cleaned.length, wasTruncated: extractedText.length > maxCharacters, error: null }),
        }],
      };
    }
  );

  server.tool(
    "get_document_metadata",
    "Extract metadata from a PDF without full text extraction",
    { s3Key: z.string() },
    async ({ s3Key }) => {
      const buffer = await downloadFile(s3Key);
      const parsed = await pdfParse(buffer, { max: 0 });
      return { content: [{ type: "text" as const, text: JSON.stringify({ pageCount: parsed.numpages, info: parsed.info }) }] };
    }
  );
}

createAndStartServer("ngo-document", "1.0.0", registerTools);