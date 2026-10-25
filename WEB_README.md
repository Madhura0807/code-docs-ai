# Code Docs AI - Web Application

A premium web interface for generating software documentation from codebases using AI.

## Overview

Code Docs AI provides a browser-based interface for generating documentation. Upload your project as a zip file, and the system will analyze your code, generate intelligent summaries, and produce a comprehensive README.md file.

## Architecture

- **Backend**: FastAPI (Python) - Handles file uploads, documentation generation, and API endpoints
- **Frontend**: Next.js 16 with TypeScript and Tailwind CSS - Premium dark developer-tool aesthetic
- **Core Engine**: Python generator - The existing documentation generator

## Prerequisites

- Python 3.10 or higher (tested with 3.11.9)
- Node.js 18 or higher
- Groq API key (get free at [console.groq.com](https://console.groq.com/))

## Installation

### 1. Backend Setup

```powershell
cd "E:\projects - MADHURA\code docs\Doclify-main"

# Activate virtual environment
.venv\Scripts\activate

# Install additional web dependencies
pip install fastapi uvicorn[standard] python-multipart
```

### 2. Frontend Setup

```powershell
cd frontend

# Install dependencies
npm install

# Install additional packages
npm install lucide-react axios
```

## Running the Application

### Quick Start (Windows)

Double-click `start.bat` to launch both backend and frontend:

```powershell
cd "E:\projects - MADHURA\code docs\Doclify-main"
start.bat
```

### Manual Start

**Terminal 1 - Backend:**
```powershell
cd "E:\projects - MADHURA\code docs\Doclify-main"
$env:GROQ_API_KEY="your_api_key_here"
.venv\Scripts\python backend\main.py
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

## Usage

1. **Open the Application**: Navigate to http://localhost:3000
2. **Upload Project**: Click "Generate Documentation" and select a zip file of your project
3. **Review Files**: The system will scan and display detected files
4. **Generate**: Click "Generate Documentation" to start the AI analysis
5. **Monitor Progress**: Watch the progress bar as files are processed
6. **View Results**: Review the generated Markdown documentation
7. **Download**: Click "Download README.md" to save the documentation

## API Endpoints

### Health Check
```
GET /health
```

### Upload Project
```
POST /api/upload
Content-Type: multipart/form-data
Body: file (zip)
```

Response:
```json
{
  "project_id": "uuid",
  "name": "project-name",
  "file_count": 20,
  "files": ["file1.py", "file2.py", ...]
}
```

### Generate Documentation
```
POST /api/generate
Content-Type: application/json
Body: { "project_id": "uuid", "model": "optional-model-name" }
```

Response:
```json
{
  "task_id": "uuid"
}
```

### Check Status
```
GET /api/status/{task_id}
```

Response:
```json
{
  "status": "pending|processing|completed|failed",
  "progress": 0-100,
  "message": "status message",
  "readme_content": "markdown content (if completed)",
  "error": "error message (if failed)"
}
```

### List Models
```
GET /api/models
```

### Delete Project
```
DELETE /api/project/{project_id}
```

## File Format Requirements

The uploaded zip file should contain:
- Python files (.py)
- Markdown files (.md)
- Text files (.txt)
- Jupyter Notebooks (.ipynb)

The system respects .gitignore rules and automatically excludes common build artifacts and dependencies.

## Security Considerations

- Projects are extracted to a temporary directory (`%TEMP%\codedocs_uploads`)
- Each project gets a unique UUID to prevent conflicts
- Projects are automatically deleted when requested
- API keys are stored in environment variables only
- No arbitrary code execution from uploaded files
- Path traversal protection via UUID-based project isolation

## Troubleshooting

### Backend won't start
- Ensure Python virtual environment is activated
- Verify GROQ_API_KEY is set
- Check that all dependencies are installed: `pip install fastapi uvicorn[standard] python-multipart`

### Frontend won't start
- Ensure Node.js is installed: `node --version`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check port 3000 is not in use

### Generation fails
- Verify Groq API key is valid
- Check backend logs for error messages
- Free tier Groq API has rate limits (1000 tokens/minute)
- Try with a smaller project first

### File upload fails
- Ensure zip file is not corrupted
- Check that zip contains supported file types
- Verify zip file size is reasonable (< 100MB recommended)

## Development

### Backend Development
```powershell
# Install with hot reload
pip install uvicorn[standard]
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development
```powershell
cd frontend
npm run dev
```

### Adding New Features

1. **Backend**: Add new endpoints in `backend/main.py`
2. **Frontend**: Add new components in `frontend/app/`
3. **Styles**: Use Tailwind CSS utility classes
4. **Icons**: Import from `lucide-react`

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Performance Notes

- Documentation generation is asynchronous
- Progress updates are polled every 1 second
- Large projects may take several minutes due to API rate limits
- Generated READMEs are cached locally during generation

## License

This web application is licensed under GNU AGPLv3.

## Support

- GitHub Issues: https://github.com/Madhura0807/code-docs-ai/issues

## Credits

- Built with FastAPI, Next.js, and Tailwind CSS
- Powered by Groq API
