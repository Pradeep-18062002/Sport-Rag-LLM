import { DataAPIClient } from "@datastax/astra-db-ts";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { Document } from "@langchain/core/documents";
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import "dotenv/config";

type SimilarityMetric = "dot_product" | "cosine" | "euclidean";

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  OPENAI_API_KEY
} = process.env;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE });

async function processDocument(pdfBuffer: Buffer): Promise<Document[]> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pdf-upload-"));
  const tempFilePath = path.join(tempDir, `uploaded-${Date.now()}.pdf`);
  fs.writeFileSync(tempFilePath, pdfBuffer);
  const loader = new PDFLoader(tempFilePath);
  const docs = await loader.load();
  fs.unlinkSync(tempFilePath);
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 400,
    chunkOverlap: 100,
    separators: ["\n\n", "\n", ".", "?", "!", " ", ""],
  });
  return await splitter.splitDocuments(docs);
}

async function setupCollection() {
  try {
    const collections = await db.listCollections();
    const exists = collections.some((col) => col.name === ASTRA_DB_COLLECTION);

    if (!exists) {
      // Create collection only if it doesn't exist
      await db.createCollection(ASTRA_DB_COLLECTION!, {
        vector: {
          dimension: 1536,
          metric: "dot_product",
        },
      });
      console.log("New collection created successfully");
    } else {
      console.log("Using existing collection");
    }
    
    return await db.collection(ASTRA_DB_COLLECTION!);
  } catch (error) {
    console.error("Error setting up collection:", error);
    throw error;
  }
}

async function generateEmbedding(text: string): Promise<number[]> {
  let retries = 3;
  while (retries > 0) {
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      retries--;
      console.log(`Embedding API error, retries left: ${retries}`);
      if (retries === 0) throw error;
      
      // Wait longer before retry for API issues
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  throw new Error("Failed to generate embedding after all retries");
}

async function addToCollection(docs: Document[]) {
  const collection = await setupCollection();
  
  console.log(`Adding ${docs.length} documents to collection...`);
  
  // Process in larger batches for speed
  const batchSize = 10;
  
  for (let batchStart = 0; batchStart < docs.length; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, docs.length);
    const batch = docs.slice(batchStart, batchEnd);
    
    console.log(`Processing batch ${Math.floor(batchStart/batchSize) + 1}/${Math.ceil(docs.length/batchSize)} (documents ${batchStart + 1}-${batchEnd})`);
    
    // Process multiple documents in parallel within each batch
    const batchPromises = batch.map(async (doc, i) => {
      const docIndex = batchStart + i;
      
      try {
        const embedding = await generateEmbedding(doc.pageContent);
        
        await collection.insertOne({
          _id: `doc_${Date.now()}_${docIndex}_${Math.random().toString(36).substr(2, 9)}`,
          content: doc.pageContent,
          metadata: doc.metadata,
          $vector: embedding,
        });
        
        return `Document ${docIndex + 1} processed`;
      } catch (error) {
        console.error(`Failed to process document ${docIndex + 1}:`, error);
        return `Document ${docIndex + 1} failed`;
      }
    });
    
    // Wait for all documents in this batch to complete
    const results = await Promise.all(batchPromises);
    console.log(`Batch ${Math.floor(batchStart/batchSize) + 1} completed: ${results.length} documents processed`);
    
    // Much shorter delay between batches (only 200ms)
    if (batchEnd < docs.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  console.log("Document processing completed!");
}

export async function handlePdfUpload(pdfBuffer: Buffer) {
  try {
    const chunks = await processDocument(pdfBuffer);
    console.log(`Extracted ${chunks.length} chunks from PDF`);
    await addToCollection(chunks);
    console.log("PDF processing completed successfully!");
  } catch (error) {
    console.error("Error in handlePdfUpload:", error);
    throw error;
  }
}