import { Button } from "@mdit/ui/components/button"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@mdit/ui/components/tooltip"
import { SquarePenIcon } from "lucide-react"
import { useShallow } from "zustand/shallow"
import { HotkeyKbd } from "@/components/hotkeys/hotkey-kbd"
import { useTranslation } from "@/i18n"
import { useStore } from "@/store"

export function NewNoteButton({
	directoryPath,
}: {
	directoryPath: string | null
}) {
	const { t } = useTranslation()
	const { createNote, createNoteHotkey } = useStore(
		useShallow((s) => ({
			createNote: s.createNote,
			createNoteHotkey: s.hotkeys["create-note"],
		})),
	)

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="text-foreground/70 hover:bg-background/40"
					onClick={() =>
						directoryPath && createNote(directoryPath, { openTab: true })
					}
				>
					<SquarePenIcon />
				</Button>
			</TooltipTrigger>
			<TooltipContent className="pr-1">
				<div className="flex items-center gap-1">
					{t.collection.newNote}
					<HotkeyKbd binding={createNoteHotkey} />
				</div>
			</TooltipContent>
		</Tooltip>
	)
}
