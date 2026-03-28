import sys
import subprocess
import os

def install(package):
    subprocess.check_call([sys.executable, "-m", "pip", "install", package, "--quiet"])

try:
    import docx
except ImportError:
    install("python-docx")
    import docx

try:
    import PyPDF2
except ImportError:
    install("PyPDF2")
    import PyPDF2

def read_docx(path):
    try:
        doc = docx.Document(path)
        return "\n".join([para.text for para in doc.paragraphs])
    except Exception as e:
        return f"Error reading docx: {e}"

def read_pdf(path):
    try:
        text = ""
        with open(path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                text += page.extract_text() + "\n"
        return text
    except Exception as e:
        return f"Error reading pdf: {e}"

files = [
    "Pre-defense diploma project.pdf",
    "analysis of existing platforms.docx",
    "data_collection.docx",
    "it review 2.0.docx",
    "methodology_final.docx",
    "technology_comparison.docx",
    "данные.docx"
]

out_file = r"c:\Users\Kaminur\PycharmProjects\diploma\farmland-analysis\tmp\extracted_docs.txt"
with open(out_file, "w", encoding="utf-8") as out:
    for file in files:
        full_path = os.path.join(r"c:\Users\Kaminur\PycharmProjects\diploma\farmland-analysis", file)
        out.write(f"\n{'='*50}\n--- {file} ---\n{'='*50}\n")
        if file.endswith(".pdf"):
            out.write(read_pdf(full_path))
        elif file.endswith(".docx"):
            out.write(read_docx(full_path))

print(f"Extraction completed to {out_file}")
