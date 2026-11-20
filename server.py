from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
import re
import secrets
import threading
import time
import webbrowser
from datetime import datetime, timezone
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, urlparse


ROOT = Path(__file__).resolve().parent
SESSION_COOKIE = "dlcts_session"
SESSION_TTL_SECONDS = 8 * 60 * 60
MAX_LOGIN_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 10 * 60
LOGIN_LOCK_SECONDS = 60
PASSWORD_ITERATIONS = 240_000
MAX_REGISTRATIONS_PER_HOUR = 5
ACCOUNT_ID_PATTERN = re.compile(r"^[a-z][a-z0-9._-]{3,31}$")
USER_STORE = Path(os.environ.get("DLCTS_USER_STORE", ROOT / "data" / "users.json"))
PROTOTYPE_VERIFICATION_ENABLED = False

STATIC_FILES = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/index.html": ("index.html", "text/html; charset=utf-8"),
    "/styles.css": ("styles.css", "text/css; charset=utf-8"),
    "/app.js": ("app.js", "text/javascript; charset=utf-8"),
    "/verify": ("verify.html", "text/html; charset=utf-8"),
    "/verify.html": ("verify.html", "text/html; charset=utf-8"),
    "/verify.css": ("verify.css", "text/css; charset=utf-8"),
    "/verify.js": ("verify.js", "text/javascript; charset=utf-8"),
}

ROLE_PROFILES = {
    "Army Logistics Department": {
        "department": "Logistics Operations",
        "views": ["overview", "network", "cargo", "stock", "disruptions", "audit", "users"],
        "actions": [
            "approve_dispatch",
            "approve_reroute",
            "undo_decision",
            "verify_cargo",
            "manage_users",
        ],
    },
    "Army Officer": {
        "department": "Operational Command",
        "views": ["overview", "network", "stock", "disruptions", "audit"],
        "actions": ["approve_dispatch", "approve_reroute", "undo_decision"],
    },
    "Depot Manager": {
        "department": "Depot Operations",
        "views": ["overview", "network", "cargo", "stock", "audit"],
        "actions": ["verify_cargo"],
    },
    "Convoy Operator": {
        "department": "Field Logistics",
        "views": ["overview", "network", "cargo"],
        "actions": ["verify_cargo"],
    },
}

USERS = {
    "logistics.command": {
        "display_name": "Logistics Controller",
        "role": "Army Logistics Department",
        "department": "Logistics Operations",
        "initials": "LC",
        "salt": "e185dec14ebaa28c8a66eee7c21bf897",
        "password_hash": "507a855c690c962b1fd9b61de45f880b746e033236b1800c22dd69ac6cd8e105",
        "views": ["overview", "network", "cargo", "stock", "disruptions", "audit", "users"],
        "actions": ["approve_dispatch", "approve_reroute", "undo_decision", "verify_cargo", "manage_users"],
        "status": "active",
    },
    "army.officer": {
        "display_name": "Authorized Army Officer",
        "role": "Army Officer",
        "department": "Operational Command",
        "initials": "AO",
        "salt": "6521b2e480bcbb6a5a461a719bfea844",
        "password_hash": "ad409853362859377602530a5728d1ff57fb4d5e182fbfbc2644f41e6138b61f",
        "views": ["overview", "network", "stock", "disruptions", "audit"],
        "actions": ["approve_dispatch", "approve_reroute", "undo_decision"],
        "status": "active",
    },
    "depot.manager": {
        "display_name": "Verified Depot Manager",
        "role": "Depot Manager",
        "department": "Depot Operations",
        "initials": "DM",
        "salt": "cf26c3b69e50b6f3ce1824a79fd37437",
        "password_hash": "d0e03de5b67f583f75746456bd6bd99ee41857c9bf3b217bbdafb2eef9e34048",
        "views": ["overview", "network", "cargo", "stock", "audit"],
        "actions": ["verify_cargo"],
        "status": "active",
    },
    "convoy.operator": {
        "display_name": "Verified Convoy Operator",
        "role": "Convoy Operator",
        "department": "Field Logistics",
        "initials": "CO",
        "salt": "2e797005beb70080337fb38cc10373e3",
        "password_hash": "f6e87642956a6d203d86ff74082297c7e6260ce40a73a5d7195d4f0937229e84",
        "views": ["overview", "network", "cargo"],
        "actions": ["verify_cargo"],
        "status": "active",
    },
}

