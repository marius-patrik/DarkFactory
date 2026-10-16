#!/bin/sh

self_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
df_bin=${DF_BIN:-"$self_dir/df-bin"}
df_source=${DF_SOURCE:-}

# One contract, two staged layouts. A staged install ships the compiled binary beside this wrapper;
# the agent image ships no compile step and runs the TypeScript entrypoint through Bun instead.
# Both resolve here so `df` means the same thing wherever it is found, rather than each layout
# carrying its own dispatcher.
run_df() {
	if [ -n "$df_bin" ] && [ -x "$df_bin" ]; then
		exec "$df_bin" "$@"
	fi
	if [ -n "$df_source" ] && [ -f "$df_source" ]; then
		exec bun "$df_source" "$@"
	fi
	echo "df: no DarkFactory runtime found." >&2
	echo "   looked for a compiled binary at: ${df_bin}" >&2
	echo "   and a TypeScript entrypoint at:   ${df_source:-<unset, set DF_SOURCE>}" >&2
	echo "   run 'bun run install:df' to stage one, or set DF_BIN/DF_SOURCE." >&2
	exit 127
}

if [ "$#" -eq 0 ] && [ -t 0 ] && [ -t 1 ]; then
	run_df chat
fi

# Every df command is routed to the single CLI owner. Do not maintain a second
# subcommand whitelist or silently invoke the operating system's disk-usage df.
run_df "$@"
