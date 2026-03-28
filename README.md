# 3D Agent Workspace

Claude Code 에이전트를 LEGO 미니피규어 스타일의 3D 캐릭터로 시각화하는 데스크탑 앱.

![agent-workspace](https://vana.kr/wp/wp-content/uploads/2016/01/minifigure.jpg)

## Features

- 🧱 LEGO 미니피규어 3D 캐릭터 (블루프린트 기반 모델링)
- 🤖 Claude Code 훅 연동 — 에이전트 상태 실시간 시각화
- 💬 말풍선, 타이핑 인디케이터, 감정 표현
- 🎭 아바타 에디터 (표정, 헤어스타일, 음성 설정)
- 💥 에이전트 간 충돌 감지 + 사과 애니메이션
- 🔊 TTS 음성 + 효과음 볼륨 개별 조절
- 📌 항상 위 미니멀 모드 (Cmd+M)
- 🚶 역할별 구역 자동 순찰

## Requirements

- macOS Ventura 이상 (Apple Silicon / arm64)
- [Claude Code CLI](https://claude.ai/code) 설치 필요

## Install

### Homebrew (권장)

```bash
brew tap JuseoungPark/3d-agent-workspace
brew install --cask agent-workspace
```

### DMG 직접 설치

[Releases](https://github.com/JuseoungPark/3d-agent-workspace/releases) 페이지에서 `.dmg` 다운로드 후 `/Applications`에 드래그.

## Claude Code 연동

훅 스크립트를 Claude Code에 등록하면 에이전트 상태가 실시간으로 앱에 반영됩니다.

```bash
# Claude Code settings에 아래 훅 추가
python3 /path/to/scripts/agent-workspace-hook.py
```

앱이 실행 중일 때 Claude Code가 도구를 호출하면 해당 에이전트 캐릭터가 반응합니다.

## Tech Stack

- Electron 30 + electron-vite
- React Three Fiber + Three.js
- @react-three/drei (RoundedBox, Html, OrbitControls)
- Zustand

## Development

```bash
npm install
npm run dev       # 개발 모드
npm run build     # 빌드
npm run package   # macOS 앱 패키징
```

## License

MIT
