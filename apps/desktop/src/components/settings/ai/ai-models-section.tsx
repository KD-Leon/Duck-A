import type { ModelCapability, ProviderId } from "@mdit/ai"
import { Checkbox } from "@mdit/ui/components/checkbox"
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@mdit/ui/components/field"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@mdit/ui/components/select"
import { Switch } from "@mdit/ui/components/switch"
import { useTranslation } from "@/i18n"
import type { ProviderModels } from "./ai-provider-state"

type EnabledChatModel = {
	provider: string
	model: string
}

type ChatModelSelectOption = {
	model: string
	value: string
}

interface AIModelsSectionProps {
	enabledChatModels: EnabledChatModel[]
	providerModels: ProviderModels[]
	connectedProviders: ProviderId[]
	hasConnectedProviders: boolean
	selectedChatModelValue: string | undefined
	selectedChatModelLabel: string | null
	chatModelSelectOptions: ChatModelSelectOption[]
	modelCapabilities: Record<string, ModelCapability>
	onSelectChatModel: (value: string | null) => void
	onToggleModelEnabled: (
		provider: string,
		model: string,
		checked: boolean,
	) => void
	onUpdateModelCapability: (
		provider: string,
		model: string,
		capabilities: Partial<ModelCapability>,
	) => void
}

export function AIModelsSection({
	enabledChatModels,
	providerModels,
	connectedProviders,
	hasConnectedProviders,
	selectedChatModelValue,
	selectedChatModelLabel,
	chatModelSelectOptions,
	modelCapabilities,
	onSelectChatModel,
	onToggleModelEnabled,
	onUpdateModelCapability,
}: AIModelsSectionProps) {
	const { t } = useTranslation()
	const ai = t.settings.ai

	return (
		<FieldSet className="border-b pb-8">
			<FieldLegend>{ai.models}</FieldLegend>
			<FieldDescription>{ai.modelsDesc}</FieldDescription>
			<div>
				<FieldGroup className="gap-0 mt-2">
					<Field orientation="horizontal" className="pt-2 pb-8">
						<FieldContent>
							<FieldLabel>{ai.chatModel}</FieldLabel>
							<FieldDescription>{ai.chatModelDesc}</FieldDescription>
						</FieldContent>
						<Select
							value={selectedChatModelValue}
							onValueChange={onSelectChatModel}
							disabled={enabledChatModels.length === 0}
						>
							<SelectTrigger className="w-[240px]">
								{selectedChatModelLabel ?? (
									<span className="text-muted-foreground">
										{enabledChatModels.length === 0
											? ai.noModelsAvailable
											: ai.chatModelPlaceholder}
									</span>
								)}
							</SelectTrigger>
							<SelectContent align="end">
								{chatModelSelectOptions.map(({ model, value }) => (
									<SelectItem key={value} value={value}>
										{model}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>

					{providerModels.map(({ provider, models }) => {
						const isConnected =
							provider === "ollama" ||
							provider.startsWith("custom_") ||
							connectedProviders.includes(provider as ProviderId)

						if (!isConnected || models.length === 0) {
							return null
						}

						return (
							<Field key={provider} className="mt-4 first:mt-0">
								<FieldLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
									{provider}
								</FieldLabel>
								<FieldGroup className="gap-0 mt-1 rounded-md border border-border/40 p-2 bg-muted/10">
									{models.map((model) => {
										const capKey = `${provider}:${model}`
										const caps = modelCapabilities[capKey]

										return (
											<Field
												key={`${provider}-${model}`}
												orientation="horizontal"
												className="py-2.5 items-center justify-between border-b border-border/20 last:border-b-0"
											>
												<FieldContent className="flex flex-col gap-1 min-w-0 pr-4">
													<FieldLabel
														htmlFor={`${provider}-${model}`}
														className="text-xs font-mono font-medium truncate"
													>
														{model}
													</FieldLabel>
													<div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-0.5">
														<label
															htmlFor={`${provider}-${model}-vision`}
															className="flex items-center gap-1.5 cursor-pointer hover:text-foreground"
														>
															<Checkbox
																id={`${provider}-${model}-vision`}
																checked={caps?.vision ?? false}
																onCheckedChange={(checked) =>
																	onUpdateModelCapability(provider, model, {
																		vision: Boolean(checked),
																	})
																}
															/>
															<span>{ai.visionCapability}</span>
														</label>
														<label
															htmlFor={`${provider}-${model}-tools`}
															className="flex items-center gap-1.5 cursor-pointer hover:text-foreground"
														>
															<Checkbox
																id={`${provider}-${model}-tools`}
																checked={caps?.toolCall ?? false}
																onCheckedChange={(checked) =>
																	onUpdateModelCapability(provider, model, {
																		toolCall: Boolean(checked),
																	})
																}
															/>
															<span>{ai.toolsCapability}</span>
														</label>
														<label
															htmlFor={`${provider}-${model}-reasoning`}
															className="flex items-center gap-1.5 cursor-pointer hover:text-foreground"
														>
															<Checkbox
																id={`${provider}-${model}-reasoning`}
																checked={caps?.reasoning ?? false}
																onCheckedChange={(checked) =>
																	onUpdateModelCapability(provider, model, {
																		reasoning: Boolean(checked),
																	})
																}
															/>
															<span>{ai.reasoningCapability}</span>
														</label>
													</div>
												</FieldContent>
												<Switch
													id={`${provider}-${model}`}
													checked={enabledChatModels.some(
														(item) =>
															item.provider === provider &&
															item.model === model,
													)}
													onCheckedChange={(checked) =>
														onToggleModelEnabled(provider, model, checked)
													}
												/>
											</Field>
										)
									})}
								</FieldGroup>
							</Field>
						)
					})}
					{!hasConnectedProviders && (
						<div className="py-2 text-sm text-muted-foreground">
							{ai.noConnectedProviders}
						</div>
					)}
				</FieldGroup>
			</div>
		</FieldSet>
	)
}
