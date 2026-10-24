# 내 캐릭터 데스크톱 펫
# 실행: .venv\Scripts\python.exe pet.py

import json
import sys
from datetime import date
from pathlib import Path

from pynput import keyboard
from PySide6.QtCore import QObject, Qt, QTimer, Signal
from PySide6.QtGui import QPixmap
from PySide6.QtWidgets import QApplication, QLabel, QMenu, QVBoxLayout, QWidget

if getattr(sys, "frozen", False):
    # pet.exe 로 묶었을 때: 그림은 exe 안에서, count.json 은 exe 옆에
    ART = Path(sys._MEIPASS) / "art"
    HERE = Path(sys.executable).parent
else:
    ART = Path(__file__).parent / "art"
    HERE = Path(__file__).parent
COUNT_FILE = HERE / "count.json"    # 날짜와 숫자만 저장
MARGIN = 16         # 화면 구석에서 띄울 거리 (픽셀)
REST_MS = 500       # 키를 안 누른 지 이만큼 지나면 두 손 들기로 (밀리초)
SLEEP_MS = 10_000   # 키를 안 누른 지 이만큼 지나면 졸기로 (밀리초)
SAVE_MS = 5_000     # 이만큼마다 횟수를 저장 (밀리초)

IDLE, RIGHT, LEFT, SLEEP = range(4)     # pose1 ~ pose4


class KeyListener(QObject):
    # 키가 눌렸다는 사실만 알린다. 어떤 키인지는 넘기지 않는다.
    pressed = Signal()

    def start(self):
        self.listener = keyboard.Listener(on_press=self.on_press)
        self.listener.daemon = True
        self.listener.start()

    def on_press(self, _key):
        # _key 는 쓰지도 저장하지도 않는다
        self.pressed.emit()


def load_count():
    # 저장된 날짜가 오늘이면 그 숫자부터, 아니면 0부터 센다
    try:
        saved = json.loads(COUNT_FILE.read_text(encoding="utf-8"))
        if saved["date"] == date.today().isoformat():
            return int(saved["count"])
    except (OSError, ValueError, KeyError, TypeError):
        pass
    return 0


class Pet(QWidget):
    def __init__(self):
        super().__init__()
        # 테두리 없음 · 늘 맨 위 · 작업 표시줄에 버튼 없음
        self.setWindowFlags(
            Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint | Qt.Tool
        )
        self.setAttribute(Qt.WA_TranslucentBackground)

        # 위: 오늘 누른 횟수 · 아래: 고양이 그림
        self.count_label = QLabel(alignment=Qt.AlignCenter)
        self.count_label.setStyleSheet(
            "background: rgba(255, 255, 255, 220); color: #333;"
            "border-radius: 8px; padding: 1px 8px; font-size: 12px;"
        )
        self.image = QLabel()

        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(2)
        layout.addWidget(self.count_label, alignment=Qt.AlignHCenter)
        layout.addWidget(self.image)

        self.poses = [QPixmap(str(ART / f"pose{n}.png")) for n in range(1, 5)]
        self.show_pose(IDLE)

        self.today = date.today()
        self.count = load_count()   # 오늘 누른 횟수
        self.saved_count = self.count
        self.update_count_label()

        self.setFixedWidth(self.poses[0].width())
        self.adjustSize()
        self.move_to_corner()

        self.hand = RIGHT           # 다음에 누를 손

        self.rest_timer = QTimer(self, singleShot=True, interval=REST_MS)
        self.rest_timer.timeout.connect(lambda: self.show_pose(IDLE))

        self.sleep_timer = QTimer(self, singleShot=True, interval=SLEEP_MS)
        self.sleep_timer.timeout.connect(lambda: self.show_pose(SLEEP))
        self.sleep_timer.start()

        self.save_timer = QTimer(self, interval=SAVE_MS)
        self.save_timer.timeout.connect(self.save_count)
        self.save_timer.start()

        self.keys = KeyListener()
        self.keys.pressed.connect(self.on_key)
        self.keys.start()

    def on_key(self):
        # 켜 둔 채로 날짜가 바뀌면 0부터 다시 센다
        if date.today() != self.today:
            self.today = date.today()
            self.count = 0
        self.count += 1
        self.update_count_label()

        self.show_pose(self.hand)
        self.hand = LEFT if self.hand == RIGHT else RIGHT
        self.rest_timer.start()
        self.sleep_timer.start()    # 누를 때마다 10초를 처음부터 다시 잰다

    def update_count_label(self):
        self.count_label.setText(f"오늘 {self.count:,}번")

    def save_count(self):
        if self.count == self.saved_count:
            return
        data = {"date": self.today.isoformat(), "count": self.count}
        COUNT_FILE.write_text(json.dumps(data), encoding="utf-8")
        self.saved_count = self.count

    def show_pose(self, index):
        self.image.setPixmap(self.poses[index])

    def move_to_corner(self):
        # availableGeometry 는 작업 표시줄을 뺀 화면 영역
        area = self.screen().availableGeometry()
        self.move(
            area.right() - self.width() - MARGIN,
            area.bottom() - self.height() - MARGIN,
        )

    # 왼쪽 버튼으로 끌어 옮기기
    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.drag_offset = event.globalPosition().toPoint() - self.pos()

    def mouseMoveEvent(self, event):
        if event.buttons() & Qt.LeftButton:
            self.move(event.globalPosition().toPoint() - self.drag_offset)

    # 오른쪽 클릭 메뉴
    def contextMenuEvent(self, event):
        menu = QMenu(self)
        menu.addAction("끄기", QApplication.quit)
        menu.exec(event.globalPos())


if __name__ == "__main__":
    app = QApplication(sys.argv)
    pet = Pet()
    app.aboutToQuit.connect(pet.save_count)     # 끌 때 한 번 더 저장
    pet.show()
    sys.exit(app.exec())
