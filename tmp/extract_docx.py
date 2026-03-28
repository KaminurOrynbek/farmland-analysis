
import zipfile
import xml.etree.ElementTree as ET
import os

def get_docx_text(path):
    """
    Take the path of a docx file as argument, return the text in unicode.
    """
    document = zipfile.ZipFile(path)
    xml_content = document.read('word/document.xml')
    document.close()
    tree = ET.fromstring(xml_content)
    
    # Namespaces
    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    
    paragraphs = []
    for paragraph in tree.findall('.//w:p', ns):
        texts = paragraph.findall('.//w:t', ns)
        if texts:
            paragraphs.append(''.join([t.text for t in texts]))
            
    return '\n'.join(paragraphs)

files = ['data_collection.docx', 'methodology.docx']
base_path = r'c:\Users\Kaminur\PycharmProjects\diploma\farmland-analysis'

for f in files:
    full_path = os.path.join(base_path, f)
    print(f"--- {f} ---")
    try:
        print(get_docx_text(full_path))
    except Exception as e:
        print(f"Error reading {f}: {e}")
    print("\n")
