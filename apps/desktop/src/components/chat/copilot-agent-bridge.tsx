import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core"
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs"
import { useEffect, useState } from "react"
import { useStore } from "@/store"

export function CopilotAgentBridge() {
	const activePath = useStore((s) => s.getActiveTabPath())
	const workspacePath = useStore((s) => s.workspacePath)
	const [activeContent, setActiveContent] = useState<string>("")

	useEffect(() => {
		let isMounted = true
		if (!activePath) {
			setActiveContent("")
			return
		}

		readTextFile(activePath)
			.then((content) => {
				if (isMounted) {
					setActiveContent(content)
				}
			})
			.catch(() => {
				if (isMounted) {
					setActiveContent("")
				}
			})

		return () => {
			isMounted = false
		}
	}, [activePath])

	// 1. 让智能体实时感知当前打开的笔记 (Vision/Perception)
	useCopilotReadable({
		description: "用户当前在编辑器中打开的笔记内容与文件路径",
		value: {
			filePath: activePath ?? "无打开的文件",
			fileName: activePath ? activePath.split("/").pop() : "未命名",
			content: activeContent ? activeContent.slice(0, 10000) : "（空文档）",
		},
	})

	// 2. 动作：读取指定笔记内容
	useCopilotAction({
		name: "readNoteContent",
		description: "读取工作区中指定相对路径或绝对路径的 Markdown 笔记全文",
		parameters: [
			{
				name: "path",
				type: "string",
				description: "笔记文件的完整路径或文件名",
				required: true,
			},
		],
		handler: async ({ path }) => {
			try {
				const fullPath =
					path.startsWith("/") || path.includes(":\\")
						? path
						: `${workspacePath}/${path}`
				const content = await readTextFile(fullPath)
				return { success: true, path: fullPath, content }
			} catch (err) {
				return {
					success: false,
					error: err instanceof Error ? err.message : "无法读取该文件",
				}
			}
		},
	})

	// 3. 动作：向当前笔记插入/追加内容
	useCopilotAction({
		name: "insertContentToActiveNote",
		description: "将生成的 Markdown 文本插入或追加到用户当前正在编辑的笔记中",
		parameters: [
			{
				name: "content",
				type: "string",
				description: "要插入或追加的 Markdown 格式文本",
				required: true,
			},
			{
				name: "position",
				type: "string",
				description: "插入位置：'end' 表示追加到文末，'start' 表示插入到开头",
				required: false,
			},
		],
		handler: async ({ content, position = "end" }) => {
			if (!activePath) {
				return { success: false, error: "当前没有打开任何笔记文件" }
			}

			try {
				const current = await readTextFile(activePath)
				const newContent =
					position === "start"
						? `${content}\n\n${current}`
						: `${current}\n\n${content}`
				await writeTextFile(activePath, newContent)
				setActiveContent(newContent)
				return {
					success: true,
					message: `已成功${position === "start" ? "插入到文首" : "追加到文末"}`,
				}
			} catch (err) {
				return {
					success: false,
					error: err instanceof Error ? err.message : "写入文件失败",
				}
			}
		},
	})

	// 4. 动作：在工作区中自动创建新笔记
	useCopilotAction({
		name: "createNewNote",
		description: "在当前工作区中创建一篇全新的 Markdown 笔记并写入内容",
		parameters: [
			{
				name: "title",
				type: "string",
				description: "新笔记的文件名（不含 .md 后缀）",
				required: true,
			},
			{
				name: "content",
				type: "string",
				description: "新笔记的 Markdown 初始正文内容",
				required: true,
			},
		],
		handler: async ({ title, content }) => {
			if (!workspacePath) {
				return { success: false, error: "未打开工作区目录" }
			}

			try {
				const cleanTitle = title.replace(/\.md$/, "")
				const filePath = `${workspacePath}/${cleanTitle}.md`
				await writeTextFile(filePath, content)
				// 触发工作区树刷新
				await useStore.getState().refreshWorkspaceEntries()
				return {
					success: true,
					filePath,
					message: `已成功创建新笔记: ${cleanTitle}.md`,
				}
			} catch (err) {
				return {
					success: false,
					error: err instanceof Error ? err.message : "创建笔记失败",
				}
			}
		},
	})

	// 5. 动作：对当前笔记进行局部精准修改 (Diff / Patch)
	useCopilotAction({
		name: "applyDiffToActiveNote",
		description: "通过搜索指定原文本并替换为新文本，对当前笔记进行局部精准修改",
		parameters: [
			{
				name: "searchText",
				type: "string",
				description: "需要被替换的现有文本（必须与原文完全一致）",
				required: true,
			},
			{
				name: "replaceText",
				type: "string",
				description: "用于替换的新文本内容",
				required: true,
			},
		],
		handler: async ({ searchText, replaceText }) => {
			if (!activePath) {
				return { success: false, error: "当前没有打开任何笔记文件" }
			}

			try {
				const current = await readTextFile(activePath)
				if (!current.includes(searchText)) {
					return {
						success: false,
						error:
							"未在当前笔记中找到需要替换的目标文本，请检查原文内容是否变更",
					}
				}

				const updated = current.replace(searchText, replaceText)
				await writeTextFile(activePath, updated)
				setActiveContent(updated)
				return {
					success: true,
					message: "已成功对当前笔记应用局部修改",
				}
			} catch (err) {
				return {
					success: false,
					error: err instanceof Error ? err.message : "应用修改失败",
				}
			}
		},
	})

	return null
}
