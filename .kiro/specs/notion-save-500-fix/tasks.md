# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - request.clone().json() 실패로 인한 500 에러
  - **CRITICAL**: 이 테스트는 수정 전 코드에서 반드시 FAIL해야 합니다 - 실패가 버그 존재를 확인합니다
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: 이 테스트는 기대 동작을 인코딩합니다 - 수정 후 PASS하면 버그가 해결된 것입니다
  - **GOAL**: request body stream이 이미 소비된 후 request.clone().json() 호출이 실패하는 반례를 확인
  - **Scoped PBT Approach**: `imageUrl`이 포함된 POST 요청에서 `request.json()` 호출 후 `request.clone().json()`이 실패하는 구체적 케이스로 범위 한정
  - `src/app/api/notion/route.ts`의 POST 핸들러를 테스트 대상으로 설정
  - `{ type: 'style', theme: '테스트', scenario: 'prompt', imageUrl: 'https://example.com/img.png', marketing: { caption: '캡션', hashtags: '#태그' }, status: '생성 완료' }` 형태의 요청을 시뮬레이션
  - 수정 전 코드에서 `request.clone().json()`이 `TypeError: Body has already been consumed` 또는 유사 에러를 throw하는지 확인
  - 기대 동작: 단일 `request.json()` 호출에서 `imageUrl`을 포함한 모든 필드를 destructure하여 200 응답 반환
  - 수정 전 코드에서 테스트 실행 → **EXPECTED OUTCOME**: Test FAILS (버그 존재 확인)
  - 반례 문서화: `request.clone().json()` 호출 시 body stream 이미 소비되어 에러 발생
  - 테스트 작성, 실행, 실패 문서화 완료 시 태스크 완료 처리
  - _Requirements: 1.1, 1.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - imageUrl 미포함 요청의 기존 동작 보존
  - **IMPORTANT**: observation-first 방법론을 따를 것
  - 수정 전 코드에서 `imageUrl`이 없는 요청(card, youtube 타입)의 실제 동작을 관찰
  - Observe: `{ type: 'card', theme: '카드뉴스', scenario: [...], status: '생성 완료' }` 요청이 정상적으로 노션 페이지를 생성하는지 확인
  - Observe: `{ type: 'youtube', theme: '유튜브', scenario: [...], klingPrompts: [...], status: '생성 완료' }` 요청이 정상 동작하는지 확인
  - Observe: `imageUrl`이 없는 요청에서 children 배열에 이미지 블록이 포함되지 않는지 확인
  - Property-based test 작성: `imageUrl`이 없는 모든 요청에 대해 수정 전후 동일한 properties와 children 배열이 생성되는지 검증
  - 다양한 type 값('card', 'youtube'), scenario/klingPrompts/marketing 필드 조합을 랜덤 생성하여 테스트
  - 수정 전 코드에서 테스트 실행 → **EXPECTED OUTCOME**: Tests PASS (기존 동작 보존 확인)
  - 테스트 작성, 실행, 통과 확인 완료 시 태스크 완료 처리
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix for request.clone().json() body stream 이중 소비 버그

  - [x] 3.1 Implement the fix
    - `src/app/api/notion/route.ts` 108행의 destructuring에 `imageUrl` 추가: `const { type, theme, scenario, klingPrompts, marketing, status, imageUrl } = await request.json();`
    - 186행의 `const { imageUrl } = await request.clone().json();` 라인 완전 제거
    - (선택) `rawDataString`의 `JSON.stringify`에 `imageUrl` 포함 검토
    - _Bug_Condition: isBugCondition(request) where request.body에 imageUrl이 포함되어 있고 request.json()이 이미 호출된 상태에서 request.clone().json()이 실패_
    - _Expected_Behavior: 단일 request.json() 호출에서 imageUrl을 포함한 모든 필드를 destructure하여 에러 없이 노션 페이지 생성_
    - _Preservation: imageUrl이 없는 요청(card, youtube 타입)은 기존과 동일하게 동작, GET/DELETE 핸들러 영향 없음_
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - imageUrl 포함 요청 정상 처리
    - **IMPORTANT**: 태스크 1에서 작성한 동일한 테스트를 다시 실행 - 새 테스트를 작성하지 말 것
    - 태스크 1의 테스트가 기대 동작을 인코딩하고 있으므로, 수정 후 PASS하면 버그 해결 확인
    - bug condition exploration test 재실행
    - **EXPECTED OUTCOME**: Test PASSES (버그 수정 확인)
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - imageUrl 미포함 요청의 기존 동작 보존
    - **IMPORTANT**: 태스크 2에서 작성한 동일한 테스트를 다시 실행 - 새 테스트를 작성하지 말 것
    - preservation property tests 재실행
    - **EXPECTED OUTCOME**: Tests PASS (회귀 없음 확인)
    - 수정 후 모든 보존 테스트가 여전히 통과하는지 확인

- [x] 4. Checkpoint - Ensure all tests pass
  - 모든 테스트(bug condition + preservation)가 통과하는지 최종 확인
  - 질문이 있으면 사용자에게 문의
