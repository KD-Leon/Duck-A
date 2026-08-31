import { Button } from "@mdit/ui/components/button"
import { cn } from "@mdit/ui/lib/utils"
import { IconPaperclip, IconX } from "@tabler/icons-react"
import type { ReactNode } from "react"
import { useCallback } from "react"

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

export type ChatProps = UseChatOptions & {
	tools?: ReactNode | ((props: ChatToolsRenderProps) => ReactNode)
	className?: string
	onOpenSettings?: () => void
	labels?: ChatLabels
	supportsVision?: boolean
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

export function Chat({
	tools,
	className,
	onOpenSettings,
	labels,
	supportsVision = true,
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

	const textInputDisabled = !enabled
	const submitDisabled = pending || !enabled

	const newChatText = labels?.newChat ?? "New chat"
	const noMessagesText = labels?.noMessages ?? "No messages yet"
	const startConversationText =
		labels?.startConversation ?? "Start a conversation to see messages here"
	const aiSettingsText = labels?.aiSettings ?? "AI settings"
	const askAssistantText = labels?.askAssistant ?? "Ask the assistant"
	const attachImageText = labels?.attachImage ?? "Attach image"

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

	const toolsContent =
		tools === undefined
			? undefined
			: typeof tools === "function"
				? tools({ error, pending })
				: tools

	return (
		<section className={cn("flex h-full min-h-0 flex-col", className)}>
			<div className="flex shrink-0 p-2">
				<Button
					onClick={startNewChat}
					size="sm"
					type="button"
					variant="outline"
				>
					{newChatText}
				</Button>
			</div>
			<Conversation className="min-h-0 flex-1">
				<ConversationContent className="h-full">
					{messages.length === 0 ? (
						onOpenSettings ? (
							<ConversationEmptyState>
								<div className="flex flex-col items-center gap-3">
									<div className="space-y-1">
										<h3 className="font-medium text-sm">{noMessagesText}</h3>
										<p className="text-muted-foreground text-sm">
											{startConversationText}
										</p>
									</div>
									<Button
										onClick={onOpenSettings}
										size="sm"
										type="button"
										variant="outline"
									>
										{aiSettingsText}
									</Button>
								</div>
							</ConversationEmptyState>
						) : (
							<ConversationEmptyState />
						)
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
											</div>
										)}
									</MessageContent>
								</Message>
							)
						})
					)}
				</ConversationContent>
			</Conversation>

			<div className="p-2">
				<PromptInput
					accept={supportsVision ? "image/*" : undefined}
					onSubmit={handleSubmit}
				>
					<PromptInputHeader>
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
