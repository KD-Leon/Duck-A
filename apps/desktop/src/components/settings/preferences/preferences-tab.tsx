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
	SelectValue,
} from "@mdit/ui/components/select"
import { Switch } from "@mdit/ui/components/switch"
import { Languages, Monitor, Moon, Sun } from "lucide-react"
import { useShallow } from "zustand/shallow"
import { HotkeyKbd } from "@/components/hotkeys/hotkey-kbd"
import { useTheme } from "@/contexts/theme-context"
import { type Language, useTranslation } from "@/i18n"
import { useStore } from "@/store"

export function PreferencesTab() {
	const { theme, setTheme } = useTheme()
	const { language, setLanguage, t } = useTranslation()
	const {
		chatPanelBetaEnabled,
		setChatPanelBetaEnabled,
		toggleChatPanelHotkey,
	} = useStore(
		useShallow((state) => ({
			chatPanelBetaEnabled: state.chatPanelBetaEnabled,
			setChatPanelBetaEnabled: state.setChatPanelBetaEnabled,
			toggleChatPanelHotkey: state.hotkeys["toggle-chat-panel"],
		})),
	)

	const p = t.settings.preferences

	const themeOptions: Array<{
		value: "light" | "dark" | "system"
		label: string
		icon?: React.ReactNode
	}> = [
		{ value: "light", label: p.themeLight, icon: <Sun /> },
		{ value: "dark", label: p.themeDark, icon: <Moon /> },
		{ value: "system", label: p.themeSystem, icon: <Monitor /> },
	]

	const languageOptions: Array<{
		value: Language
		label: string
	}> = [
		{ value: "en", label: p.languageEn },
		{ value: "zh", label: p.languageZh },
	]

	return (
		<div className="flex-1 overflow-y-auto p-12">
			<FieldSet>
				<FieldLegend>{p.title}</FieldLegend>
				<FieldDescription>{p.description}</FieldDescription>
				<FieldGroup>
					<Field orientation="horizontal">
						<FieldContent>
							<FieldLabel>{p.appearance}</FieldLabel>
							<FieldDescription>{p.appearanceDesc}</FieldDescription>
						</FieldContent>
						<Select
							value={theme}
							onValueChange={(value) =>
								setTheme(value as "light" | "dark" | "system")
							}
						>
							<SelectTrigger className="w-32">
								<SelectValue />
							</SelectTrigger>
							<SelectContent align="end">
								{themeOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.icon}
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>

					<Field orientation="horizontal">
						<FieldContent>
							<FieldLabel>{p.language}</FieldLabel>
							<FieldDescription>{p.languageDesc}</FieldDescription>
						</FieldContent>
						<Select
							value={language}
							onValueChange={(value) => setLanguage(value as Language)}
						>
							<SelectTrigger className="w-32">
								<SelectValue />
							</SelectTrigger>
							<SelectContent align="end">
								{languageOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										<Languages className="size-4" />
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>
				</FieldGroup>
			</FieldSet>

			<FieldSet className="mt-8">
				<FieldLegend>{p.beta}</FieldLegend>
				<FieldDescription>{p.betaDesc}</FieldDescription>
				<FieldGroup>
					<Field orientation="horizontal">
						<FieldContent>
							<FieldLabel>{p.agentChatPanel}</FieldLabel>
							<FieldDescription>
								{p.agentChatPanelDesc}
								{toggleChatPanelHotkey.length > 0 ? (
									<>
										<span>{` ${p.chatPanelHotkeyShow}`}</span>
										<HotkeyKbd
											className="mx-1"
											binding={toggleChatPanelHotkey}
										/>
										<span>{p.chatPanelHotkeyCustomize}</span>
									</>
								) : (
									<span>{` ${p.chatPanelHotkeyAssign}`}</span>
								)}
							</FieldDescription>
						</FieldContent>
						<Switch
							checked={chatPanelBetaEnabled}
							onCheckedChange={setChatPanelBetaEnabled}
						/>
					</Field>
				</FieldGroup>
			</FieldSet>
		</div>
	)
}
