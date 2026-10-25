# MCP 편집 예제

다음은 MCP 도구에 넘기는 JSON 인수 예제입니다. 먼저 `luma_get_document`로 아트보드 ID와 현재 revision을 확인하세요. 예제의 `PAGE_ID`, `NODE_ID`와 revision은 실제 응답으로 바꿉니다. 좌표는 부모 요소를 기준으로 하며 `parentId`가 없으면 아트보드 기준입니다.

## 구조 확인

`luma_get_document`:

```json
{ "detail": "summary" }
```

`luma_get_nodes`:

```json
{ "pageId": "PAGE_ID", "nodeIds": ["NODE_ID"] }
```

## 화면과 카드 만들기

`luma_create_page`:

```json
{ "kind": "web", "name": "새 랜딩 화면", "width": 1440, "height": 900, "expectedRevision": 1 }
```

새 아트보드 ID와 revision을 확인한 뒤 `luma_batch_edit`를 호출합니다. 같은 배치에서 고유 ID를 직접 지정하면 뒤 작업에서 참조할 수 있습니다.

```json
{
  "pageId": "PAGE_ID",
  "expectedRevision": 2,
  "operations": [
    {
      "type": "create",
      "node": {
        "id": "agent-card-01",
        "type": "frame",
        "name": "Welcome card",
        "x": 120,
        "y": 120,
        "width": 380,
        "height": 240,
        "fill": "#ffffff",
        "radius": 28,
        "shadow": true
      }
    },
    {
      "type": "create",
      "parentId": "agent-card-01",
      "node": {
        "type": "text",
        "name": "Card heading",
        "text": "새로운 아이디어",
        "x": 28,
        "y": 28,
        "width": 320,
        "height": 44,
        "fill": "transparent",
        "color": "#171d2c",
        "fontSize": 28,
        "fontWeight": 700
      }
    }
  ]
}
```

## 속성 수정과 정렬

`luma_batch_edit`:

```json
{
  "pageId": "PAGE_ID",
  "expectedRevision": 3,
  "operations": [
    { "type": "update", "ids": ["NODE_ID"], "patch": { "radius": 24, "fill": "#b9e996", "animation": "float", "duration": 2 } },
    { "type": "align", "ids": ["NODE_ID", "OTHER_NODE_ID"], "axis": "left" }
  ]
}
```

사용 가능한 작업은 `create`, `update`, `delete`, `duplicate`, `reparent`, `group`, `ungroup`, `align`, `distribute`, `reorder`, `component`, `instantiate`, `resize_page`, `token_update`입니다. 정확한 인수와 필드는 도구에 공개된 JSON Schema를 따릅니다. 알 수 없는 필드와 작업 종류는 거부됩니다.

## 렌더링과 코드

`luma_render`는 MCP 이미지 결과를 돌려줍니다.

```json
{ "pageId": "PAGE_ID", "scale": 1, "time": 0 }
```

`luma_export_code`는 파일 이름과 내용을 돌려줍니다.

```json
{ "pageId": "PAGE_ID", "format": "compose" }
```

`format`은 `html`, `react`, `xml`, `compose`, `xaml`, `svg`, `json` 중 하나입니다. `xaml`은 Windows WPF의 화면·C#·프로젝트 파일을 함께 반환합니다. `time`을 생략한 렌더링은 0초를 사용합니다.

실행 취소가 필요하면 `luma_undo`를 빈 인수 `{}`로 호출합니다. 사용자가 직접 편집한 작업도 같은 기록에 있으므로 가장 최근 변경이 무엇인지 확인하고 사용하세요.