SESSIONS: dict[str, dict] = {}
LOGIN_FAILURES: dict[str, dict] = {}
REGISTRATION_ACTIVITY: dict[str, list[float]] = {}
DYNAMIC_USERS: dict[str, dict] = {}
STATE_LOCK = threading.RLock()


def valid_stored_record(record: dict) -> bool:
    required = ("display_name", "initials", "salt", "password_hash")
    if not all(isinstance(record.get(key), str) and record[key] for key in required):
        return False
    try:
        return len(bytes.fromhex(record["salt"])) == 16 and len(bytes.fromhex(record["password_hash"])) == 32
    except ValueError:
        return False


def load_dynamic_users() -> None:
    if not USER_STORE.exists():
        return
    try:
        payload = json.loads(USER_STORE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        print(f"Warning: could not load user store at {USER_STORE}")
        return
    records = payload.get("users", {}) if isinstance(payload, dict) else {}
    if not isinstance(records, dict):
        return
    with STATE_LOCK:
        for account_id, record in records.items():
            if (
                isinstance(record, dict)
                and ACCOUNT_ID_PATTERN.fullmatch(account_id)
                and record.get("role") in ROLE_PROFILES
                and record.get("status") in {"pending", "active"}
                and valid_stored_record(record)
            ):
                profile = ROLE_PROFILES[record["role"]]
                record["department"] = profile["department"]
                record["views"] = profile["views"]
                record["actions"] = profile["actions"]
                DYNAMIC_USERS[account_id] = record


def save_dynamic_users() -> None:
    USER_STORE.parent.mkdir(parents=True, exist_ok=True)
    temporary = USER_STORE.with_suffix(USER_STORE.suffix + ".tmp")
    payload = {"users": DYNAMIC_USERS}
    temporary.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    temporary.replace(USER_STORE)


def get_user(account_id: str) -> dict | None:
    with STATE_LOCK:
        return USERS.get(account_id) or DYNAMIC_USERS.get(account_id)


def initials_for(name: str) -> str:
    words = [word for word in name.split() if word]
    return "".join(word[0] for word in words[:2]).upper() or "NU"


def password_policy_error(password: str) -> str | None:
    if len(password) < 10 or len(password) > 72:
        return "Password must contain between 10 and 72 characters."
    if not re.search(r"[A-Z]", password) or not re.search(r"[a-z]", password):
        return "Password must include uppercase and lowercase letters."
    if not re.search(r"\d", password) or not re.search(r"[^A-Za-z0-9]", password):
        return "Password must include a number and a special character."
    return None


def public_user(account_id: str, user: dict) -> dict:
    return {
        "accountId": account_id,
        "displayName": user["display_name"],
        "role": user["role"],
        "department": user["department"],
        "initials": user["initials"],
        "views": user["views"],
        "actions": user["actions"],
    }


def verify_password(password: str, user: dict | None) -> bool:
    if user is None:
        salt = bytes.fromhex("00000000000000000000000000000000")
        expected = bytes.fromhex("00" * 32)
    else:
        salt = bytes.fromhex(user["salt"])
        expected = bytes.fromhex(user["password_hash"])
    candidate = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS
    )
    return hmac.compare_digest(candidate, expected) and user is not None


