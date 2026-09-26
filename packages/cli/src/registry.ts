import type {
	CapabilityCommandDefinition,
	CapabilityDefinition,
	CapabilityRuntimeContext,
} from "@darkfactory/capability";

/** Origin of one command in the composed DarkFactory operator surface. */
export type CliCommandSource = "core" | "capability";

/** Browser/headless-safe metadata shared by CLI help, TUI and operator surfaces. */
export interface CliCommandMetadata {
	name: string;
	description: string;
	taskKind?: CapabilityCommandDefinition["taskKind"];
	credentialRequirements: readonly string[];
	source: CliCommandSource;
	capabilityId?: string;
}

/** Executable command registered in the final @darkfactory/cli command model. */
export interface CliCommandDefinition extends CliCommandMetadata {
	execute(args: readonly string[], context: CapabilityRuntimeContext): Promise<unknown> | unknown;
}

/** Declares a core-owned command before it is inserted into the shared registry. */
export type CoreCliCommandDefinition = Omit<CliCommandDefinition, "source" | "capabilityId">;

function metadata(command: CliCommandDefinition): CliCommandMetadata {
	return {
		name: command.name,
		description: command.description,
		...(command.taskKind ? { taskKind: command.taskKind } : {}),
		credentialRequirements: command.credentialRequirements,
		source: command.source,
		...(command.capabilityId ? { capabilityId: command.capabilityId } : {}),
	};
}

function owner(command: CliCommandDefinition): string {
	return command.source === "capability" ? `capability:${command.capabilityId ?? "unknown"}` : "core";
}

/**
 * One duplicate-safe command registry shared by the supported df operator surfaces.
 *
 * Registration order never affects exposed metadata: public listings are sorted by command name.
 */
export class CommandRegistry {
	private readonly commands = new Map<string, CliCommandDefinition>();

	/** Registers one already-normalized command and rejects ambiguous ownership. */
	register(command: CliCommandDefinition): void {
		const name = command.name.trim();
		if (!name) throw new Error("CLI command name must not be empty");
		if (name !== command.name)
			throw new Error(`CLI command name must not contain surrounding whitespace: ${command.name}`);
		const existing = this.commands.get(name);
		if (existing) {
			throw new Error(`Duplicate CLI command ${name}: ${owner(existing)} and ${owner(command)}`);
		}
		this.commands.set(name, command);
	}

	/** Registers a command owned by the DarkFactory core/operator surface. */
	registerCore(command: CoreCliCommandDefinition): void {
		this.register({ ...command, source: "core" });
	}

	/** Registers every command contributed by one resolved capability definition. */
	registerCapability(capability: CapabilityDefinition): void {
		for (const command of capability.commands ?? []) {
			this.register({
				name: command.name,
				description: command.description,
				...(command.taskKind ? { taskKind: command.taskKind } : {}),
				credentialRequirements: command.credentialRequirements ?? [],
				source: "capability",
				capabilityId: capability.id,
				execute: command.execute,
			});
		}
	}

	/** Returns one executable command by exact name. */
	get(name: string): CliCommandDefinition | undefined {
		return this.commands.get(name);
	}

	/** Returns deterministic command metadata for help, TUI and web/operator projections. */
	list(): readonly CliCommandMetadata[] {
		return [...this.commands.values()].sort((a, b) => a.name.localeCompare(b.name)).map(metadata);
	}

	/** Executes one registered command through the same registry used for metadata. */
	async execute(name: string, args: readonly string[], context: CapabilityRuntimeContext): Promise<unknown> {
		const command = this.commands.get(name);
		if (!command) throw new Error(`Unknown DarkFactory command: ${name}`);
		return await command.execute(args, context);
	}
}

/** Builds one registry from stable core commands plus already-resolved capability definitions. */
export function createCommandRegistry(
	coreCommands: readonly CoreCliCommandDefinition[] = [],
	capabilities: readonly CapabilityDefinition[] = [],
): CommandRegistry {
	const registry = new CommandRegistry();
	for (const command of coreCommands) registry.registerCore(command);
	for (const capability of capabilities) registry.registerCapability(capability);
	return registry;
}
