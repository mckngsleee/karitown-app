"""Karitown API: puts all the feature modules together.

Run on your computer:   uvicorn app.main:app --reload    then open http://127.0.0.1:8000/docs
On AWS Lambda:          `handler` below is the entry point (see infra/stack.py)

Each feature lives in its own pair of files:
    app/routes/<feature>.py   the URLs (read from DB -> call the rules -> save)
    app/rules/<feature>.py    the business rules (no database, no web code)
"""
import os

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from mangum import Mangum

from .errors import RuleError
from .routes import buyers, loads, materials, purchases, reports, sales, suppliers


def check_api_key(x_api_key: str = Header(default="")):
    """If API_KEY is set (it is on AWS), every request must send it in the x-api-key header."""
    expected = os.environ.get("API_KEY")
    if expected and x_api_key != expected:
        raise HTTPException(401, "Missing or wrong API key")


app = FastAPI(title="Karitown API", dependencies=[Depends(check_api_key)])

# CORS: lets the Karitown web app, which runs on a different address, call this API from the browser.
# CORS_ORIGINS is a comma-separated list, e.g. "https://app.example.com". "*" (the default) allows any
# address; that is fine here because access is controlled by the x-api-key header, not by cookies.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",")],
    allow_methods=["*"],
    allow_headers=["Content-Type", "x-api-key"],
)

for module in (materials, suppliers, buyers, purchases, loads, sales, reports):
    app.include_router(module.router)


@app.exception_handler(RuleError)
def rule_error(request: Request, error: RuleError):
    """A broken business rule becomes a 400 response with a readable message."""
    return JSONResponse(status_code=400, content={"error": str(error)})


@app.get("/health")
def health():
    return {"ok": True}


handler = Mangum(app)   # AWS Lambda calls this
