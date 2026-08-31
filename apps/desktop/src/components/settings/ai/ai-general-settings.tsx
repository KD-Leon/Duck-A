"use client"

import { Button } from "@mdit/ui/components/button"
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldSet,
} from "@mdit/ui/components/field"
import { Input } from "@mdit/ui/components/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@mdit/ui/components/select"
import { Textarea } from "@mdit/ui/components/textarea"
import { useState } from "react"
import { toast } from "sonner"
import { useTranslation } from "@/i18n"
import type { ChatConfig } from "@/store"
import { ProviderIcon } from "./provider-icon"

interface AIGeneralSettingsProps {
	chatConfig: ChatConfig | null
	enabledChatModels: { provider: string; model: string }[]
	chatHistoryRounds: number
	systemPrompt: string
	onSelectModel: (provider: string, model: string) => Promise<void>
	onSetChatHistoryRounds: (rounds: number) => void
	onSetSystemPrompt: (prompt: string) => void
}

export function AIGeneralSettings({
	chatConfig,
	enabledChatModels,
	chatHistoryRounds,
	systemPrompt,
	onSelectModel,
	onSetChatHistoryRounds,
	onSetSystemPrompt,
}: AIGeneralSettingsProps) {
	const { t } = useTranslation()
	const ai = t.settings.ai

	const [promptInput, setPromptInput] = useState(systemPrompt)
	const [roundsInput, setRoundsInput] = useState(chatHistoryRounds)

	const activeModelValue = chatConfig
		? `${chatConfig.provider}|${chatConfig.model}`
		: undefined

	const handleModelSelect = (val: string | null) => {
		if (!val) return
		const sep = val.indexOf("|")
		if (sep <= 0) return
		const provider = val.slice(0, sep)
		const model = val.slice(sep + 1)
		void onSelectModel(provider, model)
	}

	const handleSaveRounds = (val: number) => {
		const clamped = Math.max(1, Math.min(50, val || 10))
		setRoundsInput(clamped)
		onSetChatHistoryRounds(clamped)
	}

	const handleSavePrompt = () => {
		onSetSystemPrompt(promptInput)
		toast.success("System prompt saved.")
	}

	const handleResetPrompt = () => {
		setPromptInput("")
		onSetSystemPrompt("")
		toast.success("System prompt reset.")
	}

	return (
		<div className="flex flex-1 flex-col overflow-y-auto p-8 space-y-8 max-w-3xl">
			{/* Default Model */}
			<FieldSet>
				<div className="border-b border-border/50 pb-4">
					<h3 className="text-base font-semibold tracking-tight text-foreground">
						{ai.chatModel}
					</h3>
					<p className="text-xs text-muted-foreground mt-0.5">
						{ai.chatModelDesc}
					</p>
				</div>

				<FieldGroup className="mt-4">
					<Field orientation="horizontal" className="py-2">
						<FieldContent>
							<FieldLabel>{ai.chatModel}</FieldLabel>
							<FieldDescription>
								{enabledChatModels.length} models currently enabled
							</FieldDescription>
						</FieldContent>
						<Select
							value={activeModelValue}
							onValueChange={handleModelSelect}
							disabled={enabledChatModels.length === 0}
						>
							<SelectTrigger className="w-[280px]">
								{chatConfig ? (
									<div className="flex items-center gap-2 truncate">
										<ProviderIcon providerId={chatConfig.provider} size="sm" />
										<span className="font-mono text-xs truncate">
											{chatConfig.model}
										</span>
									</div>
								) : (
									<SelectValue placeholder={ai.noModelsAvailable} />
								)}
							</SelectTrigger>
							<SelectContent align="end" className="max-h-72">
								{enabledChatModels.map((item) => {
									const val = `${item.provider}|${item.model}`
									return (
										<SelectItem key={val} value={val}>
											<div className="flex items-center gap-2">
												<ProviderIcon providerId={item.provider} size="sm" />
												<span className="font-mono text-xs">{item.model}</span>
												<span className="text-[10px] text-muted-foreground">
													({item.provider})
												</span>
											</div>
										</SelectItem>
									)
								})}
							</SelectContent>
						</Select>
					</Field>
				</FieldGroup>
			</FieldSet>

			{/* Context Window Settings */}
			<FieldSet>
				<div className="border-b border-border/50 pb-4">
					<h3 className="text-base font-semibold tracking-tight text-foreground">
						{ai.generalSettings}
					</h3>
					<p className="text-xs text-muted-foreground mt-0.5">
						{ai.chatHistoryRoundsDesc}
					</p>
				</div>

				<FieldGroup className="mt-4 space-y-4">
					<Field orientation="horizontal" className="py-2">
						<FieldContent>
							<FieldLabel>{ai.chatHistoryRounds}</FieldLabel>
							<FieldDescription>{ai.chatHistoryRoundsDesc}</FieldDescription>
						</FieldContent>
						<div className="flex items-center gap-2">
							<Input
								type="number"
								min={1}
								max={50}
								value={roundsInput}
								onChange={(e) => handleSaveRounds(Number(e.target.value))}
								className="w-20 text-center font-mono text-xs"
							/>
							<span className="text-xs text-muted-foreground">rounds</span>
						</div>
					</Field>

					{/* System Prompt */}
					<div className="space-y-2 pt-2">
						<div className="flex items-center justify-between">
							<div>
								<label
									htmlFor="general-system-prompt"
									className="text-xs font-medium text-foreground"
								>
									{ai.systemPromptLabel}
								</label>
								<p className="text-[11px] text-muted-foreground">
									{ai.systemPromptDesc}
								</p>
							</div>
							<div className="flex items-center gap-2">
								{promptInput && (
									<Button
										variant="ghost"
										size="sm"
										onClick={handleResetPrompt}
										type="button"
									>
										{ai.resetDefault}
									</Button>
								)}
								<Button size="sm" onClick={handleSavePrompt} type="button">
									{ai.saveProvider}
								</Button>
							</div>
						</div>
						<Textarea
							id="general-system-prompt"
							rows={4}
							value={promptInput}
							onChange={(e) => setPromptInput(e.target.value)}
							placeholder={ai.systemPromptPlaceholder}
							className="text-xs leading-relaxed"
						/>
					</div>
				</FieldGroup>
			</FieldSet>
		</div>
	)
}
