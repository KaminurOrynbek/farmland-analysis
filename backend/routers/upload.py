from fastapi import APIRouter, UploadFile, File, HTTPException, status

router = APIRouter()

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png"}
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png"}

@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    # Validate extension
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS or file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Only {', '.join(ALLOWED_EXTENSIONS)} are allowed."
        )
    
    # Read file to get its size
    try:
        content = await file.read()
        file_size = len(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error reading file"
        )
    finally:
        await file.close()

    return {
        "status": "success",
        "filename": file.filename,
        "content_type": file.content_type,
        "file_size_bytes": file_size
    }
