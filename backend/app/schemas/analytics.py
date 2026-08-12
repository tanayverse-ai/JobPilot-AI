"""Response contracts for Feature 6 (Analytics) endpoints."""

from typing import List

from pydantic import BaseModel


class ActivityTrendPoint(BaseModel):
    date: str  # "YYYY-MM-DD"
    count: int


class ActivityTrendResponse(BaseModel):
    points: List[ActivityTrendPoint]


class ResponseRateResponse(BaseModel):
    submitted: int
    responded: int
    rate: float  # 0-100
