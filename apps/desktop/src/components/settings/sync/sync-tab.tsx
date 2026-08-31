import {
	Field,
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@mdit/ui/components/field"
import { Input } from "@mdit/ui/components/input"
import { Switch } from "@mdit/ui/components/switch"
import { Textarea } from "@mdit/ui/components/textarea"
import { useEffect, useState } from "react"
import { useShallow } from "zustand/shallow"
import { useTranslation } from "@/i18n"
import { useStore } from "@/store"

export function SyncTab() {
	const { t } = useTranslation()
	const s = t.settings.sync

	const {
		workspacePath,
		getSyncConfig,
		setBranchName,
		setCommitMessage,
		setAutoSync,
	} = useStore(
		useShallow((state) => ({
			workspacePath: state.workspacePath,
			getSyncConfig: state.getSyncConfig,
			setBranchName: state.setBranchName,
			setCommitMessage: state.setCommitMessage,
			setAutoSync: state.setAutoSync,
		})),
	)

	const [branchName, setBranchNameLocal] = useState("")
	const [commitMessage, setCommitMessageLocal] = useState("")
	const [autoSync, setAutoSyncLocal] = useState(false)

	// Update local state when workspacePath or config changes
	useEffect(() => {
		if (workspacePath) {
			getSyncConfig(workspacePath).then((currentConfig) => {
				setBranchNameLocal(currentConfig.branchName)
				setCommitMessageLocal(currentConfig.commitMessage)
				setAutoSyncLocal(currentConfig.autoSync)
			})
		} else {
			setBranchNameLocal("")
			setCommitMessageLocal("")
			setAutoSyncLocal(false)
		}
	}, [workspacePath, getSyncConfig])

	const handleBranchNameChange = async (value: string) => {
		setBranchNameLocal(value)
		if (workspacePath) {
			await setBranchName(workspacePath, value)
		}
	}

	const handleCommitMessageChange = async (value: string) => {
		setCommitMessageLocal(value)
		if (workspacePath) {
			await setCommitMessage(workspacePath, value)
		}
	}

	const handleAutoSyncChange = async (checked: boolean) => {
		setAutoSyncLocal(checked)
		if (workspacePath) {
			await setAutoSync(workspacePath, checked)
		}
	}

	if (!workspacePath) {
		return (
			<div className="flex-1 overflow-y-auto p-12">
				<FieldSet>
					<FieldLegend>{s.title}</FieldLegend>
					<FieldDescription>{s.noWorkspace}</FieldDescription>
				</FieldSet>
			</div>
		)
	}

	return (
		<div className="flex-1 overflow-y-auto p-12">
			<FieldSet>
				<FieldLegend>{s.title}</FieldLegend>
				<FieldDescription>{s.description}</FieldDescription>
				<FieldGroup>
					<Field orientation="horizontal">
						<FieldContent>
							<FieldLabel>{s.autoSync}</FieldLabel>
							<FieldDescription>{s.autoSyncDesc}</FieldDescription>
						</FieldContent>
						<Switch checked={autoSync} onCheckedChange={handleAutoSyncChange} />
					</Field>

					<Field orientation="vertical">
						<FieldContent>
							<FieldLabel>{s.branchName}</FieldLabel>
							<FieldDescription>{s.branchNameDesc}</FieldDescription>
						</FieldContent>
						<Input
							value={branchName}
							onChange={(e) => handleBranchNameChange(e.target.value)}
							placeholder={s.branchPlaceholder}
						/>
					</Field>

					<Field orientation="vertical">
						<FieldContent>
							<FieldLabel>{s.commitMessage}</FieldLabel>
							<FieldDescription>{s.commitMessageDesc}</FieldDescription>
						</FieldContent>
						<Textarea
							value={commitMessage}
							onChange={(e) => handleCommitMessageChange(e.target.value)}
							placeholder={s.commitMessagePlaceholder}
							rows={4}
							className="px-2 py-1.5"
						/>
					</Field>
				</FieldGroup>
			</FieldSet>
		</div>
	)
}
