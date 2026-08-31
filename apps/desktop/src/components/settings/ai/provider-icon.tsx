import { cn } from "@mdit/ui/lib/utils"
import {
	Brain,
	Cpu,
	Flame,
	Globe,
	Key,
	Moon,
	Server,
	Sparkles,
	Terminal,
	Wind,
	Zap,
} from "lucide-react"

interface ProviderIconProps {
	providerId: string
	className?: string
	size?: "sm" | "md" | "lg"
}

export function ProviderIcon({
	providerId,
	className,
	size = "md",
}: ProviderIconProps) {
	const sizeClasses = {
		sm: "size-6 text-xs",
		md: "size-8 text-sm",
		lg: "size-10 text-base",
	}

	const iconSizeClasses = {
		sm: "size-3.5",
		md: "size-4",
		lg: "size-5",
	}

	const getIconComponent = (id: string) => {
		switch (id) {
			case "openai":
			case "anthropic":
				return Sparkles
			case "google":
				return Flame
			case "deepseek":
			case "zhipu":
				return Brain
			case "siliconflow":
			case "dashscope":
			case "stepfun":
				return Cpu
			case "moonshot":
				return Moon
			case "groch":
			case "groq":
				return Zap
			case "openrouter":
			case "together":
				return Globe
			case "mistral":
				return Wind
			case "ollama":
				return Terminal
			case "codex_oauth":
				return Key
			default:
				return Server
		}
	}

	const IconComponent = getIconComponent(providerId)

	return (
		<div
			className={cn(
				"flex shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/60 text-foreground font-medium transition-colors shadow-2xs",
				sizeClasses[size],
				className,
			)}
		>
			<IconComponent
				className={cn(iconSizeClasses[size], "text-foreground/80")}
			/>
		</div>
	)
}
