import { Button } from "@mdit/ui/components/button"
import { cn } from "@mdit/ui/lib/utils"
import {
	IconCheck,
	IconCopy,
	IconFileDescription,
	IconFilePlus,
	IconFileText,
	IconListCheck,
	IconPaperclip,
	IconPencil,
	IconSparkles,
	IconX,
} from "@tabler/icons-react"
import type { ReactNode } from "react"
import { useCallback, useState } from "react"

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
import { type UseChatOptions, useChat } from "./use-chat"

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

export type ChatProps = UseChatOptions & {
	tools?: ReactNode | ((props: ChatToolsRenderProps) => ReactNode)
	className?: string
	onOpenSettings?: () => void
	labels?: ChatLabels
	supportsVision?: boolean
	activeDocumentName?: string | null
	attachedContextFiles?: AttachedContextFile[]
	onAddContextFile?: (file: AttachedContextFile) => void
	onRemoveContextFile?: (path: string) => void
	onClearContextFiles?: () => void
	onInsertToActiveNote?: (content: string) => void | Promise<void>
	onCreateNewNote?: (content: string) => void | Promise<void>
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
	onAddContextFile,
	onRemoveContextFile,
	onClearContextFiles,
	onInsertToActiveNote,
	onCreateNewNote,
	...useChatOptions
}: ChatProps) {
	const { enabled = true } = useChatOptions
	const {
		messages,
		pending,
		error,
		send: onSend,
		startNewChat,
	} = useChat(useChatOptions)

	const [isDragOver, setIsDragOver] = useState(false)

	const textInputDisabled = !enabled
	const submitDisabled = pending || !enabled

	const newChatText = labels?.newChat ?? "New chat"
	const noMessagesText = labels?.noMessages ?? "智能体已就绪"
	const startConversationText =
		labels?.startConversation ?? "随时向 AI 助手提问、总结笔记或执行多步任务"
	const aiSettingsText = labels?.aiSettings ?? "AI 设置"
	const askAssistantText =
		labels?.askAssistant ?? "向智能体提问，或按快捷键调用..."
	const attachImageText = labels?.attachImage ?? "附加图片"

	const handleSubmit = useCallback(
		async (message: PromptInputMessage) => {
			const filesPayload =
				message.files.length > 0
					? message.files.map((f) => ({
							url: f.url,
							mediaType: f.mediaType,
							filename: f.filename,
						}))
					: undefined

			await onSend({
				text: message.text,
				files: filesPayload,
			})
		},
		[onSend],
	)

	const handleQuickPrompt = useCallback(
		(promptText: string) => {
			if (pending) return
			void onSend({ text: promptText })
		},
		[onSend, pending],
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

	return (
		<section
			className={cn("flex h-full min-h-0 flex-col bg-background/50", className)}
		>
			{/* Top Header */}
			<div className="flex shrink-0 items-center justify-between border-b border-border/40 p-2 gap-1.5">
				<div className="flex items-center gap-1.5 min-w-0">
					<Button
						onClick={startNewChat}
						size="sm"
						type="button"
						variant="outline"
						className="h-7 text-xs rounded-md"
					>
						<IconSparkles className="size-3.5 mr-1 text-purple-500" />
						{newChatText}
					</Button>
				</div>
				{attachedContextFiles.length > 0 ? (
					<div className="flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-300 font-medium">
						<span>📎 已指定 {attachedContextFiles.length} 篇上下文</span>
					</div>
				) : activeDocumentName ? (
					<div
						className="flex items-center gap-1 max-w-[170px] truncate rounded-full bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground font-mono"
						title={`当前关联笔记: ${activeDocumentName}`}
					>
						<IconFileText className="size-3 shrink-0 text-primary/70" />
						<span className="truncate">{activeDocumentName}</span>
					</div>
				) : null}
			</div>

			<Conversation className="min-h-0 flex-1">
				<ConversationContent className="h-full">
					{messages.length === 0 ? (
						<ConversationEmptyState
							icon={
								<IconSparkles className="size-8 text-purple-500 opacity-80" />
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
												"请帮我深度总结当前关联笔记的核心要点与关键结论。",
											)
										}
										className="flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-card hover:bg-accent/60 transition-colors text-xs text-foreground/90 group"
									>
										<IconFileDescription className="size-4 text-blue-500 shrink-0" />
										<div className="flex flex-col">
											<span className="font-medium">📝 总结当前笔记</span>
											<span className="text-[10px] text-muted-foreground">
												提炼核心要点与脉络
											</span>
										</div>
									</button>

									<button
										type="button"
										onClick={() =>
											handleQuickPrompt(
												"请分析当前笔记中的待办行动项，整理成清晰规范的 Markdown Todo 清单。",
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
												"请帮我润色当前笔记的语言表达，修正语病，并提升排版呼吸感与结构清晰度。",
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

												{/* Message Bottom Action Bar */}
												<div className="flex items-center gap-1 pt-1.5 mt-2 border-t border-border/30 opacity-70 hover:opacity-100 transition-opacity">
													<CopyMessageButton content={message.content} />
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
															<span className="ml-1 text-[11px]">插入笔记</span>
														</Button>
													)}
													{onCreateNewNote && (
														<Button
															size="sm"
															variant="ghost"
															className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground"
															onClick={() => onCreateNewNote(message.content)}
															title="另存为新笔记"
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
