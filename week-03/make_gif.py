# art/pose1~4.png 로 타자를 치다가 조는 움직이는 그림 pet.gif 를 만든다.
# 실행: .venv\Scripts\python.exe make_gif.py

from pathlib import Path

from PIL import Image

HERE = Path(__file__).parent
IDLE, RIGHT, LEFT, SLEEP = range(4)     # pose1 ~ pose4

poses = [Image.open(HERE / "art" / f"pose{n}.png").convert("RGBA") for n in range(1, 5)]
size = poses[0].size


def on_white(pose, lift=0):
    # GIF 는 반투명을 못 담아서 흰 바탕에 올린다. lift 만큼 위로 들어 올린다.
    bg = Image.new("RGBA", size, (255, 255, 255, 255))
    bg.alpha_composite(pose, (0, -lift))
    return bg


frames = []     # (그림, 시간 ms)


def hold(index, ms, lift=0):
    frames.append((on_white(poses[index], lift), ms))


def fade(a, b, ms, steps):
    # a 그림에서 b 그림으로 천천히 겹쳐 바꾼다
    for k in range(1, steps + 1):
        mixed = Image.blend(on_white(poses[a]), on_white(poses[b]), k / (steps + 1))
        frames.append((mixed, ms // steps))


def type_keys(times, ms):
    # 손을 번갈아 누른다. 누르기 직전에 살짝 들썩여서 덜 뚝뚝 끊기게 한다.
    previous = IDLE
    for i in range(times):
        hand = RIGHT if i % 2 == 0 else LEFT
        fade(previous, hand, 40, 1)
        hold(hand, ms - 40)
        previous = hand
    fade(previous, IDLE, 120, 2)


hold(IDLE, 700)
type_keys(10, 180)
hold(IDLE, 500)
type_keys(8, 220)
hold(IDLE, 900)
fade(IDLE, SLEEP, 600, 6)           # 천천히 잠든다
for _ in range(2):                  # 자면서 숨 쉬기: 아주 조금 오르내린다
    for lift in (0, 1, 2, 2, 1, 0):
        hold(SLEEP, 180, lift)
fade(SLEEP, IDLE, 300, 3)           # 깨어나서 처음으로

# 모든 장면이 같은 색 목록을 쓰게 해서 깜빡임을 없앤다
# (4장을 나란히 붙인 그림에서 색을 뽑아야 Zzz 의 파란색도 들어간다)
strip = Image.new("RGB", (size[0] * 4, size[1]))
for n, pose in enumerate(poses):
    strip.paste(on_white(pose).convert("RGB"), (size[0] * n, 0))
palette = strip.quantize(colors=255, method=Image.MEDIANCUT)
images = [img.convert("RGB").quantize(palette=palette, dither=Image.NONE) for img, _ in frames]

images[0].save(
    HERE / "pet.gif",
    save_all=True,
    append_images=images[1:],
    duration=[ms for _, ms in frames],
    loop=0,
)
print(f"pet.gif 저장 · 장면 {len(images)}개 · 한 바퀴 {sum(ms for _, ms in frames) / 1000:.1f}초")
