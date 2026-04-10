# Notion 저장 500 에러 버그픽스 설계

## Overview

`/api/notion` POST 핸들러에서 `request.json()`으로 body를 소비한 후, `request.clone().json()`으로 `imageUrl`을 다시 읽으려 하여 500 Internal Server Error가 발생하는 버그를 수정합니다. Request body stream은 한 번만 소비할 수 있으므로, 이미 소비된 후 `clone()`을 호출하면 실패합니다. 수정 방법은 첫 번째 `request.json()` 호출에서 `imageUrl`을 함께 destructure하고, `request.clone().json()` 호출을 완전히 제거하는 것입니다.

## Glossary

- **Bug_Condition (C)**: `type === 'style'`이고 `imageUrl`이 포함된 POST 요청을 `/api/notion`에 보낼 때, `request.clone().json()`이 이미 소비된 body stream을 다시 읽으려 하여 실패하는 조건
- **Property (P)**: 단일 `request.json()` 호출에서 `imageUrl`을 포함한 모든 필드를 정상적으로 destructure하여 에러 없이 노션 페이지를 생성하는 것
- **Preservation**: `type === 'card'`, `type === 'youtube'`, `imageUrl`이 없는 요청, GET/DELETE 요청 등 기존 동작이 변경 없이 유지되는 것
- **POST 핸들러**: `src/app/api/notion/route.ts`의 `POST` export 함수. 노션 데이터베이스에 페이지를 생성하는 역할
- **children**: 노션 페이지 본문에 추가되는 블록 배열. 시나리오, 프롬프트, 마케팅 정보, 이미지 등을 포함

## Bug Details

### Bug Condition

POST 핸들러에서 `request.json()`을 호출하여 `{ type, theme, scenario, klingPrompts, marketing, status }`를 destructure한 후, 이미지 블록 추가를 위해 `request.clone().json()`을 다시 호출합니다. 그러나 `request.json()`이 이미 body stream을 소비했기 때문에, `clone()`이 실패하거나 빈 body를 반환하여 catch 블록에서 500 에러가 발생합니다.

**Formal Specification:**
```
FUNCTION isBugCondition(request)
  INPUT: request of type Request (HTTP POST to /api/notion)
  OUTPUT: boolean
  
  body := parseJSON(request.body)
  
  RETURN body.imageUrl IS NOT NULL
         AND body.imageUrl IS NOT EMPTY
         AND request.bodyStream HAS BEEN CONSUMED
         AND request.clone().json() WILL FAIL
END FUNCTION
```

### Examples

- `POST /api/notion` with `{ type: 'style', theme: '스타일 변환 결과', scenario: '...', imageUrl: 'https://fal.ai/...', marketing: {...}, status: '생성 완료' }` → 기대: 노션 페이지 생성 + 이미지 블록 포함 / 실제: 500 Internal Server Error
- `POST /api/notion` with `{ type: 'style', theme: '테스트', scenario: 'prompt text', imageUrl: 'data:image/png;base64,...', marketing: { caption: '...', hashtags: '...' }, status: '생성 완료' }` → 기대: 정상 저장 / 실제: 500 에러
- `POST /api/notion` with `{ type: 'card', theme: '카드뉴스', scenario: [...], status: '생성 완료' }` (imageUrl 없음) → 정상 동작하지만, `request.clone().json()`이 불필요하게 호출되어 잠재적 에러 가능성 존재

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `type === 'card'`인 카드뉴스 저장 요청은 기존과 동일하게 시나리오, 프롬프트, 마케팅 정보를 노션에 저장해야 함
- `type === 'youtube'`인 유튜브 쇼츠 저장 요청은 기존과 동일하게 동작해야 함
- `imageUrl`이 없는 요청에서는 이미지 블록을 추가하지 않아야 함
- GET 요청(데이터베이스 조회, 페이지 블록 조회)은 변경 없이 동작해야 함
- DELETE 요청(페이지 아카이브)은 변경 없이 동작해야 함
- 노션 페이지의 properties 구조(Name, 상태, 생성일, channel)는 변경 없이 유지되어야 함
- System Data 섹션의 JSON 청크 저장 로직은 변경 없이 유지되어야 함

**Scope:**
`imageUrl` 필드의 destructure 위치만 변경하고 `request.clone().json()` 호출을 제거하는 것이므로, POST 핸들러의 나머지 로직과 GET/DELETE 핸들러는 전혀 영향을 받지 않습니다.

## Hypothesized Root Cause

버그의 근본 원인은 명확합니다:

1. **Request Body Stream 이중 소비**: `src/app/api/notion/route.ts`의 POST 핸들러 108행에서 `await request.json()`으로 body를 소비합니다. 이후 186행에서 `await request.clone().json()`을 호출하지만, Web Fetch API 스펙에 따르면 body가 이미 소비된(disturbed) Request는 `clone()`할 수 없습니다. `clone()`은 body가 아직 소비되지 않은 상태에서만 유효합니다.

2. **imageUrl 누락된 Destructuring**: 첫 번째 `request.json()` 호출에서 `{ type, theme, scenario, klingPrompts, marketing, status }`만 destructure하고 `imageUrl`을 포함하지 않았습니다. 클라이언트(`src/app/style-transfer/page.tsx` 173행)는 `imageUrl: resultImage`를 body에 포함하여 전송하지만, 서버에서 이를 첫 번째 파싱에서 추출하지 않습니다.

## Correctness Properties

Property 1: Bug Condition - imageUrl 포함 요청 정상 처리

_For any_ POST 요청에 `imageUrl`이 포함되어 있을 때, 수정된 POST 핸들러는 단일 `request.json()` 호출에서 `imageUrl`을 포함한 모든 필드를 정상적으로 destructure하고, 에러 없이 노션 페이지를 생성하며, children 배열에 해당 `imageUrl`을 사용한 이미지 블록을 포함해야 한다 (SHALL).

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - imageUrl 미포함 요청 기존 동작 유지

