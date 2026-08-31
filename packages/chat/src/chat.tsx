import { Button } from "@mdit/ui/components/button"
import { cn } from "@mdit/ui/lib/utils"
import {
	IconBolt,
	IconBug,
	IconBulb,
	IconCheck,
	IconCopy,
	IconCursorText,
	IconDownload,
	IconFileDescription,
	IconFilePlus,
	IconFileText,
	IconHistory,
	IconListCheck,
	IconPaperclip,
	IconPencil,
	IconRobot,
	IconSparkles,
	IconTable,
	IconTrash,
	IconX,
} from "@tabler/icons-react"
import type { ReactNode } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"

import {
	Conversation,
	ConversationContent,
	ConversationEmptyState,
} from "./ui/conversation"
import { Message, MessageContent, MessageResponse } from "./ui/message"
import {
	PromptInput,
	PromptInputButton,
	PromptInputFooter,
	PromptInputHeader,
	type PromptInputMessage,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputTools,
	usePromptInputAttachments,
} from "./ui/prompt-input"
import { ThinkingBlock } from "./ui/thinking-block"
import { type ChatSession, type UseChatOptions, useChat } from "./use-chat"

export type ChatMessage = {
	id: string
	role: "user" | "assistant"
	content: string
	reasoning?: string
	files?: Array<{ url: string; mediaType?: string; filename?: string }>
}

export type ChatToolsRenderProps = {
	pending: boolean
	error: string | null
}

export type ChatLabels = {
	newChat?: string
	noMessages?: string
	startConversation?: string
	aiSettings?: string
	askAssistant?: string
	attachImage?: string
	thinking?: string
	thoughtProcess?: string
}

export type AttachedContextFile = {
	path: string
	name: string
}

export type NoteMentionItem = {
	path: string
	name: string
}

export type ChatProps = UseChatOptions & {
	tools?: ReactNode | ((props: ChatToolsRenderProps) => ReactNode)
	className?: string
	onOpenSettings?: () => void
	labels?: ChatLabels
	supportsVision?: boolean
	activeDocumentName?: string | null
	attachedContextFiles?: AttachedContextFile[]
	availableNotes?: NoteMentionItem[]
	onAddContextFile?: (file: AttachedContextFile) => void
	onRemoveContextFile?: (path: string) => void
	onClearContextFiles?: () => void
	resolveContextSnippet?: () => Promise<string | null>
	onInsertAtCursor?: (content: string) => void | Promise<void>
	onInsertToActiveNote?: (content: string) => void | Promise<void>
	onCreateNewNote?: (content: string) => void | Promise<void>
	onExportChat?: (markdown: string, title: string) => void | Promise<void>
}

const CHAT_SESSIONS_STORAGE_KEY = "mdit_ai_chat_sessions_v1"

function loadStoredSessions(): ChatSession[] {
	try {
		const raw = localStorage.getItem(CHAT_SESSIONS_STORAGE_KEY)
		return raw ? JSON.parse(raw) : []
	} catch {
		return []
	}
}

function saveStoredSessions(sessions: ChatSession[]) {
	try {
		localStorage.setItem(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify(sessions))
	} catch {
		// ignore
	}
}

function AttachmentsPreview() {
	const { files, remove } = usePromptInputAttachments()
	if (files.length === 0) return null

	return (
		<div className="flex flex-wrap gap-2 px-3 pt-2">
			{files.map((file) => (
				<div
					key={file.id}
					className="group relative size-14 overflow-hidden rounded-md border border-border bg-muted/40 shadow-xs"
				>
					<img
						src={file.url}
						alt={file.filename ?? "Attachment"}
						className="size-full object-cover"
					/>
					<button
						type="button"
						onClick={() => remove(file.id)}
						className="absolute top-1 right-1 rounded-full bg-background/80 p-0.5 text-foreground opacity-0 shadow-xs transition-opacity hover:bg-background group-hover:opacity-100"
					>
						<IconX className="size-3" />
					</button>
				</div>
			))}
		</div>
	)
}

