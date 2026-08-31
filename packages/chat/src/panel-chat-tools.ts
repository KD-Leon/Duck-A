import { jsonSchema, type ToolSet, tool } from "ai"

export type PanelChatToolDeps = {
	readTextFile: (path: string) => Promise<string>
	getActiveDocumentPath: () => string | null
	writeTextFile?: (path: string, content: string) => Promise<void>
	searchNotes?: (
		query: string,
	) => Promise<Array<{ path: string; name: string; snippet?: string }>>
	createNote?: (name: string, content: string) => Promise<string>
}

type ReadDocumentResult = {
	path: string | null
	content: string | null
	error: string | null
}

const MAX_ACTIVE_DOCUMENT_LENGTH = 4000

export const PANEL_CHAT_TOOLS_SYSTEM_SUFFIX = `
【工作区工具调用准则 / Tools Action Guidelines】:
你拥有直接访问与操作用户本地工作区笔记的工具集：
1. search_vault_notes({ query }): 搜索工作区中所有笔记的标题与内容。当用户提及工作区知识、询问某主题、或者需要了解已有哪些笔记时，必须立即调用此工具搜索笔记，绝不要空口说“我先去查查”，而是先直接行动调用工具！
2. read_active_document(): 读取当前正在打开的编辑器文档全文。
3. read_specified_document({ filePath }): 读取指定路径或文件名的笔记内容。
4. create_new_document({ title, content }): 直接在工作区创建新的 Markdown 笔记。
5. append_to_active_document({ content }): 向当前打开的笔记末尾追加内容。

【行动优先原则 / Action First】:
- 当用户要求搜索、查找、整理、总结或创建笔记时，请在回答前直接发起对应的 Tool Call，获取真实数据后再输出综合解答！
- 严禁仅在纯文本中承诺“我稍后去查”，必须在当前回合立即调用工具！`

export function createPanelChatTools(deps: PanelChatToolDeps): ToolSet {
	const tools: ToolSet = {
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

	if (deps.searchNotes) {
		const searchNotesFn = deps.searchNotes
		tools.search_vault_notes = tool({
			description:
				"Search across all notes in the workspace by query keywords or semantic topics.",
			inputSchema: jsonSchema({
				type: "object",
				properties: {
					query: {
						type: "string",
						description: "The search keywords or query.",
					},
				},
				required: ["query"],
				additionalProperties: false,
			}),
			execute: async ({ query }: { query: string }) => {
				try {
					const results = await searchNotesFn(query)
					return {
						results: results.slice(0, 10),
						count: results.length,
						error: null,
					}
				} catch (error) {
					const message =
						error instanceof Error && error.message
							? error.message
							: "Failed to search vault notes."
					return { results: [], count: 0, error: message }
				}
			},
		})
	}

	if (deps.createNote) {
		const createNoteFn = deps.createNote
		tools.create_new_document = tool({
			description:
				"Create a new markdown note in the workspace with the given title and content.",
			inputSchema: jsonSchema({
				type: "object",
				properties: {
					title: {
						type: "string",
						description: "The title or filename of the new note (without .md).",
					},
					content: {
						type: "string",
						description: "The initial markdown content of the note.",
					},
				},
				required: ["title", "content"],
				additionalProperties: false,
			}),
			execute: async ({
				title,
				content,
			}: {
				title: string
				content: string
			}) => {
				try {
					const path = await createNoteFn(title, content)
					return { success: true, path, error: null }
				} catch (error) {
					const message =
						error instanceof Error && error.message
							? error.message
							: "Failed to create note."
					return { success: false, path: null, error: message }
				}
			},
		})
	}

	if (deps.writeTextFile) {
		const writeTextFileFn = deps.writeTextFile
		tools.append_to_active_document = tool({
			description:
				"Append markdown text to the end of the user's currently focused editor tab.",
			inputSchema: jsonSchema({
				type: "object",
				properties: {
					content: {
						type: "string",
						description: "The markdown text content to append.",
					},
				},
				required: ["content"],
				additionalProperties: false,
			}),
			execute: async ({ content }: { content: string }) => {
				const path = deps.getActiveDocumentPath()
				if (!path) {
					return { success: false, error: "No active document tab open." }
				}
				try {
					const current = await deps.readTextFile(path)
					const updated = `${current}\n\n${content}`
					await writeTextFileFn(path, updated)
					return { success: true, path, error: null }
				} catch (error) {
					const message =
						error instanceof Error && error.message
							? error.message
							: "Failed to append to active document."
					return { success: false, error: message }
				}
			},
		})
	}

	return tools
}
