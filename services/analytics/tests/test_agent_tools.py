"""Tests for the agent tools module."""

import os
import sys

# Ensure parent directory (services/analytics) is on the path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from agent_tools import TOOLS, FunctionRouter, run_agent
import pytest
import json
from unittest.mock import patch


def test_tools_schema_contains_expected_functions():
    names = {tool["name"] for tool in TOOLS}
    assert names == {"show_chart", "annotate", "create_research"}

    show_chart_tool = next(tool for tool in TOOLS if tool["name"] == "show_chart")
    params = show_chart_tool["parameters"]["properties"]
    assert {"symbol", "interval", "from_ts", "to_ts"} <= params.keys()
    assert params["from_ts"]["type"] == "integer"


def test_router_dispatches_to_correct_handler():
    router = FunctionRouter()
    result = router.call(
        "show_chart",
        {"symbol": "AAPL", "interval": "5m", "from_ts": 0, "to_ts": 60},
    )
    assert result["event"] == "show_chart"
    assert result["symbol"] == "AAPL"


@pytest.mark.parametrize("tool", ["annotate", "create_research"])
def test_router_handles_other_tools(tool):
    router = FunctionRouter()
    payload = (
        {"ts": 1, "price": 2.0, "text": "hi", "style": "info"}
        if tool == "annotate"
        else {"type": "opportunity_scan", "payload": {}}
    )
    result = router.call(tool, payload)
    assert result["event"] == tool


def test_router_unknown_tool():
    router = FunctionRouter()
    with pytest.raises(ValueError):
        router.call("invalid", {})


def test_run_agent_dispatches_function_call():
    """Ensure OpenAI function calling triggers the correct tool."""

    router = FunctionRouter()
    fake_response = {
        "choices": [
            {
                "message": {
                    "function_call": {
                        "name": "show_chart",
                        "arguments": json.dumps(
                            {
                                "symbol": "AAPL",
                                "interval": "5m",
                                "from_ts": 0,
                                "to_ts": 60,
                            }
                        ),
                    }
                }
            }
        ]
    }

    with patch("agent_tools.openai.ChatCompletion.create", return_value=fake_response):
        result = run_agent("show AAPL", router)

    assert result["event"] == "show_chart"
