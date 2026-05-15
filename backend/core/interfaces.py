from abc import ABC, abstractmethod
from typing import Dict, Any

class JobDispatcher(ABC):
    """
    Abstract interface for dispatching background jobs.
    This hides the implementation (Celery, RabbitMQ, etc.) from the Business Logic.
    """
    @abstractmethod
    def dispatch(self, task_name: str, payload: Dict[str, Any]) -> str:
        """
        Dispatches a task and returns a unique job identifier.
        """
        pass
