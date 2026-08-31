import { type AppHotkeyMap, hotkeyToMenuAccelerator } from "@mdit/store/hotkeys"
import { MenuItem, PredefinedMenuItem, Submenu } from "@tauri-apps/api/menu"
import { getTranslation } from "@/i18n"

export async function createViewMenu({
	toggleFileExplorer,
	toggleCollectionView,
	toggleChatPanel,
	zoomIn,
	zoomOut,
	resetZoom,
	openCommandMenu,
	openGraphView,
	chatPanelBetaEnabled,
	hotkeys,
}: {
	toggleFileExplorer: () => void
	toggleCollectionView: () => void
	toggleChatPanel: () => void
	zoomIn: () => void
	zoomOut: () => void
	resetZoom: () => void
	openCommandMenu: () => void
	openGraphView: () => void
	chatPanelBetaEnabled: boolean
	hotkeys: AppHotkeyMap
}) {
	const t = getTranslation().windowMenu

	const items = [
		await MenuItem.new({
			id: "command-menu",
			text: t.commandMenu,
			accelerator: hotkeyToMenuAccelerator(hotkeys["open-command-menu"]),
			action: () => openCommandMenu(),
		}),
		await MenuItem.new({
			id: "graph-view",
			text: t.graphView,
			accelerator: hotkeyToMenuAccelerator(hotkeys["toggle-graph-view"]),
			action: () => openGraphView(),
		}),
		await PredefinedMenuItem.new({
			text: "Separator",
			item: "Separator",
		}),
		await MenuItem.new({
			id: "toggle-explorer",
			text: t.toggleFileExplorer,
			accelerator: hotkeyToMenuAccelerator(hotkeys["toggle-file-explorer"]),
			action: () => toggleFileExplorer(),
		}),
		await MenuItem.new({
			id: "toggle-collection-view",
			text: t.toggleCollectionView,
			accelerator: hotkeyToMenuAccelerator(hotkeys["toggle-collection-view"]),
			action: () => toggleCollectionView(),
		}),
	]

	if (chatPanelBetaEnabled) {
		items.push(
			await MenuItem.new({
				id: "toggle-chat-panel",
				text: t.toggleChatPanel,
				accelerator: hotkeyToMenuAccelerator(hotkeys["toggle-chat-panel"]),
				action: () => toggleChatPanel(),
			}),
		)
	}

	items.push(
		await PredefinedMenuItem.new({
			text: "Separator",
			item: "Separator",
		}),
		await MenuItem.new({
			id: "zoom-in",
			text: t.zoomIn,
			accelerator: hotkeyToMenuAccelerator(hotkeys["zoom-in"]),
			action: () => zoomIn(),
		}),
		await MenuItem.new({
			id: "zoom-out",
			text: t.zoomOut,
			accelerator: hotkeyToMenuAccelerator(hotkeys["zoom-out"]),
			action: () => zoomOut(),
		}),
		await MenuItem.new({
			id: "reset-zoom",
			text: t.resetZoom,
			accelerator: hotkeyToMenuAccelerator(hotkeys["reset-zoom"]),
			action: () => resetZoom(),
		}),
	)

	return await Submenu.new({
		text: t.view,
		items,
	})
}
