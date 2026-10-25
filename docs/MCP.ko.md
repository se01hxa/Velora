# Velora MCP 연결

Velora 0.2 이상은 AI가 현재 열려 있는 디자인을 읽고 편집할 수 있는 실제 MCP 서버를 제공합니다. 별도 Node.js 설치 없이 앱에 포함된 Electron 런타임으로 실행됩니다. 로컬 MCP를 지원하는 Claude Desktop, Claude Code, Codex, Antigravity 등에 연결할 수 있습니다. 클라이언트별 화면과 승인 방식은 해당 제품 버전에 따라 다릅니다.

0.3의 홈에서는 프로젝트 카드를 눌러 작업할 문서를 선택합니다. MCP 도구는 현재 선택된 프로젝트를 대상으로 합니다. 홈에서도 문서를 읽을 수 있고 편집 요청은 해당 편집기를 엽니다. 다른 프로젝트를 열면 revision을 올려 이전 문서 기준의 변경을 거부합니다. 프로젝트 목록 자체를 관리하는 MCP 도구는 제공하지 않습니다.

## 연결 순서

1. Velora를 실행하고 디자인 문서가 나타날 때까지 기다립니다.
2. 앱의 MCP 연결 화면에서 연결을 켜고 사용하는 클라이언트의 설정을 복사합니다.
3. 클라이언트의 MCP 설정에 추가합니다. 다른 서버가 이미 있으면 기존 항목을 유지한 채 `luma-studio` 항목을 합칩니다.
4. 클라이언트를 다시 연결하거나 재시작한 뒤 `luma_get_document`를 호출합니다.

AI에는 예를 들어 “Velora의 현재 문서 구조를 확인하고 선택한 버튼을 둥글게 바꾼 다음 렌더링해서 확인해 줘”라고 요청할 수 있습니다. 앱이 닫혀 있으면 도구 목록은 열리지만 문서 호출은 `APP_NOT_RUNNING` 또는 `APP_DISCONNECTED` 오류를 반환합니다. MCP 프로세스가 편집 창을 자동으로 열지는 않습니다.

앱에서 복사한 설정에는 실제 설치 경로가 들어 있습니다. 설치 위치를 바꾸거나 소스 개발 버전에서 설치 버전으로 바꾼 경우 설정을 다시 복사하세요. 연결 토큰은 설정에 들어가지 않으며 실행 중인 앱의 사용자 데이터 폴더에서 자동으로 찾습니다.

## 클라이언트별 설정

