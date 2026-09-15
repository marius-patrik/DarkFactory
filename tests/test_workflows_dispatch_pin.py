import pathlib
import yaml

def test_dispatch_workflow_has_pinned_checkout():
    wf_path = pathlib.Path('.github/workflows/df-dispatch.yml')
    wf = yaml.safe_load(wf_path.read_text())
    steps = wf['jobs']['dispatch']['steps']
    # Find the checkout pipeline step
    step = next(s for s in steps if s.get('name') == 'Checkout pipeline')
    with_block = step.get('with', {})
    assert with_block.get('repository') == 'darkfactory/pipeline'
    assert with_block.get('ref') == '${{ inputs.pipeline_ref }}'
    assert with_block.get('token') == "${{ secrets.GITHUB_TOKEN }}"
