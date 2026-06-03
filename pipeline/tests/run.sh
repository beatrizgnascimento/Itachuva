#!/bin/bash
curEnv=$CONDA_ENV
targetEnv="ic"

while getopts "e" opt; do
	case $opt in
		e) targetEnv="$OPTARG" ;;
	esac
done

if [[ $curEnv != $targetEnv ]]; then
	echo "Ativando ambiente conda: ($targetEnv)..."
	echo
	eval "$(conda shell.bash hook)"
	conda activate $targetEnv
	if [ $? -ne 0 ]; then
		exit 1
	fi
	curEnv=$targetEnv
fi

python -m unittest tests/r*.py