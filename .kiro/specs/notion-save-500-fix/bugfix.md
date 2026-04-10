# Bugfix Requirements Document

## Introduction

`/api/notion` POST 핸들러에서 스타일 변환 결과를 노션에 저장할 때 500 Internal Server Error가 발생합니다. 원인은 `request.json()`으로 이미 body를 소비한 후, `request.clone().json()`으로 `imageUrl`을 다시 읽으려 하기 때문입니다. Request body stream이 이미 소비된 상태에서 `clone()`이 실패하거나 빈 body를 반환하여 에러가 발생하고, catch 블록에서 "노션 저장 실패" 500 응답을 반환합니다.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN 스타일 변환 페이지(`/style-transfer`)에서 `imageUrl`을 포함한 POST 요청을 `/api/notion`에 보내면 THEN 시스템은 `request.json()`으로 body를 소비한 후 `request.clone().json()`으로 `imageUrl`을 다시 읽으려 하여 500 Internal Server Error를 반환한다

1.2 WHEN `type`이 `'style'`이고 `imageUrl`이 요청 body에 포함되어 있으면 THEN 시스템은 첫 번째 `request.json()` 호출에서 `imageUrl`을 destructure하지 않아 해당 값이 무시되고, 결과 이미지 블록이 노션 페이지에 추가되지 않는다

### Expected Behavior (Correct)

2.1 WHEN 스타일 변환 페이지에서 `imageUrl`을 포함한 POST 요청을 `/api/notion`에 보내면 THEN 시스템은 단일 `request.json()` 호출에서 `imageUrl`을 포함한 모든 필드를 destructure하여 에러 없이 노션 페이지를 성공적으로 생성해야 한다 (SHALL)

2.2 WHEN `type`이 `'style'`이고 `imageUrl`이 요청 body에 포함되어 있으면 THEN 시스템은 해당 `imageUrl`을 사용하여 노션 페이지 본문에 결과 이미지 블록을 정상적으로 추가해야 한다 (SHALL)

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `type`이 `'card'`이고 `imageUrl`이 없는 POST 요청을 보내면 THEN 시스템은 기존과 동일하게 카드뉴스 데이터를 노션에 정상 저장해야 한다 (SHALL CONTINUE TO)

3.2 WHEN `type`이 `'youtube'`이고 시나리오/프롬프트 데이터가 포함된 POST 요청을 보내면 THEN 시스템은 기존과 동일하게 유튜브 쇼츠 데이터를 노션에 정상 저장해야 한다 (SHALL CONTINUE TO)

3.3 WHEN `imageUrl`이 요청 body에 포함되지 않은 경우 THEN 시스템은 이미지 블록을 추가하지 않고 나머지 콘텐츠만 정상적으로 노션에 저장해야 한다 (SHALL CONTINUE TO)

3.4 WHEN GET 요청으로 노션 데이터베이스를 조회하거나 DELETE 요청으로 페이지를 삭제하면 THEN 시스템은 기존과 동일하게 정상 동작해야 한다 (SHALL CONTINUE TO)
