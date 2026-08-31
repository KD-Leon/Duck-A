import { AIChatPlugin } from "@platejs/ai/react"
import { EmojiInputPlugin } from "@platejs/emoji/react"
import {
	CalendarIcon,
	CheckSquare,
	Code2,
	FileText,
	ImageIcon,
	LightbulbIcon,
	List,
	ListOrdered,
	Quote,
	RadicalIcon,
	SmileIcon,
	SparklesIcon,
	Table,
	TableOfContentsIcon,
	Type,
} from "lucide-react"
import type { NodeComponent } from "platejs"
import { KEYS } from "platejs"
import type { PlateEditor, PlateElementProps } from "platejs/react"
import { PlateElement } from "platejs/react"
import { applyPreviousCodeBlockLanguage } from "../code/code-block-language"
import { CODE_DRAWING_KEY } from "../code/code-drawing-kit"
import {
	createDefaultFrontmatterRows,
	FRONTMATTER_KEY,
	requestFrontmatterFocus,
} from "../frontmatter"
import { WIKI_LINK_PLACEHOLDER_TEXT } from "../link/wiki-link-constants"
import { insertResolvedImage } from "../media/image-insert"
import { resolveEditorImageLink } from "../media/image-link-resolver"
import {
	InlineCombobox,
	InlineComboboxContent,
	InlineComboboxEmpty,
	InlineComboboxGroup,
	InlineComboboxGroupLabel,
	InlineComboboxInput,
	InlineComboboxItem,
} from "../shared/inline-combobox"
import {
	getSlashInputCancelBehavior,
	type SlashInputElement as SlashInputNode,
} from "../slash/slash-input"
import type { SlashHostDeps } from "../slash/slash-kit-types"
import {
	insertBlock,
	insertInlineElement,
	turnIntoBlock,
} from "../slash/transforms"
import { NOTE_TITLE_KEY } from "../title"

async function insertImageNode(
	editor: PlateEditor,
	path: string,
	host?: Pick<SlashHostDeps, "resolveImageLink" | "onResolveImageLinkError">,
	options?: Parameters<PlateEditor["tf"]["insertNodes"]>[1],
) {
	const imageData = await resolveEditorImageLink(path, host)
	if (!imageData) {
		return
	}

	insertResolvedImage(editor, imageData, {
		nextBlock: true,
		...options,
	})
}

type Group = {
	group: string
	shouldHide?: (editor: PlateEditor) => boolean
	items: {
		icon: React.ReactNode
		value: string
		onSelect: (editor: PlateEditor, value: string) => void | Promise<void>
		className?: string
		focusEditor?: boolean
		keywords?: string[]
		label?: string
		description?: string
	}[]
}

function HeadingIcon({ level }: { level: 1 | 2 | 3 | 4 }) {
	const subscriptMap: Record<number, string> = {
		1: "₁",
		2: "₂",
		3: "₃",
		4: "₄",
	}

	return (
		<span className="inline-flex items-center justify-center font-semibold text-xs leading-none select-none tracking-tighter">
			<span>H</span>
			<span className="text-[11px] font-bold opacity-80">
				{subscriptMap[level]}
			</span>
		</span>
	)
}

