import boto3
from botocore.client import Config
from typing import List, Optional
import os
from backend.core.interfaces import FileStorage

class S3FileStorage(FileStorage):
    """
    S3-compatible storage implementation (works with AWS S3 and MinIO).
    """
    def __init__(
        self,
        endpoint_url: str,
        access_key: str,
        secret_key: str,
        region_name: str = "us-east-1",
        default_bucket: str = "farmland-data"
    ):
        self.s3 = boto3.client(
            's3',
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region_name,
            config=Config(signature_version='s3v4')
        )
        self.default_bucket = default_bucket

    def upload(self, local_path: str, object_name: str, bucket: str = None) -> str:
        bucket = bucket or self.default_bucket
        self.s3.upload_file(local_path, bucket, object_name)
        return object_name

    def download(self, object_name: str, local_dest: str, bucket: str = None):
        bucket = bucket or self.default_bucket
        self.s3.download_file(bucket, object_name, local_dest)

    def exists(self, object_name: str, bucket: str = None) -> bool:
        """Returns True if the object exists in S3, using a lightweight HEAD request."""
        bucket = bucket or self.default_bucket
        try:
            from botocore.exceptions import ClientError
            self.s3.head_object(Bucket=bucket, Key=object_name)
            return True
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return False
            raise

    def delete(self, object_name: str, bucket: str = None):
        bucket = bucket or self.default_bucket
        self.s3.delete_object(Bucket=bucket, Key=object_name)

    def list_objects(self, prefix: str = "", bucket: str = None) -> List[str]:
        bucket = bucket or self.default_bucket
        response = self.s3.list_objects_v2(Bucket=bucket, Prefix=prefix)
        if 'Contents' not in response:
            return []
        return [obj['Key'] for obj in response['Contents']]

    def get_presigned_url(self, object_name: str, bucket: str = None, expires: int = 3600) -> str:
        bucket = bucket or self.default_bucket
        url = self.s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket, 'Key': object_name},
            ExpiresIn=expires
        )
        return url
