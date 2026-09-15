import pathlib
import yaml

YAML_PATH = pathlib.Path('.github/workflows/df-dispatch.yml')

def load_workflow():
    with YAML_PATH.open('r', encoding='utf-8') as f:
        return yaml.safe_load(f)

def test_on_triggers():
    wf = load_workflow()
    # PyYAML (YAML 1.1) reads the bare key `on` as the boolean True.
    on = wf.get('on', wf.get(True, {}))
    # Expected trigger keys
    expected_keys = {'issues', 'issue_comment', 'pull_request_review', 'check_suite', 'schedule', 'workflow_call'}
    assert set(on.keys()) == expected_keys
    # Check types for each
    assert on['issues'].get('types') == ['opened', 'labeled']
    assert on['issue_comment'].get('types') == ['created']
    assert on['pull_request_review'].get('types') == ['submitted']
    assert on['check_suite'].get('types') == ['completed']
    # schedule should be list with one dict containing cron
    schedule = on['schedule']
    assert isinstance(schedule, list) and len(schedule) == 1
    assert schedule[0].get('cron') == '*/15 * * * *'

def test_job_if_condition():
    wf = load_workflow()
    job = wf['jobs']['dispatch']
    assert job.get('if') == "github.event.sender.type != 'Bot'"

def test_permissions_readonly():
    wf = load_workflow()
    perms = wf['jobs']['dispatch'].get('permissions', {})
    expected = {
        'contents': 'read',
        'checks': 'read',
        'issues': 'read',
        'pull-requests': 'read',
    }
    assert perms == expected

def test_final_step_cli_command():
    wf = load_workflow()
    steps = wf['jobs']['dispatch']['steps']
    # Find step with name containing 'Run DF Dispatch'
    run_step = next(s for s in steps if s.get('name', '').startswith('Run DF Dispatch'))
    run_cmd = run_step.get('run', '')
    assert '--shadow' in run_cmd
    assert '--summary "$GITHUB_STEP_SUMMARY"' in run_cmd


def test_dispatch_runs_the_bundled_graph_with_a_token_for_the_checks_gate():
    wf = load_workflow()
    steps = wf['jobs']['dispatch']['steps']
    run_step = next(s for s in steps if s.get('name', '').startswith('Run DF Dispatch'))
    assert '--graph .darkfactory-pipeline/harness/assets/graph.darkfactory.json' in run_step['run']
    assert run_step.get('env', {}).get('GH_TOKEN') == '${{ github.token }}'