function AttachmentButton({ tooltip }: { tooltip: string }) {
	const { openFileDialog } = usePromptInputAttachments()
	return (
		<PromptInputButton
			onClick={openFileDialog}
			size="icon-sm"
			tooltip={tooltip}
		>
			<IconPaperclip className="size-4" />
		</PromptInputButton>
	)
}

function CopyMessageButton({ content }: { content: string }) {
	const [copied, setCopied] = useState(false)

	const handleCopy = useCallback(() => {
		navigator.clipboard.writeText(content)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}, [content])

	return (
		<Button
			size="sm"
			variant="ghost"
			className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground"
			onClick={handleCopy}
			title="复制 Markdown"
		>
			{copied ? (
				<IconCheck className="size-3 text-emerald-500" />
			) : (
				<IconCopy className="size-3" />
			)}
			<span className="ml-1 text-[11px]">{copied ? "已复制" : "复制"}</span>
		</Button>
	)
}

export function Chat({
	tools,
	className,
	onOpenSettings,
	labels,
	supportsVision = true,
	activeDocumentName,
	attachedContextFiles = [],
	availableNotes = [],
	onAddContextFile,
	onRemoveContextFile,
	onClearContextFiles,
	resolveContextSnippet,
	onInsertAtCursor,
	onInsertToActiveNote,
	onCreateNewNote,
	onExportChat,
	...useChatOptions
}: ChatProps) {
	const { enabled = true } = useChatOptions

	const {
		messages,
		pending,
		error,
		send: onSend,
		startNewChat,
		setSessionMessages,
		exportMarkdown,
		sessionId,
	} = useChat(useChatOptions)

	const [isDragOver, setIsDragOver] = useState(false)
	const [showSlashMenu, setShowSlashMenu] = useState(false)
	const [showMentionMenu, setShowMentionMenu] = useState(false)
	const [showHistoryDrawer, setShowHistoryDrawer] = useState(false)
	const [mentionSearch, setMentionSearch] = useState("")
	const [sessions, setSessions] = useState<ChatSession[]>(() =>
		loadStoredSessions(),
	)

	// Auto-persist active session
	useEffect(() => {
		if (messages.length === 0) return
		setSessions((prev) => {
			const firstUserMsg =
				messages.find((m) => m.role === "user")?.content ?? "新对话"
			const sessionTitle =
				firstUserMsg.length > 25
					? `${firstUserMsg.slice(0, 25)}...`
					: firstUserMsg
			const now = Date.now()

			const existingIdx = prev.findIndex((s) => s.id === sessionId)
			let next: ChatSession[]
			if (existingIdx >= 0) {
				next = prev.map((s, idx) =>
					idx === existingIdx
						? { ...s, title: sessionTitle, updatedAt: now, messages }
						: s,
				)
			} else {
				next = [
					{
						id: sessionId,
						title: sessionTitle,
						createdAt: now,
						updatedAt: now,
						messages,
					},
					...prev,
				]
			}
			saveStoredSessions(next)
			return next
		})
	}, [messages, sessionId])

	const handleSelectSession = useCallback(
		(session: ChatSession) => {
			setSessionMessages(session.messages, session.id)
			setShowHistoryDrawer(false)
		},
		[setSessionMessages],
	)

	const handleDeleteSession = useCallback(
		(idToDelete: string, e: React.MouseEvent) => {
			e.stopPropagation()
			setSessions((prev) => {
				const next = prev.filter((s) => s.id !== idToDelete)
				saveStoredSessions(next)
				return next
			})
		},
		[],
	)

	const handleClearAllSessions = useCallback(() => {
		setSessions([])
		saveStoredSessions([])
	}, [])

	const handleExportCurrentChat = useCallback(async () => {
		if (messages.length === 0) return
		const firstUserMsg =
			messages.find((m) => m.role === "user")?.content ?? "知识库对话"
		const title =
			firstUserMsg.length > 20 ? `${firstUserMsg.slice(0, 20)}` : firstUserMsg
		const md = exportMarkdown(title)
		if (onExportChat) {
			await onExportChat(md, title)
		} else if (onCreateNewNote) {
			await onCreateNewNote(md)
		}
	}, [exportMarkdown, messages, onCreateNewNote, onExportChat])

	const textInputDisabled = !enabled
	const submitDisabled = pending || !enabled

	const newChatText = labels?.newChat ?? "新对话"
	const noMessagesText = labels?.noMessages ?? "AI 智能助手已就绪"
	const startConversationText =
		labels?.startConversation ??
		"随时向 AI 助手提问、总结笔记、输入 @ 引用上下文、输入 / 快捷指令"
	const aiSettingsText = labels?.aiSettings ?? "AI 设置"
	const askAssistantText =
		labels?.askAssistant ??
		"向 AI 助手提问，输入 @ 引用笔记，输入 / 快捷指令..."
	const attachImageText = labels?.attachImage ?? "附加图片"

	const handleSubmit = useCallback(
		async (message: PromptInputMessage) => {
			setShowSlashMenu(false)
			setShowMentionMenu(false)
			const filesPayload =
				message.files.length > 0
					? message.files.map((f) => ({
							url: f.url,
							mediaType: f.mediaType,
							filename: f.filename,
						}))
					: undefined

			const contextSnippet = resolveContextSnippet
				? await resolveContextSnippet()
				: undefined

			await onSend({
				text: message.text,
				files: filesPayload,
				contextSnippet: contextSnippet ?? undefined,
			})
		},
		[onSend, resolveContextSnippet],
	)

	const handleQuickPrompt = useCallback(
		async (promptText: string) => {
			if (pending) return
			setShowSlashMenu(false)
			setShowMentionMenu(false)
			const contextSnippet = resolveContextSnippet
				? await resolveContextSnippet()
				: undefined
			void onSend({
				text: promptText,
				contextSnippet: contextSnippet ?? undefined,
			})
		},
		[onSend, pending, resolveContextSnippet],
	)

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		setIsDragOver(true)
	}, [])

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		setIsDragOver(false)
	}, [])

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault()
			e.stopPropagation()
			setIsDragOver(false)

			try {
				const jsonStr = e.dataTransfer.getData("application/json")
				if (jsonStr) {
					const data = JSON.parse(jsonStr)
					if (data?.type === "note-file" && data.path && data.name) {
						onAddContextFile?.({ path: data.path, name: data.name })
						return
					}
				}
				const textPath = e.dataTransfer.getData("text/plain")
				if (textPath?.endsWith(".md")) {
					const name = textPath.split("/").pop() ?? textPath
					onAddContextFile?.({ path: textPath, name })
				}
			} catch {
				// ignore parse error
			}
		},
		[onAddContextFile],
	)

	const toolsContent =
		tools === undefined
			? undefined
			: typeof tools === "function"
				? tools({ error, pending })
				: tools

	const contextCount = attachedContextFiles.length
	const contextTargetLabel =
		contextCount > 0
			? `选定的 ${contextCount} 篇笔记`
			: activeDocumentName
				? `当前笔记 (${activeDocumentName})`
				: "当前笔记"

	const filteredNotes = useMemo(() => {
		if (!mentionSearch.trim()) return availableNotes.slice(0, 10)
		const q = mentionSearch.toLowerCase()
		return availableNotes
			.filter(
				(n) =>
					n.name.toLowerCase().includes(q) || n.path.toLowerCase().includes(q),
			)
			.slice(0, 10)
	}, [availableNotes, mentionSearch])

	return (
		<section
			className={cn(
				"relative flex h-full min-h-0 flex-col bg-background/50",
				className,
			)}
		>
			{/* Top Header: Unified Assistant Title & Actions */}
			<div className="flex shrink-0 items-center justify-between border-b border-border/40 px-2.5 py-2 gap-1.5">
				<div className="flex items-center gap-1.5 min-w-0">
					<div className="size-5 rounded-md bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
						<IconSparkles className="size-3.5" />
					</div>
					<span className="text-xs font-semibold text-foreground tracking-tight truncate">
						AI 助手
					</span>
				</div>

				<div className="flex items-center gap-0.5">
					{/* History Sessions Drawer Toggle */}
					<Button
						onClick={() => setShowHistoryDrawer((prev) => !prev)}
						size="sm"
						type="button"
						variant="ghost"
						className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md"
						title="查看会话历史记录"
					>
						<IconHistory className="size-3.5 text-muted-foreground" />
					</Button>

					{/* Export Chat as Note */}
					{messages.length > 0 && (
						<Button
							onClick={handleExportCurrentChat}
							size="sm"
							type="button"
							variant="ghost"
							className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md"
							title="将当前完整会话导出为知识库笔记"
						>
							<IconDownload className="size-3.5 text-purple-500" />
						</Button>
					)}

					<Button
						onClick={startNewChat}
						size="sm"
						type="button"
						variant="ghost"
						className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md"
						title="开启全新会话"
					>
						<IconSparkles className="size-3 mr-1 text-purple-500" />
						{newChatText}
					</Button>
				</div>
			</div>

			{/* History Sessions Drawer Overlay */}
			{showHistoryDrawer && (
				<div className="absolute inset-x-0 top-[37px] bottom-0 z-50 bg-background/95 backdrop-blur-md flex flex-col border-b border-border/50 p-2 animate-in fade-in slide-in-from-top-2 duration-150">
					<div className="flex items-center justify-between px-2 py-1 border-b border-border/40 mb-2">
						<div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
							<IconHistory className="size-3.5 text-purple-500" />
							<span>会话历史记录 ({sessions.length})</span>
						</div>
						<div className="flex items-center gap-2">
							{sessions.length > 0 && (
								<button
									type="button"
									onClick={handleClearAllSessions}
									className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
								>
									清空全部
								</button>
							)}
							<button
								type="button"
								onClick={() => setShowHistoryDrawer(false)}
								className="text-muted-foreground hover:text-foreground"
							>
								<IconX className="size-3.5" />
							</button>
						</div>
					</div>

					<div className="flex-1 overflow-y-auto space-y-1 pr-1">
						{sessions.length === 0 ? (
							<div className="h-full flex flex-col items-center justify-center text-center text-xs text-muted-foreground p-6">
								<IconHistory className="size-8 opacity-40 mb-2" />
								<span>暂无历史会话记录</span>
							</div>
						) : (
							sessions.map((item) => (
								<div
									key={item.id}
									onClick={() => handleSelectSession(item)}
									className={cn(
										"group flex items-center justify-between p-2 rounded-lg border border-border/40 hover:bg-accent/70 cursor-pointer transition-all text-xs",
										item.id === sessionId &&
											"bg-purple-500/10 border-purple-500/30",
									)}
								>
									<div className="flex flex-col min-w-0 pr-2">
										<span className="font-medium text-foreground truncate">
											{item.title}
										</span>
										<span className="text-[10px] text-muted-foreground">
											{new Date(item.updatedAt).toLocaleTimeString([], {
												hour: "2-digit",
												minute: "2-digit",
											})}{" "}
											· {item.messages.length} 条消息
										</span>
									</div>
									<button
										type="button"
										onClick={(e) => handleDeleteSession(item.id, e)}
										className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-opacity"
										title="删除此会话"
									>
										<IconTrash className="size-3" />
									</button>
								</div>
							))
						)}
					</div>
				</div>
			)}

			<Conversation className="min-h-0 flex-1">
				<ConversationContent className="h-full">
					{messages.length === 0 ? (
						<ConversationEmptyState
							icon={
								<IconSparkles className="size-8 text-purple-500 opacity-90" />
							}
							title={noMessagesText}
							description={startConversationText}
						>
							<div className="flex flex-col items-center gap-4 w-full max-w-[320px]">
								{/* Quick Prompt Chips */}
								<div className="grid grid-cols-1 gap-1.5 w-full text-left">
									<button
										type="button"
										onClick={() =>
											handleQuickPrompt(
												`请帮我深度总结${contextTargetLabel}的核心要点、结构逻辑与关键结论。`,
											)
										}
										className="flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-card hover:bg-accent/60 transition-colors text-xs text-foreground/90 group"
									>
										<IconFileDescription className="size-4 text-blue-500 shrink-0" />
										<div className="flex flex-col">
											<span className="font-medium">
												📝 总结{contextTargetLabel}
											</span>
											<span className="text-[10px] text-muted-foreground">
												提炼核心要点与脉络
											</span>
										</div>
									</button>

									<button
										type="button"
										onClick={() =>
											handleQuickPrompt(
												`请分析${contextTargetLabel}中的所有待办行动项与待解决问题，整理成清晰规范的 Markdown Todo 清单。`,
											)
										}
										className="flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-card hover:bg-accent/60 transition-colors text-xs text-foreground/90 group"
									>
										<IconListCheck className="size-4 text-emerald-500 shrink-0" />
										<div className="flex flex-col">
											<span className="font-medium">🔍 提取待办清单</span>
											<span className="text-[10px] text-muted-foreground">
												提取 Action Items
											</span>
										</div>
									</button>

									<button
										type="button"
										onClick={() =>
											handleQuickPrompt(
												`请帮我润色${contextTargetLabel}的语言表达，修正错别字与语病，并优化段落结构与排版呼吸感。`,
											)
										}
										className="flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-card hover:bg-accent/60 transition-colors text-xs text-foreground/90 group"
									>
										<IconPencil className="size-4 text-amber-500 shrink-0" />
										<div className="flex flex-col">
											<span className="font-medium">✍️ 润色与结构优化</span>
											<span className="text-[10px] text-muted-foreground">
												提升语言与排版质感
											</span>
										</div>
									</button>
								</div>

								{onOpenSettings && (
									<Button
										onClick={onOpenSettings}
										size="sm"
										type="button"
										variant="ghost"
										className="text-xs text-muted-foreground"
									>
										{aiSettingsText}
									</Button>
								)}
							</div>
						</ConversationEmptyState>
					) : (
						messages.map((message, index) => {
							const isLastMessage = index === messages.length - 1
							return (
								<Message key={message.id} from={message.role}>
									<MessageContent>
										{message.role === "user" ? (
											<div className="space-y-2">
												{message.files && message.files.length > 0 && (
													<div className="flex flex-wrap gap-2">
														{message.files.map((file, idx) => (
															<img
																key={idx}
																src={file.url}
																alt={file.filename ?? "Image attachment"}
																className="max-h-40 max-w-full rounded-md border border-border/40 object-cover"
															/>
														))}
													</div>
												)}
												<p className="whitespace-pre-wrap text-sm">
													{message.content}
												</p>
											</div>
										) : (
											<div className="space-y-2">
												{message.reasoning && (
													<ThinkingBlock
														reasoning={message.reasoning}
														isPending={pending && isLastMessage}
														thinkingLabel={labels?.thinking}
														thinkingCompleteLabel={labels?.thoughtProcess}
													/>
												)}
												<MessageResponse>{message.content}</MessageResponse>

												{/* Message Bottom Action Bar (Obsidian Copilot Style) */}
												<div className="flex flex-wrap items-center gap-1 pt-1.5 mt-2 border-t border-border/30 opacity-75 hover:opacity-100 transition-opacity">
													<CopyMessageButton content={message.content} />

													{onInsertAtCursor && (
														<Button
															size="sm"
															variant="ghost"
															className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground"
															onClick={() => onInsertAtCursor(message.content)}
															title="在当前笔记的光标处直接插入"
														>
															<IconCursorText className="size-3 text-purple-500" />
															<span className="ml-1 text-[11px]">光标插入</span>
														</Button>
													)}

													{onInsertToActiveNote && (
														<Button
															size="sm"
															variant="ghost"
															className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground"
															onClick={() =>
																onInsertToActiveNote(message.content)
															}
															title="追加插入到当前笔记文末"
														>
															<IconFileText className="size-3" />
															<span className="ml-1 text-[11px]">追加文末</span>
														</Button>
													)}

													{onCreateNewNote && (
														<Button
															size="sm"
															variant="ghost"
															className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground"
															onClick={() => onCreateNewNote(message.content)}
															title="另存为新笔记并打开"
														>
															<IconFilePlus className="size-3" />
															<span className="ml-1 text-[11px]">
																存为新笔记
															</span>
														</Button>
													)}
												</div>
											</div>
										)}
									</MessageContent>
								</Message>
							)
						})
					)}
				</ConversationContent>
			</Conversation>

			<div
				className={cn(
					"relative p-2 transition-all",
					isDragOver && "scale-[1.01]",
				)}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
			>
				{isDragOver && (
					<div className="absolute inset-2 z-50 flex items-center justify-center rounded-lg border-2 border-dashed border-purple-500 bg-purple-500/10 backdrop-blur-xs text-xs font-medium text-purple-600 dark:text-purple-300 pointer-events-none">
						📥 松开以将此笔记添加到 AI 对话上下文
					</div>
				)}

				{/* Slash Commands Popover */}
				{showSlashMenu && (
					<div className="absolute bottom-[calc(100%-8px)] left-2 right-2 z-50 rounded-lg border border-border/60 bg-popover/95 p-1.5 shadow-lg backdrop-blur-md">
						<div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-muted-foreground border-b border-border/40 mb-1">
							<span>⚡ 快捷指令 (Slash Commands)</span>
							<button
								type="button"
								onClick={() => setShowSlashMenu(false)}
								className="text-muted-foreground hover:text-foreground"
							>
								<IconX className="size-3" />
							</button>
						</div>
						<div className="grid grid-cols-1 gap-1">
							<button
								type="button"
								onClick={() =>
									handleQuickPrompt(
										`请帮我深度总结${contextTargetLabel}的核心要点与关键结论。`,
									)
								}
								className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-xs text-foreground/90 text-left transition-colors"
							>
								<IconFileDescription className="size-3.5 text-purple-500 shrink-0" />
								<span className="font-mono text-purple-500 font-bold">
									/summary
								</span>
								<span className="text-muted-foreground text-[11px]">
									总结核心要点与脉络
								</span>
							</button>
							<button
								type="button"
								onClick={() =>
									handleQuickPrompt(
										`请提取${contextTargetLabel}中的所有行动项与任务，整理成清晰规范的 Markdown Todo 清单。`,
									)
								}
								className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-xs text-foreground/90 text-left transition-colors"
							>
								<IconListCheck className="size-3.5 text-emerald-500 shrink-0" />
								<span className="font-mono text-emerald-500 font-bold">
									/todo
								</span>
								<span className="text-muted-foreground text-[11px]">
									提取待办与行动清单
								</span>
							</button>
							<button
								type="button"
								onClick={() =>
									handleQuickPrompt(
										`请帮我润色优化${contextTargetLabel}的文字表达，修正错别字与语病，并提升排版呼吸感。`,
									)
								}
								className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-xs text-foreground/90 text-left transition-colors"
							>
								<IconPencil className="size-3.5 text-amber-500 shrink-0" />
								<span className="font-mono text-amber-500 font-bold">
									/polish
								</span>
								<span className="text-muted-foreground text-[11px]">
									润色与排版优化
								</span>
							</button>
							<button
								type="button"
								onClick={() =>
									handleQuickPrompt(
										`基于${contextTargetLabel}的主题，为我展开头脑风暴，提供 5 个以上极具创意与可行性的延伸方案。`,
									)
								}
								className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-xs text-foreground/90 text-left transition-colors"
							>
								<IconBulb className="size-3.5 text-yellow-500 shrink-0" />
								<span className="font-mono text-yellow-500 font-bold">
									/brainstorm
								</span>
								<span className="text-muted-foreground text-[11px]">
									头脑风暴与创意延伸
								</span>
							</button>
							<button
								type="button"
								onClick={() =>
									handleQuickPrompt(
										`请用通俗易懂的语言深度解析${contextTargetLabel}的核心概念、底层原理与背景。`,
									)
								}
								className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-xs text-foreground/90 text-left transition-colors"
							>
								<IconRobot className="size-3.5 text-blue-500 shrink-0" />
								<span className="font-mono text-blue-500 font-bold">
									/explain
								</span>
								<span className="text-muted-foreground text-[11px]">
									通俗深度原理解析
								</span>
							</button>
							<button
								type="button"
								onClick={() =>
									handleQuickPrompt(
										`请将${contextTargetLabel}的内容进行高水平专业中英文互译，保持行业术语准确与优雅流畅。`,
									)
								}
								className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-xs text-foreground/90 text-left transition-colors"
							>
								<IconBolt className="size-3.5 text-cyan-500 shrink-0" />
								<span className="font-mono text-cyan-500 font-bold">
									/translate
								</span>
								<span className="text-muted-foreground text-[11px]">
									专业高水准互译
								</span>
							</button>
							<button
								type="button"
								onClick={() =>
									handleQuickPrompt(
										`请对${contextTargetLabel}中的代码或技术方案进行严格 Code Review，指出潜在 Bug 与性能优化建议。`,
									)
								}
								className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-xs text-foreground/90 text-left transition-colors"
							>
								<IconBug className="size-3.5 text-rose-500 shrink-0" />
								<span className="font-mono text-rose-500 font-bold">
									/codereview
								</span>
								<span className="text-muted-foreground text-[11px]">
									代码审查与缺陷纠错
								</span>
							</button>
							<button
								type="button"
								onClick={() =>
									handleQuickPrompt(
										`请从${contextTargetLabel}中提取核心对比维度或结构化数据，整理成 Markdown 表格展示。`,
									)
								}
								className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-xs text-foreground/90 text-left transition-colors"
							>
								<IconTable className="size-3.5 text-indigo-500 shrink-0" />
								<span className="font-mono text-indigo-500 font-bold">
									/table
								</span>
								<span className="text-muted-foreground text-[11px]">
									提取结构化表格
								</span>
							</button>
						</div>
					</div>
				)}

				{/* @ Mention Popover */}
				{showMentionMenu && (
					<div className="absolute bottom-[calc(100%-8px)] left-2 right-2 z-50 rounded-lg border border-border/60 bg-popover/95 p-1.5 shadow-lg backdrop-blur-md">
						<div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-muted-foreground border-b border-border/40 mb-1">
							<span>@ 引用工作区笔记作为上下文</span>
							<button
								type="button"
								onClick={() => setShowMentionMenu(false)}
								className="text-muted-foreground hover:text-foreground"
							>
								<IconX className="size-3" />
							</button>
						</div>
						<div className="px-1.5 pb-1">
							<input
								type="text"
								placeholder="搜索笔记名称..."
								value={mentionSearch}
								onChange={(e) => setMentionSearch(e.target.value)}
								className="w-full h-6 px-2 text-xs bg-muted/60 border border-border/50 rounded-md focus:outline-hidden"
							/>
						</div>
						<div className="max-h-40 overflow-y-auto space-y-0.5">
							{filteredNotes.length === 0 ? (
								<div className="p-2 text-center text-xs text-muted-foreground">
									未找到匹配的笔记
								</div>
							) : (
								filteredNotes.map((note) => (
									<button
										key={note.path}
										type="button"
										onClick={() => {
											onAddContextFile?.(note)
											setShowMentionMenu(false)
											setMentionSearch("")
										}}
										className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent text-xs text-foreground/90 text-left transition-colors"
									>
										<div className="flex items-center gap-1.5 truncate">
											<IconFileText className="size-3 text-purple-500 shrink-0" />
											<span className="truncate">{note.name}</span>
										</div>
										<span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
											{note.path}
										</span>
									</button>
								))
							)}
						</div>
					</div>
				)}

				<PromptInput
					accept={supportsVision ? "image/*" : undefined}
					onSubmit={handleSubmit}
				>
					<PromptInputHeader>
						{/* Context Capsules Bar */}
						{attachedContextFiles.length > 0 ? (
							<div className="flex flex-wrap items-center gap-1.5 px-3 pt-2">
								{attachedContextFiles.map((file) => (
									<div
										key={file.path}
										className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-300 text-[11px] font-mono shadow-2xs group"
										title={file.path}
									>
										<IconFileText className="size-3 shrink-0" />
										<span className="truncate max-w-[130px]">{file.name}</span>
										<button
											type="button"
											onClick={() => onRemoveContextFile?.(file.path)}
											className="size-3.5 rounded-full inline-flex items-center justify-center hover:bg-purple-500/20 text-purple-600 dark:text-purple-300"
											title="移除此上下文"
										>
											<IconX className="size-2.5" />
										</button>
									</div>
								))}
								{onClearContextFiles && (
									<button
										type="button"
										onClick={onClearContextFiles}
										className="text-[10px] text-muted-foreground hover:text-foreground underline ml-0.5"
									>
										清空
									</button>
								)}
							</div>
						) : activeDocumentName ? (
							<div className="flex items-center gap-1 px-3 pt-2">
								<div
									className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/80 border border-border/60 text-[11px] font-mono text-muted-foreground"
									title="当前活动笔记（自动同步为上下文）"
								>
									<IconFileText className="size-3 shrink-0 text-primary/70" />
									<span className="truncate max-w-[160px]">
										{activeDocumentName}
									</span>
									<span className="text-[9px] px-1 py-0.2 rounded bg-primary/10 text-primary font-sans font-medium">
										当前
									</span>
								</div>
							</div>
						) : null}
						<AttachmentsPreview />
					</PromptInputHeader>
					<PromptInputTextarea
						disabled={textInputDisabled}
						placeholder={askAssistantText}
					/>
					<PromptInputFooter>
						<div className="flex items-center gap-1">
							{/* @ Mention trigger */}
							<PromptInputButton
								type="button"
								size="icon-sm"
								tooltip="引用笔记上下文 (@)"
								onClick={() => {
									setShowMentionMenu((prev) => !prev)
									setShowSlashMenu(false)
								}}
							>
								<span className="font-mono text-xs font-bold text-muted-foreground hover:text-foreground">
									@
								</span>
							</PromptInputButton>

							{/* / Slash trigger */}
							<PromptInputButton
								type="button"
								size="icon-sm"
								tooltip="快捷指令 (/)"
								onClick={() => {
									setShowSlashMenu((prev) => !prev)
									setShowMentionMenu(false)
								}}
							>
								<span className="font-mono text-xs font-bold text-muted-foreground hover:text-foreground">
									/
								</span>
							</PromptInputButton>

							{supportsVision && <AttachmentButton tooltip={attachImageText} />}
							{toolsContent ? (
								<PromptInputTools>{toolsContent}</PromptInputTools>
							) : null}
						</div>
						<PromptInputSubmit
							disabled={submitDisabled}
							status={pending ? "submitted" : undefined}
						/>
					</PromptInputFooter>
				</PromptInput>
			</div>
		</section>
	)
}
