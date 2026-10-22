
import hashlib
import hmac
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import httpx
import jwt
from bson import ObjectId
from bson.errors import InvalidId
from dotenv import load_dotenv
from fastapi import (
    Depends,
    FastAPI,
    File,
    HTTPException,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from pydantic import BaseModel, Field, field_validator
from pwdlib import PasswordHash
from pymongo import MongoClient


# ---------------------------------------------------------
# Configuration
# ---------------------------------------------------------

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15")
)
FRONTEND_ORIGIN = os.getenv(
    "FRONTEND_ORIGIN", "http://localhost:5173"
)
MONGO_URI = os.getenv(
    "MONGO_URI", "mongodb://127.0.0.1:27017"
)

if (
    not JWT_SECRET_KEY
    or JWT_SECRET_KEY == "PASTE_YOUR_GENERATED_SECRET_HERE"
):
    raise RuntimeError(
        "Configure JWT_SECRET_KEY in backend/.env"
    )

if JWT_ALGORITHM != "HS256":
    raise RuntimeError(
        "This configuration expects JWT_ALGORITHM=HS256"
    )

if ACCESS_TOKEN_EXPIRE_MINUTES < 1:
    raise RuntimeError(
        "ACCESS_TOKEN_EXPIRE_MINUTES must be at least 1"
    )

# Maximum accepted upload size: 25 MiB.
MAX_UPLOAD_BYTES = 25 * 1024 * 1024

mongo = MongoClient(
    MONGO_URI,
    serverSelectionTimeoutMS=5000,
)
db = mongo["audixa"]

users_col = db["users"]
risk_sessions = db["risk_sessions"]
recommend_sessions = db["recommend_sessions"]
compliance_sessions = db["compliance_sessions"]

RISK_API = "http://127.0.0.1:8000/analyze"
CLASSIFY_API = "http://127.0.0.1:8005"
RECOMMEND_API = "http://127.0.0.1:8007"

password_hasher = PasswordHash.recommended()
bearer_scheme = HTTPBearer(auto_error=False)

app = FastAPI(title="Audixa Main API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# ---------------------------------------------------------
# HTTP Security Headers
# ---------------------------------------------------------

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)

    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = (
        "camera=(), microphone=(), geolocation=()"
    )

    # Avoid caching API responses that may contain sensitive data.
    response.headers["Cache-Control"] = "no-store"

    return response

# ---------------------------------------------------------
# Request models
# ---------------------------------------------------------

class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=128)


class UserCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    username: str = Field(min_length=3, max_length=32)
    role: str = Field(min_length=1, max_length=20)
    password: str = Field(min_length=12, max_length=128)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Name must contain at least 2 non-space characters.")
        return value

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        value = value.strip().lower()
        if not re.fullmatch(r"[a-z0-9._-]{3,32}", value):
            raise ValueError(
                "Username must be 3–32 characters and contain only "
                "letters, numbers, dots, underscores, or hyphens."
            )
        return value


# ---------------------------------------------------------
# Password security
# ---------------------------------------------------------

def hash_password(password: str) -> str:
    """Create a modern password hash."""
    return password_hasher.hash(password)


def verify_password(password: str, stored_hash: str) -> bool:
    """
    Verify a modern password hash or the existing legacy
    SHA-256 hash so existing accounts can be migrated.
    """
    if not stored_hash:
        return False

    # Legacy format used by the original Audixa application.
    legacy_hash = hashlib.sha256(
        ("audixa-salt-" + password).encode("utf-8")
    ).hexdigest()

    if hmac.compare_digest(stored_hash, legacy_hash):
        return True

    # Verify modern hashes supported by pwdlib.
    try:
        return password_hasher.verify(password, stored_hash)
    except Exception:
        return False


# ---------------------------------------------------------
# JWT authentication
# ---------------------------------------------------------

