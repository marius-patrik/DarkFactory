/** @packageDocumentation
 * Capability ABI package boundary.
 *
 * #421 owns the executable ABI/loader. #420 establishes the dependency-safe package identity without duplicating a
 * second capability system.
 */
export type {
	TaskKind,
	TaskNeed,
	TaskProfile,
} from "@darkfactory/protocol/model";