function createSlashGroups(host: SlashHostDeps): Group[] {
	const groups: Group[] = [
		{
			group: "Format",
			items: [
				{
					icon: <Type className="size-4" />,
					keywords: ["paragraph", "text", "p", "正文", "文本", "段落"],
					label: "Text",
					value: KEYS.p,
				},
				{
					icon: <HeadingIcon level={1} />,
					keywords: [
						"h1",
						"heading 1",
						"title",
						"1",
						"#",
						"一",
						"一级标题",
						"标题1",
					],
					label: "Heading 1",
					value: KEYS.h1,
				},
				{
					icon: <HeadingIcon level={2} />,
					keywords: [
						"h2",
						"heading 2",
						"subtitle",
						"2",
						"##",
						"二",
						"二级标题",
						"标题2",
					],
					label: "Heading 2",
					value: KEYS.h2,
				},
				{
					icon: <HeadingIcon level={3} />,
					keywords: ["h3", "heading 3", "3", "###", "三", "三级标题", "标题3"],
					label: "Heading 3",
					value: KEYS.h3,
				},
				{
					icon: <HeadingIcon level={4} />,
					keywords: ["h4", "heading 4", "4", "####", "四", "四级标题", "标题4"],
					label: "Heading 4",
					value: KEYS.h4,
				},
				{
					icon: <Quote className="size-4" />,
					keywords: ["citation", "blockquote", "quote", ">", "引用", "块引用"],
					label: "Blockquote",
					value: KEYS.blockquote,
				},
				{
					icon: <Code2 className="size-4" />,
					keywords: ["```", "code", "codeblock", "代码", "代码块"],
					label: "Code Block",
					value: KEYS.codeBlock,
				},
				{
					icon: <List className="size-4" />,
					keywords: ["unordered", "ul", "-", "*", "bullet", "列表", "无序列表"],
					label: "Bullet List",
					value: KEYS.ul,
				},
				{
					icon: <ListOrdered className="size-4" />,
					keywords: [
						"ordered",
						"ol",
						"1",
						"1.",
						"number",
						"有序列表",
						"数字列表",
					],
					label: "Ordered List",
					value: KEYS.ol,
				},
				{
					icon: <CheckSquare className="size-4" />,
					keywords: [
						"checklist",
						"task",
						"checkbox",
						"[]",
						"[ ]",
						"todo",
						"待办",
						"任务",
					],
					label: "To-do List",
					value: KEYS.listTodo,
				},
				{
					icon: <LightbulbIcon className="size-4" />,
					keywords: [
						"note",
						"callout",
						"obsidian",
						"[!",
						"tip",
						"warning",
						"提示",
						"警告",
					],
					label: "Callout",
					value: KEYS.callout,
				},
			].map((item) => ({
				...item,
				onSelect: (editor, value) => {
					editor.tf.withoutNormalizing(() => {
						turnIntoBlock(editor, value)
						if (value === KEYS.codeBlock) {
							applyPreviousCodeBlockLanguage(editor)
						}
					})
				},
			})),
		},
		{
			group: "AI",
			items: [
				{
					focusEditor: false,
					icon: <SparklesIcon className="size-4 text-purple-500" />,
					keywords: ["ai", "chat", "assistant", "generate", "智能", "生成"],
					label: "AI Assistant",
					value: "AI",
					onSelect: (editor) => {
						editor.getApi(AIChatPlugin).aiChat.show()
					},
				},
			],
		},
		{
			group: "Insert",
			items: [
				{
					icon: <Table className="size-4" />,
					keywords: ["table", "grid", "表格"],
					label: "Table",
					value: KEYS.table,
					onSelect: (editor) => {
						insertBlock(editor, KEYS.table)
					},
				},
				{
					focusEditor: false,
					icon: <RadicalIcon className="size-4" />,
					keywords: [
						"math",
						"equation",
						"formula",
						"latex",
						"katex",
						"公式",
						"数学",
					],
					label: "Math Equation",
					value: KEYS.equation,
					onSelect: (editor) => {
						insertBlock(editor, KEYS.equation)
					},
				},
				{
					icon: <Code2 className="size-4" />,
					keywords: [
						"mermaid",
						"plantuml",
						"graphviz",
						"flowchart",
						"diagram",
						"图表",
						"流程图",
					],
					label: "Code Drawing",
					value: CODE_DRAWING_KEY,
					onSelect: (editor) => {
						insertBlock(editor, CODE_DRAWING_KEY)
					},
				},
			],
		},
	]

	if (host.pickImageFile && host.resolveImageLink) {
		const insertGroup = groups.find((g) => g.group === "Insert")
		if (insertGroup) {
			insertGroup.items.unshift({
				icon: <ImageIcon className="size-4" />,
				keywords: ["picture", "photo", "image", "img", "图片", "照片"],
				label: "Image",
				value: KEYS.img,
				onSelect: async (editor) => {
					const path = await host.pickImageFile!()
					if (path) {
						const block = editor.api.block()
						if (block) {
							await insertImageNode(editor, path, host, {
								at: block[1],
								nextBlock: false,
							})
						} else {
							await insertImageNode(editor, path, host)
						}
					}
				},
			})
		}
	}

	groups.push(
		{
			group: "Inline",
			items: [
				{
					focusEditor: false,
					icon: <SmileIcon className="size-4" />,
					keywords: ["emoji", "smile", "表情", "符号"],
					label: "Emoji",
					value: "emoji",
					onSelect: (editor: PlateEditor) => {
						const emojiInputType = editor.getType(EmojiInputPlugin.key)
						editor.tf.insertNodes({
							type: emojiInputType,
							children: [{ text: "" }],
						})
					},
				},
				{
					focusEditor: true,
					icon: <CalendarIcon className="size-4" />,
					keywords: ["date", "time", "today", "now", "日期", "时间"],
					label: "Date",
					value: KEYS.date,
				},
				{
					focusEditor: false,
					icon: <RadicalIcon className="size-4" />,
					keywords: ["inline math", "formula", "行内公式"],
					label: "Inline Equation",
					value: KEYS.inlineEquation,
				},
				{
					focusEditor: false,
					icon: <FileText className="size-4" />,
					keywords: [
						"wiki",
						"link",
						"internal",
						"note",
						"page",
						"双链",
						"笔记引用",
					],
					label: "Wiki Link",
					value: "wikiLink",
					onSelect: (editor: PlateEditor) => {
						editor.tf.insertNodes(
							{
								type: KEYS.link,
								url: "",
								wiki: true,
								wikiTarget: "",
								children: [{ text: WIKI_LINK_PLACEHOLDER_TEXT }],
							},
							{ select: true },
						)
						const linkType = editor.getType(KEYS.link)
						setTimeout(() => {
							const sel = editor.selection
							if (!sel) return
							const linkEntry = editor.api.above({
								at: sel.anchor,
								match: { type: linkType },
							})
							if (!linkEntry) return
							const [, path] = linkEntry
							const end = editor.api.end(path)
							if (end) {
								editor.tf.select({ anchor: end, focus: end })
								editor.tf.focus()
							}
						}, 0)
					},
				},
			].map((item) => {
				if (item.onSelect) {
					return item
				}

				return {
					...item,
					onSelect: (editor: PlateEditor, value: string) => {
						insertInlineElement(editor, value)
					},
				}
			}),
		},
		{
			group: "Document",
			shouldHide: (editor) => {
				const hasFrontmatter = editor.api.some({
					match: { type: FRONTMATTER_KEY },
				})
				const currentBlock = editor.api.node({ block: true, mode: "lowest" })
				const currentTopLevelIndex = currentBlock?.[1][0] ?? -1
				const canInsertFrontmatter =
					!hasFrontmatter &&
					(currentTopLevelIndex === 1 ||
						(currentTopLevelIndex === 0 &&
							currentBlock?.[0].type === NOTE_TITLE_KEY))
				return !canInsertFrontmatter
			},
			items: [
				{
					icon: <TableOfContentsIcon className="size-4" />,
					keywords: [
						"metadata",
						"yaml",
						"head",
						"front matter",
						"文档属性",
						"元数据",
					],
					label: "Frontmatter",
					value: "frontmatter",
					onSelect: async (editor: PlateEditor) => {
						if (editor.api.some({ match: { type: FRONTMATTER_KEY } })) return

						let defaults = createDefaultFrontmatterRows()
						if (host.getFrontmatterDefaults) {
							try {
								defaults = await host.getFrontmatterDefaults()
							} catch {
								defaults = createDefaultFrontmatterRows()
							}
						}

						editor.tf.replaceNodes(
							{
								type: FRONTMATTER_KEY,
								data: defaults,
								children: [{ text: "" }],
							},
							{ at: [1] },
						)
						requestFrontmatterFocus(editor.id, "firstCell")
					},
				},
			],
		},
	)

	return groups
}

