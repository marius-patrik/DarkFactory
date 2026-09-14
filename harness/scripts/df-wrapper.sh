#!/bin/sh

self_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
df_bin=${DF_BIN:-"$self_dir/df-bin"}

run_df() {
	if [ ! -x "$df_bin" ]; then
		echo "df: DarkFactory binary is not executable: $df_bin" >&2
		exit 127
	fi
	exec "$df_bin" "$@"
}

if [ "$#" -eq 0 ] && [ -t 0 ] && [ -t 1 ]; then
	run_df chat
fi

case ${1-} in
	chat|run|providers|models|accounts|account|login|logout|ask|help)
		run_df "$@"
		;;
esac

old_ifs=$IFS
IFS=:
for directory in ${PATH-}; do
	[ -n "$directory" ] || directory=.
	if [ -x "$directory/df" ] && [ ! -d "$directory/df" ]; then
		[ "$directory/df" -ef "$0" ] && continue
		IFS=$old_ifs
		exec "$directory/df" "$@"
	fi
done
IFS=$old_ifs
exec /bin/df "$@"
