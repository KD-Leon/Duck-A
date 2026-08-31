import { type AppHotkeyMap, hotkeyToMenuAccelerator } from "@mdit/store/hotkeys"
import { MenuItem, PredefinedMenuItem, Submenu } from "@tauri-apps/api/menu"
import { getTranslation } from "@/i18n"

export async function createMditMenu({
	toggleSettings,
	hotkeys,
}: {
	toggleSettings: () => void
	hotkeys: AppHotkeyMap
}) {
	const t = getTranslation().windowMenu

	return await Submenu.new({
		text: "Mdit",
		items: [
			await PredefinedMenuItem.new({
				text: t.services,
				item: "Services",
			}),
			await PredefinedMenuItem.new({
				text: "Separator",
				item: "Separator",
			}),
			await MenuItem.new({
				id: "settings",
				text: t.settings,
				accelerator: hotkeyToMenuAccelerator(hotkeys["toggle-settings"]),
				action: () => toggleSettings(),
			}),
			await PredefinedMenuItem.new({
				text: "Separator",
				item: "Separator",
			}),
			await PredefinedMenuItem.new({
				text: t.hide,
				item: "Hide",
			}),
			await PredefinedMenuItem.new({
				text: t.hideOthers,
				item: "HideOthers",
			}),
			await PredefinedMenuItem.new({
				text: "Separator",
				item: "Separator",
			}),
			await PredefinedMenuItem.new({
				text: t.quit,
				item: "Quit",
			}),
		],
	})
}