def create_access_token(username: str) -> str:
    now = datetime.now(timezone.utc)

    payload = {
        "sub": username,
        "iat": now,
        "exp": now + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        ),
    }

    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    ),
) -> dict[str, Any]:
    """Validate the bearer token and load the current user."""

    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
        )
        username = payload.get("sub")

        if not isinstance(username, str) or not username:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token",
            )

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = users_col.find_one({"username": username})

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found",
        )

    return user


def require_roles(*allowed_roles: str):
    """Dependency factory for role-based access control."""

    def role_checker(
        user: dict[str, Any] = Depends(get_current_user),
    ) -> dict[str, Any]:
        role = str(user.get("role", "")).lower().strip()

        if role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to perform this action",
            )

        return user

    return role_checker


# ---------------------------------------------------------
# File upload validation
# ---------------------------------------------------------

async def read_validated_file(file: UploadFile) -> bytes:
    """
    Read an uploaded file with a size limit.
    This checks the size, not the actual contents or safety
    of the uploaded file.
    """
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="A filename is required",
        )

    content = await file.read(MAX_UPLOAD_BYTES + 1)

    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail="File exceeds the 25 MiB upload limit",
        )

    if not content:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty",
        )

    return content


# ---------------------------------------------------------
# General endpoints
# ---------------------------------------------------------

@app.get("/")
def root():
    return {"message": "Audixa Main API is running"}


@app.get("/overview")
def overview(
    user: dict[str, Any] = Depends(
        require_roles("admin", "auditor", "viewer")
    ),
):
    return {
        "risk_scoring": "connected",
        "log_classification": "connected",
        "compliance": "pending",
        "recommendation": "pending",
    }


# ---------------------------------------------------------
# Login
# ---------------------------------------------------------

@app.post("/login")
def login(data: LoginRequest):
    username = data.username.lower().strip()
    user = users_col.find_one({"username": username})

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password",
        )

    stored_hash = user.get("password_hash", "")

    if not verify_password(data.password, stored_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password",
        )

    # Upgrade legacy hashes only after successful verification.
    if not stored_hash.startswith("$argon2"):
        users_col.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "password_hash": hash_password(data.password)
                }
            },
        )

    return {
        "username": user["username"],
        "role": user.get("role", "auditor"),
        "name": user.get("name", user["username"]),
        "token": create_access_token(user["username"]),
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


# ---------------------------------------------------------
# Admin user management
# ---------------------------------------------------------

@app.post("/users", status_code=201)
def create_user(
    data: UserCreateRequest,
    admin: dict[str, Any] = Depends(require_roles("admin")),
):
    """Create an account; only authenticated administrators may do so."""
    username = data.username.lower().strip()
    name = data.name.strip()
    role = data.role.lower().strip()

    if not re.fullmatch(r"[a-z0-9._-]{3,32}", username):
        raise HTTPException(
            status_code=400,
            detail=(
                "Username must be 3–32 characters and contain only "
                "letters, numbers, dots, underscores, or hyphens."
            ),
        )

    if len(name) < 2:
        raise HTTPException(
            status_code=400,
            detail="Full name must contain at least 2 characters.",
        )

    if role not in {"admin", "auditor", "viewer"}:
        raise HTTPException(
            status_code=400,
            detail="Role must be Admin, Auditor, or Viewer.",
        )

    if users_col.find_one({"username": username}, {"_id": 1}):
        raise HTTPException(
            status_code=409,
            detail="This username already exists.",
        )

    user_document = {
        "username": username,
        "name": name,
        "role": role,
        "password_hash": hash_password(data.password),
        "created_at": datetime.now(timezone.utc),
    }

    try:
        users_col.insert_one(user_document)
    except Exception as exc:
        # Do not expose database details to the client.
        # This also handles a duplicate-key error if a unique index exists.
        from pymongo.errors import DuplicateKeyError
        if isinstance(exc, DuplicateKeyError):
            raise HTTPException(
                status_code=409,
                detail="This username already exists.",
            ) from exc
        raise HTTPException(
            status_code=500,
            detail="The account could not be created.",
        ) from exc

    return {
        "message": "User created successfully.",
        "user": {
            "username": username,
            "name": name,
            "role": role,
        },
    }


# ---------------------------------------------------------
# Risk scoring
# ---------------------------------------------------------

@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    user: dict[str, Any] = Depends(
        require_roles("admin", "auditor")
    ),
):
    try:
        content = await read_validated_file(file)

        async with httpx.AsyncClient(timeout=120.0) as client:
            res = await client.post(
                RISK_API,
                files={
                    "file": (
                        file.filename,
                        content,
                        file.content_type or "text/csv",
                    )
                },
            )

        if res.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail="Risk-scoring service returned an error",
            )

        data = res.json()
        summary = data.get("summary", {})

        try:
            risk_sessions.insert_one(
                {
                    "filename": file.filename,
                    "uploaded_at": datetime.now(timezone.utc),
                    "total": summary.get("total"),
                    "critical": summary.get("critical"),
                    "high": summary.get("high"),
                    "medium": summary.get("medium"),
                    "low": summary.get("low"),
                    "avg_score": (
                        summary.get("avgScore")
                        or summary.get("avg_score")
                    ),
                    "max_score": (
                        summary.get("maxScore")
                        or summary.get("max_score")
                    ),
                }
            )
        except Exception:
            # Preserve the existing behavior if history saving fails.
            pass

        return data

    except HTTPException:
        raise
    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="Risk-scoring service is unavailable",
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Risk analysis failed",
        )
    finally:
        await file.close()


