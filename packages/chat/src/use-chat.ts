import { useChat as useBaseChat } from "@ai-sdk/react"
import {
	buildProviderRequestOptions,
	createModelFromChatConfig,
} from "@mdit/ai"
import {
	convertToModelMessages,
	createUIMessageStream,
	createUIMessageStreamResponse,
	DefaultChatTransport,
	stepCountIs,
	streamText,
	type UIMessage,
} from "ai"
import { useCallback, useMemo, useRef } from "react"
import type { ChatMessage } from "./chat"
import {
	createPanelChatTools,
	PANEL_CHAT_TOOLS_SYSTEM_SUFFIX,
	type PanelChatToolDeps,
} from "./panel-chat-tools"

const DEFAULT_SYSTEM_PROMPT =
	"You are a helpful assistant for writing and organizing markdown notes."

export type ChatRuntimeConfig = Parameters<typeof createModelFromChatConfig>[0]

export type UseChatOptions = {
	resolveActiveConfig: () => Promise<ChatRuntimeConfig | null>
	codexBaseUrl: string
	fetch: typeof fetch
	enabled?: boolean
	id?: string
	systemPrompt?: string
	chatHistoryRounds?: number
	/** When set, enables read_active_document; keep deps stable (e.g. memoize in the host). */
	panelChatToolDeps?: PanelChatToolDeps
	onError?: (error: Error) => void
}

export type SendMessagePayload =
	| string
	| {
			text: string
			files?: Array<{ url: string; mediaType?: string; filename?: string }>
	  }

export type UseChatResult = {
	messages: ChatMessage[]
	pending: boolean
	error: string | null
	send: (payload: SendMessagePayload) => Promise<void>
	stop: () => void
	startNewChat: () => void
}

function parseMessageContent(message: UIMessage): {
	content: string
	reasoning?: string
	files?: Array<{ url: string; mediaType?: string; filename?: string }>
} {
	let textContent = ""
	let reasoningContent = ""
	const files: Array<{ url: string; mediaType?: string; filename?: string }> =
		[]

	for (const part of message.parts) {
		if (part.type === "text") {
			textContent += part.text
		} else if (part.type === "reasoning") {
			reasoningContent += (part as any).text ?? (part as any).reasoning ?? ""
		} else if (part.type === "file") {
			files.push({
				url: (part as any).url,
				mediaType: (part as any).mediaType,
				filename: (part as any).filename,
			})
		}
	}

	// Check if textContent contains <think>...</think> (e.g. DeepSeek R1 via standard completions)
	const thinkMatch = textContent.match(/<think>([\s\S]*?)(?:<\/think>|$)/)
	if (thinkMatch) {
		if (!reasoningContent) {
			reasoningContent = thinkMatch[1].trim()
		}
		textContent = textContent
			.replace(/<think>[\s\S]*?(?:<\/think>|$)/, "")
			.trim()
	}

	return {
		content: textContent,
		reasoning: reasoningContent || undefined,
		files: files.length > 0 ? files : undefined,
	}
}

export function useChat(options: UseChatOptions): UseChatResult {
	const {
		resolveActiveConfig,
		codexBaseUrl,
		fetch,
		enabled = true,
		id = "mdit-chat",
		systemPrompt = DEFAULT_SYSTEM_PROMPT,
		chatHistoryRounds = 10,
		panelChatToolDeps,
		onError,
	} = options

	const sessionIdRef = useRef(crypto.randomUUID())

	const panelChatTools = useMemo(
		() =>
			panelChatToolDeps ? createPanelChatTools(panelChatToolDeps) : undefined,
		[panelChatToolDeps],
	)

	const effectiveSystemPrompt = useMemo(
		() =>
			panelChatToolDeps
				? `${systemPrompt}${PANEL_CHAT_TOOLS_SYSTEM_SUFFIX}`
				: systemPrompt,
		[panelChatToolDeps, systemPrompt],
	)

	const transport = useMemo(
		() =>
			new DefaultChatTransport({
				fetch: async (_input, init) => {
					const activeConfig = await resolveActiveConfig()
					if (!activeConfig) {
						throw new Error("AI model is not configured.")
					}

					const model = createModelFromChatConfig(activeConfig, {
						codex: {
							baseURL: codexBaseUrl,
							createSessionId: () => sessionIdRef.current,
							fetch,
							sessionId: sessionIdRef.current,
						},
					})
					const body = JSON.parse(
						typeof init?.body === "string" ? init.body : "{}",
					) as {
						messages?: UIMessage[]
					}
					const allMessages = body.messages ?? []
					const maxMessages = Math.max(2, chatHistoryRounds * 2)
					const messages =
						allMessages.length > maxMessages
							? allMessages.slice(-maxMessages)
							: allMessages
					const abortSignal = init?.signal as AbortSignal | undefined

					const stream = createUIMessageStream({
						execute: async ({ writer }) => {
							const modelMessages = await convertToModelMessages(messages)
							const result = streamText({
								...buildProviderRequestOptions(
									activeConfig.provider,
									effectiveSystemPrompt,
								),
								abortSignal,
								messages: modelMessages,
								model,
								...(activeConfig.maxOutputTokens
									? { maxTokens: activeConfig.maxOutputTokens }
									: {}),
								...(activeConfig.temperature !== undefined
									? { temperature: activeConfig.temperature }
									: {}),
								...(panelChatTools
									? { stopWhen: stepCountIs(5), tools: panelChatTools }
									: {}),
							})

							writer.merge(result.toUIMessageStream())
						},
					})

					return createUIMessageStreamResponse({ stream })
				},
			}),
		[
			codexBaseUrl,
			chatHistoryRounds,
			effectiveSystemPrompt,
			fetch,
			panelChatTools,
			resolveActiveConfig,
		],
	)

	const chat = useBaseChat({
		id,
		transport,
		onError(error) {
			onError?.(error)
		},
	})
	const isPending = chat.status === "submitted" || chat.status === "streaming"

	const messages = useMemo<ChatMessage[]>(
		() =>
			chat.messages.map((message) => {
				const parsed = parseMessageContent(message)
				return {
					id: message.id,
					role: message.role === "user" ? "user" : "assistant",
					content: parsed.content,
					reasoning: parsed.reasoning,
					files: parsed.files,
				}
			}),
		[chat.messages],
	)

	const send = useCallback(
		async (payload: SendMessagePayload) => {
			if (!enabled || isPending) {
				return
			}
			if (typeof payload === "string") {
				const normalized = payload.trim()
				if (!normalized) return
				await chat.sendMessage({ text: normalized })
			} else {
				const normalized = payload.text.trim()
				if (!normalized && (!payload.files || payload.files.length === 0)) {
					return
				}
				await chat.sendMessage({
					text: normalized,
					files: payload.files as any,
				})
			}
		},
		[chat, enabled, isPending],
	)

	const stop = useCallback(() => {
		chat.stop()
	}, [chat])

	const startNewChat = useCallback(() => {
		chat.stop()
		sessionIdRef.current = crypto.randomUUID()
		chat.setMessages([])
		chat.clearError()
	}, [chat])

	return {
		error: chat.error?.message ?? null,
		messages,
		pending: isPending,
		send,
		stop,
		startNewChat,
	}
}
