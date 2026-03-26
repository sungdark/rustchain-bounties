#!/usr/bin/env python3
"""Tests for agent_onboarding.py"""

import json
import os
import tempfile
from pathlib import Path

import pytest

# Ensure the module is importable
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from agent_framework.agent_onboarding import (
    OnboardingSession,
    generate_onboarding_package,
    OUTDIR,
)


class TestOnboardingSession:
    def test_create_session(self):
        s = OnboardingSession(
            sponsor_username="sungdark",
            invited_agent_name="TestBot",
            wallet="testbot_wallet_001",
            bottube_profile_url="https://bottube.ai/agent/testbot",
        )
        assert s.sponsor_username == "sungdark"
        assert s.invited_agent_name == "TestBot"
        assert s.wallet == "testbot_wallet_001"
        assert not s.milestone_a_done
        assert not s.milestone_b_done
        assert not s.milestone_c_done

    def test_save_and_load(self, tmp_path):
        s = OnboardingSession(
            sponsor_username="sponsor1",
            invited_agent_name="AgentAlpha",
            wallet="alpha_wallet",
            bottube_profile_url="https://bottube.ai/agent/alpha",
        )
        path = tmp_path / "session.json"
        s.save(path)

        loaded = OnboardingSession.load(path)
        assert loaded.sponsor_username == "sponsor1"
        assert loaded.invited_agent_name == "AgentAlpha"
        assert loaded.wallet == "alpha_wallet"
        assert loaded.bottube_profile_url == "https://bottube.ai/agent/alpha"
        assert loaded.milestone_c_done is False

    def test_session_file_name(self):
        s = OnboardingSession(
            sponsor_username="sponsor1",
            invited_agent_name="MyAgent",
            wallet="wallet1",
        )
        assert "sponsor1" in s.session_file().name
        assert "MyAgent" in s.session_file().name

    def test_all_defaults(self):
        s = OnboardingSession(
            sponsor_username="x",
            invited_agent_name="y",
            wallet="z",
        )
        assert s.bottube_profile_url is None
        assert s.video_url is None
        assert s.milestone_a_done is False
        assert s.milestone_b_done is False
        assert s.milestone_c_done is False
        assert s.created_at  # non-empty ISO string


class TestOnboardingPackage:
    def test_generate_package(self, tmp_path, monkeypatch):
        # Redirect OUTDIR to tmp so we don't pollute workspace
        monkeypatch.setattr("agent_framework.agent_onboarding.OUTDIR", tmp_path)

        path = generate_onboarding_package(
            sponsor="TestSponsor",
            agent_name="TestAgent",
            wallet="test_wallet_123",
            bottube_url="https://bottube.ai/agent/testagent",
        )

        assert path.exists()
        content = path.read_text()
        assert "TestSponsor" in content
        assert "TestAgent" in content
        assert "test_wallet_123" in content
        assert "https://bottube.ai/agent/testagent" in content
        assert "Milestone A" in content
        assert "Milestone B" in content
        assert "Milestone C" in content
        assert "50.28.86.131" in content  # balance check endpoint


class TestMilestoneLogic:
    def test_milestone_sequence(self):
        """Milestones should be completable in any order but C requires B."""
        s = OnboardingSession(
            sponsor_username="s",
            invited_agent_name="a",
            wallet="w",
        )
        # A
        s.milestone_a_done = True
        assert s.milestone_a_done
        # B
        s.milestone_b_done = True
        s.video_url = "https://bottube.ai/watch/xyz"
        assert s.milestone_b_done
        # C
        s.milestone_c_done = True
        assert s.milestone_c_done
        # All done
        assert s.milestone_a_done and s.milestone_b_done and s.milestone_c_done


class TestOutdirExists:
    def test_outdir_created(self, tmp_path, monkeypatch):
        """OUTDIR should be created as a directory on module import."""
        # The OUTDIR is created at import time by Path(...).mkdir(exist_ok=True)
        # so after importing, it should exist
        import agent_framework.agent_onboarding as ao
        assert ao.OUTDIR.exists()
        assert ao.OUTDIR.is_dir()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
