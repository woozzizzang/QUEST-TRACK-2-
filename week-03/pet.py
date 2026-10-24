# 내 캐릭터 데스크톱 펫
# 실행: .venv\Scripts\python.exe pet.py

import sys
from pathlib import Path

from pynput import keyboard
from PySide6.QtCore import QObject, Qt, QTimer, Signal
from PySide6.QtGui import QPixmap
from PySide6.QtWidgets import QApplication, QLabel, QMenu

ART = Path(__file__).parent / "art"
MARGIN = 16         # 화면 구석에서 띄울 거리 (픽셀)
REST_MS = 500       # 키를 안 누른 지 이만큼 지나면 두 손 들기로 (밀리초)
SLEEP_MS = 10_000   # 키를 안 누른 지 이만큼 지나면 졸기로 (밀리초)

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


class Pet(QLabel):
    def __init__(self):
        super().__init__()
        # 테두리 없음 · 늘 맨 위 · 작업 표시줄에 버튼 없음
        self.setWindowFlags(
            Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint | Qt.Tool
        )
        self.setAttribute(Qt.WA_TranslucentBackground)

        self.poses = [QPixmap(str(ART / f"pose{n}.png")) for n in range(1, 5)]
        self.show_pose(IDLE)
        self.move_to_corner()

        self.count = 0              # 오늘 누른 횟수
        self.hand = RIGHT           # 다음에 누를 손

        self.rest_timer = QTimer(self, singleShot=True, interval=REST_MS)
        self.rest_timer.timeout.connect(lambda: self.show_pose(IDLE))

        self.sleep_timer = QTimer(self, singleShot=True, interval=SLEEP_MS)
        self.sleep_timer.timeout.connect(lambda: self.show_pose(SLEEP))
        self.sleep_timer.start()

        self.keys = KeyListener()
        self.keys.pressed.connect(self.on_key)
        self.keys.start()

    def on_key(self):
        self.count += 1
        self.show_pose(self.hand)
        self.hand = LEFT if self.hand == RIGHT else RIGHT
        self.rest_timer.start()
        self.sleep_timer.start()    # 누를 때마다 10초를 처음부터 다시 잰다

    def show_pose(self, index):
        self.setPixmap(self.poses[index])
        self.adjustSize()

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
    pet.show()
    sys.exit(app.exec())
