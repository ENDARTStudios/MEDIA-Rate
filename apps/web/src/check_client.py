with open('/home/ubuntu/MEDIA-Rate/apps/web/src/components/MediaDetailClient.tsx', 'r') as f:
    lines = f.readlines()
    for i, line in enumerate(lines):
        if 'redirect' in line or 'push' in line or 'router' in line or 'login' in line:
            print(f"{i+1}: {line.strip()}")
