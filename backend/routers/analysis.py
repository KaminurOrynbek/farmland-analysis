from fastapi import APIRouter
from backend.schemas.analysis import AnalysisRequest, AnalysisResult
from backend.services.analysis_service import run_analysis

router = APIRouter()

@router.post("/analysis/run", response_model=AnalysisResult)
@router.post("/run-analysis", response_model=AnalysisResult)
async def analyze(request: AnalysisRequest):
    # Mock analysis trigger
    return run_analysis(request)

@router.get("/analysis/results/{field_id}")
async def get_results(field_id: str):
    # Placeholder for fetching results
    return {"field_id": field_id, "status": "completed", "results": {}}
