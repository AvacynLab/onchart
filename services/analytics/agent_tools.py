"""Tools exposed to the agent and a small function router.

This module defines the JSON schemas for the functions that the agent is
allowed to call.  The schemas follow the OpenAI functions specification and
can be fed directly to an LLM.  A tiny ``FunctionRouter`` validates incoming
payloads with pydantic and dispatches to the appropriate handler.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, Callable

import json
import openai
from pydantic import BaseModel, Field


class ResearchType(str, Enum):
    """Enumeration of available research document types."""

    OPPORTUNITY_SCAN = "opportunity_scan"
    CURRENCY_FOCUS = "currency_focus"
    ASSET_DEEP_DIVE = "asset_deep_dive"
    FUNDAMENTAL_PLUS_STRATEGY = "fundamental_plus_strategy"
    STRUCTURED_GENERAL = "structured_general"


class ShowChartArgs(BaseModel):
    """Arguments for the ``show_chart`` tool."""

    symbol: str = Field(..., description="Ticker symbol to display")
    interval: str = Field(..., description="Requested candle interval, e.g. '5m'")
    from_ts: int = Field(..., description="Start timestamp (unix, seconds)")
    to_ts: int = Field(..., description="End timestamp (unix, seconds)")


class AnnotateArgs(BaseModel):
    """Arguments for the ``annotate`` tool."""

    ts: int = Field(..., description="Timestamp of the callout (unix, seconds)")
    price: float = Field(..., description="Price level for the annotation")
    text: str = Field(..., description="Message to display")
    style: str = Field(
        "info",
        description="Visual style of the callout (info, warning, etc.)",
    )


class CreateResearchArgs(BaseModel):
    """Arguments for the ``create_research`` tool."""

    type: ResearchType = Field(..., description="Type of research document")
    payload: Dict[str, Any] = Field(
        default_factory=dict,
        description="Arbitrary payload used to build the research document",
    )


# -- helper -----------------------------------------------------------------

def _schema(model: type[BaseModel]) -> Dict[str, Any]:
    """Return the JSON schema for *model* in both pydantic v1 and v2."""

    if hasattr(model, "model_json_schema"):
        return model.model_json_schema()  # type: ignore[attr-defined]
    return model.schema()


TOOLS = [
    {
        "name": "show_chart",
        "description": "Pushes an event to the frontend to display a chart",
        "parameters": _schema(ShowChartArgs),
    },
    {
        "name": "annotate",
        "description": "Creates an AI callout on the chart",
        "parameters": _schema(AnnotateArgs),
    },
    {
        "name": "create_research",
        "description": "Generates a structured research document",
        "parameters": _schema(CreateResearchArgs),
    },
]


class FunctionRouter:
    """Simple dispatcher validating and routing tool invocations.

    The router maps tool names to handler callables.  Each handler receives a
    validated pydantic model instance and returns an arbitrary result.  The
    default handlers implemented here simply echo the parsed arguments and are
    meant to be replaced by real business logic in the future.
    """

    def __init__(self) -> None:
        self._handlers: Dict[str, Callable[[BaseModel], Any]] = {
            "show_chart": self._show_chart,
            "annotate": self._annotate,
            "create_research": self._create_research,
        }
        self._models: Dict[str, type[BaseModel]] = {
            "show_chart": ShowChartArgs,
            "annotate": AnnotateArgs,
            "create_research": CreateResearchArgs,
        }

    # -- public API ---------------------------------------------------------
    def call(self, name: str, payload: Dict[str, Any]) -> Any:
        """Validate ``payload`` for tool ``name`` and invoke its handler."""

        if name not in self._handlers:
            raise ValueError(f"Unknown tool: {name}")

        model = self._models[name]
        args = model(**payload)
        return self._handlers[name](args)

    # -- handlers -----------------------------------------------------------
    def _show_chart(self, args: ShowChartArgs) -> Dict[str, Any]:
        return {"event": "show_chart", **args.dict()}

    def _annotate(self, args: AnnotateArgs) -> Dict[str, Any]:
        return {"event": "annotate", **args.dict()}

    def _create_research(self, args: CreateResearchArgs) -> Dict[str, Any]:
        return {"event": "create_research", **args.dict()}


def run_agent(prompt: str, router: FunctionRouter, model: str = "gpt-3.5-turbo-0613") -> Any:
    """Interpret *prompt* with OpenAI and invoke tools automatically.

    This helper wires the ``FunctionRouter`` with OpenAI's function-calling
    capability.  The language model decides which tool to trigger and provides
    the JSON arguments.  The router then validates and dispatches the request.

    Parameters
    ----------
    prompt:
        Natural language instruction coming from the user.
    router:
        ``FunctionRouter`` instance used to execute the tools.
    model:
        ChatCompletion model to query.  Defaults to ``gpt-3.5-turbo-0613``.

    Returns
    -------
    Any
        Either the result of the tool execution or the raw model text if no
        tool was invoked.
    """

    # Query the language model with the tool schema and allow automatic
    # selection of a function to call.
    response = openai.ChatCompletion.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        functions=TOOLS,
        function_call="auto",
    )

    message = response["choices"][0]["message"]
    if "function_call" in message:
        # The model decided to call one of our tools.
        func = message["function_call"]
        name = func["name"]
        # Arguments are provided as a JSON string.
        args = json.loads(func.get("arguments", "{}"))
        return router.call(name, args)

    # Fallback: return the plain text response when no function was chosen.
    return message.get("content", "")
