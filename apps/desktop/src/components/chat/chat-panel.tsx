import { CODEX_BASE_URL } from "@mdit/ai"
import { Chat } from "@mdit/chat"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@mdit/ui/components/select"
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs"
import { fetch as tauriHttpFetch } from "@tauri-apps/plugin-http"
import { motion } from "motion/react"
import { useCallback, useMemo } from "react"
import { toast } from "sonner"
import { useShallow } from "zustand/shallow"
import { useResizablePanel } from "@/hooks/use-resizable-panel"
import { useTranslation } from "@/i18n"
import { useStore } from "@/store"

const toModelSelectValue = (provider: string, model: string): string =>
	`${provider}|${model}`

export function ChatPanel() {
	const { chatPanelBetaEnabled, isChatPanelOpen, setChatPanelOpen } = useStore(
		useShallow((state) => ({
			chatPanelBetaEnabled: state.chatPanelBetaEnabled,
			isChatPanelOpen: state.isChatPanelOpen,
			setChatPanelOpen: state.setChatPanelOpen,
		})),
	)

	const { isOpen, width, isResizing, handlePointerDown } = useResizablePanel({
		storageKey: "chat-panel-width",
		defaultWidth: 340,
		minWidth: 260,
		maxWidth: 640,
		invertDrag: true,
		isOpen: isChatPanelOpen,
		setIsOpen: setChatPanelOpen,
	})

	if (!chatPanelBetaEnabled) {
		return null
	}

	return (
		<motion.aside
			className="relative shrink-0 overflow-hidden"
			animate={{ width: isOpen ? width : 0 }}
			initial={false}
			transition={
				isResizing
					? { width: { duration: 0 } }
					: { width: { type: "spring", bounce: 0, duration: 0.12 } }
			}
		>
			<div
				className="flex h-full shrink-0 flex-col border-l bg-background"
				style={{ width }}
			>
				<ChatPanelContent />
			</div>
			{isOpen && (
				<div
					className="absolute top-0 -left-1 z-10 h-full w-1.5 cursor-col-resize bg-transparent transition-colors delay-100 hover:bg-foreground/20"
					onPointerDown={handlePointerDown}
				/>
			)}
		</motion.aside>
	)
}

