import re

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace('#ff3fa4', '#ff1a1a')
    content = content.replace('Hot Magenta', 'Red')
    content = re.sub(r'rgba\(\s*255\s*,\s*63\s*,\s*164\s*,', 'rgba(255, 26, 26,', content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

replace_in_file('c:/akylesh ai projects/calorie-tracker/static/style.css')
replace_in_file('c:/akylesh ai projects/calorie-tracker/templates/index.html')