**Claude Desktop**은 설정의 Developer → Edit Config에서 `%APPDATA%\Claude\claude_desktop_config.json`을 편집합니다. 앱에서 **Claude**용 JSON을 복사하고 `mcpServers` 아래에 추가한 뒤 Claude를 완전히 다시 시작합니다. [공식 로컬 MCP 연결 안내](https://modelcontextprotocol.io/docs/develop/connect-local-servers)

**Claude Code**는 프로젝트의 `.mcp.json`에 앱에서 복사한 **Claude Code** 설정을 합칩니다. 프로젝트 MCP 연결을 허용하라는 표시가 있으면 사용할 서버인지 확인한 뒤 클라이언트에서 승인합니다. CLI로 추가하는 경우 `claude mcp add --transport stdio … -- <command> <args>` 구조와 환경변수 옵션을 사용할 수 있습니다. [Claude Code MCP 공식 문서](https://code.claude.com/docs/en/mcp)

**Codex**는 `~/.codex/config.toml`의 MCP 항목에 앱에서 복사한 **Codex** 설정을 추가합니다. TOML에는 `[mcp_servers.luma-studio]`와 `[mcp_servers.luma-studio.env]`가 모두 필요합니다. 서버 연결 상태와 도구 승인 설정은 Codex의 MCP 설정에서 확인합니다. [OpenAI 공식 MCP 문서](https://developers.openai.com/codex/mcp/)

**Antigravity**는 MCP Servers → Manage MCP Servers → View raw config에서 앱의 **Antigravity** JSON을 합칩니다. 현재 공식 문서는 전역 설정 `~/.gemini/config/mcp_config.json`, 작업 공간 설정 `.agents/mcp_config.json`을 안내합니다. 사용 중인 제품 화면에서 연 설정을 우선합니다. [Antigravity MCP 공식 문서](https://antigravity.google/docs/mcp)

Windows 경로의 역슬래시는 JSON과 TOML의 큰따옴표 문자열에서 이스케이프해야 합니다. 앱의 복사 기능은 올바르게 이스케이프된 설정을 생성합니다. 경로를 수동 입력할 때는 이 점을 확인하세요.

## 제공 도구

0.5의 `luma_batch_edit`는 `fillType: "radial"`, 최대 8개의 `gradient.stops` (`color`, 0~1 `position`), `strokeDash`, `strokeCap`, `fontStyle`, `textDecoration`을 지원합니다. `luma_create_page`의 `presetId: "aurora-discord"`로 편집 가능한 소프트 배너를 만듭니다. TTF 파일 가져오기와 GIF 생성·저장은 앱에서 실행합니다. 문서에 저장된 폰트는 PNG 렌더링과 SVG·웹 코드 생성에도 적용됩니다.

- `luma_get_document`: 문서 요약 또는 전체 데이터와 현재 revision을 읽습니다.
- `luma_get_nodes`: 아트보드의 요소를 읽거나 ID로 필터링합니다.
- `luma_list_templates`: 템플릿과 화면 크기 프리셋을 확인합니다.
- `luma_create_page`: 모바일·웹·슬라이드·데스크톱·배너 아트보드를 추가합니다.
- `luma_batch_edit`: 생성·수정·삭제·복제·그룹·정렬·컴포넌트 등의 작업을 한 번에 적용합니다.
- `luma_set_selection`: 편집기에서 요소를 선택하거나 선택을 해제합니다.
- `luma_undo`, `luma_redo`: 편집기의 문서 변경을 실행 취소하거나 다시 적용합니다.
- `luma_export_code`: HTML/CSS·React·Android XML·Compose·Windows WPF XAML·SVG·JSON 파일 내용을 반환합니다.
- `luma_render`: 아트보드를 PNG로 렌더링하여 MCP 이미지로 반환합니다. 선택 인수 `time`(0–120초)으로 특정 모션 시점을 확인합니다.
- `luma_set_viewport`: 캔버스 확대 비율을 바꾸거나 화면에 맞춥니다.

읽기 전용 리소스 `luma://document`는 문서 전체 JSON을 제공합니다. `luma_design_workflow` 프롬프트에는 구조 확인 → 작은 편집 → 렌더링 검토 순서가 담겨 있습니다. 클라이언트가 리소스 또는 프롬프트 UI를 제공하지 않아도 도구로 같은 작업을 진행할 수 있습니다.

`luma_export_code`는 결과 코드를 반환하며 임의 파일을 저장하거나 명령을 실행하지 않습니다. 파일 저장은 편집기의 내보내기를 사용하거나 별도로 허용된 클라이언트 도구로 처리하세요. Android 코드의 실제 실행·컴파일과 웹 서비스 연결은 대상 개발 환경에서 확인해야 합니다.

## 읽기 전용과 연결 끄기

읽기 전용을 켜면 아트보드 생성, 배치 편집, 실행 취소와 다시 실행을 차단합니다. 문서 읽기·렌더링·코드 생성과 선택·화면 확대는 허용합니다. 연결을 끄면 로컬 브리지가 중지되고 발견 파일이 삭제됩니다. 다시 켜면 포트와 인증 토큰을 새로 만듭니다. 클라이언트 설정을 다시 복사할 필요 없이 다음 호출에서 새 연결을 찾습니다.

외부 AI 클라이언트에는 요청한 문서 데이터와 이미지가 전달됩니다. 클라이언트의 모델·전송·보관 설정은 해당 제품의 정책을 따릅니다. Velora의 브리지는 `127.0.0.1`에만 열리고 원격 주소, 브라우저 Origin, 잘못된 Host와 토큰을 거부합니다. 같은 Windows 사용자 계정에서 실행되는 신뢰할 수 없는 프로그램과는 계정 수준의 격리를 제공하지 않습니다.

## 호출 제한과 충돌 처리

한 요청은 최대 2,000,000바이트, 배치 편집은 최대 100개 작업, ID 목록은 최대 1,000개입니다. 렌더 배율은 0.1–2입니다. 크거나 복잡한 문서는 전체 데이터 대신 요약과 필요한 요소만 읽고, 여러 작은 배치로 나눠 편집하세요. 렌더러 응답에는 40초 제한이 있고 대기 요청에는 45초 제한이 있습니다.

변경 전 문서의 `revision`을 읽고 `expectedRevision`에 넣으면 다른 변경이 먼저 적용된 경우 충돌을 확인할 수 있습니다. 시간 초과나 연결 끊김 뒤에는 같은 편집을 즉시 반복하지 말고 현재 문서를 읽어 적용 여부부터 확인하세요. 편집은 라이브 문서와 편집기의 실행 취소 기록에 반영됩니다. 중요한 프로젝트는 `.luma.json` 파일로 별도 저장하세요.

## 구현과 확인된 실행 방식

공식 TypeScript SDK의 유지보수 버전 `@modelcontextprotocol/sdk` 1.32.2와 stdio transport를 사용합니다. 이 SDK 계열은 MCP 2025-11-25까지를 지원하며, MCP 2026-07-28의 새 기능 전체를 구현하는 버전은 아닙니다. [공식 v1 SDK 문서](https://ts.sdk.modelcontextprotocol.io/)

Windows에서는 GUI 모드의 `Velora.exe --mcp`가 표준 입출력 핸들을 유지하지 못하는 문제가 실제 테스트에서 확인되었습니다. 따라서 앱이 생성하는 설정은 `ELECTRON_RUN_AS_NODE=1`과 앱 내부의 `mcp/server.cjs`를 사용합니다. 설치 EXE 자체에 포함된 Node 런타임을 사용하므로 외부 Node 실행 파일은 필요하지 않습니다. 이 환경변수는 MCP 서버 프로세스에만 설정하며 앱을 일반적으로 열 때는 설정하지 않습니다. [Electron 공식 환경변수 설명](https://www.electronjs.org/docs/latest/api/environment-variables)

소스에서 통합 검증은 `node --test mcp/check-integration.cjs`로 실행합니다. 인증, 브라우저 요청 차단, 읽기 전용, 재연결, 공식 MCP 클라이언트 초기화·도구·이미지·리소스·프롬프트와 Electron 내장 Node 실행을 검사합니다.