class DLCTSHandler(BaseHTTPRequestHandler):
    server_version = "DLCTS"
    sys_version = ""

    def _security_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; connect-src 'self'; base-uri 'none'; "
            "frame-ancestors 'none'; form-action 'self'",
        )

    def _send_json(self, status: int, payload: dict, cookie: str | None = None) -> None:
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self._security_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self) -> dict | None:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return None
        if length <= 0 or length > 4096:
            return None
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            return payload if isinstance(payload, dict) else None
        except (UnicodeDecodeError, json.JSONDecodeError):
            return None

    def _session_token(self) -> str | None:
        raw_cookie = self.headers.get("Cookie", "")
        cookie = SimpleCookie()
        try:
            cookie.load(raw_cookie)
        except Exception:
            return None
        morsel = cookie.get(SESSION_COOKIE)
        return morsel.value if morsel else None

    def _active_session(self) -> tuple[str, dict] | None:
        token = self._session_token()
        if not token:
            return None
        now = time.time()
        with STATE_LOCK:
            session = SESSIONS.get(token)
            if not session:
                return None
            if session["expires_at"] <= now:
                SESSIONS.pop(token, None)
                return None
            user = USERS.get(session["account_id"]) or DYNAMIC_USERS.get(session["account_id"])
            if not user or user.get("status") != "active":
                SESSIONS.pop(token, None)
                return None
            session["expires_at"] = now + SESSION_TTL_SECONDS
            return token, session

    def _login_blocked(self, client_id: str) -> int:
        now = time.time()
        with STATE_LOCK:
            state = LOGIN_FAILURES.get(client_id)
            if not state:
                return 0
            if state["locked_until"] > now:
                return max(1, int(state["locked_until"] - now))
            if now - state["window_started"] > LOGIN_WINDOW_SECONDS:
                LOGIN_FAILURES.pop(client_id, None)
            return 0

    def _record_login_failure(self, client_id: str) -> None:
        now = time.time()
        with STATE_LOCK:
            state = LOGIN_FAILURES.get(client_id)
            if not state or now - state["window_started"] > LOGIN_WINDOW_SECONDS:
                state = {"count": 0, "window_started": now, "locked_until": 0}
                LOGIN_FAILURES[client_id] = state
            state["count"] += 1
            if state["count"] >= MAX_LOGIN_ATTEMPTS:
                state["locked_until"] = now + LOGIN_LOCK_SECONDS

    def _handle_session(self) -> None:
        active = self._active_session()
        if not active:
            self._send_json(401, {"authenticated": False})
            return
        _, session = active
        account_id = session["account_id"]
        user = get_user(account_id)
        self._send_json(
            200,
            {"authenticated": True, "user": public_user(account_id, user)},
        )

    def _handle_login(self) -> None:
        client_id = self.client_address[0]
        retry_after = self._login_blocked(client_id)
        if retry_after:
            self._send_json(
                429,
                {"error": "Too many failed attempts. Try again shortly.", "retryAfter": retry_after},
            )
            return

        payload = self._read_json()
        if not payload:
            self._send_json(400, {"error": "Invalid login request."})
            return
        account_id = str(payload.get("accountId", "")).strip().lower()
        password = str(payload.get("password", ""))
        user = get_user(account_id)

        if not account_id or not password or not verify_password(password, user):
            self._record_login_failure(client_id)
            self._send_json(401, {"error": "Account ID or password is incorrect."})
            return
        if user.get("status") == "pending":
            response = {
                "error": "This account is awaiting verification by Logistics Operations.",
                "code": "PENDING_VERIFICATION",
            }
            if PROTOTYPE_VERIFICATION_ENABLED:
                response["verificationUrl"] = "/verify"
            self._send_json(
                403,
                response,
            )
            return
        if user.get("status") != "active":
            self._send_json(403, {"error": "This account is not active."})
            return

        token = secrets.token_urlsafe(32)
        with STATE_LOCK:
            LOGIN_FAILURES.pop(client_id, None)
            SESSIONS[token] = {
                "account_id": account_id,
                "created_at": time.time(),
                "expires_at": time.time() + SESSION_TTL_SECONDS,
            }
        cookie = (
            f"{SESSION_COOKIE}={token}; HttpOnly; SameSite=Strict; "
            f"Path=/; Max-Age={SESSION_TTL_SECONDS}"
        )
        self._send_json(
            200,
            {"authenticated": True, "user": public_user(account_id, user)},
            cookie,
        )

    def _registration_allowed(self, client_id: str) -> bool:
        cutoff = time.time() - 60 * 60
        with STATE_LOCK:
            attempts = [stamp for stamp in REGISTRATION_ACTIVITY.get(client_id, []) if stamp > cutoff]
            REGISTRATION_ACTIVITY[client_id] = attempts
            if len(attempts) >= MAX_REGISTRATIONS_PER_HOUR:
                return False
            attempts.append(time.time())
            return True

    def _handle_register(self) -> None:
        payload = self._read_json()
        if not payload:
            self._send_json(400, {"error": "Invalid account request."})
            return
        display_name = " ".join(str(payload.get("displayName", "")).strip().split())
        account_id = str(payload.get("accountId", "")).strip().lower()
        role = str(payload.get("role", "")).strip()
        password = str(payload.get("password", ""))

        if len(display_name) < 3 or len(display_name) > 80 or not display_name.isprintable():
            self._send_json(400, {"error": "Enter a valid full name."})
            return
        if not ACCOUNT_ID_PATTERN.fullmatch(account_id):
            self._send_json(
                400,
                {"error": "Account ID must be 4-32 lowercase letters, numbers, dots, dashes, or underscores."},
            )
            return
        if role not in ROLE_PROFILES:
            self._send_json(400, {"error": "Select a valid operational role."})
            return
        policy_error = password_policy_error(password)
        if policy_error:
            self._send_json(400, {"error": policy_error})
            return
        if get_user(account_id):
            self._send_json(409, {"error": "That account ID is already assigned."})
            return
        if not self._registration_allowed(self.client_address[0]):
            self._send_json(429, {"error": "Account request limit reached. Try again later."})
            return

        salt = secrets.token_bytes(16)
        password_hash = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS
        )
        profile = ROLE_PROFILES[role]
        record = {
            "display_name": display_name,
            "role": role,
            "department": profile["department"],
            "initials": initials_for(display_name),
            "salt": salt.hex(),
            "password_hash": password_hash.hex(),
            "views": profile["views"],
            "actions": profile["actions"],
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        with STATE_LOCK:
            if USERS.get(account_id) or DYNAMIC_USERS.get(account_id):
                self._send_json(409, {"error": "That account ID is already assigned."})
                return
            DYNAMIC_USERS[account_id] = record
            try:
                save_dynamic_users()
            except OSError:
                DYNAMIC_USERS.pop(account_id, None)
                self._send_json(500, {"error": "The account request could not be saved."})
                return
        response = {
            "created": True,
            "status": "pending",
            "accountId": account_id,
            "message": "Account created and submitted for verification.",
        }
        if PROTOTYPE_VERIFICATION_ENABLED:
            response["verificationUrl"] = f"/verify?accountId={quote(account_id, safe='')}"
        self._send_json(201, response)

    def _handle_logout(self) -> None:
        token = self._session_token()
        if token:
            with STATE_LOCK:
                SESSIONS.pop(token, None)
        cookie = f"{SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0"
        self._send_json(200, {"authenticated": False}, cookie)

    def _handle_authorize(self) -> None:
        active = self._active_session()
        if not active:
            self._send_json(401, {"authorized": False, "error": "Session expired."})
            return
        payload = self._read_json()
        action = str(payload.get("action", "")) if payload else ""
        if not action:
            self._send_json(400, {"authorized": False, "error": "Invalid action request."})
            return
        _, session = active
        user = get_user(session["account_id"])
        if action not in user["actions"]:
            self._send_json(
                403,
                {"authorized": False, "error": "This action is not assigned to your role."},
            )
            return
        self._send_json(200, {"authorized": True})

    def _handle_pending_users(self) -> None:
        active = self._active_session()
        if not active:
            self._send_json(401, {"error": "Session expired."})
            return
        _, session = active
        manager = get_user(session["account_id"])
        if "manage_users" not in manager["actions"]:
            self._send_json(403, {"error": "User verification is not assigned to your role."})
            return
        with STATE_LOCK:
            pending = [
                {
                    "accountId": account_id,
                    "displayName": record["display_name"],
                    "role": record["role"],
                    "department": record["department"],
                    "initials": record["initials"],
                    "createdAt": record.get("created_at"),
                }
                for account_id, record in DYNAMIC_USERS.items()
                if record.get("status") == "pending"
            ]
        pending.sort(key=lambda item: item.get("createdAt") or "")
        self._send_json(200, {"pendingUsers": pending})

    def _prototype_pending_users(self) -> list[dict]:
        with STATE_LOCK:
            pending = [
                {
                    "accountId": account_id,
                    "displayName": record["display_name"],
                    "role": record["role"],
                    "department": record["department"],
                    "initials": record["initials"],
                    "createdAt": record.get("created_at"),
                }
                for account_id, record in DYNAMIC_USERS.items()
                if record.get("status") == "pending"
            ]
        pending.sort(key=lambda item: item.get("createdAt") or "")
        return pending

    def _handle_prototype_pending_users(self, account_id: str = "") -> None:
        if not PROTOTYPE_VERIFICATION_ENABLED:
            self._send_json(404, {"error": "Not found."})
            return
        if account_id and not ACCOUNT_ID_PATTERN.fullmatch(account_id):
            self._send_json(400, {"error": "Invalid account request."})
            return
        pending = self._prototype_pending_users()
        if account_id:
            pending = [user for user in pending if user["accountId"] == account_id]
        self._send_json(
            200,
            {"prototype": True, "targetAccount": account_id or None, "pendingUsers": pending},
        )

    def _handle_prototype_user_decision(self) -> None:
        if not PROTOTYPE_VERIFICATION_ENABLED:
            self._send_json(404, {"error": "Not found."})
            return
        payload = self._read_json()
        account_id = str(payload.get("accountId", "")).strip().lower() if payload else ""
        decision = str(payload.get("decision", "")).strip().lower() if payload else ""
        if decision not in {"approve", "reject"} or not ACCOUNT_ID_PATTERN.fullmatch(account_id):
            self._send_json(400, {"error": "Invalid verification decision."})
            return

        with STATE_LOCK:
            record = DYNAMIC_USERS.get(account_id)
            if not record or record.get("status") != "pending":
                self._send_json(404, {"error": "Pending account request not found."})
                return
            snapshot = dict(record)
            if decision == "approve":
                record["status"] = "active"
                record["verified_at"] = datetime.now(timezone.utc).isoformat()
                record["verified_by"] = "prototype.external.verifier"
            else:
                DYNAMIC_USERS.pop(account_id, None)
            try:
                save_dynamic_users()
            except OSError:
                DYNAMIC_USERS[account_id] = snapshot
                self._send_json(500, {"error": "The verification decision could not be saved."})
                return
        self._send_json(
            200,
            {
                "updated": True,
                "prototype": True,
                "accountId": account_id,
                "status": "active" if decision == "approve" else "rejected",
                "verifiedBy": "Prototype External Verifier",
            },
        )

    def _handle_user_decision(self) -> None:
        active = self._active_session()
        if not active:
            self._send_json(401, {"error": "Session expired."})
            return
        _, session = active
        manager = get_user(session["account_id"])
        if "manage_users" not in manager["actions"]:
            self._send_json(403, {"error": "User verification is not assigned to your role."})
            return
        payload = self._read_json()
        account_id = str(payload.get("accountId", "")).strip().lower() if payload else ""
        decision = str(payload.get("decision", "")).strip().lower() if payload else ""
        if decision not in {"approve", "reject"} or not ACCOUNT_ID_PATTERN.fullmatch(account_id):
            self._send_json(400, {"error": "Invalid verification decision."})
            return

        with STATE_LOCK:
            record = DYNAMIC_USERS.get(account_id)
            if not record or record.get("status") != "pending":
                self._send_json(404, {"error": "Pending account request not found."})
                return
            snapshot = dict(record)
            if decision == "approve":
                record["status"] = "active"
                record["verified_at"] = datetime.now(timezone.utc).isoformat()
                record["verified_by"] = session["account_id"]
            else:
                DYNAMIC_USERS.pop(account_id, None)
            try:
                save_dynamic_users()
            except OSError:
                DYNAMIC_USERS[account_id] = snapshot
                self._send_json(500, {"error": "The verification decision could not be saved."})
                return
        self._send_json(
            200,
            {
                "updated": True,
                "accountId": account_id,
                "status": "active" if decision == "approve" else "rejected",
                "verifiedBy": manager["display_name"],
            },
        )

    def _serve_static(self, request_path: str) -> None:
        if request_path in {"/verify", "/verify.html", "/verify.css", "/verify.js"} and not PROTOTYPE_VERIFICATION_ENABLED:
            self._send_json(404, {"error": "Not found."})
            return
        static = STATIC_FILES.get(request_path)
        if not static:
            if request_path == "/favicon.ico":
                self.send_response(204)
                self._security_headers()
                self.end_headers()
                return
            self._send_json(404, {"error": "Not found."})
            return
        relative_path, content_type = static
        body = (ROOT / relative_path).read_bytes()
        self.send_response(200)
        self._security_headers()
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store" if relative_path == "index.html" else "no-cache")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        parsed_url = urlparse(self.path)
        request_path = parsed_url.path
        if request_path == "/api/session":
            self._handle_session()
            return
        if request_path == "/api/users/pending":
            self._handle_pending_users()
            return
        if request_path == "/api/prototype/users/pending":
            requested_account = parse_qs(parsed_url.query).get("accountId", [""])[0].strip().lower()
            self._handle_prototype_pending_users(requested_account)
            return
        self._serve_static(request_path)

    def do_POST(self) -> None:
        request_path = urlparse(self.path).path
        if request_path == "/api/login":
            self._handle_login()
            return
        if request_path == "/api/register":
            self._handle_register()
            return
        if request_path == "/api/logout":
            self._handle_logout()
            return
        if request_path == "/api/authorize":
            self._handle_authorize()
            return
        if request_path == "/api/users/decision":
            self._handle_user_decision()
            return
        if request_path == "/api/prototype/users/decision":
            self._handle_prototype_user_decision()
            return
        self._send_json(404, {"error": "Not found."})

    def log_message(self, message: str, *args) -> None:
        print(f"[{self.log_date_time_string()}] {self.client_address[0]} {message % args}")


def main() -> None:
    global PROTOTYPE_VERIFICATION_ENABLED
    parser = argparse.ArgumentParser(description="Run the DLCTS local web application.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--no-browser", action="store_true")
    parser.add_argument(
        "--prototype-verification",
        action="store_true",
        help="Enable the no-login external verification simulator.",
    )
    args = parser.parse_args()

    PROTOTYPE_VERIFICATION_ENABLED = args.prototype_verification
    load_dynamic_users()
    server = ThreadingHTTPServer((args.host, args.port), DLCTSHandler)
    url = f"http://{args.host}:{args.port}"
    print(f"DLCTS secure access running at {url}")
    if PROTOTYPE_VERIFICATION_ENABLED:
        print(f"Prototype verifier available at {url}/verify")
    print("Press Ctrl+C to stop the server.")
    if not args.no_browser:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
