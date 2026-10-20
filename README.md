# Gacha Forge 한국어 배경·스탠딩 호환 패치 v2

Gacha Forge **1.8.12**에서 한국어 장소명 및 화자 이름 처리로 인해 배경 매칭이나 캐릭터 스탠딩 표시가 실패하는 문제를 개선하는 **비공식 런타임 패치**입니다.

**이미 v1을 설치하셨다면 [1번](#1-기존-v1-사용자용--v2로-업그레이드)을, 한국어 패치를 처음 설치하신다면 [2번](#2-v2-최초-설치자용)을 따라 진행해 주세요.**

> **지원 환경:** Marinara Engine 2.5.0 / Gacha Forge 1.8.12 / Node.js 24 계열 기준입니다. 다른 버전은 호환성을 보장하지 않습니다. 현재 테스트 버전이며, 환경에 따라 추가 검증이 필요합니다.

## 패치 기능

- **한국어 배경 매칭:** 한국어 장소명을 처리할 때 한글이 제거되지 않도록 보완합니다.
- **한국어 캐릭터 스탠딩:** 대사 화자명에서 한글이 제거되어 캐릭터 이미지가 표시되지 않는 문제를 수정합니다.
- **원본 패키지 보존:** 가챠 포지 버전 패키지 파일을 직접 덮어쓰지 않고, 실행 시 메모리에서 변환합니다.
- **CG 기능은 변경하지 않습니다.** CG 생성 기준, 생성 빈도 및 이미지 생성 비용에는 영향을 주지 않습니다.

**가속 패치는 필요하지 않습니다.** 설치 여부와 무관하게 한국어 패치를 이용하실 수 있으며, 기존에 다른 설정이 있는 경우 가능한 한 유지하도록 구성되어 있습니다.

## 사전 준비 — SSH로 서버에 접속해 주세요

마리나라 엔진을 Docker Compose로 운영하시는 서버에 SSH로 접속한 후 아래 명령어를 실행해 주세요. 이하 명령어는 기본 설치 경로가 `/root/Marinara-Engine`이고, 서버에 `curl`, `python3`, `docker compose`가 설치되어 있다는 가정으로 작성되었습니다.

파일을 직접 다운로드하거나 PC에서 서버로 업로드하실 필요 없이 **GitHub 링크에서 서버로 바로 다운로드**하실 수 있습니다.

```bash
cd /root

curl -fL \
  https://raw.githubusercontent.com/tlsiddl/gacha-forge-korean-patch/main/gacha-ko-runtime.cjs \
  -o gacha-ko-runtime.cjs

curl -fL \
  https://raw.githubusercontent.com/tlsiddl/gacha-forge-korean-patch/main/gacha-ko-patchctl.py \
  -o gacha-ko-patchctl.py
```

두 파일이 정상적으로 다운로드된 후 본인에게 해당하는 **1번 또는 2번 절차 중 하나만** 진행해 주세요.

## 1. 기존 v1 사용자용 — v2로 업그레이드

기존 한국어 배경 패치 v1(`gacha-bg-runtime.cjs`)을 사용하셨던 분들을 위한 절차입니다.

### ① 기존 패치 인식 여부 확인

```bash
python3 /root/gacha-ko-patchctl.py status
python3 /root/gacha-ko-patchctl.py check
```

아래와 같이 출력되면 정상적으로 v1을 인식한 것입니다.

```text
v1 present: True v2 present: False backup: False
CHECK OK: upgrade-v1 ; existing speedup hook is optional and preserved
```

출력이 다르거나 오류가 발생하면 업그레이드를 진행하지 마시고 현재 설정을 확인해 주세요.

### ② v1 설정을 v2로 교체

```bash
python3 /root/gacha-ko-patchctl.py upgrade
```

정상적으로 처리되면 아래 메시지가 표시됩니다.

```text
CONFIG APPLIED: upgrade-v1
```

이 명령어는 기존 v1의 Compose 마운트 및 `NODE_OPTIONS` 참조를 v2용으로 교체합니다. **기존 v1 파일을 자동 삭제하지 않으며**, 교체 직전 Compose 설정을 백업합니다. 기존 파일을 먼저 수동 삭제하지 마세요.

### ③ 마리나라 재시작

②번에서 성공 메시지를 확인하셨을 때만 실행해 주세요.

```bash
cd /root/Marinara-Engine
docker compose up -d --no-deps marinara
```

## 2. v2 최초 설치자용

한국어 배경 패치 v1을 설치한 적이 없고, 이번에 **v2를 처음 설치**하시는 분들을 위한 절차입니다.

### ① 신규 설치 가능 여부 확인

```bash
python3 /root/gacha-ko-patchctl.py status
python3 /root/gacha-ko-patchctl.py check
```

일반적으로 다음과 같이 출력됩니다.

```text
v1 present: False v2 present: False backup: False
CHECK OK: new-install ; existing speedup hook is optional and preserved
```

출력이 다르거나 오류가 발생하면 설치를 진행하지 마시고 현재 설정을 확인해 주세요.

### ② v2 신규 설치

```bash
python3 /root/gacha-ko-patchctl.py install
```

정상적으로 처리되면 다음 메시지가 표시됩니다.

```text
CONFIG APPLIED: new-install
```

### ③ 마리나라 재시작

②번에서 성공 메시지를 확인하셨을 때만 실행해 주세요.

```bash
cd /root/Marinara-Engine
docker compose up -d --no-deps marinara
```

## 3. 설치 후 정상 작동 확인 — 공통

v1에서 업그레이드하셨든 신규 설치하셨든 동일하게 확인해 주세요.

### ① 설치 상태 확인

```bash
python3 /root/gacha-ko-patchctl.py status
```

v2가 적용되었다면 다음처럼 표시됩니다.

```text
v1 present: False v2 present: True backup: True
```

### ② 실행 로그 확인

```bash
docker logs --since 10m marinara-engine-marinara-1 2>&1 | grep 'gacha-ko-bg' | tail -30
```

`loader hook registered`가 표시되면 패치 로더가 등록된 것입니다. **이 메시지만으로 실제 변환 적용까지 확인된 것은 아닙니다.** 가챠 포지 화면을 연 뒤 `transformed client route in memory` 또는 `transformed gacha server snapshot in memory` 등의 로그가 출력되는지 추가로 확인해 주세요. 코드 버전이나 패턴이 맞지 않으면 적용이 건너뛰어질 수 있습니다.

### ③ 브라우저에서 확인

브라우저에서 마리나라를 **강력 새로고침(Ctrl + Shift + R)** 한 다음 가챠 포지 스토리를 열어 주세요.

- 한국어 화자의 대사에서 해당 캐릭터의 스탠딩 이미지가 보이는지 확인해 주세요.
- 스토리가 다른 장소로 이동할 때 배경 이미지가 해당 장소와 일치하는지도 확인해 주세요.

캐릭터 스탠딩은 기존 스토리에서도 확인할 수 있습니다. 다만 설정 완료 메시지만으로 실제 표시 성공을 보장하지는 않습니다.

## 4. 문제가 발생했을 때 이전 설정으로 복원

v2 설치 또는 업그레이드 직전의 Compose 설정으로 되돌리려면 다음 명령어를 실행해 주세요.

```bash
python3 /root/gacha-ko-patchctl.py restore

cd /root/Marinara-Engine
docker compose up -d --no-deps marinara
```

기존 v1 사용자라면 **v1 설정으로 복원**되며, 신규 설치 사용자라면 **v2 설치 이전 설정으로 복원**됩니다. 설치 이후 Compose 설정을 직접 수정하셨다면 충돌 방지를 위해 자동 복원이 중단될 수 있습니다.

## 유의사항

- 이 패치는 가챠 포지 **1.8.12 전용**으로 작성되었습니다. 업데이트 후에는 호환성을 다시 확인해 주세요.
- 자동 업그레이드는 기존 v1이 `./gacha-bg-runtime.cjs:/app/gacha-bg-runtime.cjs:ro`와 `--require=/app/gacha-bg-runtime.cjs`를 사용하는 구성을 대상으로 합니다. 다른 설치 방식은 별도로 검토해 주세요.
- 설정 변경 전에 `docker-compose.override.yml`을 별도로 백업해 두시는 것을 권장합니다.
- 지원하지 않는 YAML 작성 방식이나 다른 커스텀 패치가 있는 환경에서는 설치 스크립트가 실패하거나 수동 조정이 필요할 수 있습니다.
- 서버 비밀번호, API 키, `.env` 파일 및 개인 게임 데이터는 GitHub에 공개하지 마세요.
- 본 저장소는 [Marinara Agents](https://github.com/Pasta-Devs/Marinara-Agents) 공식 프로젝트와 무관한 비공식 호환 패치입니다.

## 포함 파일

| 파일 | 설명 |
| --- | --- |
| `gacha-ko-runtime.cjs` | 한국어 배경 및 스탠딩 매칭을 수정하는 런타임 코드 |
| `gacha-ko-patchctl.py` | 설치 상태 확인, v1 → v2 업그레이드, 신규 설치 및 이전 설정 복구 |


## Gacha Forge 1.8.13 전용 한국어 스탠딩 패치 (추가)

**1.8.13의 공식 배경 식별자 수정은 건드리지 않습니다.** 신규 `gacha-standing-ko-1813-runtime.cjs`는 대사 화자 이름 정규화 `Kl()`의 한글 손실만 방지합니다. 기존 `gacha-ko-runtime.cjs`와 `gacha-ko-patchctl.py`는 **1.8.12 전용**으로 유지했습니다.

1.8.13 사용자는 기존 한국어·배경 통합 로더를 함께 활성화하지 말고, 신규 파일을 Docker Compose에 읽기 전용으로 마운트한 뒤 `NODE_OPTIONS`의 `--require` 목록에 **`--require=/app/gacha-standing-ko-1813-runtime.cjs`**를 추가해야 합니다. 다른 패치의 `--require` 항목을 삭제하지 마세요. 다운로드:

```bash
cd /root/Marinara-Engine
curl -fL --retry 3 https://raw.githubusercontent.com/tlsiddl/gacha-forge-korean-patch/main/gacha-standing-ko-1813-runtime.cjs -o gacha-standing-ko-1813-runtime.cjs
```

이 단계는 **다운로드만** 수행합니다. 서버별 Compose 구조가 다르므로, 원래 설정을 백업하고 최종 Compose에 마운트·환경변수를 병합한 후 재시작하세요. 기존 1.8.12용 로더와 중복 실행하지 마세요. 정상 등록 로그는 `[gacha-standing-ko] hook registered`, 라우트 후킹 로그는 `route transformed in memory`입니다. 실제 브라우저 스탠딩 표시 검증은 별도입니다.
