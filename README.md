# 타요 · KJ

파스텔 하늘색의 간결한 모바일 버스 도착정보 앱입니다. 지역별 정류장 검색, 주변 정류장, 실시간 도착 정보, 즐겨찾기를 제공합니다.

- **앱**: https://daejeon-tayo-kj.kjshin841.chatgpt.site/
- **설치 · 다운로드**: https://daejeon-tayo-kj.kjshin841.chatgpt.site/install
- **안드로이드 APK**: https://daejeon-tayo-kj.kjshin841.chatgpt.site/downloads/tayo-android-v1.0.0.apk

## 설치

**아이폰:** Safari에서 앱을 연 뒤 공유 → 홈 화면에 추가 → 추가. ‘웹 앱으로 열기’가 표시되면 켭니다. 웹앱 설치 방식이며 IPA 파일이나 App Store 앱은 아닙니다.

**안드로이드:** 설치 페이지에서 APK를 내려받아 엽니다. Android 8.0 이상을 지원합니다. APK는 공개된 타요 웹앱을 전용 WebView로 실행하며, 서버의 화면과 버스 데이터를 사용합니다. 별도 계정이나 버스 인증키 입력이 필요하지 않습니다. 지원되는 브라우저에서는 웹앱으로도 설치할 수 있습니다.

실시간 정보에는 인터넷 연결이 필요합니다. 오프라인에서는 연결 안내만 표시하며 과거 도착 정보를 최신 정보처럼 재사용하지 않습니다. 기기/브라우저마다 즐겨찾기와 지역 설정이 별도로 저장됩니다. ‘내 주변 정류장’을 누른 경우에만 위치를 요청합니다. 만든이 **KJ**.

## 지원 지역 및 출처

- 서울: [서울특별시 정류소정보조회 서비스](https://www.data.go.kr/data/15000303/openapi.do)
- 그 외: [국토교통부 TAGO 버스정류소정보](https://www.data.go.kr/data/15098534/openapi.do), [버스도착정보](https://www.data.go.kr/data/15098530/openapi.do)의 도시 목록 교집합

전체 시군구의 제공을 보장하지 않습니다. 설정의 목록에서 지역을 선택하세요. 기본 지역은 대전이며 서울은 별도 공식 API로 연결합니다. 제공기관의 지연, 운행 상태, 호출 한도에 따라 조회가 달라질 수 있습니다.

## 개발

Node.js 22.13 이상, npm을 사용합니다.

```sh
npm ci
npm run dev
npm run build
node --test --experimental-strip-types tests/*.test.mjs
node node_modules/typescript/bin/tsc --noEmit
```

Vinext + React + Cloudflare Worker로 구성되어 있습니다. Sites 배포 정보는 `.openai/hosting.json`, 서버 API는 `lib/transit.mjs`와 `lib/seoul-transit.mjs`입니다. 자체 배포 시 본인 소유 프로젝트 ID와 런타임 환경을 설정해야 합니다. 소스 복사만으로 운영 사이트를 수정할 수는 없습니다.

서버 런타임 비밀 값 `TAGO_SERVICE_KEY`에 공공데이터포털 인증키를 설정하고 관련 서비스 활용승인을 받습니다. 서울은 같은 공공데이터포털 키를 사용하며, 별도 키가 필요하면 `SEOUL_SERVICE_KEY`로 지정할 수 있습니다. 키는 소스, 클라이언트, APK에 넣지 않습니다. 로컬 `.dev.vars`는 Git에서 제외됩니다.

## Android 빌드

`mobile/android`는 Java 17 / Android SDK 35 / Gradle 8.11.1 프로젝트입니다.

```sh
cd mobile/android
./gradlew assembleDebug
```

배포 빌드는 `TAYO_SIGNING_STORE`, `TAYO_SIGNING_PASSWORD` 환경 변수와 `tayo` 별칭의 개인 서명키가 필요합니다. `./gradlew assembleRelease`로 생성합니다. 개인 키·암호와 빌드 캐시는 저장소에 포함하지 않습니다. 배포 APK의 SHA-256은 `public/downloads/SHA256SUMS.txt`에 기록합니다. 기존 앱 업데이트는 동일한 서명키로 빌드해야 합니다.

## 확인 범위

서울·대전·부산 실제 정류장/도착 조회, 지역별 캐시 분리, 이전 즐겨찾기 보존, 서울 도착 메시지 처리, 오프라인 응답 구분을 점검했습니다. APK는 릴리스 빌드와 서명을 검증합니다. iPhone 홈 화면 추가는 기기에서 직접 수행합니다.
