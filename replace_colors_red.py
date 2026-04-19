import re

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace('#ff6b2b', '#d90429')
    content = content.replace('#ff8c55', '#ff3333')
    content = re.sub(r'255\s*,\s*107\s*,\s*43', '217, 4, 41', content)
    content = content.replace('Electric Coral', 'Dark Red')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

replace_in_file('c:/akylesh ai projects/calorie-tracker/static/style.css')
replace_in_file('c:/akylesh ai projects/calorie-tracker/templates/index.html')
