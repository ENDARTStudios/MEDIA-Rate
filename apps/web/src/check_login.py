import os

for root, dirs, files in os.walk('/home/ubuntu/MEDIA-Rate/apps/web/src'):
    for file in files:
        if file.endswith(('.tsx', '.ts', '.js', '.jsx')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                if 'login' in content.lower() and ('push' in content or 'redirect' in content or 'window.location' in content or 'href' in content):
                    print(f"Match in {path}")
