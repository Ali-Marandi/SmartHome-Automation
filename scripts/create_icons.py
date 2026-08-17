from pathlib import Path
from PIL import Image

PROJECT = Path('/home/ubuntu/SmartHome-Automation')
SOURCE = PROJECT / 'assets' / 'horizon-app-icon.png'
TARGET = PROJECT / 'src-tauri' / 'icons'
TARGET.mkdir(parents=True, exist_ok=True)

image = Image.open(SOURCE).convert('RGBA')

for size, name in [
    (32, '32x32.png'),
    (128, '128x128.png'),
    (256, '128x128@2x.png'),
]:
    resized = image.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(TARGET / name, 'PNG', optimize=True)

image.save(
    TARGET / 'icon.ico',
    format='ICO',
    sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
)
image.save(
    TARGET / 'icon.icns',
    format='ICNS',
    sizes=[(16, 16), (32, 32), (64, 64), (128, 128), (256, 256), (512, 512), (1024, 1024)],
)

print(f'Created Tauri icon assets in {TARGET}')
