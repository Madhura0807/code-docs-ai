import os
import shutil
import tempfile
import uuid
import zipfile
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yaml

# Add parent directory to path to import doclify
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from doclify.utils.scanner import scan_repo
from doclify.utils.extract import extract_file_content
from doclify.utils.llm import generate_doc
from doclify.utils.file_utils import load_cache, save_cache, clean_cache
from doclify.utils.readme import generate_readme_file
from doclify.schema.schema import LLMConfig
from doclify.config.constants import LiteLLMConfig

app = FastAPI(title="Code Docs AI API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Temporary directory for uploaded projects
TEMP_DIR = Path(tempfile.gettempdir()) / "codedocs_uploads"
TEMP_DIR.mkdir(exist_ok=True)

# Task storage for background jobs
tasks = {}
# Project storage for work directories
projects = {}

class GenerateRequest(BaseModel):
    project_id: str
    model: Optional[str] = None

class ProjectInfo(BaseModel):
    project_id: str
    name: str
    file_count: int
    files: list[str]

class GenerationStatus(BaseModel):
    status: str  # pending, processing, completed, failed
    progress: int  # 0-100
    message: str
    readme_content: Optional[str] = None
    error: Optional[str] = None
    work_dir: Optional[str] = None

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Code Docs AI"}

@app.post("/api/upload", response_model=ProjectInfo)
async def upload_project(file: UploadFile = File(...)):
    """
    Upload a zip file containing a project to document.
    """
    # Validate API key
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured on server")

    project_id = str(uuid.uuid4())
    project_dir = TEMP_DIR / project_id
    project_dir.mkdir(exist_ok=True)

    try:
        # Save uploaded zip file
        zip_path = project_dir / "project.zip"
        with open(zip_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Extract zip file
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(project_dir)

        # Remove zip file after extraction
        zip_path.unlink()

        # Find the extracted directory (handle nested zips)
        extracted_items = list(project_dir.iterdir())
        if len(extracted_items) == 1 and extracted_items[0].is_dir():
            work_dir = extracted_items[0]
        else:
            work_dir = project_dir

        # Scan the project
        original_cwd = os.getcwd()
        os.chdir(work_dir)
        try:
            repo_structure = scan_repo()
        finally:
            os.chdir(original_cwd)

        files = repo_structure.get("structure", [])

        # Create doclify.yaml in the work directory
        config = {
            "project": file.filename.replace('.zip', ''),
            "structure": files,
            "llm": {"model": LiteLLMConfig.DEFAULT_MODEL}
        }

        config_path = work_dir / "doclify.yaml"
        with open(config_path, "w", encoding="utf-8") as f:
            yaml.dump(config, f, default_flow_style=False, sort_keys=False)

        # Store the work directory path for later use
        projects[project_id] = {"work_dir": str(work_dir)}

        return ProjectInfo(
            project_id=project_id,
            name=config["project"],
            file_count=len(files),
            files=files[:20]  # Return first 20 files for preview
        )

    except Exception as e:
        # Cleanup on error
        if project_dir.exists():
            shutil.rmtree(project_dir)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.post("/api/generate", response_model=dict)
async def generate_documentation(request: GenerateRequest, background_tasks: BackgroundTasks):
    """
    Start documentation generation in the background.
    """
    if request.project_id not in projects or "work_dir" not in projects[request.project_id]:
        raise HTTPException(status_code=404, detail="Project not found")

    # Initialize task status
    task_id = str(uuid.uuid4())
    tasks[task_id] = {
        "status": "pending",
        "progress": 0,
        "message": "Queued for processing",
        "readme_content": None,
        "error": None,
        "work_dir": projects[request.project_id]["work_dir"]
    }

    # Start background task
    background_tasks.add_task(
        process_generation,
        task_id,
        request.model
    )

    return {"task_id": task_id}

@app.get("/api/status/{task_id}")
async def get_status(task_id: str):
    """
    Get the status of a documentation generation task.
    """
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Return status without the work_dir
    status = tasks[task_id].copy()
    status.pop("work_dir", None)
    return status

@app.get("/api/models")
async def list_models():
    """
    List available Groq models.
    """
    from groq import Groq
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")

    try:
        client = Groq(api_key=api_key)
        models_response = client.models.list()
        models = [
            {
                "id": m.id,
                "owned_by": m.owned_by,
                "context_window": getattr(m, 'context_window', None),
                "max_completion_tokens": getattr(m, 'max_completion_tokens', None)
            }
            for m in models_response.data
        ]
        return {"models": models}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch models: {str(e)}")

@app.delete("/api/project/{project_id}")
async def delete_project(project_id: str):
    """
    Delete a project and all its files.
    """
    project_dir = TEMP_DIR / project_id
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        shutil.rmtree(project_dir)
        if project_id in projects:
            del projects[project_id]
        return {"message": "Project deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete project: {str(e)}")

async def process_generation(task_id: str, model_override: Optional[str]):
    """
    Background task to process documentation generation.
    """
    work_dir = None
    original_cwd = os.getcwd()
    try:
        print(f"[{task_id}] Starting generation...")
        work_dir = Path(tasks[task_id]["work_dir"])
        print(f"[{task_id}] Work directory: {work_dir}")
        tasks[task_id]["status"] = "processing"
        tasks[task_id]["progress"] = 10
        tasks[task_id]["message"] = "Loading configuration"

        # Change to project directory
        os.chdir(work_dir)
        print(f"[{task_id}] Changed to work directory")

        # Load configuration
        config_path = Path("doclify.yaml")
        if not config_path.exists():
            raise Exception(f"Config file not found: {config_path}")
        config = yaml.safe_load(config_path.read_text(encoding="utf-8"))
        files = config.get("structure", [])
        print(f"[{task_id}] Loaded config with {len(files)} files")
        llm_model = model_override or config.get("llm", {}).get("model", LiteLLMConfig.DEFAULT_MODEL)
        print(f"[{task_id}] Using model: {llm_model}")

        tasks[task_id]["progress"] = 20
        tasks[task_id]["message"] = f"Processing {len(files)} files"

        # Initialize cache
        cache = load_cache()
        if "files" not in cache:
            cache["files"] = {}

        # Process files
        total_files = len(files)
        for idx, file_path in enumerate(files):
            tasks[task_id]["progress"] = 20 + int((idx / total_files) * 60)
            tasks[task_id]["message"] = f"Processing file {idx + 1}/{total_files}: {Path(file_path).name}"

            # Extract content
            chunks = extract_file_content(file_path)
            if any(c.startswith("Error") or c.startswith("File not found") for c in chunks):
                continue

            # Generate summary
            summaries = []
            for chunk in chunks:
                try:
                    llm_config = LLMConfig(model=llm_model)
                    summary = generate_doc(
                        code_content=chunk,
                        prompt_type="batch_summary",
                        llm_config=llm_config,
                        metadata={"project_name": config.get("project", "Project")}
                    )
                    if summary:
                        summaries.append(summary.strip())
                except Exception as e:
                    print(f"Error processing chunk: {e}")

            # Save to cache
            norm_path = os.path.normpath(file_path)
            cache["files"][norm_path] = "\n\n".join(summaries) if summaries else ""

        tasks[task_id]["progress"] = 85
        tasks[task_id]["message"] = "Generating README"

        # Save cache
        save_cache(cache)

        # Generate README
        llm_config = LLMConfig(model=llm_model)
        metadata = {"project_name": config.get("project", "Project")}
        generate_readme_file(cache, config, llm_config=llm_config, metadata=metadata)

        # Read generated README
        readme_path = Path("README.md")
        if readme_path.exists():
            readme_content = readme_path.read_text(encoding="utf-8")
        else:
            readme_content = "# Documentation\n\nFailed to generate README."

        tasks[task_id]["progress"] = 100
        tasks[task_id]["status"] = "completed"
        tasks[task_id]["message"] = "Documentation generated successfully"
        tasks[task_id]["readme_content"] = readme_content
        print(f"[{task_id}] Generation completed successfully")

        # Change back to original directory
        os.chdir(original_cwd)

    except Exception as e:
        print(f"[{task_id}] Generation error: {e}")
        import traceback
        traceback.print_exc()
        os.chdir(original_cwd)
        tasks[task_id]["status"] = "failed"
        tasks[task_id]["message"] = "Generation failed"
        tasks[task_id]["error"] = str(e)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
