from abc import ABC, abstractmethod
from typing import Dict, Any, List

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

class FileStorage(ABC):
    """
    Abstract interface for file operations.
    Hides the underlying storage implementation (S3, MinIO, Local, GCP, etc.)
    """
    @abstractmethod
    def upload(self, local_path: str, object_name: str, bucket: str = None) -> str:
        """Uploads a local file and returns its S3 key/object name."""
        pass
    
    @abstractmethod
    def download(self, object_name: str, local_dest: str, bucket: str = None):
        """Downloads an object to a local path."""
        pass
        
    @abstractmethod
    def exists(self, object_name: str, bucket: str = None) -> bool:
        """Checks if an object physically exists in storage."""
        pass
    
    @abstractmethod
    def delete(self, object_name: str, bucket: str = None):
        """Permanently deletes an object from storage."""
        pass
    
    @abstractmethod
    def list_objects(self, prefix: str = "", bucket: str = None) -> List[str]:
        """Lists objects in a bucket with an optional prefix."""
        pass
    
    @abstractmethod
    def get_presigned_url(self, object_name: str, bucket: str = None, expires: int = 3600) -> str:
        """Generates a temporary URL for direct browser access."""
        pass
