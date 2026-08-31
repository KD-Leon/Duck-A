import {
	GraphCanvas,
	type GraphNode,
	type GraphViewData,
} from "@mdit/graph-view"
import { Button } from "@mdit/ui/components/button"
import { Dialog, DialogContent, DialogTitle } from "@mdit/ui/components/dialog"
import { invoke } from "@tauri-apps/api/core"
import { relative, resolve } from "pathe"
import { useCallback, useEffect, useRef, useState } from "react"
import { useShallow } from "zustand/shallow"
import { useTranslation } from "@/i18n"
import { useStore } from "@/store"

const EMPTY_GRAPH_DATA: GraphViewData = {
	nodes: [],
	edges: [],
}

function normalizeGraphPath(value: string) {
	return value.replace(/\\/g, "/")
}

export function GraphViewDialog() {
	const { t } = useTranslation()
	const g = t.graphView
	const {
		isGraphViewDialogOpen,
		setGraphViewDialogOpen,
		workspacePath,
		openTab,
		tabPath,
	} = useStore(
		useShallow((state) => ({
			isGraphViewDialogOpen: state.isGraphViewDialogOpen,
			setGraphViewDialogOpen: state.setGraphViewDialogOpen,
			workspacePath: state.workspacePath,
			openTab: state.openTab,
			tabPath: state.getActiveTabPath(),
		})),
	)

	const [data, setData] = useState<GraphViewData>(EMPTY_GRAPH_DATA)
	const [isLoading, setIsLoading] = useState(false)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const requestIdRef = useRef(0)

	const fetchGraphData = useCallback(async () => {
		if (!workspacePath) {
			setData(EMPTY_GRAPH_DATA)
			setErrorMessage(null)
			return
		}

		const requestId = requestIdRef.current + 1
		requestIdRef.current = requestId
		setIsLoading(true)
		setErrorMessage(null)

		try {
			const result = await invoke<GraphViewData>(
				"get_graph_view_data_command",
				{
					workspacePath,
				},
			)
			if (requestIdRef.current !== requestId) {
				return
			}
			setData(result)
		} catch (error) {
			if (requestIdRef.current !== requestId) {
				return
			}

			setData(EMPTY_GRAPH_DATA)
			setErrorMessage(error instanceof Error ? error.message : g.failed)
		} finally {
			if (requestIdRef.current === requestId) {
				setIsLoading(false)
			}
		}
	}, [workspacePath, g.failed])

	useEffect(() => {
		if (!isGraphViewDialogOpen) {
			return
		}

		fetchGraphData()
	}, [fetchGraphData, isGraphViewDialogOpen])

	const activeRelPath = (() => {
		if (!workspacePath || !tabPath) {
			return null
		}

		return normalizeGraphPath(relative(workspacePath, tabPath))
	})()

	const handleNodeAction = useCallback(
		(node: GraphNode) => {
			if (node.unresolved) {
				return
			}

			if (!workspacePath) {
				return
			}

			openTab(resolve(workspacePath, node.relPath))
			setGraphViewDialogOpen(false)
		},
		[openTab, setGraphViewDialogOpen, workspacePath],
	)

	const hasNodes = data.nodes.length > 0

	const statsText = g.stats
		.replace("{nodes}", String(data.nodes.length))
		.replace("{edges}", String(data.edges.length))

	return (
		<Dialog open={isGraphViewDialogOpen} onOpenChange={setGraphViewDialogOpen}>
			<DialogContent
				className="w-full md:max-w-[calc(100vw-8rem)] h-[calc(100vh-8rem)] p-0 overflow-hidden flex flex-col gap-0"
				showCloseButton
			>
				<header className="absolute top-0 left-0 right-0 h-12 shrink-0 px-3 flex items-center">
					<div className="min-w-0">
						<DialogTitle className="text-sm font-medium">{g.title}</DialogTitle>
						<p className="text-[11px] text-muted-foreground">{statsText}</p>
					</div>
				</header>

				<div className="flex-1 min-h-0">
					{errorMessage ? (
						<div className="h-full flex items-center justify-center px-6">
							<div className="max-w-md text-center space-y-3">
								<p className="text-sm font-medium">{g.failed}</p>
								<p className="text-xs text-muted-foreground break-words">
									{errorMessage}
								</p>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={fetchGraphData}
								>
									{g.tryAgain}
								</Button>
							</div>
						</div>
					) : hasNodes ? (
						<GraphCanvas
							data={data}
							activeRelPath={activeRelPath}
							onNodeSelect={handleNodeAction}
						/>
					) : isLoading ? null : (
						<div className="h-full flex items-center justify-center text-sm text-muted-foreground">
							{g.empty}
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}