@app.get("/risk/sessions")
def risk_sessions_list(
    user: dict[str, Any] = Depends(
        require_roles("admin", "auditor", "viewer")
    ),
):
    rows = list(
        risk_sessions.find().sort("uploaded_at", -1)
    )

    for row in rows:
        row["id"] = str(row.pop("_id"))

        if "uploaded_at" in row:
            row["uploaded_at"] = row["uploaded_at"].isoformat()

    return rows


@app.delete("/risk/sessions/{session_id}")
def risk_sessions_delete(
    session_id: str,
    user: dict[str, Any] = Depends(
        require_roles("admin")
    ),
):
    try:
        object_id = ObjectId(session_id)
    except (InvalidId, TypeError):
        raise HTTPException(
            status_code=400,
            detail="Invalid session ID",
        )

    result = risk_sessions.delete_one({"_id": object_id})

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    return {"deleted": True}


# ---------------------------------------------------------
# Log classification
# ---------------------------------------------------------

@app.delete("/classify/sessions/{session_id}")
async def classify_delete_session(
    session_id: str,
    user: dict[str, Any] = Depends(
        require_roles("admin")
    ),
):
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.delete(
                f"{CLASSIFY_API}/sessions/{session_id}"
            )

        if res.status_code == 404:
            raise HTTPException(
                status_code=404,
                detail="Classification session not found",
            )

        if res.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail="Classification service returned an error",
            )

        return res.json()

    except HTTPException:
        raise
    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="Classification service is unavailable",
        )


@app.get("/classify/health")
async def classify_health(
    user: dict[str, Any] = Depends(
        require_roles("admin", "auditor", "viewer")
    ),
):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(f"{CLASSIFY_API}/health")

        if res.status_code >= 400:
            raise HTTPException(
                status_code=502,
                detail="Classification health check failed",
            )

        return res.json()

    except HTTPException:
        raise
    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="Classification service is unavailable",
        )


@app.post("/classify/predict_batch")
async def classify_predict_batch(
    payload: list[dict[str, Any]],
    user: dict[str, Any] = Depends(
        require_roles("admin", "auditor")
    ),
):
    if not payload:
        raise HTTPException(
            status_code=400,
            detail="The prediction batch cannot be empty",
        )

    if len(payload) > 10000:
        raise HTTPException(
            status_code=413,
            detail="The batch exceeds the 10,000-record limit",
        )

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            res = await client.post(
                f"{CLASSIFY_API}/predict_batch",
                json=payload,
            )

        if res.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail="Classification service returned an error",
            )

        return res.json()

    except HTTPException:
        raise
    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="Classification service is unavailable",
        )


