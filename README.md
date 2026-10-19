# Gacha Forge 한국어 배경·스탠딩 호환 패치 v2

Gacha Forge **1.8.12**의 한국어 장소 슬러그 처리 및 한국어 화자명/초상화 매칭 문제를 보완하기 위한 **비공식 런타임 패치**.

> 테스트 버전. 실제 서버 환경에서 설치·동작 검증이 필요해. CG 생성 빈도나 기준은 변경하지 않아.

## 범위

- 한국어 배경 장소명 슬러그를 Unicode 문자까지 허용하도록 변경
- 대사 화자 이름 정규화 시 한글이 삭제되는 문제 수정
- 기존 가챠 포지 패키지 파일은 디스크에서 수정하지 않음
- 가속 패치 `me-speedup.cjs`는 **필요하지 않음**. 설치되어 있어도 기존 설정 유지
- 대상: **Marinara Engine 2.5.0 / Gacha Forge 1.8.12 / Node.js 24 계열**
- 다른 버전에서 자동 적용을 보장하지 않음. 패키지 버전/해시가 일치하지 않으면 일부 변경을 건너뜀

## 포함 파일

- `gacha-ko-runtime.cjs` — Node 로더 훅을 통한 메모리 내 서버/클라이언트 코드 변환
- `gacha-ko-patchctl.py` — 설치, v1→v2 전환, 상태 확인 및 복구

## 파일 설치 준비

이 저장소에서 위 파일 2개를 받아 VPS의 `/root/`에 넣어야 해. Windows PowerShell에서 실행하는 예시:

```powershell
scp .\gacha-ko-runtime.cjs .\gacha-ko-patchctl.py root@YOUR_SERVER_IP:/root/
```

명령어의 `YOUR_SERVER_IP`를 자기 서버 주소로 변경해.

## A. 기존 v1에서 v2로 업그레이드

기존 `gacha-bg-runtime.cjs` 기반 v1을 쓰는 경우에는 **v1 설치 스크립트를 다시 실행하지 말고** 아래 순서대로 실행해.

```bash
python3 /root/gacha-ko-patchctl.py status
python3 /root/gacha-ko-patchctl.py check
python3 /root/gacha-ko-patchctl.py upgrade

cd /root/Marinara-Engine
docker compose up -d --no-deps marinara
```

`CONFIG APPLIED: upgrade-v1` 메시지가 나와야 해. 업그레이드는 v1의 마운트와 NODE_OPTIONS 참조를 제거하고 v2 참조를 넣어. 기존 다른 설정은 최대한 유지해.

**주의:** 자동 전환은 Compose 설정에 v1의 `./gacha-bg-runtime.cjs:/app/gacha-bg-runtime.cjs:ro` 마운트와 `--require=/app/gacha-bg-runtime.cjs`가 정확히 존재하는 형태를 대상으로 해. 설정이 다르면 수동 검토가 필요해.

## B. v2 새 설치

```bash
python3 /root/gacha-ko-patchctl.py status
python3 /root/gacha-ko-patchctl.py check
python3 /root/gacha-ko-patchctl.py install

cd /root/Marinara-Engine
docker compose up -d --no-deps marinara
```

가속 패치나 기존 `docker-compose.override.yml`이 없어도 기본 설치를 시도해. 단, 특수 YAML 형식은 자동 편집을 지원하지 않을 수 있어.

## 적용 확인

```bash
python3 /root/gacha-ko-patchctl.py status
docker logs --since 5m marinara-engine-marinara-1 2>&1 | grep 'gacha-ko-bg'
```

`loader hook registered`, `transformed client route in memory`, `transformed gacha server snapshot in memory` 등을 점검한 다음 브라우저를 강력 새로고침해. 실사용에서 한국어 장소 배경과 대사 스탠딩도 따로 확인해야 해.

## v2 제거/복원

```bash
python3 /root/gacha-ko-patchctl.py restore
cd /root/Marinara-Engine
docker compose up -d --no-deps marinara
```

v2 **설치 직전**의 Compose 설정으로 되돌려. 기존 v1에서 업그레이드한 경우 다시 v1 설정으로 돌아가. v2 설치 후 Compose 설정이 변경되었다면 안전을 위해 복구가 중단돼. 기존 v1 관련 파일은 자동 삭제되지 않아.

## 제약 및 주의

- 원본 패키지에 변경이 있으면 패치가 비활성화되거나 일부만 적용될 수 있어.
- 이 패치는 CG 생성 빈도, 중요한 장면 선정 프롬프트, 이미지 생성 비용에는 영향을 주지 않아.
- 스토리의 화자 이름과 캐릭터 명칭이 정확히 일치하지 않는 경우 등은 여전히 별도 검사가 필요할 수 있어.
- 서버에 적용하기 전에 Compose 설정을 백업하고, 실제 적용 후 로그 및 동작을 확인해.
- 공식 제작자와 무관한 비공식 패치야. 원본 프로젝트: [Pasta-Devs/Marinara-Agents](https://github.com/Pasta-Devs/Marinara-Agents).

## 공개 저장소 주의

서버 비밀번호, IP 주소, 비밀키, 개인 저장 데이터, .env 파일 등은 업로드하지 마.
