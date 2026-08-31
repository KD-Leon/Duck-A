import { cn } from "@mdit/ui/lib/utils"
import { PlateElement, type PlateElementProps } from "platejs/react"

export function BlockquoteElement(props: PlateElementProps) {
	return (
		<PlateElement
			as="blockquote"
			className={cn(
				"my-3 border-l-[3px] border-primary/70 bg-muted/20 py-2 pl-4 pr-3 rounded-r-lg italic text-muted-foreground/90 font-normal leading-relaxed",
				props.attributes.className,
			)}
			{...props}
		/>
	)
}
