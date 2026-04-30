# RAG Architecture — Two Separate Pipelines


these rag is just for idea purpose , every below idea is already built in n8n 

caution = don't build rag , i is alreday built in n8n 


## PIPELINE 1 — DOCUMENT RAG
For: Leases, compliance docs, inspection reports, court orders, RERA circulars

Trigger: Document uploaded via /app/documents/upload
↓
LlamaParse — high-res OCR, premium mode, GPT-4o model
↓
Authority-Aware Chunker (semantic chunking)
- Chunk type detection: text | code | table | heading | qa_pair
- Neighbour pointers (prev_chunk_id, next_chunk_id)
- Authority metadata injected per chunk
↓
Gemini embedding-001 (768-dim dense vector)
BM25 sparse vector (keyword)
↓
Qdrant collection: document_rag
- Dense: gemini_ai_small (768-dim, Cosine)
- Sparse: bm25 (IDF modifier)
↓
Authority-weighted hybrid search on query (RRF fusion)
↓
LLM synthesis (top-down by authority level)

Payload per chunk:
- chunk_id, doc_id, page_start, chapter, section
- content_type, topics, entities
- authority_level (1-7), authority_category
- is_binding, jurisdiction, doc_date
- prev_chunk_id, next_chunk_id
- organization_id (for multi-tenant isolation)

---

## PIPELINE 2 — EXCEL / TABLE RAG
For: Property lists, maintenance logs, financial data, rent rolls, inventory

Trigger: Excel/CSV uploaded via /app/documents/upload
↓
LlamaParse (spreadsheet mode: adaptive_long_table, sub_tables)
OR direct CSV parsing for clean files
↓
Row/column semantic understanding
Table structure preserved as markdown chunks
Header metadata attached to every row chunk
↓
Gemini embedding-001 (768-dim)
BM25 sparse
↓
Qdrant collection: table_rag
↓
For structured queries → Supabase SQL (exact filters)
For semantic queries → Qdrant search (natural language)
For hybrid → both merged

Payload per chunk:
- source_file, sheet_name, row_range
- column_headers
- numeric_fields (for range filtering)
- organization_id

---

## QUERY ROUTING LOGIC

Query arrives
↓
Classifier (Gemini):
- "structured" → pure SQL on Supabase
- "semantic_doc" → Document RAG (Qdrant: document_rag)
- "semantic_table" → Table RAG (Qdrant: table_rag)
- "hybrid" → SQL + RAG merged
↓
Per-category search (Document RAG only)
↓
Authority-weighted RRF fusion
↓
Context formatted top-down by authority
↓
LLM answer with source citations