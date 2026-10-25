# Code Docs AI

> Generate project READMEs from source code using LLMs.

**Code Docs AI** is a Python CLI tool that automates the creation and maintenance of project documentation. It scans a repository, extracts source code, and uses the Groq API to generate file-level summaries and a cohesive project `README.md`. It is designed for developers who want to keep documentation in sync with code changes without manual effort. The project is in an early stage, with a functional core pipeline but no automated test suite.

## Quick Start

```bash
git clone https://github.com/Madhura0807/code-docs-ai.git
cd code-docs-ai
pip install -r requirements.txt
export GROQ_API_KEY="your-groq-api-key"
doclify init
doclify run
```

Open your browser to view the generated `README.md` in your project root.

## Environment Variables

Create a `.env` file in your project root or export the following variable in your shell. **Warning:** Never commit `.env` files to version control.

```bash
# Groq API Key
# Required for LLM interactions. Obtain a key at https://console.groq.com/keys
GROQ_API_KEY=
```

## Core Features

- **Repository Scanning** — Traverses the directory tree to identify documentation-relevant files (Python, Markdown, Text, Jupyter Notebooks) while respecting `.gitignore` and custom exclusion rules.
- **Incremental Documentation** — Maintains a local JSON cache of file summaries to enable targeted updates and avoid re-processing unchanged files.
- **README Generation** — Aggregates individual file summaries to produce a final project overview, automatically backing up previous `README.md` versions with timestamps.
- **Model Selection** — Lists available Groq models with metadata (developer, token limits) to assist in configuring the LLM provider.

## Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| Language | Python | Core implementation |
| LLM Provider | Groq API | Content generation and summarization |
| CLI Framework | Argparse (implied) | Command-line interface |
| Data Validation | Pydantic | Schema definition for config and responses |
| UI/Logging | Rich | Console output formatting and logging |
| Config | PyYAML | `doclify.yaml` serialization |

## System Architecture

The system operates as a linear pipeline triggered by CLI commands:

1.  **Discovery**: The scanner traverses the repository, filtering files based on extensions and ignore rules to produce a list of source files.
2.  **Ingestion**: Source files are read and chunked into segments under 40,000 characters to manage token limits. Jupyter notebooks are processed to extract only code cells.
3.  **Generation**: Each chunk is sent to the Groq API with specific prompts. The LLM generates summaries for individual files.
4.  **Caching**: Summaries are stored in a local JSON cache. Stale entries (files no longer present) are pruned.
5.  **Aggregation**: Cached summaries are combined and sent to the LLM again to generate the final project-level `README.md`.
6.  **Output**: The final README is written to the root, with a timestamped backup of the previous version saved to an artifacts directory.

## Usage

**Initialize a project**
Scans the current directory and creates `doclify.yaml`.
```bash
doclify init
```

**List available models**
Displays a table of Groq models sorted by developer and ID.
```bash
doclify list-models
```

**Generate documentation**
Processes all files defined in `doclify.yaml` and generates the `README.md`.
```bash
doclify run
```

**Update specific files**
Regenerates summaries for a specific file or all files matching a wildcard.
```bash
doclify update path/to/file.py
doclify update "*.py"
```

## Project Structure

```text
doclify/
├── components/       # CLI command handlers (init, run, update, config)
├── config/           # Constants and default settings
├── pipelines/        # Main entry point and argument parsing
├── prompts/          # Static prompt templates for LLM interactions
├── schema/           # Pydantic models for data validation
└── utils/            # Core logic (scanning, extraction, LLM client, caching)
```

## Known Issues & Limitations

| Issue | Description | Status |
| :--- | :--- | :--- |
| No Test Suite | The project lacks an automated test suite. | Planned Fix |
| API Rate Limits | Free tier Groq API limits may restrict bulk generation. | Investigating |
| Windows Console | Non-ASCII symbols previously caused issues; fixed with compatible characters. | Resolved |

## Contributing

1.  Fork the repository.
2.  Create a feature branch: `git checkout -b feature/amazing-feature`
3.  Commit your changes: `git commit -m 'feat: add amazing feature'`
4.  Push to the branch: `git push origin feature/amazing-feature`
5.  Open a Pull Request.

Please open an issue before making major changes.

## Support

*   **Bugs**: Open an issue on [GitHub Issues](https://github.com/Madhura0807/code-docs-ai/issues).
*   **Questions**: Use [GitHub Discussions](https://github.com/Madhura0807/code-docs-ai/discussions).
*   **Security**: Report vulnerabilities via private email or [SECURITY.md](SECURITY.md).