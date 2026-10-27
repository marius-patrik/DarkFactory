import type {
	CapabilityDefinition,
	CapabilityHookContext,
	CapabilityHookDefinition,
	CapabilityHookEvent,
	CapabilityHookResult,
	CapabilityRuntimeContext,
} from "./index.ts";

/** One hook's verdict, with the identity needed to attribute it. */
interface HookOutcome {
	capability: string;
	hook: string;
	status: CapabilityHookResult["status"];
	message?: string;
}

/** Every outcome from one event, plus the capability set that produced them. */
interface HookRunResult {
	outcomes: readonly HookOutcome[];
	/** True when no hook returned `fail`. `fix` is reported, not treated as a failure. */
	ok: boolean;
}

/** The events a hook declares, normalising the legacy single-`event` form. */
function hookEvents(hook: {
	event?: CapabilityHookEvent;
	events?: readonly CapabilityHookEvent[];
}): readonly CapabilityHookEvent[] {
	return hook.events ?? (hook.event ? [hook.event] : []);
}

/** The hooks of one capability that apply to `event`, in declaration order. */
export function hooksForEvent(
	capability: CapabilityDefinition,
	event: CapabilityHookEvent,
): readonly CapabilityHookDefinition[] {
	return (capability.hooks ?? []).filter((hook) => hookEvents(hook).includes(event));
}

/**
 * Run every hook declared for `event` across every capability, and collect the verdicts.
 *
 * This is the missing half of the hook ABI. A capability declares hooks and the ABI validates that
 * each one names at least one event, but nothing in the repository ever called `execute`, so every
 * declared hook was inert: a rule could be declared, documented and tested, and never once run. A
 * hook that is never invoked is not a rule.
 *
 * The runner deliberately does not decide *when* an event fires or what a `fix` verdict should do
 * — invocation timing and effect ownership stay with the layer that observes the event. It answers
 * one question: given this event and this evidence, which declared rules object, and why.
 *
 * A hook that throws is reported as a failure rather than propagated. A rule that cannot be
 * evaluated must not be indistinguishable from a rule that passed.
 */
export async function runHooks(
	capabilities: readonly CapabilityDefinition[],
	event: CapabilityHookEvent,
	input: CapabilityHookContext,
	runtime: CapabilityRuntimeContext,
): Promise<HookRunResult> {
	const outcomes: HookOutcome[] = [];
	for (const capability of capabilities) {
		for (const hook of hooksForEvent(capability, event)) {
			if (!hook.execute) continue;
			try {
				const result = await hook.execute(input, runtime);
				outcomes.push({
					capability: capability.id,
					hook: hook.id,
					status: result.status,
					...(result.message === undefined ? {} : { message: result.message }),
				});
			} catch (error) {
				outcomes.push({
					capability: capability.id,
					hook: hook.id,
					status: "fail",
					message: `hook threw instead of returning a verdict: ${error instanceof Error ? error.message : String(error)}`,
				});
			}
		}
	}
	return { outcomes, ok: outcomes.every((outcome) => outcome.status !== "fail") };
}
