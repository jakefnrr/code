#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
import shlex
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import threading
import time
import webbrowser
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import parse_qs, quote, unquote, urlparse

DEV_ROOT = Path(__file__).resolve().parent
WORKSPACE = DEV_ROOT.parent
API_PREFIX = "/__dev/api"
MAX_EDITOR_FILE = 8 * 1024 * 1024
MAX_SEARCH_FILE = 2 * 1024 * 1024
MAX_SEARCH_RESULTS = 300
MAX_RUN_OUTPUT = 400_000
ALLOWED_HOSTS = {"127.0.0.1", "localhost", "::1"}
SKIP_DIRS = {".git", "node_modules", "__pycache__"}


class ApiError(Exception):
    def __init__(self, message: str, status: int = HTTPStatus.BAD_REQUEST):
        super().__init__(message)
        self.message = message
        self.status = int(status)


class DevHandler(SimpleHTTPRequestHandler):
    server_version = "WorkspaceEditor/1.0"

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(WORKSPACE), **kwargs)

    def do_GET(self) -> None:
        if not self.secure_host():
            self.send_json({"error": "Invalid host"}, HTTPStatus.FORBIDDEN)
            return
        parsed = urlparse(self.path)
        if parsed.path.startswith(API_PREFIX):
            self.dispatch_api("GET", parse_qs(parsed.query))
            return
        if any(part == ".git" for part in unquote(parsed.path).split("/")):
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        super().do_GET()

    def do_HEAD(self) -> None:
        if not self.secure_host():
            self.send_error(HTTPStatus.FORBIDDEN)
            return
        parsed = urlparse(self.path)
        if any(part == ".git" for part in unquote(parsed.path).split("/")):
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        super().do_HEAD()

    def do_PUT(self) -> None:
        if not self.secure_request():
            return
        parsed = urlparse(self.path)
        if parsed.path == f"{API_PREFIX}/file":
            self.dispatch_api("PUT", parse_qs(parsed.query))
        else:
            self.send_error(HTTPStatus.NOT_FOUND)

    def do_POST(self) -> None:
        if not self.secure_request():
            return
        parsed = urlparse(self.path)
        if parsed.path in {
            f"{API_PREFIX}/operation",
            f"{API_PREFIX}/run",
            f"{API_PREFIX}/open",
        }:
            self.dispatch_api("POST", parse_qs(parsed.query))
        else:
            self.send_error(HTTPStatus.NOT_FOUND)

    def log_message(self, format_string: str, *args: Any) -> None:
        if urlparse(self.path).path.startswith(API_PREFIX):
            return
        super().log_message(format_string, *args)

    def secure_host(self) -> bool:
        host = self.headers.get("Host", "").split(":")[0].strip("[]").lower()
        return host in ALLOWED_HOSTS

    def secure_request(self) -> bool:
        if not self.secure_host():
            self.send_json({"error": "Invalid host"}, HTTPStatus.FORBIDDEN)
            return False
        origin = self.headers.get("Origin")
        if origin:
            hostname = (urlparse(origin).hostname or "").lower()
            if hostname not in ALLOWED_HOSTS:
                self.send_json({"error": "Cross-origin request blocked"}, HTTPStatus.FORBIDDEN)
                return False
        content_type = self.headers.get("Content-Type", "").split(";", 1)[0].strip()
        if content_type != "application/json":
            self.send_json({"error": "Content-Type must be application/json"}, HTTPStatus.UNSUPPORTED_MEDIA_TYPE)
            return False
        return True

    def read_json(self) -> Dict[str, Any]:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as exc:
            raise ApiError("Invalid content length")
        if length <= 0:
            raise ApiError("Request body is required")
        if length > MAX_EDITOR_FILE + 1_000_000:
            raise ApiError("Request is too large", HTTPStatus.REQUEST_ENTITY_TOO_LARGE)
        try:
            body = self.rfile.read(length)
            value = json.loads(body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ApiError("Request body must be valid JSON") from exc
        if not isinstance(value, dict):
            raise ApiError("Request body must be a JSON object")
        return value

    def dispatch_api(self, method: str, query: Dict[str, List[str]]) -> None:
        try:
            parsed_path = urlparse(self.path).path
            if method == "GET" and parsed_path == f"{API_PREFIX}/health":
                self.send_json({"ok": True, "workspace": str(WORKSPACE)})
                return
            if method == "GET" and parsed_path == f"{API_PREFIX}/tree":
                self.send_json(list_directory(query_value(query, "path", "")))
                return
            if method == "GET" and parsed_path == f"{API_PREFIX}/file":
                self.send_json(read_file(query_value(query, "path")))
                return
            if method == "GET" and parsed_path == f"{API_PREFIX}/search":
                self.send_json(search_files(query_value(query, "query"), query_value(query, "path", "")))
                return
            if method == "GET" and parsed_path == f"{API_PREFIX}/preview":
                self.send_preview(query_value(query, "path"))
                return
            if method == "PUT" and parsed_path == f"{API_PREFIX}/file":
                payload = self.read_json()
                expected_etag = payload.get("expectedEtag")
                if expected_etag is not None and not isinstance(expected_etag, str):
                    raise ApiError("expectedEtag must be a string")
                self.send_json(write_file(
                    required_string(payload, "path"),
                    required_string(payload, "content", allow_empty=True),
                    expected_etag,
                ))
                return
            if method == "POST" and parsed_path == f"{API_PREFIX}/operation":
                self.send_json(run_file_operation(self.read_json()))
                return
            if method == "POST" and parsed_path == f"{API_PREFIX}/run":
                self.send_json(execute_file(self.read_json()))
                return
            if method == "POST" and parsed_path == f"{API_PREFIX}/open":
                payload = self.read_json()
                result = open_in_safari(required_string(payload, "path"))
                self.send_json(result)
                return
            self.send_error(HTTPStatus.NOT_FOUND)
        except ApiError as exc:
            self.send_json({"error": exc.message}, exc.status)
        except (BrokenPipeError, ConnectionResetError):
            return
        except Exception as exc:
            self.send_json({"error": f"Server error: {exc}"}, HTTPStatus.INTERNAL_SERVER_ERROR)

    def send_json(self, value: Any, status: int = HTTPStatus.OK) -> None:
        body = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def send_preview(self, relative_path: str) -> None:
        path = safe_path(relative_path)
        if not path.is_file():
            raise ApiError("File not found", HTTPStatus.NOT_FOUND)
        if path.stat().st_size > MAX_EDITOR_FILE:
            raise ApiError("Preview file is too large", HTTPStatus.REQUEST_ENTITY_TOO_LARGE)
        try:
            source = path.read_text(encoding="utf-8")
        except UnicodeDecodeError as exc:
            raise ApiError("Only UTF-8 text files can be previewed") from exc
        suffix = path.suffix.lower()
        directory = display_path(path.parent)
        encoded_directory = "/".join(quote(part) for part in directory.split("/") if part)
        base_url = f"http://127.0.0.1:{self_server_port(self.server)}/{encoded_directory}/" if encoded_directory else f"http://127.0.0.1:{self_server_port(self.server)}/"
        bridge_source = """<script>(function(){const format=value=>{if(typeof value==='string')return value;if(value instanceof Error)return value.stack||value.message;try{return JSON.stringify(value,null,2)}catch{return String(value)}};const send=(type,message)=>{try{window.parent.postMessage({type,message},'*')}catch{}};['log','info','warn','error'].forEach(method=>{const original=console[method].bind(console);console[method]=(...values)=>{const message=values.map(format).join(' ');const output=document.getElementById('output');if(output)output.textContent+=message+'\\n';send('workspace-preview-log',message);original(...values)}});addEventListener('error',event=>send('workspace-preview-error',event.message||'Unknown script error'));addEventListener('unhandledrejection',event=>send('workspace-preview-error',String(event.reason&&event.reason.stack||event.reason||'Unhandled promise rejection')));})();</script>"""
        base_and_bridge = f"<base href=\"{escape_html(base_url)}\">{bridge_source}"
        if suffix in {".html", ".htm"}:
            body = inject_preview_bridge(source, base_and_bridge)
        elif suffix in {".js", ".mjs", ".cjs", ".jsx", ".ts"}:
            escaped = re.sub(r"</script", r"<\\/script", source, flags=re.IGNORECASE)
            module_attribute = " type=\"module\"" if re.search(r"^\s*(?:import|export)\b", source, flags=re.MULTILINE) else ""
            body = (
                "<!doctype html><html><head><meta charset=\"utf-8\">"
                f"<title>{escape_html(path.name)}</title>{base_and_bridge}</head>"
                "<body><pre id=\"output\"></pre>"
                f"<script{module_attribute}>try{{\n{escaped}\n}}catch(error){{document.getElementById('output').textContent+=String(error.stack||error)+'\\n';window.parent.postMessage({{type:'workspace-preview-error',message:String(error.stack||error)}},'*');}}</script>"
                "</body></html>"
            )
        elif suffix == ".css":
            escaped = re.sub(r"</style", r"<\\/style", source, flags=re.IGNORECASE)
            body = f"<!doctype html><html><head><meta charset=\"utf-8\"><title>{escape_html(path.name)}</title>{base_and_bridge}<style>{escaped}</style></head><body><main class=\"preview\">CSS preview</main><script>document.documentElement.style.setProperty('background','#10141d');document.documentElement.style.setProperty('color','#f4f7fb')</script></body></html>"
        elif suffix == ".json":
            try:
                formatted = json.dumps(json.loads(source), indent=2, ensure_ascii=False)
            except json.JSONDecodeError:
                formatted = source
            body = f"<!doctype html><html><head><meta charset=\"utf-8\"><title>{escape_html(path.name)}</title><style>body{{margin:0;background:#0d1117;color:#d7dce5}}pre{{margin:0;padding:20px;white-space:pre-wrap}}</style></head><body><pre>{escape_html(formatted)}</pre></body></html>"
        else:
            body = f"<!doctype html><html><head><meta charset=\"utf-8\"><title>{escape_html(path.name)}</title><style>body{{margin:0;background:#0d1117;color:#d7dce5}}pre{{margin:0;padding:20px;white-space:pre-wrap}}</style></head><body><pre>{escape_html(source)}</pre></body></html>"
        encoded = body.encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(encoded)


def inject_preview_bridge(source: str, bridge: str) -> str:
    head = re.search(r"<head\b[^>]*>", source, flags=re.IGNORECASE)
    if head:
        return f"{source[:head.end()]}{bridge}{source[head.end():]}"
    html = re.search(r"<html\b[^>]*>", source, flags=re.IGNORECASE)
    if html:
        return f"{source[:html.end()]}<head>{bridge}</head>{source[html.end():]}"
    doctype = re.match(r"\ufeff?\s*<!doctype\b[^>]*>", source, flags=re.IGNORECASE)
    if doctype:
        return f"{source[:doctype.end()]}<html><head>{bridge}</head><body>{source[doctype.end():]}</body></html>"
    return f"<html><head>{bridge}</head><body>{source}</body></html>"


def query_value(query: Dict[str, List[str]], name: str, default: Optional[str] = None) -> str:
    values = query.get(name)
    if values:
        return values[0]
    if default is not None:
        return default
    raise ApiError(f"Missing query parameter: {name}")


def required_string(payload: Dict[str, Any], name: str, allow_empty: bool = False) -> str:
    value = payload.get(name)
    if not isinstance(value, str) or (not allow_empty and not value.strip()):
        raise ApiError(f"{name} must be a{' non-empty' if not allow_empty else ''} string")
    return value


def safe_path(raw_path: str) -> Path:
    normalized = unquote(raw_path).strip().replace("\\", "/")
    if not normalized or normalized == ".":
        return WORKSPACE
    relative = Path(normalized)
    if relative.is_absolute() or any(part == ".." for part in relative.parts):
        raise ApiError("Path is outside the workspace", HTTPStatus.FORBIDDEN)
    candidate = (WORKSPACE / relative).resolve()
    try:
        candidate.relative_to(WORKSPACE)
    except ValueError as exc:
        raise ApiError("Path is outside the workspace", HTTPStatus.FORBIDDEN) from exc
    checked = candidate.relative_to(WORKSPACE)
    if ".git" in checked.parts:
        raise ApiError("Git internals are not editable", HTTPStatus.FORBIDDEN)
    return candidate


def display_path(path: Path) -> str:
    if path == WORKSPACE:
        return ""
    return path.relative_to(WORKSPACE).as_posix()


def list_directory(relative_path: str) -> Dict[str, Any]:
    directory = safe_path(relative_path)
    if not directory.exists():
        raise ApiError("Folder not found", HTTPStatus.NOT_FOUND)
    if not directory.is_dir():
        raise ApiError("Path is not a folder")
    entries: List[Dict[str, Any]] = []
    try:
        children = list(directory.iterdir())
    except PermissionError as exc:
        raise ApiError("Folder cannot be read", HTTPStatus.FORBIDDEN) from exc
    for child in children:
        if child.name in SKIP_DIRS:
            continue
        try:
            stat = child.lstat()
            if child.is_symlink():
                resolved = child.resolve()
                try:
                    resolved.relative_to(WORKSPACE)
                except ValueError:
                    continue
                kind = "directory" if resolved.is_dir() else "file"
            else:
                kind = "directory" if child.is_dir() else "file"
            entries.append({
                "name": child.name,
                "path": display_path(child),
                "type": kind,
                "size": stat.st_size if kind == "file" else 0,
                "modified": stat.st_mtime,
            })
        except OSError:
            continue
    entries.sort(key=lambda item: (item["type"] != "directory", item["name"].casefold()))
    return {"path": display_path(directory), "entries": entries}


def read_file(relative_path: str) -> Dict[str, Any]:
    path = safe_path(relative_path)
    if not path.exists():
        raise ApiError("File not found", HTTPStatus.NOT_FOUND)
    if not path.is_file():
        raise ApiError("Path is not a file")
    stat = path.stat()
    if stat.st_size > MAX_EDITOR_FILE:
        raise ApiError("File is too large to edit", HTTPStatus.REQUEST_ENTITY_TOO_LARGE)
    try:
        content = path.read_text(encoding="utf-8")
    except UnicodeDecodeError as exc:
        raise ApiError("Only UTF-8 text files can be edited") from exc
    return {
        "path": display_path(path),
        "content": content,
        "size": stat.st_size,
        "modified": stat.st_mtime,
        "etag": f"{stat.st_mtime_ns}-{stat.st_size}",
    }


def write_file(relative_path: str, content: str, expected_etag: Optional[str] = None) -> Dict[str, Any]:
    path = safe_path(relative_path)
    if not path.parent.is_dir():
        raise ApiError("Parent folder does not exist")
    encoded = content.encode("utf-8")
    if len(encoded) > MAX_EDITOR_FILE:
        raise ApiError("File is too large to save", HTTPStatus.REQUEST_ENTITY_TOO_LARGE)
    mode: Optional[int] = None
    if path.exists():
        if not path.is_file():
            raise ApiError("Path is not a file")
        current_stat = path.stat()
        current_etag = f"{current_stat.st_mtime_ns}-{current_stat.st_size}"
        if expected_etag and current_etag != expected_etag:
            raise ApiError("File changed outside the editor", HTTPStatus.CONFLICT)
        mode = current_stat.st_mode & 0o777
    temporary_name = ""
    try:
        descriptor, temporary_name = tempfile.mkstemp(prefix=".workspace-editor-", dir=str(path.parent))
        with os.fdopen(descriptor, "wb") as temporary_file:
            temporary_file.write(encoded)
            temporary_file.flush()
            os.fsync(temporary_file.fileno())
        if mode is not None:
            os.chmod(temporary_name, mode)
        os.replace(temporary_name, path)
    finally:
        if temporary_name and os.path.exists(temporary_name):
            os.unlink(temporary_name)
    stat = path.stat()
    return {
        "path": display_path(path),
        "size": stat.st_size,
        "modified": stat.st_mtime,
        "etag": f"{stat.st_mtime_ns}-{stat.st_size}",
    }


def run_file_operation(payload: Dict[str, Any]) -> Dict[str, Any]:
    action = required_string(payload, "action")
    source = safe_path(required_string(payload, "path"))
    if action == "create-file":
        if source.exists():
            raise ApiError("A file or folder with that name already exists", HTTPStatus.CONFLICT)
        if not source.parent.is_dir():
            raise ApiError("Parent folder does not exist")
        source.write_text("", encoding="utf-8")
    elif action == "create-folder":
        if source.exists():
            raise ApiError("A file or folder with that name already exists", HTTPStatus.CONFLICT)
        source.mkdir()
    elif action == "rename":
        destination = safe_path(required_string(payload, "destination"))
        if source == WORKSPACE:
            raise ApiError("The workspace root cannot be renamed")
        if not source.exists():
            raise ApiError("File or folder not found", HTTPStatus.NOT_FOUND)
        if destination.exists():
            raise ApiError("Destination already exists", HTTPStatus.CONFLICT)
        if not destination.parent.is_dir():
            raise ApiError("Destination parent folder does not exist")
        source.rename(destination)
        source = destination
    elif action == "delete":
        if source == WORKSPACE:
            raise ApiError("The workspace root cannot be deleted")
        if not source.exists() and not source.is_symlink():
            raise ApiError("File or folder not found", HTTPStatus.NOT_FOUND)
        if source.is_dir() and not source.is_symlink():
            if not bool(payload.get("recursive")):
                raise ApiError("Confirm recursive folder deletion")
            shutil.rmtree(source)
        else:
            source.unlink()
    else:
        raise ApiError("Unknown operation")
    kind = "directory" if source.is_dir() else "file"
    return {"ok": True, "path": display_path(source), "type": kind}


def search_files(query: str, relative_path: str) -> Dict[str, Any]:
    needle = query.strip()
    if len(needle) < 2:
        raise ApiError("Search for at least two characters")
    start = safe_path(relative_path)
    if not start.is_dir():
        raise ApiError("Search path is not a folder")
    folded = needle.casefold()
    results: List[Dict[str, Any]] = []
    scanned = 0
    for directory, directory_names, file_names in os.walk(start, followlinks=False):
        directory_names[:] = [name for name in directory_names if name not in SKIP_DIRS]
        for name in file_names:
            path = Path(directory) / name
            relative = display_path(path)
            if folded in relative.casefold():
                results.append({"path": relative, "type": "path", "line": 0, "text": name})
            scanned += 1
            try:
                if path.is_symlink() or path.stat().st_size > MAX_SEARCH_FILE:
                    continue
                raw = path.read_bytes()
                if b"\x00" in raw[:8192]:
                    continue
                text = raw.decode("utf-8")
            except (OSError, UnicodeDecodeError):
                continue
            for line_number, line in enumerate(text.splitlines(), 1):
                if folded in line.casefold():
                    results.append({
                        "path": relative,
                        "type": "content",
                        "line": line_number,
                        "text": line.strip()[:300],
                    })
                    if len(results) >= MAX_SEARCH_RESULTS:
                        return {"query": query, "results": results, "scanned": scanned, "truncated": True}
            if scanned >= 20_000:
                return {"query": query, "results": results, "scanned": scanned, "truncated": True}
    return {"query": query, "results": results, "scanned": scanned, "truncated": False}


def execute_file(payload: Dict[str, Any]) -> Dict[str, Any]:
    path = safe_path(required_string(payload, "path"))
    if not path.is_file():
        raise ApiError("File not found", HTTPStatus.NOT_FOUND)
    suffix = path.suffix.lower()
    runners = {
        ".js": ["node"],
        ".mjs": ["node"],
        ".cjs": ["node"],
        ".jsx": ["node"],
        ".ts": ["node"],
        ".py": [sys.executable],
        ".sh": ["/bin/bash"],
        ".bash": ["/bin/bash"],
        ".command": ["/bin/bash"],
    }
    if suffix not in runners:
        raise ApiError("Use Run Preview for this file type")
    arguments = payload.get("args", "")
    if not isinstance(arguments, str):
        raise ApiError("args must be a string")
    try:
        extra_arguments = shlex.split(arguments)
    except ValueError as exc:
        raise ApiError("Arguments could not be parsed") from exc
    try:
        timeout = int(payload.get("timeout", 20))
    except (TypeError, ValueError) as exc:
        raise ApiError("timeout must be a number") from exc
    timeout = max(1, min(timeout, 120))
    command = runners[suffix] + [path.name] + extra_arguments
    environment = os.environ.copy()
    environment["PYTHONUNBUFFERED"] = "1"
    environment["NO_COLOR"] = "1"
    started = time.monotonic()
    process = subprocess.Popen(
        command,
        cwd=str(path.parent),
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=environment,
        start_new_session=os.name != "nt",
    )
    timed_out = False
    try:
        output, _ = process.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        timed_out = True
        if os.name != "nt":
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
        else:
            process.kill()
        output, _ = process.communicate()
    duration = round(time.monotonic() - started, 3)
    if len(output) > MAX_RUN_OUTPUT:
        output = output[:MAX_RUN_OUTPUT] + "\n[Output truncated]"
    return {
        "command": " ".join(shlex.quote(part) for part in command),
        "code": process.returncode,
        "output": output or "Process finished with no output.",
        "duration": duration,
        "timedOut": timed_out,
    }


def open_in_safari(relative_path: str) -> Dict[str, Any]:
    path = safe_path(relative_path)
    if not path.is_file():
        raise ApiError("File not found", HTTPStatus.NOT_FOUND)
    port = int(self_server_port(self.server))
    encoded_path = "/".join(quote(part) for part in display_path(path).split("/"))
    suffix = path.suffix.lower()
    if suffix in {".html", ".htm"}:
        url = f"http://127.0.0.1:{port}/{encoded_path}"
    else:
        url = f"http://127.0.0.1:{port}{API_PREFIX}/preview?path={quote(display_path(path), safe='')}&v={int(time.time())}"
    if sys.platform == "darwin":
        subprocess.Popen(
            ["open", "-a", "Safari", url],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    else:
        threading.Timer(0.15, webbrowser.open, args=(url,)).start()
    return {"ok": True, "url": url}


def self_server_port(server: Any) -> int:
    return int(server.server_address[1])


def escape_html(value: str) -> str:
    return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;").replace("'", "&#039;")


def find_port(requested: Optional[int]) -> int:
    if requested is not None:
        return requested
    for port in range(4173, 4193):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
            try:
                probe.bind(("127.0.0.1", port))
            except OSError:
                continue
            return port
    raise RuntimeError("No available editor port")


def launch_editor(url: str) -> None:
    if sys.platform == "darwin":
        subprocess.Popen(
            ["open", "-a", "Safari", url],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    else:
        webbrowser.open(url)


def main() -> int:
    parser = argparse.ArgumentParser(description="Local workspace code editor")
    parser.add_argument("--port", type=int, default=None)
    parser.add_argument("--open", action="store_true", dest="open_editor")
    args = parser.parse_args()
    mimetypes.add_type("application/javascript", ".js")
    mimetypes.add_type("text/css", ".css")
    port = find_port(args.port)
    server = ThreadingHTTPServer(("127.0.0.1", port), DevHandler)
    url = f"http://127.0.0.1:{port}/dev/"
    print(f"Workspace: {WORKSPACE}")
    print(f"Editor:    {url}")
    print("Press Ctrl+C to stop.")
    if args.open_editor:
        threading.Timer(0.25, launch_editor, args=(url,)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nEditor stopped.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
