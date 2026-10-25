"use client";

import { useState, useEffect } from "react";
import JSZip from "jszip";

export default function Home() {
  const [uploaded, setUploaded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [readme, setReadme] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [fileCount, setFileCount] = useState(0);
  const [error, setError] = useState("");

  const API_URL = "http://localhost:8000";

  const triggerFolderUpload = () => {
    document.getElementById("folder-upload")?.click();
  };

  const triggerZipUpload = () => {
    document.getElementById("file-upload")?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploaded(false);
    setReadme("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      setProjectId(data.project_id);
      setProjectName(data.name);
      setFileCount(data.file_count);
      setUploaded(true);
    } catch (err) {
      setError("Failed to upload project. Please try again.");
    }
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError("");
    setUploaded(false);
    setReadme("");

    try {
      // Create a zip file with all selected files
      const zip = new JSZip();
      const fileArray = Array.from(files);

      for (const file of fileArray) {
        const path = file.webkitRelativePath || file.name;
        const content = await file.arrayBuffer();
        zip.file(path, content);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const formData = new FormData();
      formData.append("file", new File([zipBlob], "project.zip", { type: "application/zip" }));

      const response = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      setProjectId(data.project_id);
      setProjectName(data.name);
      setFileCount(data.file_count);
      setUploaded(true);
    } catch (err) {
      setError("Failed to upload folder. Please try again.");
    }
  };

  const handleGenerate = async () => {
    if (!projectId) return;

    setGenerating(true);
    setProgress(0);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId }),
      });

      if (!response.ok) {
        throw new Error("Failed to start generation");
      }

      const data = await response.json();
      setTaskId(data.task_id);

      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`${API_URL}/api/status/${data.task_id}`);
          const statusData = await statusRes.json();

          setProgress(statusData.progress);

          if (statusData.status === "completed") {
            clearInterval(pollInterval);
            setGenerating(false);
            setReadme(statusData.readme_content || "");
          } else if (statusData.status === "failed") {
            clearInterval(pollInterval);
            setGenerating(false);
            setError(statusData.error || "Generation failed");
          }
        } catch (err) {
          clearInterval(pollInterval);
          setGenerating(false);
          setError("Failed to check status");
        }
      }, 1000);
    } catch (err) {
      setGenerating(false);
      setError("Failed to start generation");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([readme], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "README.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0a0a0a", color: "#fafafa" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid #1a1a1a", padding: "16px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "24px" }}>📄</span>
            <span style={{ fontSize: "18px", fontWeight: 600 }}>Code Docs AI</span>
          </div>
          <nav style={{ display: "flex", gap: "32px", fontSize: "14px", color: "#888" }}>
            <a href="#features" style={{ color: "#888", textDecoration: "none" }}>Features</a>
            <a href="#how-it-works" style={{ color: "#888", textDecoration: "none" }}>How It Works</a>
            <a href="https://github.com/KalyanM45/Doclify" target="_blank" rel="noopener noreferrer" style={{ color: "#888", textDecoration: "none" }}>GitHub</a>
          </nav>
          <button
            onClick={triggerFolderUpload}
            className="btn btn-primary"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero */}
      <section style={{ padding: "96px 24px", maxWidth: "1280px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "48px", fontWeight: 700, marginBottom: "24px", lineHeight: 1.2 }}>
          Generate Documentation from Your Codebase
        </h1>
        <p style={{ fontSize: "20px", color: "#888", marginBottom: "32px", lineHeight: 1.6 }}>
          Upload your project and let AI analyze your code to produce comprehensive Markdown documentation.
        </p>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <button
            onClick={triggerFolderUpload}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <span>📁</span> Select Folder
          </button>
          <input
            id="folder-upload"
            type="file"
            webkitdirectory="true"
            directory="true"
            multiple
            onChange={handleFolderUpload}
            style={{ display: "none" }}
          />
          <button
            onClick={triggerZipUpload}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <span>📦</span> Upload Zip
          </button>
          <input
            id="file-upload"
            type="file"
            accept=".zip"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
          <a
            href="https://github.com/KalyanM45/Doclify"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            View on GitHub
          </a>
        </div>

        {/* Product Preview */}
        <div style={{ marginTop: "64px", border: "1px solid #1a1a1a", borderRadius: "8px", backgroundColor: "#0d0d0d", overflow: "hidden" }}>
          <div style={{ borderBottom: "1px solid #1a1a1a", padding: "12px 16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#ef4444" }} />
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#eab308" }} />
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#22c55e" }} />
            <span style={{ marginLeft: "16px", fontSize: "14px", color: "#666" }}>Documentation Generator</span>
          </div>
          <div style={{ padding: "24px", minHeight: "300px" }}>
            {!uploaded && !error && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "256px", color: "#666" }}>
                <span style={{ fontSize: "48px", marginBottom: "16px" }}>�</span>
                <p style={{ fontSize: "18px" }}>Select a folder or upload a zip file of your project</p>
                <p style={{ fontSize: "14px", marginTop: "8px" }}>Supports Python, Markdown, Text, and Jupyter Notebook files</p>
              </div>
            )}

            {error && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "256px", color: "#ef4444" }}>
                <span style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</span>
                <p style={{ fontSize: "18px" }}>{error}</p>
              </div>
            )}

            {uploaded && !generating && !readme && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#22c55e" }}>
                  <span>✅</span>
                  <span>Project uploaded successfully</span>
                </div>
                <div style={{ backgroundColor: "#111", borderRadius: "8px", padding: "16px" }}>
                  <p style={{ fontSize: "14px", color: "#888", marginBottom: "8px" }}>Project: {projectName}</p>
                  <p style={{ fontSize: "14px", color: "#888" }}>Files detected: {fileCount}</p>
                </div>
                <button
                  onClick={handleGenerate}
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                >
                  Generate Documentation
                </button>
              </div>
            )}

            {generating && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#9333ea" }}>
                  <span>⚡</span>
                  <span>Generating documentation...</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <p style={{ fontSize: "14px", color: "#666", textAlign: "center" }}>{progress}% complete</p>
              </div>
            )}

            {readme && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#22c55e" }}>
                  <span>✅</span>
                  <span>Documentation generated successfully</span>
                </div>
                <div style={{ backgroundColor: "#111", borderRadius: "8px", padding: "16px", maxHeight: "256px", overflowY: "auto" }}>
                  <pre style={{ fontSize: "14px", color: "#ccc", whiteSpace: "pre-wrap", fontFamily: "monospace" }}>{readme}</pre>
                </div>
                <div style={{ display: "flex", gap: "16px" }}>
                  <button
                    onClick={handleDownload}
                    className="btn btn-primary"
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                  >
                    <span>📥</span> Download README.md
                  </button>
                  <button
                    onClick={() => {
                      setUploaded(false);
                      setReadme("");
                      setProjectId(null);
                    }}
                    className="btn btn-secondary"
                  >
                    New Project
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ borderTop: "1px solid #1a1a1a", padding: "96px 24px", maxWidth: "1280px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "32px", fontWeight: 700, marginBottom: "48px" }}>Features</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "32px" }}>
          <div className="card">
            <div style={{ fontSize: "32px", marginBottom: "16px" }}>⚡</div>
            <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>Codebase Analysis</h3>
            <p style={{ color: "#888" }}>Scans your project structure, identifies relevant files, and respects .gitignore rules.</p>
          </div>
          <div className="card">
            <div style={{ fontSize: "32px", marginBottom: "16px" }}>🖥️</div>
            <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>AI-Generated Documentation</h3>
            <p style={{ color: "#888" }}>Uses LLMs to generate intelligent summaries and compile comprehensive README files.</p>
          </div>
          <div className="card">
            <div style={{ fontSize: "32px", marginBottom: "16px" }}>📄</div>
            <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>Markdown Output</h3>
            <p style={{ color: "#888" }}>Produces clean, structured Markdown documentation ready for GitHub and other platforms.</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" style={{ borderTop: "1px solid #1a1a1a", padding: "96px 24px", maxWidth: "1280px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "32px", fontWeight: 700, marginBottom: "48px" }}>How It Works</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "32px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#9333ea", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700 }}>1</div>
            <h3 style={{ fontSize: "18px", fontWeight: 600 }}>Upload Your Project</h3>
            <p style={{ color: "#888" }}>Upload a zip file containing your source code. The system extracts and analyzes the structure.</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#9333ea", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700 }}>2</div>
            <h3 style={{ fontSize: "18px", fontWeight: 600 }}>AI Analysis</h3>
            <p style={{ color: "#888" }}>The system processes each file, generates summaries, and caches results for efficiency.</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#9333ea", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700 }}>3</div>
            <h3 style={{ fontSize: "18px", fontWeight: 600 }}>Download Documentation</h3>
            <p style={{ color: "#888" }}>Review and download the generated README.md file with complete project documentation.</p>
          </div>
        </div>
      </section>

      {/* Developer Section */}
      <section id="developer" style={{ borderTop: "1px solid #1a1a1a", padding: "96px 24px", maxWidth: "1280px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "32px", fontWeight: 700, marginBottom: "48px" }}>Developer</h2>
        <div className="card" style={{ backgroundColor: "#0d0d0d" }}>
          <p style={{ color: "#888", marginBottom: "16px" }}>Install the CLI tool locally:</p>
          <pre style={{ backgroundColor: "#111", borderRadius: "8px", padding: "16px", fontSize: "14px", overflowX: "auto" }}>
            <code>{`pip install doclify
export GROQ_API_KEY="your_api_key"
doclify init
doclify run`}</code>
          </pre>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #1a1a1a", padding: "48px 24px" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>📄</span>
            <span style={{ fontWeight: 600 }}>Code Docs AI</span>
          </div>
          <nav style={{ display: "flex", gap: "24px", fontSize: "14px", color: "#888" }}>
            <a href="#features" style={{ color: "#888", textDecoration: "none" }}>Features</a>
            <a href="#how-it-works" style={{ color: "#888", textDecoration: "none" }}>How It Works</a>
            <a href="https://github.com/KalyanM45/Doclify" target="_blank" rel="noopener noreferrer" style={{ color: "#888", textDecoration: "none" }}>GitHub</a>
          </nav>
          <div style={{ display: "flex", gap: "24px", fontSize: "14px", color: "#888" }}>
            <a href="#" style={{ color: "#888", textDecoration: "none" }}>Privacy</a>
            <a href="#" style={{ color: "#888", textDecoration: "none" }}>Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
