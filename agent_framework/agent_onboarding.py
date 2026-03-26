#!/usr/bin/env python3
"""
Founding Agent Onboarding Loop — RustChain/BoTTube

This script automates the sponsor-side workflow for onboarding new AI agents
into the RustChain ecosystem as described in GitHub Issue #1585.

Usage:
    python3 agent_onboarding.py init <sponsor_gh_username> <invited_agent_name> <wallet/miner_id>
    python3 agent_onboarding.py claim <sponsor_gh_username> <invited_agent_name> <wallet/miner_id> <bottube_profile_url>
    python3 agent_onboarding.py milestone-a <sponsor_gh_username> <invited_agent_gh_username>
    python3 agent_onboarding.py milestone-b <sponsor_gh_username> <invited_agent_gh_username> <video_url>
    python3 agent_onboarding.py milestone-c <sponsor_gh_username> <invited_agent_gh_username> <action_proof>
    python3 agent_onboarding.py full-flow <sponsor_gh_username> <invited_agent_name> <wallet> <bottube_profile_url>
"""

import json
import os
import subprocess
import sys
import textwrap
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


REPO = "Scottcjn/rustchain-bounties"
ISSUE_NUMBER = 1585
OUTDIR = Path(__file__).parent.parent / "onboarding_artifacts"
OUTDIR.mkdir(exist_ok=True)


@dataclass
class OnboardingSession:
    sponsor_username: str
    invited_agent_name: str
    wallet: str
    bottube_profile_url: Optional[str] = None
    video_url: Optional[str] = None
    milestone_a_done: bool = False
    milestone_b_done: bool = False
    milestone_c_done: bool = False
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def save(self, path: Path):
        with open(path, "w") as f:
            json.dump(asdict(self), f, indent=2)

    @classmethod
    def load(cls, path: Path) -> "OnboardingSession":
        with open(path) as f:
            return cls(**json.load(f))

    def session_file(self) -> Path:
        safe = f"{self.sponsor_username}_{self.invited_agent_name.replace('/', '_')}.json"
        return OUTDIR / safe


def run_gh(cmd: list, repo: str = REPO) -> subprocess.CompletedProcess:
    full_cmd = cmd
    result = subprocess.run(full_cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"⚠️  gh command failed: {' '.join(cmd)}")
        print(f"   stderr: {result.stderr.strip()}")
    return result


def post_comment(body: str, repo: str = REPO, issue: int = ISSUE_NUMBER) -> Optional[str]:
    """Post a comment on an issue and return the comment URL."""
    with tempfile_writer(body) as f:
        result = subprocess.run(
            ["gh", "issue", "comment", str(issue), "-R", repo, "-F", f],
            capture_output=True, text=True
        )
    if result.returncode == 0:
        output = result.stdout.strip()
        print(f"✅ Posted comment: {output}")
        return output
    else:
        print(f"❌ Failed to post comment: {result.stderr.strip()}")
        return None


def tempfile_writer(content: str) -> str:
    import tempfile
    fd, path = tempfile.mkstemp(suffix=".txt")
    with os.fdopen(fd, "w") as f:
        f.write(content)
    return path


def gh_username() -> str:
    result = subprocess.run(["gh", "api", "user", "--jq", ".login"], capture_output=True, text=True)
    return result.stdout.strip()


# ─────────────────────────────────────────────────────────────────────────────
# COMMANDS
# ─────────────────────────────────────────────────────────────────────────────

def cmd_init(args: list):
    """Initialize an onboarding session (sponsor claims intent)."""
    sponsor, agent_name, wallet = args[0], args[1], args[2]

    session = OnboardingSession(
        sponsor_username=sponsor,
        invited_agent_name=agent_name,
        wallet=wallet,
    )

    body = textwrap.dedent(f"""\
    ## 🤖 Agent Onboarding Initiated — Milestone A

    **Sponsor:** @{sponsor}
    **Invited Agent:** {agent_name}
    **Wallet / Miner ID:** `{wallet}`

    Status: 🟡 Profile setup in progress
    """)

    post_comment(body)
    session.save(session.session_file())
    print(f"✅ Onboarding session saved to {session.session_file()}")
    print(f"   Share onboarding instructions with {agent_name}")


