import base64
from pydantic import BaseModel, Field, field_validator


class DropCreate(BaseModel):
    ciphertext: str = Field(
        ...,
        min_length=1,
        max_length=20_971_520,  # 20 MB base64 (~15 MB binary) — allows ~10 MB of files
        description="Base64-encoded IV+ciphertext blob from AES-256-GCM",
    )
    ttl_seconds: int = Field(
        default=86400,
        ge=300,
        le=604800,
        description="Time-to-live in seconds (5 min – 7 days)",
    )

    @field_validator("ciphertext")
    @classmethod
    def must_be_base64(cls, v: str) -> str:
        try:
            # Pad if needed and attempt decode
            padded = v + "=" * (-len(v) % 4)
            base64.b64decode(padded, validate=True)
        except Exception:
            raise ValueError("ciphertext must be valid base64")
        return v


class DropCreateResponse(BaseModel):
    drop_id: str
    expires_at: int  # Unix timestamp (seconds)


class DropRead(BaseModel):
    ciphertext: str
    ai_warnings: list[str] = Field(default_factory=list)
    ai_risk_level: str = "low"      # "low" | "medium" | "high"
    ai_analyzed: bool = False       # True if Gemini actually ran for this drop