export const createSlashInputElement = (
	host: SlashHostDeps = {},
): NodeComponent => {
	const groups = createSlashGroups(host)

	return function SlashInputElement(props: PlateElementProps<SlashInputNode>) {
		const { editor, element } = props
		const source = element.source

		return (
			<PlateElement {...props} as="span">
				<InlineCombobox
					element={element}
					trigger="/"
					showTrigger={source !== "insert-handle"}
					onCancelInput={({ cause, insertPoint, trigger, value }) => {
						const behavior = getSlashInputCancelBehavior({
							cause,
							source,
							trigger,
							value,
						})

						if (behavior.restoreText) {
							editor.tf.insertText(behavior.restoreText, {
								at: insertPoint ?? undefined,
							})
						}

						if (behavior.move) {
							editor.tf.move({
								distance: 1,
								reverse: behavior.move === "left",
							})
						}

						return true
					}}
				>
					<InlineComboboxInput
						containerClassName="inline-flex items-center rounded-md bg-muted/60 px-1 -ml-1 -mt-0.5"
						className="placeholder:text-muted-foreground text-sm"
						placeholder="Type to filter..."
					/>

					<InlineComboboxContent gutter={6}>
						<InlineComboboxEmpty>No matching commands</InlineComboboxEmpty>

						{groups
							.filter(({ shouldHide }) => !shouldHide?.(editor))
							.map(({ group, items }) => {
								return (
									<InlineComboboxGroup key={group}>
										<InlineComboboxGroupLabel>{group}</InlineComboboxGroupLabel>

										{items.map(
											({
												focusEditor,
												icon,
												keywords,
												label,
												value,
												onSelect,
											}) => (
												<InlineComboboxItem
													key={value}
													value={value}
													onClick={() => {
														void onSelect(editor, value)
													}}
													label={label}
													focusEditor={focusEditor}
													group={group}
													keywords={keywords}
												>
													<div className="mr-2.5 flex size-5 items-center justify-center text-muted-foreground/90 shrink-0">
														{icon}
													</div>
													<span className="font-normal text-[13px]">
														{label ?? value}
													</span>
												</InlineComboboxItem>
											),
										)}
									</InlineComboboxGroup>
								)
							})
							.filter(Boolean)}
					</InlineComboboxContent>
				</InlineCombobox>

				{props.children}
			</PlateElement>
		)
	}
}