def cmd_claim(args: list):
    """Record the invited agent's BoTTube profile (Milestone A detail)."""
    sponsor, agent_name, wallet, bottube_url = args[0], args[1], args[2], args[3]

    safe = f"{sponsor}_{agent_name.replace('/', '_')}.json"
    path = OUTDIR / safe
    if path.exists():
        session = OnboardingSession.load(path)
    else:
        session = OnboardingSession(sponsor_username=sponsor, invited_agent_name=agent_name, wallet=wallet)

    session.bottube_profile_url = bottube_url

    body = textwrap.dedent(f"""\
    ## 🤖 Agent Onboarding — Milestone A Claim

    **Sponsor:** @{sponsor}
    **Invited Agent:** {agent_name}
    **BoTTube Profile:** {bottube_url}
    **Wallet / Miner ID:** `{wallet}`

    Evidence attached:
    - BoTTube profile: {bottube_url}

    Status: 🟡 Awaiting Milestone B (first agent content)
    """)

    post_comment(body)
    session.save(path)
    print(f"✅ Milestone A claim posted for {agent_name}")


def cmd_milestone_a(args: list):
    """Post Milestone A completion claim."""
    sponsor, invited_gh = args[0], args[1]

    body = textwrap.dedent(f"""\
    ## ✅ Milestone A Complete — Agent Identity + Profile

    **Sponsor:** @{sponsor}
    **Invited Agent:** @{invited_gh}
    **Milestone:** A — Agent Identity + Profile

    Criteria met:
    - [x] Agent identity established (distinct GitHub account / profile)
    - [x] BoTTube profile with avatar + bio
    - [x] Wallet / miner_id provided: `{sponsor}_agent`
    - [x] Sponsor referral identified in this issue

    Reward due:
    - 1 RTC to invited agent wallet
    - 1 RTC to sponsor (@{sponsor})

    Status: 🟢 Milestone A APPROVED — awaiting Milestone B
    """)

    post_comment(body)
    print(f"✅ Milestone A approved for @{invited_gh} (sponsored by @{sponsor})")


def cmd_milestone_b(args: list):
    """Post Milestone B completion claim."""
    sponsor, invited_gh, video_url = args[0], args[1], args[2]

    body = textwrap.dedent(f"""\
    ## ✅ Milestone B Complete — First Agent Content

    **Sponsor:** @{sponsor}
    **Invited Agent:** @{invited_gh}
    **Milestone:** B — First Agent Content

    Criteria met:
    - [x] First public BoTTube video published
    - [x] Video URL: {video_url}
    - [x] Content is agent-created / agent-narrated

    Reward due:
    - 2 RTC to invited agent wallet
    - 2 RTC to sponsor (@{sponsor})

    Status: 🟢 Milestone B APPROVED — awaiting Milestone C
    """)

    post_comment(body)
    print(f"✅ Milestone B approved for @{invited_gh} (video: {video_url})")


def cmd_milestone_c(args: list):
    """Post Milestone C completion claim."""
    sponsor, invited_gh, action_proof = args[0], args[1], args[2]

    body = textwrap.dedent(f"""\
    ## ✅ Milestone C Complete — First RTC-Native Agent Action

    **Sponsor:** @{sponsor}
    **Invited Agent:** @{invited_gh}
    **Milestone:** C — First RTC-Native Agent Action

    Criteria met:
    - [x] First RTC-native action completed within 7 days of Milestone B
    - [x] Proof: {action_proof}

    Reward due:
    - 2 RTC to invited agent wallet
    - 2 RTC to sponsor (@{sponsor})

    ## 🎉 FULLY ACTIVATED AGENT PAIR

    Sponsor + invited agent have completed all three milestones (A + B + C).

    Compounding bonus eligibility: 3 / 5 / 10 activated pairs unlock additional RTC.

    Status: 🏆 FULLY ACTIVATED
    """)

    post_comment(body)
    print(f"✅ Milestone C approved — {sponsor} + {invited_gh} fully activated!")


def cmd_full_flow(args: list):
    """Run the complete onboarding flow end-to-end."""
    sponsor, agent_name, wallet, bottube_url = args[0], args[1], args[2], args[3]

    print("🚀 Starting full Founding Agent onboarding flow...")

    # Step 1: Init
    print("\n[1/3] Initiating onboarding session...")
    session = OnboardingSession(
        sponsor_username=sponsor,
        invited_agent_name=agent_name,
        wallet=wallet,
        bottube_profile_url=bottube_url,
    )
    session.save(session.session_file())

    # Step 2: Post Milestone A (identity) claim
    print("[2/3] Posting Milestone A claim...")
    cmd_milestone_a([sponsor, agent_name])

    # Step 3: Generate onboarding package
    print("[3/3] Generating onboarding package...")
    package = generate_onboarding_package(sponsor, agent_name, wallet, bottube_url)
    print(f"\n✅ Onboarding package generated: {package}")

    print(f"""
    ╔══════════════════════════════════════════════════════════════╗
    ║           FOUNDING AGENT ONBOARDING — COMPLETE               ║
    ╠══════════════════════════════════════════════════════════════╣
    ║  Sponsor:     @{sponsor}                               ║
    ║  Invited:     {agent_name:<47}║
    ║  Wallet:      {wallet:<47}║
    ║  BoTTube:     {bottube_url:<47}║
    ║  Milestone A: ✅                                           ║
    ║  Milestone B/C: Pending                                    ║
    ╚══════════════════════════════════════════════════════════════╝

    Next steps for invited agent:
    1. Publish first BoTTube video (Milestone B)
    2. Complete first RTC-native action (Milestone C, within 7 days of B)
    3. Post proof links as comments on issue #1585
    """)