@app.post("/classify/sessions/save")
async def classify_save_session(
    payload: dict[str, Any],
    user: dict[str, Any] = Depends(
        require_roles("admin", "auditor")
    ),
):
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                f"{CLASSIFY_API}/sessions/save",
                json=payload,
            )

        if res.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail="Classification session could not be saved",
            )

        return res.json()

    except HTTPException:
        raise
    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="Classification service is unavailable",
        )


@app.get("/classify/sessions")
async def classify_sessions(
    user: dict[str, Any] = Depends(
        require_roles("admin", "auditor", "viewer")
    ),
):
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.get(
                f"{CLASSIFY_API}/sessions"
            )

        if res.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail="Classification sessions could not be retrieved",
            )

        return res.json()

    except HTTPException:
        raise
    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="Classification service is unavailable",
        )


# ---------------------------------------------------------
# Compliance
# ---------------------------------------------------------

@app.get("/compliance")
def compliance(
    user: dict[str, Any] = Depends(
        require_roles("admin", "auditor", "viewer")
    ),
):
    return {"status": "module_not_connected"}


@app.post("/compliance/sessions")
def save_compliance(
    payload: dict[str, Any],
    user: dict[str, Any] = Depends(
        require_roles("admin", "auditor")
    ),
):
    payload["created_at"] = datetime.now(timezone.utc).isoformat()
    compliance_sessions.insert_one(payload)
    return {"saved": True}


@app.get("/compliance/sessions")
def list_compliance(
    user: dict[str, Any] = Depends(
        require_roles("admin", "auditor", "viewer")
    ),
):
    rows = list(
        compliance_sessions.find().sort("created_at", -1).limit(20)
    )

    for row in rows:
        row["id"] = str(row.pop("_id"))

    return rows


# ---------------------------------------------------------
# Recommendation / audit insights
# ---------------------------------------------------------

@app.get("/recommend/health")
async def recommend_health(
    user: dict[str, Any] = Depends(
        require_roles("admin", "auditor", "viewer")
    ),
):
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(f"{RECOMMEND_API}/docs")

        return {
            "status": (
                "connected" if res.status_code < 500 else "down"
            )
        }

    except httpx.RequestError:
        return {"status": "down"}


@app.post("/recommend/sessions")
def save_recommend(
    payload: dict[str, Any],
    user: dict[str, Any] = Depends(
        require_roles("admin", "auditor")
    ),
):
    payload["created_at"] = datetime.now(timezone.utc).isoformat()
    recommend_sessions.insert_one(payload)
    return {"saved": True}


@app.get("/recommend/sessions")
def list_recommend(
    user: dict[str, Any] = Depends(
        require_roles("admin", "auditor", "viewer")
    ),
):
    rows = list(
        recommend_sessions.find().sort("created_at", -1).limit(20)
    )

    for row in rows:
        row["id"] = str(row.pop("_id"))

    return rows


# Keep the catch-all proxy last so that the explicit
# /recommend/sessions routes above are matched first.
@app.post("/recommend/{path:path}")
async def recommend_post(
    path: str,
    file: Optional[UploadFile] = File(default=None),
    user: dict[str, Any] = Depends(
        require_roles("admin", "auditor")
    ),
):
    # Prevent traversal-like paths in the internal proxy.
    if not path or ".." in path.split("/"):
        raise HTTPException(
            status_code=400,
            detail="Invalid recommendation endpoint path",
        )

    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            if file is not None:
                content = await read_validated_file(file)

                res = await client.post(
                    f"{RECOMMEND_API}/{path}",
                    files={
                        "file": (
                            file.filename,
                            content,
                            file.content_type or "text/csv",
                        )
                    },
                )
            else:
                res = await client.post(
                    f"{RECOMMEND_API}/{path}"
                )

        if res.status_code >= 400:
            raise HTTPException(
                status_code=502,
                detail="Recommendation service returned an error",
            )

        return res.json()

    except HTTPException:
        raise
    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="Recommendation service is unavailable",
        )
    finally:
        if file is not None:
            await file.close()
