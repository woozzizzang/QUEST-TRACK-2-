# art/sheet.png 를 4칸으로 잘라 art/pose1.png ~ pose4.png 로 저장한다.
# 실행: .venv\Scripts\python.exe cut.py

from pathlib import Path

from PIL import Image

ART = Path(__file__).parent / "art"
SIZE = 150          # 펫 그림 한 장의 가로세로 (픽셀)
FAINT = 16          # 이보다 흐린 점은 빈 곳으로 본다 (가장자리 얼룩 지우기)

sheet = Image.open(ART / "sheet.png").convert("RGBA")
cell = sheet.width // 2

# ① 왼쪽 위 · 두 손  ② 오른쪽 위 · 오른손  ③ 왼쪽 아래 · 왼손  ④ 오른쪽 아래 · 졸기
corners = [(0, 0), (cell, 0), (0, cell), (cell, cell)]

poses = []
for x, y in corners:
    pose = sheet.crop((x, y, x + cell, y + cell))
    alpha = pose.getchannel("A").point(lambda v: v if v > FAINT else 0)
    pose.putalpha(alpha)
    poses.append(pose.crop(alpha.getbbox()))

# 4장을 같은 크기 캔버스에 왼쪽·아래를 맞춰 놓는다.
# 그래야 그림이 바뀔 때 고양이가 옆으로 흔들리지 않는다 (④ 는 Zzz 때문에 오른쪽이 더 넓다).
width = max(p.width for p in poses)
height = max(p.height for p in poses)
scale = SIZE / max(width, height)

for number, pose in enumerate(poses, start=1):
    canvas = Image.new("RGBA", (width, height))
    canvas.paste(pose, (0, height - pose.height))
    small = canvas.resize((round(width * scale), round(height * scale)), Image.LANCZOS)

    out = Image.new("RGBA", (SIZE, SIZE))
    out.paste(small, ((SIZE - small.width) // 2, SIZE - small.height))
    out.save(ART / f"pose{number}.png")
    print(f"pose{number}.png 저장")