_For any_ POST 요청에 `imageUrl`이 포함되지 않은 경우 (card, youtube 타입 등), 수정된 POST 핸들러는 기존 코드와 동일한 결과를 생성해야 하며, children 배열에 이미지 블록을 추가하지 않고 나머지 콘텐츠(시나리오, 프롬프트, 마케팅 정보, System Data)를 동일하게 저장해야 한다 (SHALL).

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

근본 원인이 명확하므로 수정은 최소한의 변경으로 이루어집니다:

**File**: `src/app/api/notion/route.ts`

**Function**: `POST` export (108행~)

**Specific Changes**:

1. **Destructuring에 imageUrl 추가** (108행):
   - 변경 전: `const { type, theme, scenario, klingPrompts, marketing, status } = await request.json();`
   - 변경 후: `const { type, theme, scenario, klingPrompts, marketing, status, imageUrl } = await request.json();`

2. **request.clone().json() 호출 제거** (186행):
   - 변경 전: `const { imageUrl } = await request.clone().json();`
   - 변경 후: (해당 라인 삭제)

3. **System Data에 imageUrl 포함 고려**: `rawDataString`에 `imageUrl`을 포함할지 검토. 현재 `JSON.stringify({ type, theme, scenario, klingPrompts, marketing })`에 `imageUrl`이 빠져 있으므로, 필요시 추가.

## Testing Strategy

### Validation Approach

테스트 전략은 두 단계로 진행합니다: 먼저 수정 전 코드에서 버그를 재현하는 반례를 확인하고, 수정 후 버그가 해결되었으며 기존 동작이 보존되는지 검증합니다.

### Exploratory Bug Condition Checking

**Goal**: 수정 전 코드에서 `request.clone().json()` 호출이 실패하는 것을 확인하여 근본 원인을 검증합니다.

**Test Plan**: `imageUrl`을 포함한 POST 요청을 시뮬레이션하고, `request.json()` 호출 후 `request.clone().json()`이 실패하는지 확인합니다.

**Test Cases**:
1. **Style 타입 + imageUrl 요청**: `{ type: 'style', imageUrl: 'https://example.com/img.png', ... }`를 POST → 500 에러 발생 확인 (수정 전 코드에서 실패)
2. **imageUrl이 data URI인 경우**: `{ type: 'style', imageUrl: 'data:image/png;base64,...', ... }`를 POST → 500 에러 발생 확인 (수정 전 코드에서 실패)
3. **Body stream 소비 후 clone 실패 확인**: `request.json()` 호출 후 `request.clone()`이 TypeError를 throw하는지 직접 확인

**Expected Counterexamples**:
- `request.clone().json()` 호출 시 `TypeError: Body has already been consumed` 또는 유사한 에러 발생
- catch 블록에서 500 응답 반환

### Fix Checking

**Goal**: 수정 후, `imageUrl`이 포함된 모든 요청에서 정상적으로 노션 페이지가 생성되는지 검증합니다.

**Pseudocode:**
```
FOR ALL request WHERE isBugCondition(request) DO
  result := POST_handler_fixed(request)
  ASSERT result.status === 200
  ASSERT result.children CONTAINS image_block WITH imageUrl
END FOR
```

### Preservation Checking

**Goal**: 수정 후, `imageUrl`이 없는 요청(card, youtube 타입)에서 기존과 동일한 결과가 생성되는지 검증합니다.

**Pseudocode:**
```
FOR ALL request WHERE NOT isBugCondition(request) DO
  ASSERT POST_handler_original(request) = POST_handler_fixed(request)
END FOR
```

**Testing Approach**: Property-based testing을 통해 다양한 입력 조합에서 보존 동작을 검증합니다:
- 다양한 type 값 ('card', 'youtube', 'style')
- imageUrl 유무 조합
- scenario, klingPrompts, marketing 필드의 다양한 조합

**Test Cases**:
1. **Card 타입 보존**: `{ type: 'card', scenario: [...], ... }` 요청이 수정 전후 동일한 children 배열을 생성하는지 확인
2. **YouTube 타입 보존**: `{ type: 'youtube', scenario: [...], klingPrompts: [...], ... }` 요청이 수정 전후 동일하게 동작하는지 확인
3. **imageUrl 없는 Style 타입**: `{ type: 'style', scenario: '...', ... }` (imageUrl 없음) 요청에서 이미지 블록이 추가되지 않는지 확인
4. **GET/DELETE 핸들러 보존**: GET, DELETE 핸들러가 수정의 영향을 받지 않는지 확인

### Unit Tests

- `imageUrl`을 포함한 POST 요청에서 children 배열에 이미지 블록이 포함되는지 테스트
- `imageUrl`이 없는 POST 요청에서 이미지 블록이 포함되지 않는지 테스트
- 다양한 type 값에 대해 properties와 children이 올바르게 구성되는지 테스트

### Property-Based Tests

- 랜덤한 type, theme, scenario, imageUrl 조합을 생성하여 POST 핸들러가 에러 없이 처리하는지 검증
- imageUrl이 없는 랜덤 요청에서 수정 전후 동일한 children 배열이 생성되는지 검증
- imageUrl이 있는 랜덤 요청에서 항상 이미지 블록이 children에 포함되는지 검증

### Integration Tests

- 스타일 변환 페이지에서 실제 노션 저장 플로우를 테스트 (imageUrl 포함)
- 카드뉴스 페이지에서 노션 저장 플로우가 기존과 동일하게 동작하는지 테스트
- 저장된 노션 페이지를 GET으로 조회하여 이미지 블록이 포함되어 있는지 확인
