import { type AppHotkeyMap, hotkeyToMenuAccelerator } from "@mdit/store/hotkeys"
import { MenuItem, PredefinedMenuItem, Submenu } from "@tauri-apps/api/menu"
import { getTranslation } from "@/i18n"

export async function createFileMenu({
	createNote,
	closeTabOrHideWindow,
	openWorkspace,
	hotkeys,
}: {
	createNote: () => void | Promise<void>
	closeTabOrHideWindow: () => void
	openWorkspace: () => void | Promise<void>
	hotkeys: AppHotkeyMap
}) {
	const t = getTranslation().windowMenu

	return await Submenu.new({
		text: t.file,
		items: [
			await MenuItem.new({
				id: "new-note",
				text: t.newNote,
				accelerator: hotkeyToMenuAccelerator(hotkeys["create-note"]),
				action: () => createNote(),
			}),
			await MenuItem.new({
				id: "open-folder",
				text: t.openFolder,
				accelerator: hotkeyToMenuAccelerator(hotkeys["open-folder"]),
				action: () => openWorkspace(),
			}),
			await MenuItem.new({
				id: "close-tab",
				text: t.closeTab,
				accelerator: hotkeyToMenuAccelerator(hotkeys["close-tab"]),
				action: () => closeTabOrHideWindow(),
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
