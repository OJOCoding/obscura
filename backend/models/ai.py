from typing import Literal
from pydantic import BaseModel, Field
import time


class SessionMetadata(BaseModel):
    hour_of_day: int = Field(ge=0, le=23)
    day_of_week: int = Field(ge=0, le=6)
    ttl_chosen_seconds: int = Field(ge=300, le=604800)
    ciphertext_size_bytes: int = Field(ge=0, le=131072)
    reads_in_last_hour: int = Field(ge=0, default=0)
    drops_created_in_last_hour: int = Field(ge=0, default=0)


class AIAnalysisRequest(BaseModel):
    metadata: SessionMetadata


class AIAnalysisResponse(BaseModel):
    warnings: list[str] = Field(default_factory=list)
    risk_level: Literal["low", "medium", "high"] = "low"
    analyzed_at: int = Field(default_factory=lambda: int(time.time()))
