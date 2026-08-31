import { PredefinedMenuItem, Submenu } from "@tauri-apps/api/menu"
import { getTranslation } from "@/i18n"

export async function createEditMenu() {
	const t = getTranslation().windowMenu

	return await Submenu.new({
		text: t.edit,
		items: [
			await PredefinedMenuItem.new({
				text: t.undo,
				item: "Undo",
			}),
			await PredefinedMenuItem.new({
				text: t.redo,
				item: "Redo",
			}),
			await PredefinedMenuItem.new({
				text: "Separator",
				item: "Separator",
			}),
			await PredefinedMenuItem.new({
				text: t.cut,
				item: "Cut",
			}),
			await PredefinedMenuItem.new({
				text: t.copy,
				item: "Copy",
			}),
			await PredefinedMenuItem.new({
				text: t.paste,
				item: "Paste",
			}),
			await PredefinedMenuItem.new({
				text: t.selectAll,
				item: "SelectAll",
			}),
		],
	})
}
