# Model Mux Pi Extension

A pi extension that exposes the cost-balanced multi-model router as a tool.

## Features

- **Cost-aware routing**: Automatically routes requests through local oMLX models for cost efficiency
- **OpenAI fallback**: Escalates to OpenAI (gpt-4o, gpt-4.1) when quality thresholds are not met
- **Generic tool**: Works for any type of request (plans, code, validation, long context)

## Installation

### From local path (development)
```bash
pi install /Users/tinetti/Projects/model-mux/examples/pi-extension
```

### From git repository
```bash
pi install git:github.com/tinetti/model-mux@main
```

### Temporary (no install)
```bash
pi -e /Users/tinetti/Projects/model-mux/examples/pi-extension
```

## Usage

Once installed, the `route_to_best_model` tool is available to the LLM:

```
You: Can you explain how to implement OAuth authentication?
assistant: [automatically calls route_to_best_model tool]
assistant: [response routed through cost-balanced model system]
```

## Configuration

Requires the same configuration as model-mux:

- `openaiApiKey` - OpenAI API key
- `omlxBaseURL` - Local oMLX endpoint (for cost-efficient local models)

Configure globally via `~/.pi/agent/settings.json` or project-local via `.pi/settings.json`:

```json
{
  "openaiApiKey": "your-api-key",
  "omlxBaseURL": "http://127.0.0.1:8000/v1",
  "models": {
    "planner": "o4-mini",
    "coder": "gpt-4o",
    "validator": "gpt-4o-mini",
    "longContext": "gpt-4.1",
    "omlx": "mlx-community/Qwen3.6-35B-A3B-8bit"
  }
}
```
