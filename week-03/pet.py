# 내 캐릭터 데스크톱 펫
# 실행: .venv\Scripts\python.exe pet.py

import sys
from pathlib import Path

from PySide6.QtCore import Qt
from PySide6.QtGui import QPixmap
from PySide6.QtWidgets import QApplication, QLabel

ART = Path(__file__).parent / "art"
MARGIN = 16         # 화면 구석에서 띄울 거리 (픽셀)


class Pet(QLabel):
    def __init__(self):
        super().__init__()
        # 테두리 없음 · 늘 맨 위 · 작업 표시줄에 버튼 없음
        self.setWindowFlags(
            Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint | Qt.Tool
        )
        self.setAttribute(Qt.WA_TranslucentBackground)

        self.poses = [QPixmap(str(ART / f"pose{n}.png")) for n in range(1, 5)]
        self.show_pose(0)
        self.move_to_corner()

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


if __name__ == "__main__":
    app = QApplication(sys.argv)
    pet = Pet()
    pet.show()
    sys.exit(app.exec())
