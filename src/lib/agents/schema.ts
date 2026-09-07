export const AGENT_STATUSES = ["active", "inactive"] as const;
export const AGENT_LIFECYCLE_STATUSES = [
  "draft",
  "unpublished",
  "published",
] as const;
export const INSTRUCTIONS_STATUSES = [
  "pending",
  "analyzing",
  "generating",
  "validating",
  "ready",
  "failed",
] as const;
export const DOCUMENT_STATUSES = [
  "pending",
  "processing",
  "ready",
  "error",
] as const;

export type AgentStatus = (typeof AGENT_STATUSES)[number];
export type AgentLifecycleStatus = (typeof AGENT_LIFECYCLE_STATUSES)[number];
export type InstructionsStatus = (typeof INSTRUCTIONS_STATUSES)[number];
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export type Agent = {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  instructions: string;
  instructions_status: InstructionsStatus;
  instructions_error: string | null;
  instructions_generated_at: string | null;
  instructions_version: number;
  status: AgentStatus;
  lifecycle_status: AgentLifecycleStatus;
  category_id: string | null;
  voice_id: string | null;
  voice_name: string | null;
  configuration: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AgentInput = {
  name: string;
  description: string;
  instructions: string;
  status: AgentStatus;
  lifecycle_status: AgentLifecycleStatus;
  category_id?: string | null;
  voice_id?: string | null;
  voice_name?: string | null;
  configuration?: Record<string, unknown>;
};

export type AgentPatch = Partial<AgentInput>;

export type DocumentKind = "pdf" | "markdown";
export type KnowledgeScope = "shared" | "agent";

export type DocumentMetadata = {
  filename: string;
  type: DocumentKind;
  heading: string | null;
  headings: string[];
};

export type KnowledgeDocument = {
  id: string;
  organization_id: string;
  agent_id: string | null;
  scope: KnowledgeScope;
  filename: string;
  storage_path: string;
  mime_type: string;
  status: DocumentStatus;
  error_message: string | null;
  extracted_text?: string | null;
  metadata: DocumentMetadata | null;
  page_count: number | null;
  file_size: number | null;
  chunk_count: number;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FieldErrors = Partial<Record<keyof AgentInput, string>>;

export type ValidationResult =
  | { ok: true; data: AgentInput }
  | { ok: false; errors: FieldErrors };

export type PatchValidationResult =
  | { ok: true; data: AgentPatch }
  | { ok: false; errors: FieldErrors };

function isStatus(value: string): value is AgentStatus {
  return AGENT_STATUSES.includes(value as AgentStatus);
}

function isLifecycleStatus(value: string): value is AgentLifecycleStatus {
  return AGENT_LIFECYCLE_STATUSES.includes(value as AgentLifecycleStatus);
}

function isInstructionsStatus(value: string): value is InstructionsStatus {
  return INSTRUCTIONS_STATUSES.includes(value as InstructionsStatus);
}

export function isInstructionBusy(status: InstructionsStatus) {
  return (
    status === "analyzing" ||
    status === "generating" ||
    status === "validating"
  );
}

function normalizeInstructionsStatus(value: string): InstructionsStatus {
  if (value === "idle") return "pending";
  if (value === "error") return "failed";
  if (isInstructionsStatus(value)) return value;
  return "pending";
}

function isDocumentStatus(value: string): value is DocumentStatus {
  return DOCUMENT_STATUSES.includes(value as DocumentStatus);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateAgentInput(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      errors: { name: "Invalid payload." },
    };
  }

  const source = body as Record<string, unknown>;
  const data: AgentInput = {
    name: readString(source.name),
    description: readString(source.description),
    instructions: typeof source.instructions === "string" ? source.instructions : "",
    status: isStatus(readString(source.status))
      ? (readString(source.status) as AgentStatus)
      : "active",
    lifecycle_status: isLifecycleStatus(readString(source.lifecycle_status))
      ? (readString(source.lifecycle_status) as AgentLifecycleStatus)
      : "draft",
  };
  if ("category_id" in source) {
    data.category_id =
      typeof source.category_id === "string" && source.category_id.trim()
        ? source.category_id.trim()
        : null;
  }

  const errors = collectErrors(data);
  if (!data.instructions.trim()) {
    errors.instructions = "Instruction is required.";
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, data };
}

export function validateAgentPatch(body: unknown): PatchValidationResult {
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      errors: { name: "Invalid payload." },
    };
  }

  const source = body as Record<string, unknown>;
  const data: AgentPatch = {};

  if ("name" in source) data.name = readString(source.name);
  if ("description" in source) data.description = readString(source.description);
  if ("instructions" in source) {
    data.instructions =
      typeof source.instructions === "string" ? source.instructions : "";
  }
  if ("voice_id" in source) {
    data.voice_id = typeof source.voice_id === "string" ? source.voice_id.trim() || null : null;
  }
  if ("voice_name" in source) {
    data.voice_name = typeof source.voice_name === "string" ? source.voice_name.trim() || null : null;
  }
  if ("category_id" in source) {
    data.category_id =
      typeof source.category_id === "string" && source.category_id.trim()
        ? source.category_id.trim()
        : null;
  }
  if ("configuration" in source && source.configuration && typeof source.configuration === "object") {
    data.configuration = source.configuration as Record<string, unknown>;
  }
  if ("status" in source) {
    const status = readString(source.status);
    if (!isStatus(status)) {
      return { ok: false, errors: { status: "Status must be active or inactive." } };
    }
    data.status = status;
  }
  if ("lifecycle_status" in source) {
    const lifecycleStatus = readString(source.lifecycle_status);
    if (!isLifecycleStatus(lifecycleStatus)) {
      return {
        ok: false,
        errors: { lifecycle_status: "Lifecycle must be draft, unpublished, or published." },
      };
    }
    data.lifecycle_status = lifecycleStatus;
  }

  if (Object.keys(data).length === 0) {
    return { ok: false, errors: { name: "No fields to update." } };
  }

  const errors = collectErrors(data);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, data };
}

