import pathlib

import yaml


def test_dispatch_workflow_checks_out_the_pinned_pipeline():
    """The pipeline checkout honours the workflow_call pinning inputs and defaults to DarkFactory."""
    wf = yaml.safe_load(
        pathlib.Path(".github/workflows/df-dispatch.yml").read_text(encoding="utf-8")
    )
    on = wf.get("on", wf.get(True, {}))
    inputs = on["workflow_call"]["inputs"]
    assert inputs["pipeline-repo"]["default"] == "marius-patrik/DarkFactory"
    assert "pipeline-ref" in inputs
    step = next(s for s in wf["jobs"]["dispatch"]["steps"] if s.get("name") == "Checkout pipeline")
    assert (
        step["with"]["repository"] == "${{ inputs.pipeline-repo || 'marius-patrik/DarkFactory' }}"
    )
    assert step["with"]["ref"] == "${{ inputs.pipeline-ref }}"
    assert step["with"]["path"] == ".darkfactory-pipeline"
