import { type AppHotkeyMap, hotkeyToMenuAccelerator } from "@mdit/store/hotkeys"
import { MenuItem, Submenu } from "@tauri-apps/api/menu"
import { getTranslation } from "@/i18n"

export async function createHistoryMenu({
	goBack,
	goForward,
	hotkeys,
}: {
	goBack: () => Promise<boolean>
	goForward: () => Promise<boolean>
	hotkeys: AppHotkeyMap
}) {
	const t = getTranslation().windowMenu

	return await Submenu.new({
		text: t.history,
		items: [
			await MenuItem.new({
				id: "go-back",
				text: t.back,
				accelerator: hotkeyToMenuAccelerator(hotkeys["go-back"]),
				action: () => goBack(),
			}),
			await MenuItem.new({
				id: "go-forward",
				text: t.forward,
				accelerator: hotkeyToMenuAccelerator(hotkeys["go-forward"]),
				action: () => goForward(),
			}),
		],
	})
}
