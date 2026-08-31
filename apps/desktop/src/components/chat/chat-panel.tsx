import { CODEX_BASE_URL } from "@mdit/ai"
import { Chat } from "@mdit/chat"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@mdit/ui/components/select"
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs"
import { fetch as tauriHttpFetch } from "@tauri-apps/plugin-http"
import { motion } from "motion/react"
import { useCallback, useMemo } from "react"
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

	const panelChatToolDeps = useMemo(
		() => ({
			getActiveDocumentPath: () => useStore.getState().getActiveTabPath(),
			readTextFile,
		}),
		[],
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

	const activeTabPath = useStore((state) => state.getActiveTabPath())
	const workspacePath = useStore((state) => state.workspacePath)
	const activeDocumentName = useMemo(() => {
		if (!activeTabPath) return null
		return activeTabPath.split("/").pop() ?? activeTabPath
	}, [activeTabPath])

	const handleInsertToActiveNote = useCallback(
		async (content: string) => {
			if (!activeTabPath) return
			try {
				const current = await readTextFile(activeTabPath)
				const newContent = `${current}\n\n${content}`
				await writeTextFile(activeTabPath, newContent)
			} catch (err) {
				console.error("Failed to insert to active note", err)
			}
		},
		[activeTabPath],
	)

	const handleCreateNewNote = useCallback(
		async (content: string) => {
			if (!workspacePath) return
			try {
				const dateStr = new Date().toISOString().slice(0, 10)
				const fileName = `AI-Note-${dateStr}-${Date.now().toString().slice(-4)}.md`
				const filePath = `${workspacePath}/${fileName}`
				await writeTextFile(filePath, content)
				await useStore.getState().refreshWorkspaceEntries()
			} catch (err) {
				console.error("Failed to create new note from AI", err)
			}
		},
		[workspacePath],
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
			onInsertToActiveNote={handleInsertToActiveNote}
			onCreateNewNote={handleCreateNewNote}
			tools={({ pending }) => (
				<Select
					disabled={pending || enabledChatModels.length === 0}
					onValueChange={(value) => {
						void handleModelChange(value)
					}}
					value={selectedModelValue}
				>
					<SelectTrigger className="h-7 w-[146px] rounded-sm text-xs">
						<SelectValue placeholder={t.chat.model} />
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
