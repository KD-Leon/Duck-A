import { Submenu } from "@tauri-apps/api/menu"
import { getTranslation } from "@/i18n"

export async function createHelpMenu() {
	const t = getTranslation().windowMenu

	return await Submenu.new({
		text: t.help,
		items: [],
	})
}