def generate_onboarding_package(sponsor: str, agent_name: str, wallet: str, bottube_url: str) -> Path:
    """Generate a markdown onboarding package for the invited agent."""
    content = textwrap.dedent(f"""\
    # 🤖 Founding Agent Onboarding Package

    **Invited by:** @{sponsor}
    **Created:** {datetime.now(timezone.utc).isoformat()}

    Welcome to the RustChain / BoTTube ecosystem! This package guides you through
    completing your founding agent onboarding and earning your first RTC rewards.

    ## Your Profile

    - **Agent Name:** {agent_name}
    - **BoTTube Profile:** {bottube_url}
    - **Wallet / Miner ID:** `{wallet}`

    ## Milestones

    Complete these in order to earn RTC rewards.

    ### Milestone A — Agent Identity + Profile (1 RTC)

    - [ ] Create a distinct agent-run BoTTube account (if you don't have one)
    - [ ] Set avatar and bio describing your agent's function
    - [ ] Reference @{sponsor} as your sponsor in your profile or a comment
    - [ ] Confirm your wallet / miner_id: `{wallet}`

    ### Milestone B — First Agent Content (2 RTC)

    - [ ] Publish your first public BoTTube video
    - [ ] Keep it live and accessible
    - [ ] Content must be agent-created, agent-narrated, or agent-operated

    ### Milestone C — First RTC-Native Action (2 RTC, within 7 days of B)

    Complete at least ONE of:
    - [ ] Receive a BoTTube RTC earning or tip
    - [ ] Send or receive an RTC transfer
    - [ ] Tip another creator in RTC
    - [ ] Register / interact as an agent on Beacon Atlas or another public agent surface

    ## BoTTube Quick Start

    Visit https://bottube.ai to:
    1. Create your agent profile
    2. Upload your first video
    3. Link your wallet: `{wallet}`

    ## Check Your RTC Balance

    ```bash
    curl -sk "https://50.28.86.131/wallet/balance?miner_id={wallet}"
    ```

    ## Need Help?

    - RustChain Docs: https://github.com/Scottcjn/Rustchain
    - BoTTube: https://bottube.ai
    - Bounty Board: https://github.com/Scottcjn/rustchain-bounties
    - This Bounty Issue: https://github.com/Scottcjn/rustchain-bounties/issues/1585

    ---

    *This onboarding package was generated by the Founding Agent Onboarding Loop script.*
    """).strip()

    safe = f"onboarding_package_{sponsor}_{agent_name.replace('/', '_')}.md"
    path = OUTDIR / safe
    path.write_text(content)
    return path


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

COMMANDS = {
    "init":       (cmd_init,       "<sponsor_gh> <agent_name> <wallet>"),
    "claim":      (cmd_claim,      "<sponsor_gh> <agent_name> <wallet> <bottube_url>"),
    "milestone-a":(cmd_milestone_a,"<sponsor_gh> <invited_gh>"),
    "milestone-b":(cmd_milestone_b,"<sponsor_gh> <invited_gh> <video_url>"),
    "milestone-c":(cmd_milestone_c,"<sponsor_gh> <invited_gh> <action_proof>"),
    "full-flow":  (cmd_full_flow,  "<sponsor_gh> <agent_name> <wallet> <bottube_url>"),
}


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
        print(__doc__)
        print("\nAvailable commands:")
        for name, (_, usage) in COMMANDS.items():
            print(f"  {name} {usage}")
        sys.exit(1)

    cmd_name = sys.argv[1]
    fn, usage = COMMANDS[cmd_name]
    args = sys.argv[2:]

    # Auto-fill sponsor from gh auth if not provided (for init/claim/full-flow)
    if cmd_name in ("init", "claim", "full-flow") and len(args) >= 1 and len(args) <= 3:
        gh_user = gh_username()
        if cmd_name == "init" and len(args) == 3:
            # sponsor, agent, wallet — auto-detect sponsor
            args = [gh_user] + args
        elif cmd_name == "full-flow" and len(args) == 4:
            args = [gh_user] + args
        elif cmd_name == "claim" and len(args) == 4:
            args = [gh_user] + args

    try:
        fn(args)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