function ChatPanelContent() {
	const { t } = useTranslation()
	const {
		chatConfig,
		enabledChatModels,
		chatHistoryRounds,
		systemPrompt,
		selectModel,
		openSettingsWithTab,
	} = useStore(
		useShallow((state) => ({
			chatConfig: state.chatConfig,
			enabledChatModels: state.enabledChatModels,
			chatHistoryRounds: state.chatHistoryRounds,
			systemPrompt: state.systemPrompt,
			selectModel: state.selectModel,
			openSettingsWithTab: state.openSettingsWithTab,
		})),
	)

	const isConfigured = Boolean(chatConfig)
	const supportsVision = chatConfig?.vision ?? true

	const resolveActiveConfig = useCallback(async () => {
		const currentConfig = useStore.getState().chatConfig
		if (!currentConfig) {
			return null
		}
		if (currentConfig.provider !== "codex_oauth") {
			return currentConfig
		}

		await useStore.getState().refreshCodexOAuthForTarget()
		return useStore.getState().chatConfig
	}, [])

	const selectedModelValue = useMemo(() => {
		if (!chatConfig) {
			return undefined
		}
		const exists = enabledChatModels.some(
			(item) =>
				item.provider === chatConfig.provider &&
				item.model === chatConfig.model,
		)
		if (!exists) {
			return undefined
		}
		return toModelSelectValue(chatConfig.provider, chatConfig.model)
	}, [chatConfig, enabledChatModels])

	const currentModelDisplayName = useMemo(() => {
		if (!chatConfig) return undefined
		const match = enabledChatModels.find(
			(item) =>
				item.provider === chatConfig.provider &&
				item.model === chatConfig.model,
		)
		return match?.model ?? chatConfig.model
	}, [chatConfig, enabledChatModels])

	const entries = useStore((state) => state.entries)
	const activeTabPath = useStore((state) => state.getActiveTabPath())
	const workspacePath = useStore((state) => state.workspacePath)
	const openTab = useStore((state) => state.openTab)
	const aiContextFiles = useStore((state) => state.aiContextFiles)
	const addAiContextFile = useStore((state) => state.addAiContextFile)
	const removeAiContextFile = useStore((state) => state.removeAiContextFile)
	const clearAiContextFiles = useStore((state) => state.clearAiContextFiles)

	const flatFiles = useMemo(() => {
		const result: Array<{ path: string; name: string }> = []
		const stack = [...entries]
		while (stack.length > 0) {
			const item = stack.pop()
			if (!item) continue
			if (!item.isDirectory && item.name.endsWith(".md")) {
				result.push({ path: item.path, name: item.name })
			} else if (item.children) {
				stack.push(...item.children)
			}
		}
		return result
	}, [entries])

	const availableNotes = useMemo(() => {
		return flatFiles
	}, [flatFiles])

	const panelChatToolDeps = useMemo(
		() => ({
			getActiveDocumentPath: () => useStore.getState().getActiveTabPath(),
			readTextFile,
			writeTextFile,
			searchNotes: async (query: string) => {
				const q = query.toLowerCase()
				return flatFiles.filter(
					(e) =>
						e.name.toLowerCase().includes(q) ||
						e.path.toLowerCase().includes(q),
				)
			},
			createNote: async (title: string, content: string) => {
				const ws = useStore.getState().workspacePath
				if (!ws) throw new Error("No active workspace.")
				const name = title.endsWith(".md") ? title : `${title}.md`
				const filePath = `${ws}/${name}`
				await writeTextFile(filePath, content)
				await useStore.getState().refreshWorkspaceEntries()
				await useStore.getState().openTab(filePath)
				return filePath
			},
		}),
		[flatFiles],
	)

	const handleModelChange = useCallback(
		async (value: string | null) => {
			if (!value) {
				return
			}

			const separatorIndex = value.indexOf("|")
			if (separatorIndex <= 0) {
				return
			}

			const provider = value.slice(0, separatorIndex)
			const model = value.slice(separatorIndex + 1)
			if (!model) {
				return
			}

			const isEnabledModel = enabledChatModels.some(
				(item) => item.provider === provider && item.model === model,
			)
			if (!isEnabledModel) {
				return
			}

			await selectModel(provider, model)
		},
		[enabledChatModels, selectModel],
	)

	const activeDocumentName = useMemo(() => {
		if (!activeTabPath) return null
		return activeTabPath.split("/").pop() ?? activeTabPath
	}, [activeTabPath])

	const resolveContextSnippet = useCallback(async () => {
		const targets =
			aiContextFiles.length > 0
				? aiContextFiles
				: activeTabPath && activeDocumentName
					? [{ path: activeTabPath, name: activeDocumentName }]
					: []

		if (targets.length === 0) return null

		const fileSnippets = await Promise.all(
			targets.map(async (file) => {
				try {
					const text = await readTextFile(file.path)
					const maxChars = 5000
					const truncated =
						text.length > maxChars
							? `${text.slice(0, maxChars)}\n...[文件后续内容已截断]`
							: text
					return `【笔记: ${file.name}】（路径: ${file.path}）：\n\`\`\`markdown\n${truncated}\n\`\`\``
				} catch {
					return null
				}
			}),
		)

		const validSnippets = fileSnippets.filter(Boolean)
		if (validSnippets.length === 0) return null

		return `\n\n=== 关联的笔记上下文参考资料 ===\n${validSnippets.join("\n\n")}\n================================\n请严格基于上述关联笔记的内容来回答或执行指令。`
	}, [activeDocumentName, activeTabPath, aiContextFiles])

	const handleInsertAtCursor = useCallback(
		async (content: string) => {
			if (!activeTabPath) {
				toast.error("当前未打开任何笔记，无法插入")
				return
			}
			try {
				const current = await readTextFile(activeTabPath)
				const newContent = `${current}\n\n${content}`
				await writeTextFile(activeTabPath, newContent)
				toast.success("已成功将内容插入到当前笔记中")
			} catch (err) {
				console.error("Failed to insert at cursor", err)
				toast.error("插入内容失败")
			}
		},
		[activeTabPath],
	)

	const handleInsertToActiveNote = useCallback(
		async (content: string) => {
			if (!activeTabPath) {
				toast.error("当前未打开任何笔记，无法插入")
				return
			}
			try {
				const current = await readTextFile(activeTabPath)
				const newContent = `${current}\n\n${content}`
				await writeTextFile(activeTabPath, newContent)
				toast.success("已成功追加内容到当前笔记末尾")
			} catch (err) {
				console.error("Failed to insert to active note", err)
				toast.error("插入内容失败")
			}
		},
		[activeTabPath],
	)

	const handleCreateNewNote = useCallback(
		async (content: string) => {
			if (!workspacePath) {
				toast.error("未打开工作区，无法新建笔记")
				return
			}
			try {
				const dateStr = new Date().toISOString().slice(0, 10)
				const fileName = `AI-Note-${dateStr}-${Date.now().toString().slice(-4)}.md`
				const filePath = `${workspacePath}/${fileName}`
				await writeTextFile(filePath, content)
				await useStore.getState().refreshWorkspaceEntries()
				await openTab(filePath)
				toast.success(`已创建并打开新笔记: ${fileName}`)
			} catch (err) {
				console.error("Failed to create new note from AI", err)
				toast.error("创建新笔记失败")
			}
		},
		[openTab, workspacePath],
	)

	const handleExportChat = useCallback(
		async (markdown: string, title: string) => {
			if (!workspacePath) {
				toast.error("未打开工作区，无法导出笔记")
				return
			}
			try {
				const safeTitle =
					title.replace(/[/\\?%*:|"<>]/g, "-").trim() || "AI-Chat"
				const dateStr = new Date().toISOString().slice(0, 10)
				const fileName = `AI-Chat-${safeTitle.slice(0, 15)}-${dateStr}.md`
				const filePath = `${workspacePath}/${fileName}`
				await writeTextFile(filePath, markdown)
				await useStore.getState().refreshWorkspaceEntries()
				await openTab(filePath)
				toast.success(`已成功将完整会话导出为笔记: ${fileName}`)
			} catch (err) {
				console.error("Failed to export chat", err)
				toast.error("导出笔记失败")
			}
		},
		[openTab, workspacePath],
	)

	return (
		<Chat
			id="desktop-chat"
			codexBaseUrl={CODEX_BASE_URL}
			enabled={isConfigured}
			fetch={tauriHttpFetch}
			onOpenSettings={() => openSettingsWithTab("ai")}
			panelChatToolDeps={panelChatToolDeps}
			resolveActiveConfig={resolveActiveConfig}
			supportsVision={supportsVision}
			chatHistoryRounds={chatHistoryRounds}
			systemPrompt={systemPrompt || undefined}
			labels={t.chat}
			activeDocumentName={activeDocumentName}
			attachedContextFiles={aiContextFiles}
			availableNotes={availableNotes}
			onAddContextFile={addAiContextFile}
			onRemoveContextFile={removeAiContextFile}
			onClearContextFiles={clearAiContextFiles}
			resolveContextSnippet={resolveContextSnippet}
			onInsertAtCursor={handleInsertAtCursor}
			onInsertToActiveNote={handleInsertToActiveNote}
			onCreateNewNote={handleCreateNewNote}
			onExportChat={handleExportChat}
			tools={({ pending }) => (
				<Select
					disabled={pending || enabledChatModels.length === 0}
					onValueChange={(value) => {
						void handleModelChange(value)
					}}
					value={selectedModelValue}
				>
					<SelectTrigger className="h-7 min-w-[110px] max-w-[180px] rounded-sm text-xs px-2">
						<span className="truncate">
							{currentModelDisplayName ?? t.chat.model}
						</span>
					</SelectTrigger>
					<SelectContent align="start">
						{enabledChatModels.map((item) => {
							const value = toModelSelectValue(item.provider, item.model)
							return (
								<SelectItem key={value} value={value}>
									{item.model}
								</SelectItem>
							)
						})}
					</SelectContent>
				</Select>
			)}
		/>
	)
}
