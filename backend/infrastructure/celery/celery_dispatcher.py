from typing import Dict, Any
from backend.core.interfaces import JobDispatcher
from backend.infrastructure.celery.celery_app import celery_app

class CeleryJobDispatcher(JobDispatcher):
    """
    Celery-based implementation of the JobDispatcher interface.
    This resides in the Infrastructure layer.
    """
    def dispatch(self, task_name: str, payload: Dict[str, Any]) -> str:
        # We use send_task to call by string name, keeping the physical decoupling
        task = celery_app.send_task(task_name, kwargs=payload)
        return task.id
