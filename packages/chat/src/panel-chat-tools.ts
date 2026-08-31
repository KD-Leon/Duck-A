import { jsonSchema, type ToolSet, tool } from "ai"

export type PanelChatToolDeps = {
	readTextFile: (path: string) => Promise<string>
	getActiveDocumentPath: () => string | null
}

type ReadDocumentResult = {
	path: string | null
	content: string | null
	error: string | null
}

const MAX_ACTIVE_DOCUMENT_LENGTH = 4000

export const PANEL_CHAT_TOOLS_SYSTEM_SUFFIX = `
You have access to tools for interacting with the user's workspace notes:
- read_active_document: Reads the note currently open in the active editor tab.
- read_specified_document: Reads any markdown document specified by its file path or filename.
Use these tools when the user's question asks to inspect, summarize, analyze, or compare notes.`

export function createPanelChatTools(deps: PanelChatToolDeps): ToolSet {
	return {
		read_active_document: tool({
			description:
				"Read the markdown (or text) file open in the user's active editor tab from disk. Call when answering requires the active document contents.",
			inputSchema: jsonSchema({
				type: "object",
				properties: {},
				additionalProperties: false,
			}),
			execute: async (): Promise<ReadDocumentResult> => {
				const path = deps.getActiveDocumentPath()
				if (!path) {
					return {
						path: null,
						content: null,
						error: "No active document tab.",
					}
				}

				try {
					const raw = await deps.readTextFile(path)
					const content =
						raw.length > MAX_ACTIVE_DOCUMENT_LENGTH
							? `${raw.slice(0, MAX_ACTIVE_DOCUMENT_LENGTH)}\n...`
							: raw

					return { path, content, error: null }
				} catch (error) {
					const message =
						error instanceof Error && error.message
							? error.message
							: "Failed to read active document."
					return { path, content: null, error: message }
				}
			},
		}),
		read_specified_document: tool({
			description:
				"Read a specific markdown note or file by its relative or absolute path.",
			inputSchema: jsonSchema({
				type: "object",
				properties: {
					filePath: {
						type: "string",
						description: "The file path of the markdown document to read.",
					},
				},
				required: ["filePath"],
				additionalProperties: false,
			}),
			execute: async ({
				filePath,
			}: {
				filePath: string
			}): Promise<ReadDocumentResult> => {
				try {
					const raw = await deps.readTextFile(filePath)
					const content =
						raw.length > MAX_ACTIVE_DOCUMENT_LENGTH
							? `${raw.slice(0, MAX_ACTIVE_DOCUMENT_LENGTH)}\n...`
							: raw

					return { path: filePath, content, error: null }
				} catch (error) {
					const message =
						error instanceof Error && error.message
							? error.message
							: `Failed to read document at ${filePath}.`
					return { path: filePath, content: null, error: message }
				}
			},
		}),
	}
}
