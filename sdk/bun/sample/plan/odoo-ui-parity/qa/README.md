# Per-module QA ledgers

Create one `<module>.md` file for each module. The assigned QA owner records
functional tests, browser evidence, failures, fixes, retests, and sign-off in
that module's file. `../progress.md` is the aggregate summary and must not be
edited directly by module or QA agents.

The QA worker tests the committed developer candidate using the Core3 process
and worktree spawned by that developer, with a fresh deterministic data state.

## Background activation

QA module assignments and ledger state are durable, but QA execution is not.
A developer emits an event by recording the trigger and candidate commit in
`progress/<module>.md` and setting the module to `ready-for-test`. The main
agent dispatches a bounded task to any available QA slot assigned to that
module, including the module, trigger, commit, runtime endpoint, and required
checks. The worker acknowledges the event, tests the candidate, updates this
module's QA ledger, and exits. After merge, the main agent emits a new
`post-merge` task. QA uses the developer's Core3 process/worktree and does not
create a second runtime unless the original process must be restarted at the
candidate commit.

The same rule applies to module developers: preserve the owner, worktree,
branch, and context, but stop inactive processes. The main agent dispatches new
bounded implementation or repair tasks to the same owner rather than creating
a new durable agent for every event.
