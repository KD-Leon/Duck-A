"use client"

import { cn } from "@mdit/ui/lib/utils"
import {
	IconBrain,
	IconChevronDown,
	IconChevronRight,
} from "@tabler/icons-react"
import { useState } from "react"

export interface ThinkingBlockProps {
	reasoning: string
	isPending?: boolean
	thinkingLabel?: string
	thinkingCompleteLabel?: string
}

export function ThinkingBlock({
	reasoning,
	isPending,
	thinkingLabel = "Thinking...",
	thinkingCompleteLabel = "Thought process",
}: ThinkingBlockProps) {
	const [isOpen, setIsOpen] = useState(isPending ?? false)

	if (!reasoning.trim()) {
		if (isPending) {
			return (
				<div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground animate-pulse">
					<IconBrain className="size-4 animate-spin text-primary" />
					<span>{thinkingLabel}</span>
				</div>
			)
		}
		return null
	}

	return (
		<div className="my-2 overflow-hidden rounded-lg border border-border/50 bg-muted/30 text-xs">
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="flex w-full items-center justify-between px-3 py-2 text-left font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
			>
				<div className="flex items-center gap-2">
					<IconBrain
						className={cn("size-4 text-primary", isPending && "animate-pulse")}
					/>
					<span>{isPending ? thinkingLabel : thinkingCompleteLabel}</span>
				</div>
				{isOpen ? (
					<IconChevronDown className="size-3.5" />
				) : (
					<IconChevronRight className="size-3.5" />
				)}
			</button>

			{isOpen && (
				<div className="border-t border-border/40 px-3 py-2.5 text-muted-foreground/90 font-mono text-[11px] leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
					{reasoning}
				</div>
			)}
		</div>
	)
}
