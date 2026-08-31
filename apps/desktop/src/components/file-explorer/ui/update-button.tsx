import { Button } from "@mdit/ui/components/button"
import { relaunch } from "@tauri-apps/plugin-process"
import { ArrowDownToLineIcon } from "lucide-react"
import { useTranslation } from "@/i18n"
import { useStore } from "@/store"

export function UpdateButton() {
	const { t } = useTranslation()
	const isUpdateReady = useStore((state) => state.isUpdateReady)

	if (!isUpdateReady) {
		return null
	}

	return (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			className="text-foreground/80 justify-start group hover:bg-background/40 px-1.5!"
			onClick={() => relaunch()}
		>
			<ArrowDownToLineIcon className="size-4" /> {t.explorer.updateNow}
		</Button>
	)
}
