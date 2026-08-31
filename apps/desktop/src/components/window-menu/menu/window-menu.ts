import { type AppHotkeyMap, hotkeyToMenuAccelerator } from "@mdit/store/hotkeys"
import { MenuItem, PredefinedMenuItem, Submenu } from "@tauri-apps/api/menu"
import { getTranslation } from "@/i18n"

export async function createWindowMenu({
	activatePreviousTab,
	activateNextTab,
	hotkeys,
}: {
	activatePreviousTab: () => void
	activateNextTab: () => void
	hotkeys: AppHotkeyMap
}) {
	const t = getTranslation().windowMenu

	return await Submenu.new({
		text: t.window,
		items: [
			await MenuItem.new({
				id: "previous-tab",
				text: t.previousTab,
				accelerator: hotkeyToMenuAccelerator(hotkeys["previous-tab"]),
				action: () => activatePreviousTab(),
			}),
			await MenuItem.new({
				id: "next-tab",
				text: t.nextTab,
				accelerator: hotkeyToMenuAccelerator(hotkeys["next-tab"]),
				action: () => activateNextTab(),
			}),
			await PredefinedMenuItem.new({
				text: "Separator",
				item: "Separator",
			}),
			await PredefinedMenuItem.new({
				text: t.minimize,
				item: "Minimize",
			}),
			await PredefinedMenuItem.new({
				text: t.maximize,
				item: "Maximize",
			}),
			await PredefinedMenuItem.new({
				text: t.fullscreen,
				item: "Fullscreen",
			}),
			await PredefinedMenuItem.new({
				text: "Separator",
				item: "Separator",
			}),
			await PredefinedMenuItem.new({
				text: t.closeWindow,
				item: "CloseWindow",
			}),
		],
	})
}
