import { cn } from "@mdit/ui/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"
import type { PlateElementProps } from "platejs/react"
import { PlateElement } from "platejs/react"

const headingVariants = cva("relative", {
	variants: {
		variant: {
			h1: "mt-[1.4em] mb-[0.35em] pb-1 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.25]",
			h2: "mt-[1.25em] mb-[0.3em] pb-px font-heading text-2xl font-semibold tracking-tight text-foreground leading-[1.3]",
			h3: "mt-[1.1em] mb-[0.25em] pb-px font-heading text-xl font-semibold tracking-tight text-foreground leading-[1.35]",
			h4: "mt-[0.9em] mb-[0.2em] font-heading text-lg font-semibold tracking-tight text-foreground leading-[1.4]",
			h5: "mt-[0.8em] mb-[0.2em] text-base font-semibold tracking-tight text-foreground leading-[1.4]",
			h6: "mt-[0.8em] mb-[0.2em] text-sm font-semibold tracking-tight text-muted-foreground leading-[1.4]",
		},
	},
})

export function HeadingElement({
	variant,
	...props
}: PlateElementProps & VariantProps<typeof headingVariants>) {
	const path = props.api.findPath(props.element)
	const isFirstChild = path && path.length === 1 && path[0] === 0

	return (
		<PlateElement
			as={variant ?? "h1"}
			className={cn(
				headingVariants({ variant }),
				props.attributes.className,
				isFirstChild && "mt-0",
			)}
			{...props}
		>
			{props.children}
		</PlateElement>
	)
}

export function H1Element(props: PlateElementProps) {
	return <HeadingElement variant="h1" {...props} />
}

export function H2Element(props: PlateElementProps) {
	return <HeadingElement variant="h2" {...props} />
}

export function H3Element(props: PlateElementProps) {
	return <HeadingElement variant="h3" {...props} />
}

export function H4Element(props: PlateElementProps) {
	return <HeadingElement variant="h4" {...props} />
}

export function H5Element(props: PlateElementProps) {
	return <HeadingElement variant="h5" {...props} />
}

export function H6Element(props: PlateElementProps) {
	return <HeadingElement variant="h6" {...props} />
}