function collectErrors(data: AgentPatch): FieldErrors {
  const errors: FieldErrors = {};

  if (data.name !== undefined) {
    if (!data.name) errors.name = "Name is required.";
    else if (data.name.length > 80) errors.name = "Name must be 80 characters or less.";
  }

  if (data.description !== undefined && data.description.length > 280) {
    errors.description = "Description must be 280 characters or less.";
  }

  if (data.instructions !== undefined) {
    if (data.instructions.length > 50_000) {
      errors.instructions = "Instructions must be 50,000 characters or less.";
    } else if (!data.instructions.trim()) {
      errors.instructions = "Instruction cannot be empty.";
    }
  }

  if (data.status !== undefined && !isStatus(data.status)) {
    errors.status = "Status must be active or inactive.";
  }

  if (data.lifecycle_status !== undefined && !isLifecycleStatus(data.lifecycle_status)) {
    errors.lifecycle_status = "Lifecycle must be draft, unpublished, or published.";
  }

  return errors;
}

export function mapAgentRow(row: Record<string, unknown>): Agent {
  const statusValue = readString(row.instructions_status) || "pending";
  return {
    id: String(row.id),
    organization_id: String(
      row.organization_id ?? "a0000000-0000-4000-8000-000000000001",
    ),
    name: String(row.name ?? ""),
    description: typeof row.description === "string" ? row.description : "",
    instructions: typeof row.instructions === "string" ? row.instructions : "",
    instructions_status: normalizeInstructionsStatus(statusValue),
    instructions_error:
      typeof row.instructions_error === "string" ? row.instructions_error : null,
    instructions_generated_at:
      typeof row.instructions_generated_at === "string"
        ? row.instructions_generated_at
        : null,
    instructions_version:
      typeof row.instructions_version === "number" ? row.instructions_version : 0,
    status: isStatus(String(row.status)) ? (row.status as AgentStatus) : "active",
    lifecycle_status: isLifecycleStatus(readString(row.lifecycle_status))
      ? (row.lifecycle_status as AgentLifecycleStatus)
      : "published",
    category_id:
      typeof row.category_id === "string" && row.category_id
        ? row.category_id
        : null,
    voice_id:
      typeof row.voice_id === "string" ? row.voice_id.trim() || null : null,
    voice_name:
      typeof row.voice_name === "string" ? row.voice_name.trim() || null : null,
    configuration:
      row.configuration && typeof row.configuration === "object"
        ? (row.configuration as Record<string, unknown>)
        : {},
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

function isDocumentKind(value: string): value is DocumentKind {
  return value === "pdf" || value === "markdown";
}

function mapDocumentMetadata(value: unknown, filename: string): DocumentMetadata | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const typeValue = readString(source.type);
  const headings = Array.isArray(source.headings)
    ? source.headings.filter((item): item is string => typeof item === "string")
    : [];
  return {
    filename: readString(source.filename) || filename,
    type: isDocumentKind(typeValue) ? typeValue : "pdf",
    heading: typeof source.heading === "string" ? source.heading : null,
    headings,
  };
}

export function mapDocumentRow(
  row: Record<string, unknown>,
  includeText = false,
): KnowledgeDocument {
  const statusValue = readString(row.status) || "pending";
  const filename = String(row.filename ?? "");
  const scope = readString(row.scope) === "shared" ? "shared" : "agent";
  const doc: KnowledgeDocument = {
    id: String(row.id),
    organization_id: String(
      row.organization_id ?? "a0000000-0000-4000-8000-000000000001",
    ),
    agent_id:
      typeof row.agent_id === "string" && row.agent_id ? row.agent_id : null,
    scope,
    filename,
    storage_path: String(row.storage_path ?? ""),
    mime_type: String(row.mime_type ?? "application/pdf"),
    status: isDocumentStatus(statusValue) ? statusValue : "pending",
    error_message: typeof row.error_message === "string" ? row.error_message : null,
    metadata: mapDocumentMetadata(row.metadata, filename),
    page_count: typeof row.page_count === "number" ? row.page_count : null,
    file_size: typeof row.file_size === "number" ? row.file_size : null,
    chunk_count: typeof row.chunk_count === "number" ? row.chunk_count : 0,
    processed_at:
      typeof row.processed_at === "string" ? row.processed_at : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
  if (includeText) {
    doc.extracted_text =
      typeof row.extracted_text === "string" ? row.extracted_text : "";
  }
  return doc;
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
